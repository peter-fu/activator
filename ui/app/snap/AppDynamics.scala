/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package snap

import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Json._

object AppDynamicsRequest {
  import RequestHelpers._
  import JsonHelper._

  val requestTag = "AppDynamicsRequest"
  val responseTag = "monitoring"
  val responseSubTag = "appdynamics"

  sealed trait Request {
    def error(message: String): Response =
      ErrorResponse(message, this)
  }
  case class Provision(username: monitor.AppDynamics.Username, password: monitor.AppDynamics.Password) extends Request {
    def response: Response = Provisioned(this)
  }
  case object Available extends Request {
    def response(result: Boolean): Response = AvailableResponse(result, this)
  }
  case object Deprovision extends Request {
    def response: Response = Deprovisioned
  }

  sealed trait Response {
    def request: Request
  }
  case class Provisioned(request: Provision) extends Response
  case class ErrorResponse(message: String, request: Request) extends Response
  case class AvailableResponse(result: Boolean, request: Request) extends Response
  case object Deprovisioned extends Response {
    val request: Request = Deprovision
  }

  implicit val appDynamicsProvisionReads: Reads[Provision] =
    extractRequest[Provision](requestTag)(extractType("provision")(((__ \ "username").read[String] and
      (__ \ "password").read[String])((u, p) => Provision.apply(monitor.AppDynamics.Username(u), monitor.AppDynamics.Password(p)))))

  implicit val appDynamicsProvisionWrites: Writes[Provision] =
    emitRequest(requestTag)(p => Json.obj("type" -> "provision", "username" -> p.username.value, "password" -> p.password.value))

  implicit val appDynamicsAvailableReads: Reads[Available.type] =
    extractRequest[Available.type](requestTag)(extractTypeOnly("available", Available))

  implicit val appDynamicsAvailableWrites: Writes[Available.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "available"))

  implicit val appDynamicsDeprovisionReads: Reads[Deprovision.type] =
    extractRequest[Deprovision.type](requestTag)(extractTypeOnly("deprovision", Deprovision))

  implicit val appDynamicsDeprovisionWrites: Writes[Deprovision.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "deprovision"))

  implicit val appDynamicsRequestReads: Reads[Request] = {
    val pr = appDynamicsProvisionReads.asInstanceOf[Reads[Request]]
    val ar = appDynamicsAvailableReads.asInstanceOf[Reads[Request]]
    val de = appDynamicsDeprovisionReads.asInstanceOf[Reads[Request]]
    extractRequest[Request](requestTag)(pr.orElse(ar).orElse(de))
  }

  implicit val appDynamicsProvisionedWrites: Writes[Provisioned] =
    emitResponse(responseTag, responseSubTag)(in => Json.obj("event" ->
      Json.obj(
        "type" -> JsString("provisioned"),
        "request" -> in.request)))

  implicit val appDynamicsAvailableResponseWrites: Writes[AvailableResponse] =
    emitResponse(responseTag, responseSubTag)(in => Json.obj("event" ->
      Json.obj(
        "type" -> JsString("availableResponse"),
        "result" -> in.result,
        "request" -> in.request)))

  implicit val appDynamicsDeprovisionResponseWrites: Writes[Deprovisioned.type] =
    emitResponse(responseTag, responseSubTag)(in => Json.obj("event" ->
      Json.obj(
        "type" -> JsString("deprovisioned"),
        "request" -> in.request)))

  implicit val appDynamicsErrorResponseWrites: Writes[ErrorResponse] =
    emitResponse(responseTag, responseSubTag)(in => Json.obj("event" ->
      Json.obj(
        "type" -> JsString("error"),
        "message" -> in.message,
        "request" -> in.request)))

  implicit val appDynamicsRequestWrites: Writes[Request] =
    Writes {
      case x: Provision => appDynamicsProvisionWrites.writes(x)
      case x @ Available => appDynamicsAvailableWrites.writes(x)
      case x @ Deprovision => appDynamicsDeprovisionWrites.writes(x)
    }

  implicit val appDynamicsResponseWrites: Writes[Response] =
    Writes {
      case x @ Deprovisioned => appDynamicsDeprovisionResponseWrites.writes(x)
      case x: Provisioned => appDynamicsProvisionedWrites.writes(x)
      case x: AvailableResponse => appDynamicsAvailableResponseWrites.writes(x)
      case x: ErrorResponse => appDynamicsErrorResponseWrites.writes(x)
    }

  def unapply(in: JsValue): Option[Request] = Json.fromJson[Request](in).asOpt
}
