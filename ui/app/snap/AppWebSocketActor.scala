package snap

import akka.actor.{ ActorRef, Status, ActorLogging }
import akka.pattern._
import console.ClientController.HandleRequest
import play.api.libs.json.Json._
import play.api.libs.json._
import snap.JsonHelper._
import scala.concurrent.ExecutionContext.Implicits.global

class AppWebSocketActor(pending: Vector[(ActorRef, ClientAppRequest)]) extends WebSocketActor[JsValue] with ActorLogging {
  implicit val timeout = WebSocketActor.timeout

  override def onMessage(json: JsValue): Unit = {
    json match {
      case InspectRequest(m) => for (cActor <- consoleActor) cActor ! HandleRequest(json)
      case WebSocketActor.Ping(ping) => produce(WebSocketActor.Pong(ping.cookie))
      case SbtRequest(req) => handleSbtPayload(req.json)
      case _ => log.info("unhandled message on web socket: {}", json)
    }
  }

  /**
   * Parses incoming sbt payload into an sbt command to execute.
   * Send result of execution asynchronously via web socket.
   *
   * The 'serialId' is what connects the request with the asynchronous response.
   * This way a client can filter out events that are a result of its invocation.
   *
   * Please note that the 'serialId' is not any id used in sbt-server.
   */
  def handleSbtPayload(json: JsValue) = {
    def sendResult(subType: String, serialId: String, result: JsValue, partialCommand: Option[String] = None) = {
      var payload = Seq(
        "type" -> JsString("sbt"),
        "subType" -> JsString(subType),
        "serialId" -> JsString(serialId),
        "result" -> result)

      val pc = for {
        pc <- partialCommand
        r = Seq("partialCommand" -> JsString(pc))
      } yield r
      payload ++= pc.getOrElse(Seq.empty)

      context.parent ! NotifyWebSocket(JsObject(payload))
    }

    json.validate[SbtPayload](SbtPayload.sbtPayloadReads) match {
      case p: JsSuccess[SbtPayload] =>
        val payload = p.get
        payload.requestType match {
          case AppWebSocketActor.requestExecution =>
            context.parent ? RequestExecution(payload.serialId, Some(payload.command)) map {
              case (serialId: String, executionId: Long) =>
                sendResult(AppWebSocketActor.requestExecution, serialId, JsNumber(executionId))
              case other =>
                log.warning("sbt could not execute command")
            }
          case AppWebSocketActor.cancelExecution =>
            if (payload.executionId.isDefined) {
              context.parent ? CancelExecution(payload.serialId, payload.executionId.get) map {
                case (serialId: String, result: Boolean) =>
                  sendResult(AppWebSocketActor.cancelExecution, serialId, JsBoolean(result))
                case other =>
                  log.warning("sbt could not cancel command")
              }
            } else {
              log.info("Cannot cancel sbt request without execution id.")
              None
            }
          case AppWebSocketActor.possibleAutoCompletions =>
            context.parent ? PossibleAutoCompletions(payload.serialId, Some(payload.command)) map {
              case (serialId: String, command: String, choicesAny: Set[_]) =>
                val choices = choicesAny.map(_.asInstanceOf[sbt.protocol.Completion])
                sendResult(AppWebSocketActor.possibleAutoCompletions, serialId, JsArray(choices.toList map { Json.toJson(_) }), Some(command))
              case other => log.warning(s"sbt could not execute possible auto completions")
            }
          case other =>
            log.info("Unknown sbt request type: $other")
            None
        }
      case e: JsError =>
        log.warning(s"Could not parse $json to valid SbtPayload. Error is: $e")
        None
    }
  }

  override def subReceive: Receive = {
    case NotifyWebSocket(json) =>
      log.debug("sending message on web socket: {}", json)
      produce(json)
  }

  override def postStop(): Unit = {
    log.debug("postStop")
    for (p <- pending) p._1 ! Status.Failure(new RuntimeException("app shut down"))
  }
}

object AppWebSocketActor {
  val requestExecution = "RequestExecution"
  val cancelExecution = "CancelExecution"
  val possibleAutoCompletions = "PossibleAutoCompletions"
}

case class InspectRequest(json: JsValue)

case class SbtRequest(json: JsValue)

case class SbtPayload(serialId: String, requestType: String, command: String, executionId: Option[Long])

object InspectRequest {
  val tag = "InspectRequest"

  implicit val inspectRequestReads: Reads[InspectRequest] =
    extractRequest[InspectRequest](tag)((__ \ "location").read[JsValue].map(InspectRequest.apply _))

  implicit val inspectRequestWrites: Writes[InspectRequest] =
    emitRequest(tag)(in => obj("location" -> in.json))

  def unapply(in: JsValue): Option[InspectRequest] = Json.fromJson[InspectRequest](in).asOpt
}

object SbtRequest {
  val tag = "sbt"

  implicit val sbtRequestReads: Reads[SbtRequest] =
    extractRequest[SbtRequest](tag)((__ \ "payload").read[JsValue].map(SbtRequest.apply _))

  implicit val sbtRequestWrites: Writes[SbtRequest] =
    emitRequest(tag)(in => obj("payload" -> in.json))

  def unapply(in: JsValue): Option[SbtRequest] = Json.fromJson[SbtRequest](in).asOpt
}

object SbtPayload {

  import play.api.libs.functional.syntax._

  implicit val sbtPayloadReads = (
    (__ \ "serialId").read[String] and
    (__ \ "type").read[String] and
    (__ \ "command").read[String] and
    (__ \ "executionId").readNullable[Long])(SbtPayload.apply _)
}
