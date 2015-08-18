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
  val projectPreprocessor: (ActorRef, ActorRef, AppConfig) => Unit) extends Actor with ActorLogging with Stash {

  import AppActor.State

  AppManager.registerKeepAlive(self)

  def location = config.location

  log.debug(s"Creating AppActor for $location")

  // we can stay alive due to socket connection (and then die with the socket)
  // or else we just die after being around a short time
  context.system.scheduler.scheduleOnce(2.minutes, self, InitialTimeoutExpired)

  override val supervisorStrategy = SupervisorStrategy.stoppingStrategy

  @volatile var connector: SbtConnector = null

  private final def running(state: State): Receive = {
    import state._

    def runWith(newState: State): Unit = context.become(running(newState))

    {
      case Terminated(ref) =>
        if (ref == socket) {
          log.debug(s"socket terminated, killing AppActor ${self.path.name}")
          for (p <- pending) p._1 ! Status.Failure(new RuntimeException("app shut down"))
          self ! PoisonPill
        } else if (ref == projectWatcher) {
          log.debug(s"projectWatcher terminated, killing AppActor ${self.path.name}")
          self ! PoisonPill
        } else if (Some(ref) == sbtClientActor) {
          log.debug(s"clientActor terminated, dropping it")
          withSbtClientActor(None)
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
          sbtClientActor.foreach(_ ! RequestSelfDestruct(AppActor.playInternalSerialId))
        case ProjectFilesChanged =>
          self ! NotifyWebSocket(AppActor.projectFilesChanged)
        case OpenClient(client) =>
          log.debug(s"Old client actor was ${sbtClientActor}")
          sbtClientActor.foreach(_ ! PoisonPill) // shouldn't happen - paranoia

          log.debug(s"Opening new client actor for sbt client ${client}")
          self ! NotifyWebSocket(AppActor.clientOpenedJsonEvent)
          val sca = Some(context.actorOf(SbtClientActor.props(client), name = s"client-$clientCount"))
          sca.foreach(context.watch(_))
          runWith(flushPending(withSbtClientActor(sca).incrementClientCount()))
        case CloseClient =>
          log.debug(s"Closing client actor ${sbtClientActor}")
          sbtClientActor.foreach(_ ! PoisonPill) // shouldn't be needed - paranoia
          self ! NotifyWebSocket(AppActor.clientClosedJsonEvent)
          runWith(withSbtClientActor(None).decrementClientCount())
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
        val projectWatcher = context.actorOf(Props(new ProjectWatcher(location, newSourcesSocket = socket, appActor = self)),
          name = "projectWatcher")
        context.watch(projectWatcher)

        @volatile var startedConnecting = System.currentTimeMillis()
        val selfCopy = self
        log.debug("Opening SbtConnector")
        connector.open({ client =>
          val now = System.currentTimeMillis()
          val delta = now - startedConnecting

          log.debug(s"Opened connection to sbt for ${location} AppActor=${selfCopy.path.name} after ${delta}ms (${delta.toDouble / 1000.0}s)")
          produceLog(LogMessage.DEBUG, s"Opened sbt at '${location}'")
          selfCopy ! OpenClient(client)
        }, { (reconnecting, message) =>
          startedConnecting = System.currentTimeMillis()
          log.debug(s"Connection to sbt closed (reconnecting=${reconnecting}: ${message})")
          produceLog(LogMessage.INFO, s"Lost or failed sbt connection: ${message}")
          selfCopy ! CloseClient
          if (!reconnecting) {
            log.debug(s"SbtConnector gave up and isn't reconnecting; killing AppActor ${selfCopy.path.name}")
            selfCopy ! PoisonPill
          }
        })
        context.become(running(State(pending = Vector.empty[(ActorRef, ClientAppRequest)],
          connector = connector,
          socket = socket,
          projectWatcher = projectWatcher,
          sbtClientActor = None,
          clientCount = 0)))
        unstashAll()
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
    val socket = context.actorOf(Props(new AppWebSocketActor(config, typesafeComActor, lookupTimeout)), name = "socket")
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

  private def flushPending(state: State): State = {
    var pending: Vector[(ActorRef, ClientAppRequest)] = state.pending
    while (state.sbtClientActor.isDefined && pending.nonEmpty) {
      val req = pending.head
      pending = pending.tail
      state.sbtClientActor.foreach { actor =>
        produceLog(LogMessage.DEBUG, s"sending request to sbt ${req._2}")
        actor.tell(req._2, req._1)
      }
    }
    if (pending.nonEmpty)
      log.debug(s"Requests waiting for sbt client to be connected: ${pending}")

    state.copy(pending = pending)
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

  override def postStop(): Unit = {
    log.debug("postStop, closing sbt connector")
    val c = connector
    if (c != null) {
      c.close()
    }
  }
}

object AppActor {
  final case class State(pending: Vector[(ActorRef, ClientAppRequest)],
    connector: SbtConnector,
    socket: ActorRef,
    projectWatcher: ActorRef,
    sbtClientActor: Option[ActorRef],
    clientCount: Int) {
    def withSbtClientActor(sbtClientActor: Option[ActorRef]): State = this.copy(sbtClientActor = sbtClientActor)
    def incrementClientCount(n: Int = 1): State = this.copy(clientCount = this.clientCount + n)
    def decrementClientCount(n: Int = 1): State = this.copy(clientCount = this.clientCount - n)
    def addPending(target: ActorRef, request: ClientAppRequest): State = this.copy(pending = this.pending :+ (target -> request))
  }

  val clientOpenedJsonEvent = SbtProtocol.wrapEvent(JsObject(Nil), "ClientOpened")
  val clientClosedJsonEvent = SbtProtocol.wrapEvent(JsObject(Nil), "ClientClosed")
  val playInternalSerialId = -1L
  val projectFilesChanged = SbtProtocol.wrapEvent(JsObject(Nil), "ProjectFilesChanged")
}
