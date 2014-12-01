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
  case class Provision(username: monitor.AppDynamicsActor.Username, password: monitor.AppDynamicsActor.Password) extends Request {
    def response: Response = Provisioned(this)
  }
  case object Available extends Request {
    def response(result: Boolean): Response = AvailableResponse(result, this)
  }
  case object ProjectEnabled extends Request {
    def response(result: Boolean): Response = ProjectEnabledResponse(result, this)
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
  case class ProjectEnabledResponse(result: Boolean, request: Request) extends Response
  case object Deprovisioned extends Response {
    val request: Request = Deprovision
  }
  case class GeneratedFiles(request: Request) extends Response

  case class GenerateFiles(
    location: String,
    applicationName: String,
    nodeName: String,
    tierName: String,
    accountName: String,
    accessKey: String,
    hostName: String,
    port: String,
    sslEnabled: Boolean) extends Request {
    def response: Response = GeneratedFiles(this)
  }

  implicit val appDynamicsProvisionReads: Reads[Provision] =
    extractRequest[Provision](requestTag)(extractType("provision")(((__ \ "username").read[String] and
      (__ \ "password").read[String])((u, p) => Provision.apply(monitor.AppDynamicsActor.Username(u), monitor.AppDynamicsActor.Password(p)))))

  implicit val appDynamicsProvisionWrites: Writes[Provision] =
    emitRequest(requestTag)(p => Json.obj("type" -> "provision", "username" -> p.username.value, "password" -> p.password.value))

  implicit val appDynamicsAvailableReads: Reads[Available.type] =
    extractRequest[Available.type](requestTag)(extractTypeOnly("available", Available))

  implicit val appDynamicsAvailableWrites: Writes[Available.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "available"))

  implicit val appDynamicsProjectEnabledReads: Reads[ProjectEnabled.type] =
    extractRequest[ProjectEnabled.type](requestTag)(extractTypeOnly("isProjectEnabled", ProjectEnabled))

  implicit val appDynamicsProjectEnabledWrites: Writes[ProjectEnabled.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "isProjectEnabled"))

  implicit val appDynamicsDeprovisionReads: Reads[Deprovision.type] =
    extractRequest[Deprovision.type](requestTag)(extractTypeOnly("deprovision", Deprovision))

  implicit val appDynamicsDeprovisionWrites: Writes[Deprovision.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "deprovision"))

  implicit val appDynamicsGenerateFilesReads: Reads[GenerateFiles] =
    extractRequest[GenerateFiles](requestTag)(extractType("generateFiles")((
      (__ \ "location").read[String] and
      (__ \ "applicationName").read[String] and
      (__ \ "nodeName").read[String] and
      (__ \ "tierName").read[String] and
      (__ \ "accountName").read[String] and
      (__ \ "accessKey").read[String] and
      (__ \ "hostName").read[String] and
      (__ \ "port").read[String] and
      (__ \ "sslEnabled").read[Boolean])(GenerateFiles.apply _)))

  implicit val appDynamicsGenerateFilesWrites: Writes[GenerateFiles] =
    emitRequest(requestTag)(in => Json.obj("type" -> "generateFiles", "location" -> in.location))

  implicit val appDynamicsRequestReads: Reads[Request] = {
    val pr = appDynamicsProvisionReads.asInstanceOf[Reads[Request]]
    val ar = appDynamicsAvailableReads.asInstanceOf[Reads[Request]]
    val de = appDynamicsDeprovisionReads.asInstanceOf[Reads[Request]]
    val gf = appDynamicsGenerateFilesReads.asInstanceOf[Reads[Request]]
    val pe = appDynamicsProjectEnabledReads.asInstanceOf[Reads[Request]]
    extractRequest[Request](requestTag)(pr.orElse(ar).orElse(de).orElse(gf).orElse(pe))
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

  implicit val appDynamicsProjectEnabledResponseWrites: Writes[ProjectEnabledResponse] =
    emitResponse(responseTag, responseSubTag)(in => Json.obj("event" ->
      Json.obj(
        "type" -> JsString("projectEnabledResponse"),
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

  implicit val appDynamicsGeneratedFilesWrites: Writes[GeneratedFiles] =
    emitResponse(responseTag, responseSubTag)(in => Json.obj("event" ->
      Json.obj(
        "type" -> "generatedFiles",
        "request" -> in.request)))

  implicit val appDynamicsRequestWrites: Writes[Request] =
    Writes {
      case x: Provision => appDynamicsProvisionWrites.writes(x)
      case x @ Available => appDynamicsAvailableWrites.writes(x)
      case x @ Deprovision => appDynamicsDeprovisionWrites.writes(x)
      case x: GenerateFiles => appDynamicsGenerateFilesWrites.writes(x)
      case x @ ProjectEnabled => appDynamicsProjectEnabledWrites.writes(x)
    }

  implicit val appDynamicsResponseWrites: Writes[Response] =
    Writes {
      case x @ Deprovisioned => appDynamicsDeprovisionResponseWrites.writes(x)
      case x: Provisioned => appDynamicsProvisionedWrites.writes(x)
      case x: AvailableResponse => appDynamicsAvailableResponseWrites.writes(x)
      case x: ErrorResponse => appDynamicsErrorResponseWrites.writes(x)
      case x: GeneratedFiles => appDynamicsGeneratedFilesWrites.writes(x)
      case x: ProjectEnabledResponse => appDynamicsProjectEnabledResponseWrites.writes(x)
    }

  def unapply(in: JsValue): Option[Request] = Json.fromJson[Request](in).asOpt
}
