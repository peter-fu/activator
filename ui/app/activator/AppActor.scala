/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package activator

import akka.actor._
import java.io.File
import akka.util.Timeout
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.duration._
import play.api.libs.json._
import sbt.client._
import sbt.protocol._
import sbt.client.actors.{SbtConnectionProxy, SbtClientProxy, WithAskAdapter}

sealed trait AppRequest
case object GetWebSocketCreated extends AppRequest
case object CreateWebSocket extends AppRequest
case class NotifyWebSocket(json: JsObject) extends AppRequest
case object InitialTimeoutExpired extends AppRequest
case class UpdateSourceFiles(files: Set[File]) extends AppRequest
case object ReloadSbtBuild extends AppRequest
case class OpenClient(client: SbtClient) extends AppRequest
case object CloseClient extends AppRequest
case object ProjectFilesChanged extends AppRequest

// requests that need an sbt client
sealed trait ClientAppRequest extends AppRequest {
  def serialId: Long
  def command: Option[String] = None
}
case class RequestExecution(serialId: Long, override val command: Option[String]) extends ClientAppRequest
case class CancelExecution(serialId: Long, executionId: Long) extends ClientAppRequest
case class PossibleAutoCompletions(serialId: Long, override val command: Option[String], detailLevel: Option[Int] = None) extends ClientAppRequest
case class RequestSelfDestruct(serialId: Long) extends ClientAppRequest

sealed trait AppReply
case class SbtClientResponse(serialId: Long, result: Any, command: Option[String] = None) extends AppReply
case object WebSocketAlreadyUsed extends AppReply
case class WebSocketCreatedReply(created: Boolean) extends AppReply

class InstrumentationRequestException(message: String) extends Exception(message)

class AppActor(val config: AppConfig,
  val typesafeComActor: ActorRef,
  val lookupTimeout: Timeout,
  val commandTimeout: Timeout,
  val sbtConnectorProps: SbtConnector => Props,
  val projectWatcherProps: (File, ActorRef, ActorRef) => Props,
  val webSocketProps: (AppConfig, ActorRef, Timeout) => Props,
  val projectPreprocessor: (ActorRef, ActorRef, AppConfig) => Unit) extends Actor with ActorLogging with Stash with WithAskAdapter {

  import AppActor.RunningState

  AppManager.registerKeepAlive(self)

  def location = config.location

  log.debug(s"Creating AppActor for $location")

  // we can stay alive due to socket connection (and then die with the socket)
  // or else we just die after being around a short time
  context.system.scheduler.scheduleOnce(2.minutes, self, InitialTimeoutExpired)

  override val supervisorStrategy = SupervisorStrategy.stoppingStrategy

  private final def awaitClose(socket:ActorRef): Receive = {
    case Terminated(ref) =>
      if (ref == socket) {
        log.debug(s"socket terminated, killing AppActor ${self.path.name}")
        for (p <- pending) p._1 ! Status.Failure(new RuntimeException("app shut down"))
        self ! PoisonPill
      } else if (ref == connectorActor) {
        log.debug(s"connectorActor terminated, killing AppActor ${self.path.name}")
        self ! PoisonPill
      }
    case SbtClientProxy.Closed =>
      context.become(preprocessProject(socket))
  }

  private final def forwardOverSocket(event:Event, socket:ActorRef):Unit = {
    val package = NotifyWebSocket(SbtProtocol.wrapEvent(event))
    if (validateEvent(package.json)) {
      socket.forward(package)
    } else {
      log.error("Attempt to send invalid event {}", package.json)
    }
  }

  private final def handleEvent(event:Event, socket:ActorRef):Unit = event match {
    case _: ClosedEvent =>
      self ! PoisonPill
    case _: BuildStructureChanged =>
      // this should not happen unless during development, hence the error level
      log.error(s"Received event which should have been filtered out by SbtClient ${event}")
    case changed: ValueChanged => forwardOverSocket(changed,socket)
    case entry: LogEvent => entry match {
      case e: DetachedLogEvent => forwardOverSocket(e,socket)
      case e: TaskLogEvent => forwardOverSocket(e,socket)
      case e: BackgroundJobLogEvent => forwardOverSocket(e,socket)
    }
    case fail: ExecutionFailure => forwardOverSocket(fail,socket)
    case yay: ExecutionSuccess => forwardOverSocket(yay,socket)
    case starting: ExecutionStarting => forwardOverSocket(starting,socket)
    case waiting: ExecutionWaiting => forwardOverSocket(waiting,socket)
    case finished: TaskFinished => forwardOverSocket(finished,socket)
    case started: TaskStarted => forwardOverSocket(started,socket)
    case taskEvent: TaskEvent => forwardOverSocket(taskEvent,socket)
    case detachedEvent: DetachedEvent => forwardOverSocket(detachedEvent,socket)
    case loaded: BuildLoaded => forwardOverSocket(loaded,socket)
    case failed: BuildFailedToLoad => forwardOverSocket(failed,socket)
    case background: BackgroundJobEvent => forwardOverSocket(background,socket)
    case background: BackgroundJobStarted => forwardOverSocket(background,socket)
    case background: BackgroundJobFinished => forwardOverSocket(background,socket)
  }

    case req: ClientAppRequest => {
      req match {
        case re: RequestExecution =>
          log.debug("requesting execution of " + re.command)
          client.requestExecution(re.command.get, interaction = None)
        case ce: CancelExecution =>
          log.debug("canceling execution " + ce.executionId)
          client.cancelExecution(ce.executionId)
        case pac: PossibleAutoCompletions =>
          log.debug("possible autocompletions for " + pac.command.get)
          client.possibleAutocompletions(pac.command.get, detailLevel = pac.detailLevel.getOrElse(0))
        case rsd: RequestSelfDestruct =>
          log.debug("Asking sbt to exit")
          client.requestSelfDestruct()
          Future.successful(None)
      }
    } recover {
      case NonFatal(e) =>
        log.debug(s"request to sbt failed ${e.getMessage}")
        produceLog(LogMessage.DEBUG, s"request $req failed: ${e.getClass.getName}: ${e.getMessage}")
        Status.Failure(e)
    } map { result =>
      log.debug(s"${req} result: ${result}")
      produceLog(LogMessage.DEBUG, s"request $req result: ${result}")
      SbtClientResponse(req.serialId, result, req.command)
    } pipeTo sender

  }

  private final def running(state: RunningState): Receive = {
    import state._

    def runWith(newState: RunningState): Unit = context.become(running(newState))

    {
      case Terminated(ref) =>
        if (ref == socket) {
          log.debug(s"socket terminated, killing AppActor ${self.path.name}")
          for (p <- pending) p._1 ! Status.Failure(new RuntimeException("app shut down"))
          self ! PoisonPill
        } else if (ref == projectWatcher) {
          log.debug(s"projectWatcher terminated, killing AppActor ${self.path.name}")
          self ! PoisonPill
        } else if (ref == connectorActor) {
          log.debug(s"connectorActor terminated, killing AppActor ${self.path.name}")
          self ! PoisonPill
        } else if (ref == sbtClientActor) {
          log.debug(s"clientActor terminated, dropping it")
          connectorActor ! SbtConnectionProxy.NewClient(self)
          context.become(awaitingClient(AwaitingClientState(pending = pending,
            connectorActor = connectorActor,
            socket = socket,
            projectWatcher = projectWatcher,
            clientCount = clientCount)))
        }

      case event: Event => handleEvent(event,socket)
      case structure: MinimalBuildStructure => forwardOverSocket(BuildStructureChanged(structure),socket)
      case req: AppRequest => req match {
        case GetWebSocketCreated =>
          sender ! WebSocketCreatedReply(true)
        case CreateWebSocket =>
          log.debug("Attempt to create websocket for app a second time {}", config.id)
          sender ! WebSocketAlreadyUsed
        case notify: NotifyWebSocket =>
          if (validateEvent(notify.json)) {
            socket.forward(notify)
          } else {
            log.error("Attempt to send invalid event {}", notify.json)
          }
        case InitialTimeoutExpired => // Ignore, already created Websocket
        case UpdateSourceFiles(files) =>
          projectWatcher ! SetSourceFilesRequest(files)
        case ReloadSbtBuild =>
          sbtClientActor.foreach(_ ! SbtClientProxy.RequestExecution.ByCommandOrTask("exit",None))
          connectorActor ! SbtConnectionProxy.Close(self)
          projectWatcher ! PoisonPill
          context.unwatch(projectWatcher)
          sbtClientActor.foreach(context.unwatch)
          context.become(awaitClose(socket))

        case ProjectFilesChanged =>
          self ! NotifyWebSocket(AppActor.projectFilesChanged)
        case SbtConnectionProxy.NewClientResponse.Connected(client) =>
          log.debug(s"Old client actor was ${sbtClientActor}")
          sbtClientActor.foreach(_ ! SbtClientProxy.Close(self)) // shouldn't happen - paranoia

          log.debug(s"Opening new client actor for sbt client ${client}")
          self ! NotifyWebSocket(AppActor.clientOpenedJsonEvent)
          context.watch(client)
          runWith(flushPending(withSbtClientActor(Some(client)).incrementClientCount()))
        case CloseClient =>
          log.debug(s"Closing client actor ${sbtClientActor}")
          sbtClientActor ! SbtClientProxy.Close(self) // shouldn't be needed - paranoia
          self ! NotifyWebSocket(AppActor.clientClosedJsonEvent)
          runWith(decrementClientCount())
        case r: ClientAppRequest =>
          val newState = flushPending(addPending(sender, r))
          runWith(newState)
          if (newState.pending.nonEmpty) {
            produceLog(LogMessage.DEBUG, s"request pending until connection to sbt opens: ${r}")
          }
      }
    }
  }


  private final def awaitingClient(state: AwaitingClientState): Receive = {
    import state._

    def runWith(newState: AwaitingClientState): Unit = context.become(awaitingClient(newState))

    {
      case Terminated(ref) =>
        if (ref == socket) {
          log.debug(s"socket terminated, killing AppActor ${self.path.name}")
          for (p <- pending) p._1 ! Status.Failure(new RuntimeException("app shut down"))
          self ! PoisonPill
        } else if (ref == projectWatcher) {
          log.debug(s"projectWatcher terminated, killing AppActor ${self.path.name}")
          self ! PoisonPill
        } else if (ref == connectorActor) {
          log.debug(s"connectorActor terminated, killing AppActor ${self.path.name}")
          self ! PoisonPill
        }

      case req: AppRequest => req match {
        case GetWebSocketCreated =>
          sender ! WebSocketCreatedReply(true)
        case CreateWebSocket =>
          log.debug("Attempt to create websocket for app a second time {}", config.id)
          sender ! WebSocketAlreadyUsed
        case notify: NotifyWebSocket =>
          if (validateEvent(notify.json)) {
            socket.forward(notify)
          } else {
            log.error("Attempt to send invalid event {}", notify.json)
          }
        case InitialTimeoutExpired => // Ignore, already created Websocket
        case UpdateSourceFiles(files) =>
          projectWatcher ! SetSourceFilesRequest(files)
        case ReloadSbtBuild =>
          connectorActor ! SbtConnectionProxy.Close(self)
          projectWatcher ! PoisonPill
          context.unwatch(projectWatcher)
          context.become(awaitClose(socket))
        case ProjectFilesChanged =>
          self ! NotifyWebSocket(AppActor.projectFilesChanged)
        case SbtConnectionProxy.NewClientResponse.Connected(client) =>
          log.debug(s"Opening new client actor for sbt client ${client}")
          self ! NotifyWebSocket(AppActor.clientOpenedJsonEvent)
          context.watch(client)
          context.become(running(flushPending(withSbtClientActor(client).incrementClientCount())))
          unstashAll()
        case CloseClient =>
          log.debug(s"Closing client actor BEFORE getting client -- become reject client")
          self ! NotifyWebSocket(AppActor.clientClosedJsonEvent)
          context.become(rejectClient(socket))
        case r: ClientAppRequest =>
          val newState = flushPending(addPending(sender, r))
          runWith(newState)
          if (newState.pending.nonEmpty) {
            produceLog(LogMessage.DEBUG, s"request pending until connection to sbt opens: ${r}")
          }
      }
    }
  }

  def produceLog(level: String, message: String): Unit = {
    // self can be null after we are destroyed
    val selfCopy = self
    if (selfCopy != null)
      selfCopy ! NotifyWebSocket(SbtProtocol.synthesizeLogEvent(level, message))
  }

  private final def preprocessProject(socket: ActorRef): Receive = {
    projectPreprocessor(self, socket, config)

    {
      case ProjectPreprocessor.Finished =>
        // TODO configName/humanReadableName are cut-and-pasted into AppManager, fix
        val connector = SbtConnector(configName = "activator", humanReadableName = "Activator", location)
        // val projectWatcher = context.actorOf(Props(new ProjectWatcher(location, newSourcesSocket = socket, appActor = self)),
        //   name = "projectWatcher")
        val projectWatcher = context.actorOf(projectWatcherProps(location, socket, self), name = "projectWatcher")
        context.watch(projectWatcher)

        val connectorActor = context.actorOf(sbtConnectorProps(connector), name = "connectorActor")
        context.watch(connectorActor)

        connectorActor ! SbtConnectionProxy.NewClient(self)
        context.become(awaitingClient(AwaitingClientState(pending = Vector.empty[(ActorRef, ClientAppRequest)],
          connectorActor = connectorActor,
          socket = socket,
          projectWatcher = projectWatcher,
          clientCount = 0)))
      case Terminated(ref) =>
        if (ref == socket) {
          log.debug(s"socket terminated, killing AppActor ${self.path.name}")
          context stop self
        }
      case req: AppRequest => req match {
        case GetWebSocketCreated =>
          sender ! WebSocketCreatedReply(true)
        case CreateWebSocket =>
          log.debug("Attempt to create websocket for app a second time {}", config.id)
          sender ! WebSocketAlreadyUsed
        case InitialTimeoutExpired => // Ignore - we created the Websocket
        case _ => stash()
      }
      case _ => stash()
    }
  }

  private final def waitWebSocket(): Receive = {
    // val socket = context.actorOf(Props(new AppWebSocketActor(config, typesafeComActor, lookupTimeout)), name = "socket")
    val socket = context.actorOf(webSocketProps(config, typesafeComActor, lookupTimeout), name = "socket")
    context.watch(socket)

    {
      case Terminated(ref) =>
        if (ref == socket) {
          log.debug(s"socket terminated, killing AppActor ${self.path.name}")
          context stop self
        }
      case req: AppRequest => req match {
        case GetWebSocketCreated =>
          sender ! WebSocketCreatedReply(false)
        case CreateWebSocket =>
          log.debug("got CreateWebSocket")
          socket.tell(GetWebSocket, sender)
          context.become(preprocessProject(socket))
        case InitialTimeoutExpired =>
          log.debug("Nobody ever connected to {}, killing it", config.id)
          self ! PoisonPill
        case _ => stash()
      }
      case _ => stash()
    }
  }

  override def receive = waitWebSocket()

  private def flushPending(state: RunningState): RunningState = {
    import SbtClientProxy._

    var pending: Vector[(ActorRef, ClientAppRequest)] = state.pending
    def askBuilder[T](requestBuilder:ActorRef => Request[T]):Future[T] =
        asAsk(state.sbtClientActor)(requestBuilder)(commandTimeout)

    while (pending.nonEmpty) {
      val (command,sendTo) = pending.head
      pending = pending.tail
      produceLog(LogMessage.DEBUG, s"sending request to sbt ${command}")
      val result = command match {
        case r:RequestExecution =>
          futureFold(askBuilder(SbtClientProxy.RequestExecution.ByCommandOrTask(r.command.get,None,_)))(
            success = {
              case ExecutionId(Success(id),_) => SbtClientResponse(r.serialId,id,r.command)
              case ExecutionId(Failure(e),_) => Status.Failure(e)
            },
            failure = Status.Failure.apply
          )
        case r:CancelExecution =>
          futureFold(askBuilder(SbtClientProxy.CancelExecution(r.executionId,_)))(
            success = {
              case CancelExecutionResponse(_,Success(result)) => SbtClientResponse(r.serialId,result,r.command)
              case CancelExecutionResponse(_,Failure(e)) => Status.Failure(e)
            },
            failure = Status.Failure.apply
          )
        case r:PossibleAutoCompletions =>
          futureFold(askBuilder(SbtClientProxy.PossibleAutoCompletions(r.command.get,r.detailLevel.getOrElse(0),_)))(
            success = {
              case AutoCompletions(Success(result)) => SbtClientResponse(r.serialId,result,r.command)
              case AutoCompletions(Failure(e)) => Status.Failure(e)
            },
            failure = Status.Failure.apply
          )
        case _:RequestSelfDestruct =>
          futureFold(askBuilder(SbtClientProxy.RequestExecution.ByCommandOrTask("exit",None,_)))(
            success = {
              case ExecutionId(Success(id),_) => SbtClientResponse(r.serialId,id,r.command)
              case ExecutionId(Failure(e),_) => Status.Failure(e)
            },
            failure = Status.Failure.apply
          )
      }

      result pipeTo sendTo
    }

    state.copy(pending = Vector.empty[(ActorRef, ClientAppRequest)])
  }

  private def validateEvent(json: JsObject): Boolean = {
    // be sure all events have "type" so on the client
    // side we don't check for that.
    val hasType = json \ "type" match {
      case JsString(t) => true
      case _ => false
    }
    hasType
  }

  override def preRestart(reason: Throwable, message: Option[Any]): Unit = {
    super.preRestart(reason, message)
    log.debug(s"preRestart, ${reason.getClass.getName}: ${reason.getMessage}, on $message")
  }
}

object AppActor {

  def futureFold[T,Z](in:Future[T])(success:T => Z,failure:Throwable => Z):Future[Z] =
    in.recover(failure).map(success)

  final case class AwaitingClientState(pending: Vector[(ActorRef, ClientAppRequest)],
    connectorActor: ActorRef,
    socket: ActorRef,
    projectWatcher: ActorRef,
    clientCount: Int) {
    def incrementClientCount(n: Int = 1): AwaitingClientState = this.copy(clientCount = this.clientCount + n)
    def addPending(target: ActorRef, request: ClientAppRequest): AwaitingClientState = this.copy(pending = this.pending :+ (target -> request))
    def withSbtClientActor(sbtClientActor: ActorRef):RunningState =
      RunningState(pending = pending,
                   connectorActor = connectorActor,
                   socket = socket,
                   projectWatcher = projectWatcher,
                   sbtClientActor =sbtClientActor,
                   clientCount = clientCount)
  }

  final case class RunningState(pending: Vector[(ActorRef, ClientAppRequest)],
    connectorActor: ActorRef,
    socket: ActorRef,
    projectWatcher: ActorRef,
    sbtClientActor: ActorRef,
    clientCount: Int) {
    def incrementClientCount(n: Int = 1): RunningState = this.copy(clientCount = this.clientCount + n)
    def addPending(target: ActorRef, request: ClientAppRequest): RunningState = this.copy(pending = this.pending :+ (target -> request))
  }

  val clientOpenedJsonEvent = SbtProtocol.wrapEvent(JsObject(Nil), "ClientOpened")
  val clientClosedJsonEvent = SbtProtocol.wrapEvent(JsObject(Nil), "ClientClosed")
  val playInternalSerialId = -1L
  val projectFilesChanged = SbtProtocol.wrapEvent(JsObject(Nil), "ProjectFilesChanged")
}
