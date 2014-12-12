/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package snap

import play.api.libs.json._
import scala.util.parsing.json.JSONType
import scala.util.parsing.json.JSONObject
import scala.util.parsing.json.JSONArray

/** Helper methods to convert between JSON libraries. */
object JsonHelper {
  import play.api.libs.json._
  import play.api.libs.json.Json._
  import play.api.libs.functional.syntax._
  import play.api.libs.json.Reads._
  import play.api.libs.json.Writes._
  import java.io._
  import play.api.data.validation.ValidationError

  implicit object FileWrites extends Writes[File] {
    def writes(file: File) = JsString(file.getPath)
  }

  implicit object FileReads extends Reads[File] {
    def reads(json: JsValue) = json match {
      case JsString(path) => JsSuccess(new File(path))
      case _ => JsError(Seq(JsPath() -> Seq(ValidationError("validate.error.expected.jsstring"))))
    }
  }

  def extractTagged[T](key: String, tag: String)(reads: Reads[T]): Reads[T] =
    (__ \ key).read[String](pattern(tag.r)) ~> reads

  def extractRequest[T](tag: String)(reads: Reads[T]): Reads[T] =
    extractTagged("request", tag)(reads)

  def extractResponse[T](tag: String)(reads: Reads[T]): Reads[T] =
    extractTagged("response", tag)(reads)

  def emitTagged[T](key: String, tag: String)(bodyFunc: T => JsObject): Writes[T] = new Writes[T] {
    def writes(in: T): JsValue =
      Json.obj(key -> tag) ++ bodyFunc(in)
  }

  def emitTagged[T](tagKey: String, tag: String, subTagKey: String, subTag: String)(bodyFunc: T => JsObject): Writes[T] = new Writes[T] {
    def writes(in: T): JsValue =
      Json.obj(tagKey -> tag) ++ Json.obj(subTagKey -> subTag) ++ bodyFunc(in)
  }

  def emitRequest[T](tag: String)(bodyFunc: T => JsObject): Writes[T] =
    emitTagged("request", tag)(bodyFunc)

  def emitResponse[T](tag: String, subTag: String)(bodyFunc: T => JsObject): Writes[T] =
    emitTagged("type", tag, "subtype", subTag)(bodyFunc)

  def playJsonToScalaJson(playJson: JsValue): JSONType = {
    def playJsonToScalaJsonValue(playJson: JsValue): Any = {
      playJson match {
        case JsBoolean(b) => b
        case JsNumber(n) => n
        case JsString(s) => s
        case JsNull => null
        case o: JsObject => playJsonToScalaJson(o)
        case a: JsArray => playJsonToScalaJson(a)
        case u: JsUndefined => throw new RuntimeException("undefined found in json")
      }
    }

    playJson match {
      case JsObject(list) =>
        JSONObject((list map { kv =>
          kv._1 -> playJsonToScalaJsonValue(kv._2)
        }).toMap)
      case JsArray(list) =>
        JSONArray(list.map(playJsonToScalaJsonValue).toList)
      case other =>
        throw new RuntimeException("only JSON 'containers' allowed here, not " + other.getClass)
    }
  }

  def scalaJsonToPlayJson(scalaJson: JSONType): JsValue = {
    def scalaJsonToPlayJsonValue(scalaJson: Any): JsValue = {
      scalaJson match {
        // always check null first since it's an instance of everything
        case null => JsNull
        case o: JSONObject => scalaJsonToPlayJson(o)
        case a: JSONArray => scalaJsonToPlayJson(a)
        case b: Boolean => JsBoolean(b)
        case n: Double => JsNumber(BigDecimal(n))
        case n: Long => JsNumber(BigDecimal(n))
        case n: Int => JsNumber(BigDecimal(n))
        case s: String => JsString(s)
      }
    }

    scalaJson match {
      case JSONObject(m) =>
        JsObject(m.iterator.map(kv => (kv._1 -> scalaJsonToPlayJsonValue(kv._2))).toSeq)
      case JSONArray(list) =>
        JsArray(list.map(scalaJsonToPlayJsonValue))
      case other =>
        throw new RuntimeException("only JSON 'containers' allowed here, not " + other.getClass)
    }
  }
}
