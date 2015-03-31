package activator

import sbt.protocol._
import sbt.serialization._
import play.api.libs.json._

object SbtProtocol {
  def wrapEvent(event: JsValue, subType: String): JsObject = {
    JsObject(Seq("type" -> JsString("sbt"),
      "subType" -> JsString(subType),
      "event" -> event))
  }

  private def messageJson(message: Message)(implicit pickler: Pickler[Message]): JsObject =
    Json.parse(SerializedValue(message).toJsonString) match {
      case o: JsObject =>
        message match {
          case log: LogEvent =>
            // TODO once we're sure the JS never needs the original "message"
            // we can delete it here and skip sending it over the socket
            val newEntry = (o \ "entry").as[JsObject] +
              ("messageHtml" ->
                JsString(AnsiToHtml.ansiToHtml(log.entry.message)))
            o + ("entry" -> newEntry)
          case _ =>
            o
        }
      case other => throw new RuntimeException(s"message $message should have become a JsObject not $other")
    }

  def wrapEvent(event: Event): JsObject = {
    import sbt.serialization._
    val klassName = event.getClass.getName
    val subType = klassName.substring(klassName.lastIndexOf('.') + 1)
    wrapEvent(messageJson(event), subType)
  }

  def synthesizeLogEvent(level: String, message: String): JsObject = {
    wrapEvent(DetachedLogEvent(LogMessage(level, message)))
  }
}
