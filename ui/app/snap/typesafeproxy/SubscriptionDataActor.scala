package snap.typesafeproxy

import akka.actor._
import scala.concurrent.duration._
import org.joda.time.DateTime
import play.api.Play.current
import play.api.libs.ws._
import play.api.libs.ws.ning.NingAsyncHttpClientConfigBuilder
import scala.concurrent.Future
import scala.util.{ Try, Success => TSuccess, Failure => TFailure }
import scala.concurrent.ExecutionContext
import java.util.concurrent.TimeoutException
import snap.HttpHelper
import play.api.libs.json._

object SubscriptionDataActor {
  type DoGetSubscriptionData = (AuthenticationStates.AuthenticationData, ActorRef) => Unit

  sealed trait Notification

  sealed trait Response
  case object InvalidAuthentication extends Response
  case class Failure(error: Throwable) extends Response
  case class Success(subscriberData: SubscriberData) extends Response

  sealed trait LocalRequest[Resp] extends Request[Resp]
  case class GetSubscriberData(sendTo: ActorRef) extends LocalRequest[Response] {
    def invalidAuthentication()(implicit sender: ActorRef): Unit = response(InvalidAuthentication)
    def failure(error: Throwable)(implicit sender: ActorRef): Unit = response(Failure(error))
    def success(subscriberData: SubscriberData)(implicit sender: ActorRef): Unit = response(Success(subscriberData))
  }

  def httpGetSubscriptionData(subscriptionDataUrl: String, timeout: FiniteDuration, executionContext: ExecutionContext)(authentication: AuthenticationStates.AuthenticationData, sendTo: ActorRef): Unit = {
    implicit val ec = executionContext
    import SubscriberData._

    def respondWith(result: Response): Unit = sendTo ! result

    val req = HttpHelper.proxyHolder(WS.url(subscriptionDataUrl)
      .withHeaders("Accept" -> "application/json",
        "Cookie" -> authentication.toString)
      .withRequestTimeout(timeout.toMillis.intValue))
    req.get() onComplete {
      case TSuccess(response) => respondWith {
        response.status match {
          case 200 =>
            val j = Json.parse(response.body)
            Success(Json.fromJson[SubscriberData](j).get)
          case 401 => InvalidAuthentication
          case status => Failure(new ProxyFailure(s"Unknown response code: $status"))
        }
      }
      case TFailure(exception) => respondWith {
        exception match {
          case x: TimeoutException => Failure(new ProxyTimeout(s"Fetching subscriber data exceeded timeout ${timeout}", x))
          case e => Failure(new ProxyFailure(s"Failed to fetch subscriber data: ${e.getMessage}", e))
        }
      }
    }

  }

  def props(authentication: AuthenticationStates.AuthenticationData,
    doGetSubscriptionData: SubscriptionDataActor.DoGetSubscriptionData,
    replyTo: ActorRef,
    uiActor: ActorRef): Props =
    Props(new SubscriptionDataActor(authentication, doGetSubscriptionData, replyTo, uiActor))

}

class SubscriptionDataActor(authentication: AuthenticationStates.AuthenticationData,
  doGetSubscriptionData: SubscriptionDataActor.DoGetSubscriptionData,
  replyTo: ActorRef,
  uiActor: ActorRef) extends Actor with ActorLogging {

  def cancel(message: String = "Fetching subscription data canceled by user"): Unit = {
    replyTo ! SubscriptionDataActor.Failure(new ProxyCanceled(message))
    context stop self
  }

  def onFailure(onRetry: () => Unit): Receive = {
    case UIActor.Cancel => cancel()
    case UIActor.Retry => onRetry()
  }

  def awaitResults(): Receive = {
    case UIActor.Cancel => cancel()
    case x: SubscriptionDataActor.Success =>
      replyTo ! x
      uiActor ! UIActor.SubscriptionDataSuccess
      context stop self
    case SubscriptionDataActor.Failure(e: ProxyInvalidCredentials) =>
      uiActor ! UIActor.RetryableRequests.Failure(e.getMessage, self, false)
      replyTo ! SubscriptionDataActor.InvalidAuthentication
      context stop self
    case SubscriptionDataActor.Failure(e: ProxyTimeout) =>
      log.error("Timeout during fetching subscriber data", e)
      uiActor ! UIActor.RetryableRequests.Failure(e.getMessage, self, true)
      context.become(onFailure(() => context.become(runRequest())))
    case x @ SubscriptionDataActor.Failure(e) =>
      log.error("Unknown exception during fetching subscriber data", e)
      uiActor ! UIActor.RetryableRequests.Failure(e.getMessage, self, false)
      replyTo ! x
      context stop self
  }

  def runRequest(): Receive = {
    doGetSubscriptionData(authentication, self)
    uiActor ! UIActor.CancelableRequests.FetchingSubscriptionData(self)
    awaitResults()
  }

  def receive: Receive = runRequest()
}
