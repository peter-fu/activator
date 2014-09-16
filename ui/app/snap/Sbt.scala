package snap

import sbt.protocol._
import play.api.libs.json._
import scala.reflect.ClassTag

object Sbt {
  def wrapEvent(event: JsValue, subType: String): JsObject = {
    JsObject(Seq("type" -> JsString("sbt"),
      "subType" -> JsString(subType),
      "event" -> event))
  }

  def wrapEvent[T <: Event: Writes: ClassTag](event: T): JsObject = {
    val klassName = implicitly[ClassTag[T]].runtimeClass.getName
    val subType = klassName.substring(klassName.lastIndexOf('.') + 1)
    wrapEvent(Json.toJson(event), subType)
  }

  def synthesizeLogEvent(level: String, message: String): JsObject = {
    wrapEvent(CoreLogEvent(LogMessage(level, message)))
  }
}
