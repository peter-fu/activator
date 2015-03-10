package snap.typesafeproxy

import org.junit._
import org.junit.Assert._
import akka.actor._
import akka.util.Timeout
import scala.concurrent.duration._
import akka.testkit._
import scala.util.Random
import com.typesafe.config.{ ConfigFactory, Config }
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import java.util.concurrent.atomic.AtomicReference

object AkkaTestKitHelper {
  val configString =
    """
      |akka {
      |  loglevel = "OFF"
      |  stdout-loglevel = "OFF"
      |}
    """.stripMargin

  val config = ConfigFactory.parseString(configString)
  def randomActorSystemName: String = s"test-actor-system-${new String(Random.alphanumeric.take(10).toArray)}"

}

class AkkaTestKitHelper(_system: ActorSystem) extends TestKit(_system) with ImplicitSender {
  def this(config: Config) = this(ActorSystem(AkkaTestKitHelper.randomActorSystemName, config))
  def this() = this(AkkaTestKitHelper.config)

  def after() = system.shutdown()

  lazy val name: String = s"test-${new String(Random.alphanumeric.take(10).toArray)}"

  case class FakeAuthenticatorMessage(replyTo: ActorRef, uiActor: ActorRef, message: Any) {
    def reply(reply: Any)(implicit sender: ActorRef): Unit = replyTo.tell(message, sender)
  }

  class FakeAuthenticator(replyTo: ActorRef, uiActor: ActorRef) extends Actor {
    def receive: Receive = {
      uiActor ! UIActor.CancelableRequests.RequestCredentials(self)

      {
        case msg => testActor ! FakeAuthenticatorMessage(replyTo, uiActor, msg)
      }
    }
  }

  case object FakeSubscriptionRPCInit

  case class FakeSubscriptionRPCMessage(authenticationData: AuthenticationStates.AuthenticationData, replyTo: ActorRef, uiActor: ActorRef, message: Any) {
    def reply(reply: Any)(implicit sender: ActorRef): Unit = replyTo.tell(message, sender)
  }

  class FakeSubscriptionRPC(authenticationData: AuthenticationStates.AuthenticationData, replyTo: ActorRef, uiActor: ActorRef) extends Actor {
    def receive: Receive = {
      testActor ! FakeSubscriptionRPCInit

      {
        case msg => testActor ! FakeSubscriptionRPCMessage(authenticationData, replyTo, uiActor, msg)
      }
    }
  }

  def fakeAuthenticatorProps(replyTo: ActorRef, uiActor: ActorRef): Props =
    Props(new FakeAuthenticator(replyTo, uiActor))

  def fakeSubscriptionRPCProps(authenticationData: AuthenticationStates.AuthenticationData, replyTo: ActorRef, uiActor: ActorRef): Props =
    Props(new FakeSubscriptionRPC(authenticationData, replyTo, uiActor))

  def withProxy[T](initAuth: AuthenticationState = AuthenticationStates.Unauthenticated,
    initUserProps: UserProperties = UserProperties(),
    uiActor: ActorRef = testActor,
    authenticatorProps: (ActorRef, ActorRef) => Props = fakeAuthenticatorProps,
    subscriptionRPCProps: (AuthenticationStates.AuthenticationData, ActorRef, ActorRef) => Props = fakeSubscriptionRPCProps,
    notificationSink: TypesafeComProxy.Notification => Unit = _ => ())(body: ActorRef => T): T = {
    val proxy = system.actorOf(TypesafeComProxy.props(initAuth, initUserProps, uiActor, authenticatorProps, subscriptionRPCProps, notificationSink))
    val r = body(proxy)
    system stop proxy
    r
  }

  def authenticationResult(result: AuthenticationState): (String, String, ActorRef) => Unit = { (_, _, sendTo) =>
    sendTo ! result
  }

  def delayedAuthenticationResult(delay: FiniteDuration, result: Option[AuthenticationState] = None): (String, String, ActorRef) => Unit = {
    import ExecutionContext.Implicits.global

    (_, _, sendTo) => {
      Future {
        Thread.sleep(delay.toMillis)
        result.foreach(r => sendTo ! r)
      }
      ()
    }
  }

  def mutableAuthenticationResult(result: AuthenticationState): (AtomicReference[AuthenticationState], (String, String, ActorRef) => Unit) = {
    val ref = new AtomicReference[AuthenticationState](result)
    (ref, (_, _, sendTo) => sendTo ! ref.get())
  }

  def withAuthenticationActor[T](doAuthenticate: AuthenticationActor.DoAuthenticate,
    replyTo: ActorRef = testActor,
    uiActor: ActorRef = testActor)(body: ActorRef => T): T = {
    val authenticator = system.actorOf(AuthenticationActor.props(doAuthenticate, replyTo, uiActor))
    val r = body(authenticator)
    system stop authenticator
    r
  }

  def subscriptionDataResult(result: SubscriptionDataActor.Response): (AuthenticationStates.AuthenticationData, ActorRef) => Unit = { (_, sendTo) =>
    sendTo ! result
  }

  def mutableSubscriptionDataResult(result: SubscriptionDataActor.Response): (AtomicReference[SubscriptionDataActor.Response], (AuthenticationStates.AuthenticationData, ActorRef) => Unit) = {
    val ref = new AtomicReference[SubscriptionDataActor.Response](result)
    (ref, (_, sendTo) => sendTo ! ref.get())
  }

  def delayedSubscriptionDataResult(delay: FiniteDuration, result: Option[SubscriptionDataActor.Response] = None): (AuthenticationStates.AuthenticationData, ActorRef) => Unit = {
    import ExecutionContext.Implicits.global

    (_, sendTo) => {
      Future {
        Thread.sleep(delay.toMillis)
        result.foreach(r => sendTo ! r)
      }
      ()
    }
  }

  def withSubscriptionDataActor[T](doGetSubscriptionData: SubscriptionDataActor.DoGetSubscriptionData,
    authentication: AuthenticationStates.AuthenticationData = AuthenticationStates.emptyAuthentication,
    replyTo: ActorRef = testActor,
    uiActor: ActorRef = testActor)(body: ActorRef => T): T = {
    val rpc = system.actorOf(SubscriptionDataActor.props(authentication, doGetSubscriptionData, replyTo, uiActor))
    val r = body(rpc)
    system stop rpc
    r
  }

}

abstract class Specification[T <: AkkaTestKitHelper] {
  def gen(): T
  def withHelper[U](body: T => U): U = {
    val h = gen()
    try body(h)
    finally (h.after())
  }
}

class DefaultSpecification extends Specification[AkkaTestKitHelper] {
  def gen() = new AkkaTestKitHelper()
}
