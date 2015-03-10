package snap.typesafeproxy

import org.junit._
import org.junit.Assert._
import akka.actor._
import akka.util.Timeout
import scala.concurrent.duration._
import akka.testkit._
import scala.util.Random
import scala.reflect.ClassTag
import java.lang.AssertionError

object SubscriptionDataActorTest {

  def invalidAuthentication = SubscriptionDataActor.InvalidAuthentication
  def success(subscriberData: SubscriberData = SubscriberData.exampleDetail()) = SubscriptionDataActor.Success(subscriberData)
  def failure(error: Throwable) = SubscriptionDataActor.Failure(error)

  val canceled = failure(new ProxyCanceled("canceled"))
  val failed = failure(new ProxyFailure("fail"))
  val invalid = failure(new ProxyInvalidCredentials("invalid"))
  val timeout = failure(new ProxyTimeout("timeout"))

  def assertTypeOf[T](x: Any)(implicit ct: ClassTag[T]): Unit =
    if (!ct.runtimeClass.isInstance(x)) throw new AssertionError(s"Value '$x' of type ${x.getClass.getName} is not of type ${ct.runtimeClass.getName}", null)

}

class SubscriptionDataActorTest extends DefaultSpecification {
  import SubscriptionDataActorTest._

  @Test
  def testShouldSucceed(): Unit = withHelper { helper =>
    import helper._
    val expected = success()
    withSubscriptionDataActor(subscriptionDataResult(expected)) { rpc =>
      expectMsgType[UIActor.CancelableRequests.FetchingSubscriptionData]
      expectMsgAllOf(expected, UIActor.SubscriptionDataSuccess)
    }
  }

  @Test
  def testHandleCanceledFetch(): Unit = withHelper { helper =>
    import helper._
    withSubscriptionDataActor(delayedSubscriptionDataResult(3.seconds)) { rpc =>
      val f = expectMsgType[UIActor.CancelableRequests.FetchingSubscriptionData]
      f.cancel()
      val failure = expectMsgType[SubscriptionDataActor.Failure]
      assertTypeOf[ProxyCanceled](failure.error)
    }
  }

  @Test
  def testHandleTimeoutRetry(): Unit = withHelper { helper =>
    import helper._
    val expected = success()
    val (ref, func) = mutableSubscriptionDataResult(timeout)
    withSubscriptionDataActor(func) { rpc =>
      expectMsgType[UIActor.CancelableRequests.FetchingSubscriptionData]
      val f = expectMsgType[UIActor.RetryableRequests.Failure]
      ref.set(expected)
      f.retry()
      expectMsgType[UIActor.CancelableRequests.FetchingSubscriptionData]
      expectMsgAllOf(expected, UIActor.SubscriptionDataSuccess)
    }
  }

  @Test
  def testHandleTimeoutCancel(): Unit = withHelper { helper =>
    import helper._
    val (ref, func) = mutableSubscriptionDataResult(timeout)
    withSubscriptionDataActor(func) { rpc =>
      expectMsgType[UIActor.CancelableRequests.FetchingSubscriptionData]
      val f = expectMsgType[UIActor.RetryableRequests.Failure]
      f.cancel()
      val failure = expectMsgType[SubscriptionDataActor.Failure]
      assertTypeOf[ProxyCanceled](failure.error)
    }
  }
}
