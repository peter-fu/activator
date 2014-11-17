/**
 * Copyright (C) 2014 Typesafe <http://typesafe.com/>
 */

package monitor

import java.io.File

import akka.actor.{ ActorRef, _ }
import akka.event.LoggingAdapter
import snap.{ NewRelic => NR }

import scala.concurrent.ExecutionContext
import scala.util.{ Failure, Success }

object NewRelic {
  def props(config: NR.Config,
    executionContext: ExecutionContext): Props =
    Props(new NewRelic(new Underlying(config)(_)(executionContext)))

  def unapply(in: Any): Option[Request] = in match {
    case r: Request => Some(r)
    case _ => None
  }

  sealed trait Request {
    def error(message: String): Response =
      ErrorResponse(message, this)
  }

  case class Provision(notificationSink: ActorRef) extends Request {
    def response: Response = Provisioned(this)
  }

  case object Deprovision extends Request {
    def response: Response = Deprovisioned
  }

  case object Available extends Request {
    def response(result: Boolean): Response = AvailableResponse(result, this)
  }

  case class EnableProject(destination: File, key: String, appName: String) extends Request {
    def response: Response = ProjectEnabled(this)
  }

  case class IsProjectEnabled(destination: File) extends Request {
    def response(result: Boolean): Response = IsProjectEnabledResult(result, this)
  }

  case object IsSupportedJavaVersion extends Request {
    def response(result: Boolean, version: String): Response = IsSupportedJavaVersionResult(result, version, this)
  }

  case class InternalGenerateFiles(location: String, appConfig: File) extends Request {
    def response = InternalGenerateFilesResult(this)
  }

  sealed trait Response {
    def request: Request
  }
  case class Provisioned(request: Provision) extends Response
  case object Deprovisioned extends Response {
    val request: Request = Deprovision
  }
  case class ErrorResponse(message: String, request: Request) extends Response
  case class AvailableResponse(result: Boolean, request: Request) extends Response
  case class ProjectEnabled(request: Request) extends Response
  case class IsProjectEnabledResult(result: Boolean, request: Request) extends Response
  case class IsSupportedJavaVersionResult(result: Boolean, version: String, request: Request) extends Response
  case class InternalGenerateFilesResult(request: Request) extends Response

  class Underlying(config: NR.Config)(log: LoggingAdapter)(implicit ec: ExecutionContext) {
    import monitor.Provisioning._

    def reportError(error: Throwable, message: String, request: Request, sender: ActorRef): Unit = {
      log.error(error, message)
      sender ! request.error(message)
    }

    def onMessage(request: Request, sender: ActorRef, self: ActorRef, context: ActorContext): Unit = request match {
      case r @ Provision(sink) =>
        val ns = actorWrapper(sink)
        provision(
          simpleDownloadExecutor(defaultWSClient,
            config.url, ns, config.timeout),
          config.verifyFile,
          config.extractRoot(), ns) onComplete {
            case Success(_) => sender ! r.response
            case Failure(error) =>
              reportError(error, s"Error processing provisioning request: ${error.getMessage}", r, sender)
          }
      case r @ Deprovision => try {
        NR.deprovision(config.extractRoot())
        sender ! r.response
      } catch {
        case e: Exception =>
          log.error(e, "Failure deprovisioning AppDynamics")
          sender ! r.error(s"Failure deprovisioning AppDynamics: ${e.getMessage}")
      }
      case r @ Available => try {
        sender ! r.response(NR.hasNewRelic(config.extractRoot()))
      } catch {
        case e: Exception =>
          log.error(e, "Failure during New Relic availability check")
          sender ! r.error(s"Failure during New Relic availability check: ${e.getMessage}")
      }
      case r @ EnableProject(destination, key, name) => try {
        NR.provisionNewRelic(config.extractRoot(), destination, key, name)
        sender ! r.response
      } catch {
        case e: Exception =>
          log.error(e, "Failure during enabling project")
          sender ! r.error(s"Failure during enabling project: ${e.getMessage}")
      }
      case r @ IsProjectEnabled(destination) => try {
        sender ! r.response(NR.isProjectEnabled(destination))
      } catch {
        case e: Exception =>
          log.error(e, "Failure testing if project enabled for New Relic")
          sender ! r.error(s"Failure testing if project enabled for New Relic: ${e.getMessage}")
      }
      case r @ IsSupportedJavaVersion => try {
        val version = System.getProperty("java.version")
        sender ! r.response(config.supportJavaVersionsPattern.matcher(version).matches(), version)
      } catch {
        case e: Exception =>
          log.error(e, "Failure checking for supported Java version for New Relic")
          sender ! r.error(s"Failure checking for supported Java version for New Relic: ${e.getMessage}")
      }
      case r @ InternalGenerateFiles(location, root) => try {
        NR.generateFiles(location, config, context.system.settings.config, root)
        sender ! r.response
      } catch {
        case e: Exception =>
          log.error(e, "Failure creating sbt files required for New Relic support")
          sender ! r.error(s"Failure creating sbt files required for New Relic support: ${e.getMessage}")
      }
    }
  }
}

class NewRelic(newRelicBuilder: LoggingAdapter => NewRelic.Underlying) extends Actor with ActorLogging {
  val newRelic = newRelicBuilder(log)

  def receive: Receive = {
    case r: NewRelic.Request => newRelic.onMessage(r, sender, self, context)
  }
}
