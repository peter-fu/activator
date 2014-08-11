/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package snap

import com.typesafe.sbtrc._
import akka.actor._
import akka.pattern._
import java.io.File
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.duration._
import console.ClientController.HandleRequest
import JsonHelper._
import play.api.libs.json._
import play.api.libs.json.Json._
import sbt.client._
import sbt.protocol._
import scala.reflect.ClassTag
import scala.concurrent.Future
import scala.util.control.NonFatal

sealed trait AppRequest
case object GetWebSocketCreated extends AppRequest
case object CreateWebSocket extends AppRequest
case class NotifyWebSocket(json: JsObject) extends AppRequest
case object InitialTimeoutExpired extends AppRequest
case class UpdateSourceFiles(files: Set[File]) extends AppRequest
case object ReloadSbtBuild extends AppRequest
case class OpenClient(client: SbtClient) extends AppRequest
case object CloseClient extends AppRequest

// requests that need an sbt client
sealed trait ClientAppRequest extends AppRequest
case class RequestExecution(command: String) extends ClientAppRequest
case class CancelExecution(executionId: Long) extends ClientAppRequest
case class PossibleAutoCompletions(partialCommand: String, detailLevel: Option[Int] = None) extends ClientAppRequest
case object RequestSelfDestruct extends ClientAppRequest

sealed trait AppReply
case object WebSocketAlreadyUsed extends AppReply
case class WebSocketCreatedReply(created: Boolean) extends AppReply
case class InspectRequest(json: JsValue)

object InspectRequest {
  val tag = "InspectRequest"

  implicit val inspectRequestReads: Reads[InspectRequest] =
    extractRequest[InspectRequest](tag)((__ \ "location").read[JsValue].map(InspectRequest.apply _))

  implicit val inspectRequestWrites: Writes[InspectRequest] =
    emitRequest(tag)(in => obj("location" -> in.json))

  def unapply(in: JsValue): Option[InspectRequest] = Json.fromJson[InspectRequest](in).asOpt
}

class AppActor(val config: AppConfig) extends Actor with ActorLogging {

  AppManager.registerKeepAlive(self)

  def location = config.location

  log.debug(s"Creating AppActor for $location")

  // TODO configName/humanReadableName are cut-and-pasted into AppManager, fix
  val connector = SbtConnector(configName = "activator", humanReadableName = "Activator", location)
  val socket = context.actorOf(Props(new AppSocketActor()), name = "socket")
  val projectWatcher = context.actorOf(Props(new ProjectWatcher(location, newSourcesSocket = socket, appActor = self)),
    name = "projectWatcher")
  var clientActor: Option[ActorRef] = None
  var clientCount = 0

  var webSocketCreated = false

  var pending = Vector.empty[(ActorRef, ClientAppRequest)]

  context.watch(socket)
  context.watch(projectWatcher)

  // we can stay alive due to socket connection (and then die with the socket)
  // or else we just die after being around a short time
  context.system.scheduler.scheduleOnce(2.minutes, self, InitialTimeoutExpired)

  override val supervisorStrategy = SupervisorStrategy.stoppingStrategy

  log.debug("Opening SbtConnector")
  connector.open({ client =>
    log.debug(s"Opened connection to sbt for ${location} AppActor=${self.path.name}")
    produceLog(LogMessage.DEBUG, s"Opened sbt at '${location}'")
    self ! OpenClient(client)
  }, { (reconnecting, message) =>
    log.debug(s"sbt client closed reconnecting=${reconnecting}: ${message}")
    produceLog(LogMessage.INFO, s"Lost or failed sbt connection: ${message}")
    self ! CloseClient
    if (!reconnecting) {
      log.info(s"SbtConnector gave up and isn't reconnecting; killing AppActor ${self.path.name}")
      self ! PoisonPill
    }
  })

  def produceLog(level: String, message: String): Unit = {
    // self can be null after we are destroyed
    val selfCopy = self
    if (selfCopy != null)
      selfCopy ! NotifyWebSocket(Sbt.synthesizeLogEvent(level, message))
  }

  override def receive = {
    case Terminated(ref) =>
      if (ref == socket) {
        log.info(s"socket terminated, killing AppActor ${self.path.name}")
        self ! PoisonPill
      } else if (ref == projectWatcher) {
        log.info(s"projectWatcher terminated, killing AppActor ${self.path.name}")
        self ! PoisonPill
      } else if (Some(ref) == clientActor) {
        log.debug(s"clientActor terminated, dropping it")
        clientActor = None
      }

    case req: AppRequest => req match {
      case GetWebSocketCreated =>
        sender ! WebSocketCreatedReply(webSocketCreated)
      case CreateWebSocket =>
        log.debug("got CreateWebSocket")
        if (webSocketCreated) {
          log.warning("Attempt to create websocket for app a second time {}", config.id)
          sender ! WebSocketAlreadyUsed
        } else {
          webSocketCreated = true
          socket.tell(GetWebSocket, sender)
        }
      case notify: NotifyWebSocket =>
        if (validateEvent(notify.json)) {
          socket.forward(notify)
        } else {
          log.error("Attempt to send invalid event {}", notify.json)
        }
      case InitialTimeoutExpired =>
        if (!webSocketCreated) {
          log.warning("Nobody every connected to {}, killing it", config.id)
          self ! PoisonPill
        }
      case UpdateSourceFiles(files) =>
        projectWatcher ! SetSourceFilesRequest(files)
      case ReloadSbtBuild =>
        clientActor.foreach(_ ! RequestSelfDestruct)
      case OpenClient(client) =>
        log.debug(s"Old client actor was ${clientActor}")
        clientActor.foreach(_ ! PoisonPill) // shouldn't happen - paranoia

        log.debug(s"Opening new client actor for sbt client ${client}")
        clientCount += 1
        self ! NotifyWebSocket(AppActor.clientOpenedJsonResponse)
        clientActor = Some(context.actorOf(Props(new SbtClientActor(client)), name = s"client-$clientCount"))
        clientActor.foreach(context.watch(_))
        flushPending()
      case CloseClient =>
        log.debug(s"Closing client actor ${clientActor}")
        clientActor.foreach(_ ! PoisonPill) // shouldn't be needed - paranoia
        clientActor = None
      case r: ClientAppRequest =>
        pending = pending :+ (sender -> r)
        flushPending()
        if (pending.nonEmpty) {
          produceLog(LogMessage.DEBUG, s"request pending until connection to sbt opens: ${r}")
        }
    }
  }

  private def flushPending(): Unit = {
    while (clientActor.isDefined && pending.nonEmpty) {
      val req = pending.head
      pending = pending.tail
      clientActor.foreach { actor =>
        produceLog(LogMessage.DEBUG, s"sending request to sbt ${req._2}")
        actor.tell(req._2, req._1)
      }
    }
    if (pending.nonEmpty)
      log.debug(s"Requests waiting for sbt client to be connected: ${pending}")
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
    connector.close()
  }

  class AppSocketActor extends WebSocketActor[JsValue] with ActorLogging {
    override def onMessage(json: JsValue): Unit = {
      json match {
        case InspectRequest(m) => for (cActor <- consoleActor) cActor ! HandleRequest(json)
        case WebSocketActor.Ping(ping) => produce(WebSocketActor.Pong(ping.cookie))
        case _ => log.info("unhandled message on web socket: {}", json)
      }
    }

    override def subReceive: Receive = {
      case NotifyWebSocket(json) =>
        log.debug("sending message on web socket: {}", json)

        produce(json)
    }

    override def postStop(): Unit = {
      log.debug("postStop")
      for (p <- pending)
        p._1 ! Status.Failure(new RuntimeException("app shut down"))
    }
  }

  class SbtClientActor(val client: SbtClient) extends Actor with ActorLogging {
    log.debug(s"Creating SbtClientActor ${self.path.name}")

    override val supervisorStrategy = SupervisorStrategy.stoppingStrategy

    val eventsSub = client.handleEvents { event =>
      self ! event
    }
    val buildSub = client.watchBuild { structure =>
      self ! structure
    }

    // this is a hardcoded hack... we need to control the list of things
    // to watch from JS, and we should handle build structure changes
    // by redoing this
    val valueSub = new Subscription() {
      val futureValueSubs: Seq[Future[Seq[Subscription]]] =
        Seq("discoveredMainClasses",
          "mainClasses",
          "mainClass",
          "libraryDependencies") map { name =>
            client.lookupScopedKey(name) map { scopeds =>
              scopeds map { scoped =>
                log.debug(s"Subscribing to key ${scoped}")
                client.watch(TaskKey[Seq[String]](scoped)) { (key, result) =>
                  self ! ValueChanged(key, result)
                }
              }
            }
          }
      override def cancel(): Unit = {
        futureValueSubs map { futureSubs => futureSubs map { subs => subs map { sub => sub.cancel() } } }
      }
    }

    override def postStop(): Unit = {
      log.debug("postStop")
      eventsSub.cancel()
      buildSub.cancel()
      valueSub.cancel()
      // we were probably stopped because the client closed already,
      // but if not, close here.
      client.close()
    }

    private def forwardOverSocket[T <: Event: Format: ClassTag](event: T): Unit = {
      context.parent ! NotifyWebSocket(Sbt.wrapEvent(event))
    }

    def produceLog(level: String, message: String): Unit = {
      context.parent ! NotifyWebSocket(Sbt.synthesizeLogEvent(level, message))
    }

    override def receive = {
      case event: Event => event match {
        case _: ClosedEvent =>
          self ! PoisonPill
        case _: BuildStructureChanged =>
          log.error(s"Received event which should have been filtered out by SbtClient ${event}")
        case changed: ValueChanged[_] => forwardOverSocket(changed)
        case entry: LogEvent => forwardOverSocket(entry)
        case fail: ExecutionFailure => forwardOverSocket(fail)
        case yay: ExecutionSuccess => forwardOverSocket(yay)
        case starting: ExecutionStarting => forwardOverSocket(starting)
        case waiting: ExecutionWaiting => forwardOverSocket(waiting)
        case finished: TaskFinished => forwardOverSocket(finished)
        case started: TaskStarted => forwardOverSocket(started)
        case taskEvent: TaskEvent => forwardOverSocket(taskEvent)
      }
      case structure: MinimalBuildStructure =>
        forwardOverSocket(BuildStructureChanged(structure))
      case req: ClientAppRequest => {
        req match {
          case RequestExecution(command) =>
            log.debug("requesting execution of " + command)
            client.requestExecution(command, interaction = None)
          case CancelExecution(executionId) =>
            log.debug("canceling execution " + executionId)
            client.cancelExecution(executionId)
          case PossibleAutoCompletions(partialCommand, detailLevelOption) =>
            log.debug("possible autocompletions for " + partialCommand)
            client.possibleAutocompletions(partialCommand, detailLevel = detailLevelOption.getOrElse(0))
          case RequestSelfDestruct =>
            client.requestSelfDestruct()
            Future.successful()
        }
      } recover {
        case NonFatal(e) =>
          log.error(s"request to sbt failed ${e.getMessage}", e)
          produceLog(LogMessage.DEBUG, s"request $req failed: ${e.getClass.getName}: ${e.getMessage}")
          Status.Failure(e)
      } map { result =>
        log.debug(s"${req} result: ${result}")
        produceLog(LogMessage.DEBUG, s"request $req result: ${result}")
        result
      } pipeTo sender
    }
  }
}

object AppActor {
  val clientOpenedJsonResponse = JsObject(Seq("type" -> JsString("sbt"), "subType" -> JsString("ClientOpened"), "event" -> JsObject(Nil)))
}
