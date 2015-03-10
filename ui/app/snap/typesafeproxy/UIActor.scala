package snap.typesafeproxy

import akka.actor._

// This is an abstract protocol used to communicate to the front-end
object UIActor {
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
    case class RequestCredentials(sendTo: ActorRef) extends CancelableRequest[CredentialsResponse] {
      def credentials(username: String, password: String)(implicit sender: ActorRef): Unit =
        response(Credentials(username, password))
    }

    case class Authenticating(sendTo: ActorRef) extends CancelableRequest[Nothing]

    case class FetchingSubscriptionData(sendTo: ActorRef) extends CancelableRequest[Nothing]
  }

  object RetryableRequests {
    case class Failure(message: String, sendTo: ActorRef, retryable: Boolean) extends RetryableRequest[Nothing]
  }

  object WebsocketMessages {
    case object RequestCredentials
    case object Authenticating
    case object FetchingSubscriptionData
    case class Failure(message: String, retryable: Boolean)
    case object AuthenticationSuccess
    case object SubscriptionDataSuccess
    case class Credentials(username: String, password: String)
    case object Cancel
    case object Retry
  }

  def props(websocketsActor: ActorRef): Props = Props(new UIActor(websocketsActor))

}

class UIActor(websocketsActor: ActorRef) extends Actor with ActorLogging {
  import UIActor._

  def run(outstanding: Option[LocalRequest[_]]): Receive = {
    case x: CancelableRequests.RequestCredentials =>
      websocketsActor ! WebsocketMessages.RequestCredentials
      context.become(run(Some(x)))
    case x: CancelableRequests.Authenticating =>
      websocketsActor ! WebsocketMessages.Authenticating
      context.become(run(Some(x)))
    case x: CancelableRequests.FetchingSubscriptionData =>
      websocketsActor ! WebsocketMessages.FetchingSubscriptionData
      context.become(run(Some(x)))
    case x: RetryableRequests.Failure =>
      websocketsActor ! WebsocketMessages.Failure(x.message, x.retryable)
      context.become(run(Some(x)))
    case AuthenticationSuccess =>
      websocketsActor ! WebsocketMessages.AuthenticationSuccess
      context.become(run(None))
    case SubscriptionDataSuccess =>
      websocketsActor ! WebsocketMessages.SubscriptionDataSuccess
      context.become(run(None))
    case WebsocketMessages.Credentials(un, pw) =>
      outstanding match {
        case Some(x: CancelableRequests.RequestCredentials) => x.credentials(un, pw)
        case _ =>
      }
      context.become(run(None))
    case WebsocketMessages.Cancel =>
      outstanding match {
        case Some(x: CancelableRequest[_]) => x.cancel()
        case Some(x: RetryableRequest[_]) => x.cancel()
        case _ =>
      }
      context.become(run(None))
    case WebsocketMessages.Retry =>
      outstanding match {
        case Some(x: RetryableRequest[_]) => x.retry()
        case _ =>
      }
      context.become(run(None))
  }

  def receive: Receive = run(None)
}
