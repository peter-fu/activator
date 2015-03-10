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

}
