package snap.typesafeproxy

import akka.actor._
import play.api.libs.json._
import activator._
import scala.concurrent.duration._
import org.joda.time.DateTime
import play.api.Play.current
import play.api.libs.ws._
import play.api.libs.ws.ning.NingAsyncHttpClientConfigBuilder
import scala.concurrent.Future
import scala.util.{ Try, Success, Failure }
import scala.concurrent.ExecutionContext
import java.util.concurrent.TimeoutException
import snap.HttpHelper

sealed trait AuthenticationState
object AuthenticationStates {
  type AuthenticationData = WSCookie

  val emptyAuthentication: AuthenticationData = new WSCookie {
    val domain: String = "domain"
    val expires: Option[Long] = None
    val maxAge: Option[Int] = None
    val name: Option[String] = None
    val path: String = "path"
    val secure: Boolean = true
    def underlying[T]: T = ???
    val value: Option[String] = Some("value")
  }

  case object Unauthenticated extends AuthenticationState
  case class Failure(error: Throwable) extends AuthenticationState
  case class Authenticated(authenticationData: AuthenticationData) extends AuthenticationState
}

object AuthenticationActor {
  type DoAuthenticate = (String, String, ActorRef) => Unit

  def httpDoAuthenticate(authenticationUrl: String, authenticateTimeout: FiniteDuration, executionContext: ExecutionContext)(username: String, password: String, sendTo: ActorRef): Unit = {
    implicit val ec = executionContext

    def respondWith(result: AuthenticationState): Unit = sendTo ! result

    val req = HttpHelper.proxyHolder(WS.url(authenticationUrl)
      .withHeaders("Accept" -> "application/json")
      .withRequestTimeout(authenticateTimeout.toMillis.intValue))
    req.post(Map("email" -> Seq(username), "password" -> Seq(password))) onComplete {
      case Success(response) => respondWith {
        response.status match {
          case 200 => AuthenticationStates.Authenticated(response.cookie("PLAY_SESSION").get)
          case 401 => AuthenticationStates.Failure(new ProxyInvalidCredentials("Invalid login credentials"))
          case 400 => AuthenticationStates.Failure(new ProxyInvalidCredentials("Missing email or password"))
          case status => AuthenticationStates.Failure(new ProxyFailure("Unknown response code: $status"))
        }
      }
      case Failure(exception) => respondWith {
        exception match {
          case x: TimeoutException => AuthenticationStates.Failure(new ProxyTimeout(s"Authentication exceeded timeout ${authenticateTimeout}", x))
          case e => AuthenticationStates.Failure(new ProxyFailure(s"Authentication failure: ${e.getMessage}", e))
        }
      }
    }

  }

  def props(doAuthenticate: DoAuthenticate, replyTo: ActorRef, uiActor: ActorRef, initMessage: Option[String]): Props =
    Props(new AuthenticationActor(doAuthenticate, replyTo, uiActor, initMessage))

}

class AuthenticationActor(doAuthenticate: AuthenticationActor.DoAuthenticate, replyTo: ActorRef, uiActor: ActorRef, initMessage: Option[String]) extends Actor with ActorLogging {
  import AuthenticationActor._
  import TypesafeComProxy._

  def cancel(message: String = "Authentication canceled by user"): Unit = {
    replyTo ! AuthenticationStates.Failure(new ProxyCanceled(message))
    context stop self
  }

  def onFailure(onRetry: () => Unit): Receive = {
    case UIActor.Cancel => cancel()
    case UIActor.Retry => onRetry()
  }

  def authenticating(username: String, password: String): Receive = {
    uiActor ! UIActor.CancelableRequests.Authenticating(self)
    doAuthenticate(username, password, self)

    {
      case UIActor.Cancel => cancel()
      case x: AuthenticationStates.Authenticated =>
        replyTo ! x
        uiActor ! UIActor.AuthenticationSuccess
        context stop self
      case AuthenticationStates.Failure(e: ProxyInvalidCredentials) =>
        uiActor ! UIActor.RetryableRequests.Failure(e.getMessage, self, true)
        context.become(onFailure(() => context.become(run())))
      case AuthenticationStates.Failure(e: ProxyTimeout) =>
        log.error("Timeout during authentication", e)
        uiActor ! UIActor.RetryableRequests.Failure(e.getMessage, self, true)
        context.become(onFailure(() => context.become(authenticating(username, password))))
      case x @ AuthenticationStates.Failure(e) =>
        log.error("Unknown exception during authentication", e)
        uiActor ! UIActor.RetryableRequests.Failure(e.getMessage, self, false)
        replyTo ! x
        context stop self
    }
  }

  def awaitCredentials(): Receive = {
    def onCredentialsResponse(msg: UIActor.CredentialsResponse): Unit = msg match {
      case UIActor.Credentials(username, password) =>
        context.become(authenticating(username, password))
      case UIActor.Cancel => cancel()
    }

    {
      case x: UIActor.CredentialsResponse => onCredentialsResponse(x)
    }

  }

  def run(message: Option[String] = None): Receive = {
    uiActor ! UIActor.CancelableRequests.RequestCredentials(self, message)
    awaitCredentials()
  }

  def receive: Receive = run(initMessage)

}
