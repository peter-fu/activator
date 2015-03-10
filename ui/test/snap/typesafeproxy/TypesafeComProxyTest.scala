package snap.typesafeproxy

import org.junit._
import org.junit.Assert._
import akka.actor._
import akka.util.Timeout
import scala.concurrent.duration._
import akka.testkit._
import scala.util.Random

object TypesafeComProxyTest {
  val subscriptionRequests: Seq[ActorRef => TypesafeComProxy.SubscriptionRequest[_]] =
    Seq(TypesafeComProxy.SubscriptionRequests.GetSubscriptionDetail.apply)

  def foreachSubscriptionRequest(probe: ActorRef)(builder: () => (ActorRef => Unit) => Unit)(body: (TypesafeComProxy.SubscriptionRequest[_], ActorRef) => Unit): Unit = {
    subscriptionRequests.foreach { recFun =>
      val rec = recFun(probe)
      builder() { proxy =>
        proxy ! rec
        body(rec, proxy)
      }
    }
  }
}

class TypesafeComProxyTest extends DefaultSpecification {
  import TypesafeComProxyTest._

  @Test
  def testShouldAuthenticate(): Unit = withHelper { helper =>
    import helper._
    foreachSubscriptionRequest(testActor)(() => withProxy()) { (_, _) =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
    }

    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Failure(new ProxyFailure("fail")))) { (_, _) =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
    }
  }

  @Test
  def testShouldRPC(): Unit = withHelper { helper =>
    import helper._
    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication))) { (_, _) =>
      expectMsg(FakeSubscriptionRPCInit)
    }
  }

  @Test
  def testShouldSupplyResult(): Unit = withHelper { helper =>
    import helper._
    val id = "id"
    val level = SubscriptionLevels.Developer
    val detail = SubscriberData.exampleDetail(id, level)
    foreachSubscriptionRequest(testActor)(() => withProxy(initUserProps = UserProperties(subscriberData = Some(detail)))) { (rec, _) =>
      rec match {
        case _: TypesafeComProxy.SubscriptionRequests.GetSubscriptionDetail =>
          expectMsg(TypesafeComProxy.SubscriptionResponses.Detail(detail))
      }
    }
  }

  @Test
  def testShouldNotSupplyResultForNonSubscriber(): Unit = withHelper { helper =>
    import helper._
    val example = SubscriberData.exampleNotASubscriber()

    foreachSubscriptionRequest(testActor)(() => withProxy(initUserProps = UserProperties(subscriberData = Some(example)))) { (rec, _) =>
      expectMsg(TypesafeComProxy.SubscriptionResponses.NotASubscriber(example))
    }
  }

  @Test
  def testShouldRPCAfterAuthenticate(): Unit = withHelper { helper =>
    import helper._

    foreachSubscriptionRequest(testActor)(() => withProxy()) { (_, proxy) =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      proxy ! AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication)
      expectMsg(FakeSubscriptionRPCInit)
    }

    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Failure(new ProxyFailure("fail")))) { (_, proxy) =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      proxy ! AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication)
      expectMsg(FakeSubscriptionRPCInit)
    }
  }

  @Test
  def testShouldFailRPCAfterAuthenticationFailure(): Unit = withHelper { helper =>
    import helper._
    val exception = new ProxyFailure("fail")

    foreachSubscriptionRequest(testActor)(() => withProxy()) { (_, proxy) =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      proxy ! AuthenticationStates.Failure(exception)
      expectMsg(TypesafeComProxy.SubscriptionResponses.Failure(exception))
    }

    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Failure(new ProxyFailure("fail")))) { (_, proxy) =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      proxy ! AuthenticationStates.Failure(exception)
      expectMsg(TypesafeComProxy.SubscriptionResponses.Failure(exception))
    }
  }

  @Test
  def testShouldReturnRPCResults(): Unit = withHelper { helper =>
    import helper._
    val id = "id"
    val level = SubscriptionLevels.Developer
    val detail = SubscriberData.exampleDetail(id, level)

    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication))) { (rec, proxy) =>
      expectMsg(FakeSubscriptionRPCInit)
      proxy ! SubscriptionDataActor.Success(detail)
      rec match {
        case _: TypesafeComProxy.SubscriptionRequests.GetSubscriptionDetail =>
          expectMsg(TypesafeComProxy.SubscriptionResponses.Detail(detail))
      }
    }
  }

  @Test
  def testShouldReturnRPCResultsForNonSubscriber(): Unit = withHelper { helper =>
    import helper._
    val nons = SubscriberData.exampleNotASubscriber()

    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication))) { (rec, proxy) =>
      expectMsg(FakeSubscriptionRPCInit)
      proxy ! SubscriptionDataActor.Success(nons)
      expectMsg(TypesafeComProxy.SubscriptionResponses.NotASubscriber(nons))
    }
  }

  @Test
  def testShouldReturnRPCFailure(): Unit = withHelper { helper =>
    import helper._
    val exception = new ProxyFailure("fail")

    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication))) { (rec, proxy) =>
      expectMsg(FakeSubscriptionRPCInit)
      proxy ! SubscriptionDataActor.Failure(exception)
      expectMsg(TypesafeComProxy.SubscriptionResponses.Failure(exception))
    }
  }

  @Test
  def testShouldReauthenticate(): Unit = withHelper { helper =>
    import helper._
    val id = "id"
    val level = SubscriptionLevels.Developer
    val detail = SubscriberData.exampleDetail(id, level)

    foreachSubscriptionRequest(testActor)(() => withProxy(initAuth = AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication))) { (rec, proxy) =>
      expectMsg(FakeSubscriptionRPCInit)
      proxy ! SubscriptionDataActor.InvalidAuthentication
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      proxy ! AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication)
      expectMsg(FakeSubscriptionRPCInit)
      proxy ! SubscriptionDataActor.Success(detail)
      rec match {
        case _: TypesafeComProxy.SubscriptionRequests.GetSubscriptionDetail =>
          expectMsg(TypesafeComProxy.SubscriptionResponses.Detail(detail))
      }
    }
  }

}
