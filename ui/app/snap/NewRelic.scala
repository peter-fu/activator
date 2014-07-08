/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package snap

import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Json._
import scala.concurrent.duration._

object NewRelicRequest {
  import RequestHelpers._
  import JsonHelper._

  val requestTag = "NewRelicRequest"
  val responseTag = "NewRelicResponse"

  sealed trait Request {
    def error(message: String): Response =
      ErrorResponse(message, this)
  }
  case object Provision extends Request {
    def response: Response = Provisioned
  }
  case object Available extends Request {
    def response(result: Boolean): Response = AvailableResponse(result, this)
  }
  case class EnableProject(key: String, appName: String) extends Request {
    def response: Response = ProjectEnabled(this)
  }
  case object IsProjectEnabled extends Request {
    def response(result: Boolean): Response = IsProjectEnabledResponse(result, this)
  }

  sealed trait Response {
    def request: Request
  }
  case object Provisioned extends Response {
    final val request: Request = Provision
  }
  case class ErrorResponse(message: String, request: Request) extends Response
  case class AvailableResponse(result: Boolean, request: Request) extends Response
  case class ProjectEnabled(request: Request) extends Response
  case class IsProjectEnabledResponse(result: Boolean, request: Request) extends Response

  implicit val newRelicProvisionReads: Reads[Provision.type] =
    extractRequest[Provision.type](requestTag)(extractTypeOnly("provision", Provision))

  implicit val newRelicIsProjectEnabledReads: Reads[IsProjectEnabled.type] =
    extractRequest[IsProjectEnabled.type](requestTag)(extractTypeOnly("isProjectEnabled", IsProjectEnabled))

  implicit val newRelicProvisionWrites: Writes[Provision.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "provision"))

  implicit val newRelicIsProjectEnabledWrites: Writes[IsProjectEnabled.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "isProjectEnabled"))

  implicit val newRelicAvailableReads: Reads[Available.type] =
    extractRequest[Available.type](requestTag)(extractTypeOnly("available", Available))

  implicit val newRelicAvailableWrites: Writes[Available.type] =
    emitRequest(requestTag)(_ => Json.obj("type" -> "available"))

  implicit val newRelicEnableProjectReads: Reads[EnableProject] =
    extractRequest[EnableProject](requestTag)(extractType("enable")(((__ \ "key").read[String] and
      (__ \ "name").read[String])(EnableProject.apply _)))

  implicit val newRelicEnableProjectWrites: Writes[EnableProject] =
    emitRequest(requestTag)(in => Json.obj("type" -> "enable",
      "key" -> in.key,
      "name" -> in.appName))

  implicit val newRelicRequestReads: Reads[Request] = {
    val pr = newRelicProvisionReads.asInstanceOf[Reads[Request]]
    val ar = newRelicAvailableReads.asInstanceOf[Reads[Request]]
    val epr = newRelicEnableProjectReads.asInstanceOf[Reads[Request]]
    val iper = newRelicIsProjectEnabledReads.asInstanceOf[Reads[Request]]
    extractRequest[Request](requestTag)(pr.orElse(ar).orElse(epr).orElse(iper))
  }

  implicit val newRelicProvisionedWrites: Writes[Provisioned.type] =
    emitResponse(responseTag)(in => Json.obj("type" -> "provisioned",
      "request" -> in.request))

  implicit val newRelicIsProjectEnabledResponseWrites: Writes[IsProjectEnabledResponse] =
    emitResponse(responseTag)(in => Json.obj("type" -> "isProjectEnabledResponse",
      "result" -> in.result,
      "request" -> in.request))

  implicit val newRelicAvailableResponseWrites: Writes[AvailableResponse] =
    emitResponse(responseTag)(in => Json.obj("type" -> "availableResponse",
      "result" -> in.result,
      "request" -> in.request))

  implicit val newRelicProjectEnabledWrites: Writes[ProjectEnabled] =
    emitResponse(responseTag)(in => Json.obj("type" -> "projectEnabled",
      "request" -> in.request))

  implicit val newRelicErrorResponseWrites: Writes[ErrorResponse] =
    emitResponse(responseTag)(in => Json.obj("type" -> "error",
      "message" -> in.message,
      "request" -> in.request))

  implicit val newRelicRequestWrites: Writes[Request] =
    Writes {
      case x: EnableProject => newRelicEnableProjectWrites.writes(x)
      case x @ IsProjectEnabled => newRelicIsProjectEnabledWrites.writes(x)
      case x @ Provision => newRelicProvisionWrites.writes(x)
      case x @ Available => newRelicAvailableWrites.writes(x)
    }

  implicit val newRelicResponseWrites: Writes[Response] =
    Writes {
      case x @ Provisioned => newRelicProvisionedWrites.writes(x)
      case x: IsProjectEnabledResponse => newRelicIsProjectEnabledResponseWrites.writes(x)
      case x: AvailableResponse => newRelicAvailableResponseWrites.writes(x)
      case x: ProjectEnabled => newRelicProjectEnabledWrites.writes(x)
      case x: ErrorResponse => newRelicErrorResponseWrites.writes(x)
    }

  def unapply(in: JsValue): Option[Request] = Json.fromJson[Request](in).asOpt
}
