/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package snap

import com.typesafe.sbtrc._
import akka.actor._
import java.io.File
import java.net.URLEncoder
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.duration._
import console.ClientController.HandleRequest
import JsonHelper._
import play.api.libs.json._
import play.api.libs.json.Json._
import play.api.libs.functional.syntax._
import sbt.client._

sealed trait AppRequest

case object GetWebSocketCreated extends AppRequest
case object CreateWebSocket extends AppRequest
case class NotifyWebSocket(json: JsObject) extends AppRequest
case object InitialTimeoutExpired extends AppRequest
case class UpdateSourceFiles(files: Set[File]) extends AppRequest
case object ReloadSbtBuild extends AppRequest

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

  // TODO configName/humanReadableName are cut-and-pasted into AppManager, fix
  // TODO actually open the connector and use it
  val connector = SbtConnector(configName = "activator", humanReadableName = "Activator", location)
  val socket = context.actorOf(Props(new AppSocketActor()), name = "socket")
  val projectWatcher = context.actorOf(Props(new ProjectWatcher(location, newSourcesSocket = socket, appActor = self)),
    name = "projectWatcher")

  var webSocketCreated = false

  context.watch(socket)
  context.watch(projectWatcher)

  // we can stay alive due to socket connection (and then die with the socket)
  // or else we just die after being around a short time
  context.system.scheduler.scheduleOnce(2.minutes, self, InitialTimeoutExpired)

  override val supervisorStrategy = SupervisorStrategy.stoppingStrategy

  override def receive = {
    case Terminated(ref) =>
      if (ref == socket) {
        log.info(s"socket terminated, killing AppActor ${self.path.name}")
        self ! PoisonPill
      } else if (ref == projectWatcher) {
        log.info(s"projectWatcher terminated, killing AppActor ${self.path.name}")
        self ! PoisonPill
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
      // TODO FIXME
    }
  }

  private def validateEvent(json: JsObject): Boolean = {
    // we need either a toplevel "type" or a toplevel "taskId"
    // and then a nested "event" with a "type"
    val hasType = json \ "type" match {
      case JsString(t) => true
      case _ => false
    }
    val hasTaskId = json \ "taskId" match {
      case JsString(t) =>
        json \ "event" \ "type" match {
          case JsString(t) => true
          case _ => false
        }
      case _ => false
    }
    hasType || hasTaskId;
  }

  override def preRestart(reason: Throwable, message: Option[Any]): Unit = {
    super.preRestart(reason, message)
    log.debug(s"preRestart, ${reason.getClass.getName}: ${reason.getMessage}, on $message")
  }

  override def postStop(): Unit = {
    log.debug("postStop")
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
    }
  }
}
