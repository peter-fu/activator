package snap.typesafeproxy

import akka.actor._
import com.typesafe.config.{ Config => TSConfig }
import scala.concurrent.duration._
import java.util.concurrent.TimeUnit

object TypesafeComProxy {
  sealed trait Notification

  sealed trait Response
  sealed trait SubscriptionResponse[+T] extends Response

  object SubscriptionResponses {
    case class NotASubscriber(value: SubscriberData.NotASubscriber) extends SubscriptionResponse[Nothing]
    case class Failure(error: Throwable) extends SubscriptionResponse[Nothing]
    case class Detail(value: SubscriberData.Detail) extends SubscriptionResponse[Detail]
  }

  sealed trait LocalRequest[Resp] extends Request[Resp]
  sealed trait SubscriptionRequest[T] extends LocalRequest[SubscriptionResponse[T]] {
    def notASubscriber(value: SubscriberData.NotASubscriber)(implicit sender: ActorRef): Unit = response(SubscriptionResponses.NotASubscriber(value))
    def failure(error: Throwable)(implicit sender: ActorRef): Unit = response(SubscriptionResponses.Failure(error))
    final def replyUsingSubscriberData(subscriberData: SubscriberData)(implicit sender: ActorRef): Unit = subscriberData match {
      case x: SubscriberData.NotASubscriber => notASubscriber(x)
      case x: SubscriberData.Detail => replyUsingDetailSubscriberData(x)
    }
    def replyUsingDetailSubscriberData(detail: SubscriberData.Detail)(implicit sender: ActorRef): Unit
  }

  object SubscriptionRequests {
    case class GetSubscriptionDetail(sendTo: ActorRef) extends SubscriptionRequest[SubscriptionResponses.Detail] {
      def subscriptionDetail(value: SubscriberData.Detail)(implicit sender: ActorRef): Unit = response(SubscriptionResponses.Detail(value))
      def replyUsingDetailSubscriberData(detail: SubscriberData.Detail)(implicit sender: ActorRef): Unit = subscriptionDetail(detail)
    }
  }

  sealed trait RpcEndpoint {
    def url: String
    def timeout: FiniteDuration
  }

  case class LoginConfig(url: String, timeout: FiniteDuration) extends RpcEndpoint
  case class SubscriptionConfig(url: String, timeout: FiniteDuration) extends RpcEndpoint

  case class Config(login: LoginConfig, subscriptionData: SubscriptionConfig)

  def withTypesafeComConfig[T](in: TSConfig)(body: TSConfig => T): T = {
    val c = in.getConfig("activator.typesafe-com-proxy")
    body(c)
  }

  def fromConfig(in: TSConfig): Config = {
    withTypesafeComConfig(in) { configRoot =>
      val login = configRoot.getConfig("login")
      val subscriptionData = configRoot.getConfig("subscriber-data")
      Config(login = LoginConfig(login.getString("url"), login.getDuration("timeout", TimeUnit.MILLISECONDS).intValue.millis),
        subscriptionData = SubscriptionConfig(subscriptionData.getString("url"), subscriptionData.getDuration("timeout", TimeUnit.MILLISECONDS).intValue.millis))
    }
  }

  def props(initAuth: AuthenticationState,
    initUserProps: UserProperties,
    uiActor: ActorRef,
    authenticatorProps: (ActorRef, ActorRef, Option[String]) => Props,
    subscriptionRPCProps: (AuthenticationStates.AuthenticationData, ActorRef, ActorRef) => Props,
    notificationSink: TypesafeComProxy.Notification => Unit = _ => ()): Props =
    Props(new TypesafeComProxy(initAuth, initUserProps, uiActor, authenticatorProps, subscriptionRPCProps, notificationSink))
}

class TypesafeComProxy(initAuth: AuthenticationState,
  initUserProps: UserProperties,
  uiActor: ActorRef,
  authenticatorProps: (ActorRef, ActorRef, Option[String]) => Props,
  subscriptionRPCProps: (AuthenticationStates.AuthenticationData, ActorRef, ActorRef) => Props,
  notificationSink: TypesafeComProxy.Notification => Unit) extends Actor with ActorLogging {
  import TypesafeComProxy._

  def doAuthenticate(message: Option[String] = None): Unit = {
    context.actorOf(authenticatorProps(self, uiActor, message))
  }

  def awaitingAuthentication(pendingRequests: Set[SubscriptionRequest[_]], userProps: UserProperties): Receive = {
    def onSubscriptionRequest(msg: SubscriptionRequest[_]): Unit = userProps.subscriberData match {
      case Some(sd) => msg.replyUsingSubscriberData(sd)
      case None =>
        context.become(awaitingAuthentication(pendingRequests + msg, userProps))
    }

    def onAuthenticationResult(msg: AuthenticationState): Unit = msg match {
      case x @ AuthenticationStates.Unauthenticated =>
        pendingRequests.foreach(_.failure(new ProxyFailure("Failed to authenticate")))
        context.become(run(x, userProps))
      case x: AuthenticationStates.Failure =>
        pendingRequests.foreach(_.failure(x.error))
        context.become(run(x, userProps))
      case x: AuthenticationStates.Authenticated =>
        pendingRequests.foreach(x => self ! x)
        context.become(run(x, userProps))
    }

    {
      case x: SubscriptionRequest[_] => onSubscriptionRequest(x)
      case x: AuthenticationState => onAuthenticationResult(x)
    }
  }

  def getSubscriptionData(auth: AuthenticationState, pendingRequests: Set[SubscriptionRequest[_]], userProps: UserProperties): Unit = auth match {
    case AuthenticationStates.Authenticated(authenticationData) =>
      context.actorOf(subscriptionRPCProps(authenticationData, self, uiActor))
      context.become(awaitingSubscriptionResult(auth, pendingRequests, userProps))
    case _ =>
      doAuthenticate()
      context.become(awaitingAuthentication(pendingRequests, userProps))
  }

  def awaitingSubscriptionResult(auth: AuthenticationState, pendingRequests: Set[SubscriptionRequest[_]], userProps: UserProperties): Receive = {
    def onSubscriptionRequest(msg: SubscriptionRequest[_]): Unit = context.become(awaitingSubscriptionResult(auth, pendingRequests + msg, userProps))

    def onSubscriptionResult(msg: SubscriptionDataActor.Response): Unit = msg match {
      case SubscriptionDataActor.InvalidAuthentication =>
        doAuthenticate(Some("Existing credentials are invalid.  Please login again."))
        context.become(awaitingAuthentication(pendingRequests, userProps))
      case x: SubscriptionDataActor.Failure =>
        pendingRequests.foreach(_.failure(x.error))
        context.become(run(auth, userProps))
      case SubscriptionDataActor.Success(subscriberData) =>
        context.become(run(auth, userProps.copy(subscriberData = Some(subscriberData))))
        pendingRequests.foreach(_.replyUsingSubscriberData(subscriberData))
    }

    {
      case x: SubscriptionRequest[_] => onSubscriptionRequest(x)
      case x: SubscriptionDataActor.Response => onSubscriptionResult(x)
    }
  }

  def run(auth: AuthenticationState, userProps: UserProperties): Receive = {
    def onSubscriptionRequest(msg: SubscriptionRequest[_]): Unit = userProps.subscriberData match {
      case Some(sd) => msg.replyUsingSubscriberData(sd)
      case None => getSubscriptionData(auth, Set(msg), userProps)
    }

    {
      case x: SubscriptionRequest[_] => onSubscriptionRequest(x)
    }
  }

  def receive: Receive = {
    uiActor ! UIActor.ProxyActor(self)

    run(initAuth, initUserProps)
  }
}
