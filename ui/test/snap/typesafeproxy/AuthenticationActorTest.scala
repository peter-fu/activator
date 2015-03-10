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

object AuthenticationActorTest {

  val authenticated = AuthenticationStates.Authenticated(AuthenticationStates.emptyAuthentication)
  val unauthenticated = AuthenticationStates.Unauthenticated
  def failure(error: Throwable) = AuthenticationStates.Failure(error)

  val canceled = failure(new ProxyCanceled("canceled"))
  val failed = failure(new ProxyFailure("fail"))
  val invalid = failure(new ProxyInvalidCredentials("invalid"))
  val timeout = failure(new ProxyTimeout("timeout"))

  val username = "username"
  val password = "password"
  val credentials = UIActor.Credentials(username, password)

  def assertTypeOf[T](x: Any)(implicit ct: ClassTag[T]): Unit =
    if (!ct.runtimeClass.isInstance(x)) throw new AssertionError(s"Value '$x' of type ${x.getClass.getName} is not of type ${ct.runtimeClass.getName}", null)

}

class AuthenticationActorTest extends DefaultSpecification {
  import AuthenticationActorTest._

  @Test
  def testShouldSucceed(): Unit = withHelper { helper =>
    import helper._
    withAuthenticationActor(authenticationResult(authenticated)) { auth =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      auth ! credentials
      expectMsgType[UIActor.CancelableRequests.Authenticating]
      expectMsgAllOf(authenticated, UIActor.AuthenticationSuccess)
    }
  }

  @Test
  def testHandleCanceledCredentialsRequest(): Unit = withHelper { helper =>
    import helper._
    withAuthenticationActor(authenticationResult(authenticated)) { auth =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      auth ! UIActor.Cancel
      val failure = expectMsgType[AuthenticationStates.Failure]
      assertTypeOf[ProxyCanceled](failure.error)
    }
  }

  @Test
  def testHandleCanceledAuthentication(): Unit = withHelper { helper =>
    import helper._
    withAuthenticationActor(delayedAuthenticationResult(3.seconds)) { auth =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      auth ! credentials
      val a = expectMsgType[UIActor.CancelableRequests.Authenticating]
      a.cancel()
      val failure = expectMsgType[AuthenticationStates.Failure]
      assertTypeOf[ProxyCanceled](failure.error)
    }
  }

  @Test
  def testHandleInvalidCredentialsRetry(): Unit = withHelper { helper =>
    import helper._
    val (ref, func) = mutableAuthenticationResult(invalid)
    withAuthenticationActor(func) { auth =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      auth ! credentials
      expectMsgType[UIActor.CancelableRequests.Authenticating]
      val f = expectMsgType[UIActor.RetryableRequests.Failure]
      f.retry()
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      ref.set(authenticated)
      auth ! credentials
      expectMsgType[UIActor.CancelableRequests.Authenticating]
      expectMsgAllOf(authenticated, UIActor.AuthenticationSuccess)
    }
  }

  @Test
  def testHandleInvalidCredentialsCancel(): Unit = withHelper { helper =>
    import helper._
    val (ref, func) = mutableAuthenticationResult(invalid)
    withAuthenticationActor(func) { auth =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      auth ! credentials
      expectMsgType[UIActor.CancelableRequests.Authenticating]
      val f = expectMsgType[UIActor.RetryableRequests.Failure]
      f.cancel()
      val failure = expectMsgType[AuthenticationStates.Failure]
      assertTypeOf[ProxyCanceled](failure.error)
    }
  }

  @Test
  def testHandleTimeoutRetry(): Unit = withHelper { helper =>
    import helper._
    val (ref, func) = mutableAuthenticationResult(timeout)
    withAuthenticationActor(func) { auth =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      auth ! credentials
      expectMsgType[UIActor.CancelableRequests.Authenticating]
      val f = expectMsgType[UIActor.RetryableRequests.Failure]
      f.retry()
      ref.set(authenticated)
      auth ! credentials
      expectMsgType[UIActor.CancelableRequests.Authenticating]
      expectMsgAllOf(authenticated, UIActor.AuthenticationSuccess)
    }
  }

  @Test
  def testHandleTimeoutCancel(): Unit = withHelper { helper =>
    import helper._
    val (ref, func) = mutableAuthenticationResult(timeout)
    withAuthenticationActor(func) { auth =>
      expectMsgType[UIActor.CancelableRequests.RequestCredentials]
      auth ! credentials
      expectMsgType[UIActor.CancelableRequests.Authenticating]
      val f = expectMsgType[UIActor.RetryableRequests.Failure]
      f.cancel()
      val failure = expectMsgType[AuthenticationStates.Failure]
      assertTypeOf[ProxyCanceled](failure.error)
    }
  }
}
