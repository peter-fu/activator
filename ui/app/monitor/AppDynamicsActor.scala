/**
 * Copyright (C) 2014 Typesafe <http://typesafe.com/>
 */

package monitor

import akka.actor._
import java.io.File
import akka.util.Timeout
import snap.HttpHelper._
import scala.concurrent.duration._
import monitor.Provisioning.{ StatusNotifier, DownloadPrepExecutor }
import play.api.libs.ws.{ WSClient, WSResponse, WSRequestHolder, WSCookie }
import snap.{ InstrumentationRequestTypes, AppDynamics }
import scala.util.{ Success, Failure }
import scala.concurrent.{ Future, ExecutionContext }
import akka.event.LoggingAdapter

object AppDynamicsActor {
  def props(config: AppDynamics.Config,
    executionContext: ExecutionContext): Props =
    Props(new AppDynamicsActor(new Underlying(config)(_)(executionContext)))

  def unapply(in: Any): Option[InternalRequest] = in match {
    case r: InternalRequest => Some(r)
    case _ => None
  }

  sealed class Username private[AppDynamicsActor] (val value: String)
  sealed class Password private[AppDynamicsActor] (val value: String)

  object Username {
    def apply(in: String): Username = {
      val v = in.trim()
      assert(v.nonEmpty, "Username may not be empty")
      new Username(v)
    }
  }

  object Password {
    def apply(in: String): Password = {
      val v = in.trim()
      assert(v.nonEmpty, "Password may not be empty")
      new Password(v)
    }
  }
  sealed trait InternalRequest {
    def error(message: String): InternalResponse =
      InternalErrorResponse(message, this)
  }
  case class InternalProvision(notificationSink: ActorRef, username: Username, password: Password) extends InternalRequest {
    def response: InternalResponse = Provisioned(this)
  }
  case object InternalDeprovision extends InternalRequest {
    def response: InternalResponse = Deprovisioned
  }
  case object InternalAvailable extends InternalRequest {
    def response(result: Boolean): InternalResponse = InternalAvailableResponse(result, this)
  }
  case class InternalProjectEnabled(destination: File) extends InternalRequest {
    def response(result: Boolean): InternalResponse = InternalProjectEnabledResponse(result, this)
  }

  sealed trait InternalResponse {
    def request: InternalRequest
  }
  case class Provisioned(request: InternalProvision) extends InternalResponse
  case object Deprovisioned extends InternalResponse {
    val request: InternalRequest = InternalDeprovision
  }
  case class InternalErrorResponse(message: String, request: InternalRequest) extends InternalResponse
  case class InternalAvailableResponse(result: Boolean, request: InternalRequest) extends InternalResponse
  case class InternalProjectEnabledResponse(result: Boolean, request: InternalRequest) extends InternalResponse
  case class InternalGenerateFilesResult(request: InternalRequest) extends InternalResponse
  case class InternalGenerateFiles(location: String, appDynamicSettings: InstrumentationRequestTypes.AppDynamics) extends InternalRequest {
    def response = InternalGenerateFilesResult(this)
  }

  private def serializeCookie(in: WSCookie): String = {
    (in.name, in.value) match {
      case (Some(n), Some(v)) => s"$n=$v"
      case (None, Some(v)) => v
      case _ => ""
    }
  }

  trait Credentials {
    def apply(request: WSRequestHolder)(implicit ec: ExecutionContext): Future[WSResponse]
    def failureDiagnostics: String
  }

  case class UsernamePasswordCredentials(username: String, password: String, usernameKey: String = "username", passwordKey: String = "password") extends Credentials {
    def apply(request: WSRequestHolder)(implicit ec: ExecutionContext): Future[WSResponse] = request.post(Map(usernameKey -> Seq(username), passwordKey -> Seq(password)))
    def failureDiagnostics: String = s"Username: $username"
  }

  def prepareDownload(client: WSClient,
    credentials: Credentials,
    loginUrl: String,
    downloadUrl: String,
    notificationSink: StatusNotifier,
    timeout: Timeout = Timeout(30.seconds))(implicit ec: ExecutionContext): DownloadPrepExecutor = new DownloadPrepExecutor {
    import Provisioning._
    def execute(): Future[DownloadExecutor] = {
      notificationSink.notify(Authenticating(credentials.failureDiagnostics, loginUrl))
      for {
        login <- credentials(client.url(loginUrl).withFollowRedirects(false).withRequestTimeout(timeout.duration.toMillis.toInt))
        cookies = login.cookies.map(serializeCookie).filter(_.nonEmpty)
        () = if (cookies.isEmpty) throw new AuthenticationException(s"Confirm that you can log into: $loginUrl", credentials.failureDiagnostics, loginUrl)
      } yield {
        val dl = downloadUrl
        new DownloadExecutor {
          def downloadUrl: String = dl
          def execute(): Future[File] =
            retrieveFileHttp(client.url(downloadUrl).withHeaders("Cookie" -> cookies.mkString("; ")).withFollowRedirects(true),
              notificationProgressBuilder(downloadUrl, notificationSink),
              timeout = timeout)
          def failureDiagnostics: String = s"Download url: $downloadUrl"
        }

      }
    }
    def failureDiagnostics: String = credentials.failureDiagnostics
  }

  class Underlying(config: AppDynamics.Config)(log: LoggingAdapter)(implicit ec: ExecutionContext) {
    import Provisioning._

    def onMessage(request: InternalRequest, sender: ActorRef, self: ActorRef, context: ActorContext): Unit = request match {
      case r @ InternalProvision(sink, username, password) =>
        val ns = actorWrapper(sink)
        prepareDownload(defaultWSClient,
          UsernamePasswordCredentials(username.value, password.value),
          config.loginUrl,
          config.url,
          ns,
          config.timeout).execute().flatMap(de => provision(de, config.verifyFile, config.extractRoot(), ns)) onComplete {
            case Success(_) => sender ! r.response
            case Failure(error) =>
              ns.notify(ProvisioningError(s"Failure during provisioning: ${error.getMessage}", error))
          }
      case r @ InternalDeprovision => try {
        AppDynamics.deprovision(config.extractRoot())
        sender ! r.response
      } catch {
        case e: Exception =>
          log.error(e, "Failure deprovisioning AppDynamics")
          sender ! r.error(s"Failure deprovisioning AppDynamics: ${e.getMessage}")
      }
      case r @ InternalAvailable => try {
        val v = AppDynamics.hasAppDynamics(config.extractRoot())
        sender ! r.response(v)
      } catch {
        case e: Exception =>
          log.error(e, "Failure during AppDynamics availability check")
          sender ! r.error(s"Failure during AppDynamics availability check: ${e.getMessage}")
      }
      case r @ InternalProjectEnabled(destination) => try {
        sender ! r.response(AppDynamics.isProjectEnabled(destination))
      } catch {
        case e: Exception =>
          log.error(e, "Failure during AppDynamics enabled check")
          sender ! r.error(s"Failure during AppDynamics enabled check: ${e.getMessage}")
      }
      case r @ InternalGenerateFiles(location, appDynamicsSettings) => try {
        AppDynamics.generateFiles(location, appDynamicsSettings, context.system.settings.config, config)
        sender ! r.response
      } catch {
        case e: Exception =>
          log.error(e, "Failure creating sbt files required for New Relic support")
          sender ! r.error(s"Failure creating sbt files required for New Relic support: ${e.getMessage}")
      }
    }
  }
}

class AppDynamicsActor(appDynamicsBuilder: LoggingAdapter => AppDynamicsActor.Underlying) extends Actor with ActorLogging {
  val appDynamics = appDynamicsBuilder(log)

  def receive: Receive = {
    case r: AppDynamicsActor.InternalRequest => appDynamics.onMessage(r, sender, self, context)
  }
}
