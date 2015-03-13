package snap.typesafeproxy

import akka.actor._

import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Json._

// This is an abstract protocol used to communicate to the front-end
object UIActor {
  case class ProxyActor(proxy: ActorRef)

  sealed trait Notification
  case object AuthenticationSuccess extends Notification
  case object SubscriptionDataSuccess extends Notification

  sealed trait Response

  sealed trait CancelableResponse extends Response
  sealed trait RetryableResponse extends Response

  sealed trait CredentialsResponse extends CancelableResponse
  sealed trait FailureResponse extends RetryableResponse
  case object Cancel extends CredentialsResponse with FailureResponse
  case object Retry extends FailureResponse
  case class Credentials(username: String, password: String) extends CredentialsResponse

  sealed trait LocalRequest[+Resp] extends Request[Resp]

  sealed trait CancelableRequest[T <: CancelableResponse] extends LocalRequest[T] {
    def cancel()(implicit sender: ActorRef): Unit = response(Cancel)
  }
  sealed trait RetryableRequest[T <: RetryableResponse] extends LocalRequest[T] {
    def cancel()(implicit sender: ActorRef): Unit = response(Cancel)
    def retry()(implicit sender: ActorRef): Unit = response(Retry)
  }

  object CancelableRequests {
    case class RequestCredentials(sendTo: ActorRef, message: Option[String] = None) extends CancelableRequest[CredentialsResponse] {
      def credentials(username: String, password: String)(implicit sender: ActorRef): Unit =
        response(Credentials(username, password))
    }

    case class Authenticating(sendTo: ActorRef) extends CancelableRequest[Nothing]

    case class FetchingSubscriptionData(sendTo: ActorRef) extends CancelableRequest[Nothing]
  }

  object RetryableRequests {
    case class Failure(message: String, sendTo: ActorRef, retryable: Boolean) extends RetryableRequest[Nothing]
  }

  sealed trait WebsocketMessage
  object WebsocketMessages {
    import snap.RequestHelpers._
    import snap.JsonHelper._
    import SubscriberData._

    val requestTag = "TypesafeComProxy"
    val responseTag = requestTag

    sealed trait Outbound extends WebsocketMessage
    sealed trait Inbound extends WebsocketMessage

    case class RequestCredentials(message: Option[String]) extends Outbound
    case object Authenticating extends Outbound
    case object FetchingSubscriptionData extends Outbound
    case class Failure(message: String, retryable: Boolean) extends Outbound
    case object AuthenticationSuccess extends Outbound
    case object SubscriptionDataSuccess extends Outbound
    case object NotASubscriber extends Outbound
    case class SubscriptionDetails(data: SubscriberData) extends Outbound

    case object GetSubscriptionDetail extends Inbound
    case class Credentials(username: String, password: String) extends Inbound
    case object Cancel extends Inbound
    case object Retry extends Inbound

    implicit val websocketInboundMessageReads: Reads[Inbound] =
      extractMessage[Inbound](requestTag)(new Reads[Inbound] {
        def reads(in: JsValue): JsResult[Inbound] = (in \ "type") match {
          case JsString("getSubscriptionDetail") => JsSuccess(GetSubscriptionDetail)
          case JsString("cancel") => JsSuccess(Cancel)
          case JsString("retry") => JsSuccess(Retry)
          case JsString("credentials") =>
            ((__ \ "username").read[String] and (__ \ "password").read[String])(Credentials.apply _).reads(in)
          case x => JsError(s"expected one of 'cancel', 'retry' or 'credentials', got $x")
        }
      })

    implicit val websocketOutboundMessageWrites: Writes[Outbound] =
      emitMessage(responseTag)(_ match {
        case RequestCredentials(None) => Json.obj("type" -> "requestCredentials")
        case RequestCredentials(Some(m)) => Json.obj("type" -> "requestCredentials", "message" -> m)
        case Authenticating => Json.obj("type" -> "authenticating")
        case FetchingSubscriptionData => Json.obj("type" -> "fetchingSubscriptionData")
        case x: Failure => Json.obj("type" -> "failure", "message" -> x.message, "retryable" -> x.retryable)
        case AuthenticationSuccess => Json.obj("type" -> "authenticationSuccess")
        case SubscriptionDataSuccess => Json.obj("type" -> "subscriptionDataSuccess")
        case NotASubscriber => Json.obj("type" -> "notASubscriber")
        case x: SubscriptionDetails => Json.obj("type" -> "subscriptionDetails", "data" -> x.data)
      })

    object Inbound {
      def unapply(in: JsValue): Option[Inbound] = Json.fromJson[Inbound](in).asOpt
    }

    object Outbound {
      def unapply(in: Any): Option[Outbound] = in match {
        case x: Outbound => Some(x)
        case _ => None
      }
    }
  }

  def props(websocketsActor: ActorRef): Props = Props(new UIActor(websocketsActor))

}

class UIActor(websocketsActor: ActorRef) extends Actor with ActorLogging {
  import UIActor._

  def run(outstanding: Option[LocalRequest[_]], proxy: ActorRef): Receive = {
    def runWith(outstanding: Option[LocalRequest[_]]): Unit =
      context.become(run(outstanding, proxy))

    {
      // Outbound
      case x: CancelableRequests.RequestCredentials =>
        websocketsActor ! WebsocketMessages.RequestCredentials(x.message)
        runWith(Some(x))
      case x: CancelableRequests.Authenticating =>
        websocketsActor ! WebsocketMessages.Authenticating
        runWith(Some(x))
      case x: CancelableRequests.FetchingSubscriptionData =>
        websocketsActor ! WebsocketMessages.FetchingSubscriptionData
        runWith(Some(x))
      case x: RetryableRequests.Failure =>
        websocketsActor ! WebsocketMessages.Failure(x.message, x.retryable)
        runWith(Some(x))
      case AuthenticationSuccess =>
        websocketsActor ! WebsocketMessages.AuthenticationSuccess
        runWith(None)
      case SubscriptionDataSuccess =>
        websocketsActor ! WebsocketMessages.SubscriptionDataSuccess
        runWith(None)
      case _: TypesafeComProxy.SubscriptionResponses.NotASubscriber =>
        websocketsActor ! WebsocketMessages.NotASubscriber
        runWith(None)
      case TypesafeComProxy.SubscriptionResponses.Failure(e: ProxyCanceled) =>
        websocketsActor ! WebsocketMessages.Failure(s"User canceled operation", false)
        runWith(None)
      case TypesafeComProxy.SubscriptionResponses.Failure(e) =>
        websocketsActor ! WebsocketMessages.Failure(s"An unexpected error occurred fetching subscriber data ${e.getMessage}", false)
        runWith(None)
      case x: TypesafeComProxy.SubscriptionResponses.Detail =>
        websocketsActor ! WebsocketMessages.SubscriptionDetails(x.value)
        runWith(None)

      // Inbound
      case WebsocketMessages.GetSubscriptionDetail =>
        proxy ! TypesafeComProxy.SubscriptionRequests.GetSubscriptionDetail(self)
        runWith(None)
      case WebsocketMessages.Credentials(un, pw) =>
        outstanding match {
          case Some(x: CancelableRequests.RequestCredentials) => x.credentials(un, pw)
          case _ =>
        }
        runWith(None)
      case WebsocketMessages.Cancel =>
        outstanding match {
          case Some(x: CancelableRequest[_]) => x.cancel()
          case Some(x: RetryableRequest[_]) => x.cancel()
          case _ =>
        }
        runWith(None)
      case WebsocketMessages.Retry =>
        outstanding match {
          case Some(x: RetryableRequest[_]) => x.retry()
          case _ =>
        }
        runWith(None)
    }
  }

  def awaitingProxyActor: Receive = {
    case ProxyActor(p) =>
      context.become(run(None, p))
  }

  def receive: Receive = awaitingProxyActor
}
