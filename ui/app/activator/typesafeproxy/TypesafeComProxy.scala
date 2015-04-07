package activator.typesafeproxy

import java.util.concurrent.TimeUnit

import akka.actor._
import com.typesafe.config.{ Config => TSConfig }

import scala.concurrent.duration._
import scala.util.{ Failure, Success, Try }
import akka.util.Timeout

object TypesafeComProxy {
  sealed trait SlotValue[+T]
  case object Empty extends SlotValue[Nothing]
  case class Pending(actor: ActorRef) extends SlotValue[Nothing]
  case class Value[T](value: Try[T]) extends SlotValue[T]

  object SlotValue {
    def empty[T]: SlotValue[T] = Empty
  }

  case class CacheEntry[T](value: SlotValue[T],
    filler: (Long, ActorRef, ActorRef) => Props,
    tag: String,
    version: Long = 0L,
    pendingRequests: Set[ActionPair[T]#Get] = Set.empty[ActionPair[T]#Get]) {
    def maybeDoBump(doBump: Boolean): CacheEntry[T] = if (doBump) this.copy(version = this.version + 1L) else this
  }

  object CacheEntry {
    def fromManifest[T](value: SlotValue[T],
      filler: (Long, ActorRef, ActorRef) => Props,
      version: Long = 0L,
      pendingRequests: Set[ActionPair[T]#Get] = Set.empty[ActionPair[T]#Get])(implicit ev: Manifest[T]): CacheEntry[T] =
      CacheEntry(value, filler, ev.erasure.getName, version, pendingRequests)
  }
  case class CacheState(entries: Map[String, CacheEntry[_]] = Map.empty[String, CacheEntry[_]]) {
    def lookup[U](implicit ev: Manifest[U]): Option[CacheEntry[U]] =
      entries.get(ev.erasure.getName).map(_.asInstanceOf[CacheEntry[U]])
    def lookup[U](key: String): Option[CacheEntry[U]] =
      entries.get(key).map(_.asInstanceOf[CacheEntry[U]])
    def update[U](value: SlotValue[U], doBump: Boolean = true)(implicit ev: Manifest[U]): CacheState = {
      val tag = ev.erasure.getName
      CacheState(entries.foldLeft(Map.empty[String, CacheEntry[_]]) {
        case (s, (k, v)) => if (k == tag) s + (k -> v.asInstanceOf[CacheEntry[Any]].maybeDoBump(doBump).copy(value = value)) else s + (k -> v)
      })
    }
    def updateAll[U](value: CacheEntry[U], doBump: Boolean = true): CacheState =
      CacheState(entries.foldLeft(Map.empty[String, CacheEntry[_]]) {
        case (s, (k, v)) => if (k == value.tag) s + (k -> value.copy(version = v.maybeDoBump(doBump).version)) else s + (k -> v)
      })
    def add[U](value: CacheEntry[U]): CacheState =
      lookup[U](value.tag).map(_ => updateAll[U](value)).getOrElse(this.copy(entries = this.entries + (value.tag -> value)))

  }

  def initialStateBuilder(authState: SlotValue[AuthenticationState] = SlotValue.empty[AuthenticationState],
    authGetter: (Long, ActorRef, ActorRef) => Props = (_, _, _) => ???,
    subscriberData: SlotValue[SubscriberData] = SlotValue.empty[SubscriberData],
    subscriberDataGetter: (Long, ActorRef, ActorRef) => Props = (_, _, _) => ???,
    activatorInfo: SlotValue[ActivatorLatestInfo] = SlotValue.empty[ActivatorLatestInfo],
    activatorInfoGetter: (Long, ActorRef, ActorRef) => Props = (_, _, _) => ???): CacheState = {
    CacheState()
      .add(CacheEntry.fromManifest[AuthenticationState](authState, authGetter))
      .add(CacheEntry.fromManifest[SubscriberData](subscriberData, subscriberDataGetter))
      .add(CacheEntry.fromManifest[ActivatorLatestInfo](activatorInfo, activatorInfoGetter))
  }

  sealed trait Response

  sealed trait LocalRequest[Resp] extends Request[Resp]

  abstract class ActionPair[T](implicit ev: Manifest[T]) {
    final case class Value(value: Try[T], version: Long) extends Response
    final case class Outcome(result: Try[Unit]) extends Response
    final case class Get(sendTo: ActorRef, websocketActor: ActorRef) extends LocalRequest[Value] {
      final val key: String = ev.erasure.getName
      final def withValue(value: Try[T], version: Long)(implicit sender: ActorRef) = response(Value(value, version))
    }
    final case class Put(value: Try[T], version: Long, sendTo: ActorRef) extends LocalRequest[Outcome] {
      final val key: String = ev.erasure.getName
      final def success()(implicit sender: ActorRef) = response(Outcome(Success(())))
      final def failed()(implicit sender: ActorRef) =
        response(Outcome(Failure(new CachePutFailure(s"Could not put value:$value into cache slot: $key"))))
    }
  }

  case object Authentication extends ActionPair[AuthenticationState]
  case object SubscriberDetail extends ActionPair[SubscriberData]
  case object ActivatorInfo extends ActionPair[ActivatorLatestInfo]

  sealed trait RpcEndpoint {
    def url: String
    def timeout: FiniteDuration
  }

  case class LoginConfig(url: String, timeout: FiniteDuration) extends RpcEndpoint
  case class SubscriptionConfig(url: String, timeout: FiniteDuration) extends RpcEndpoint
  case class ActivatorInfoConfig(url: String, timeout: FiniteDuration) extends RpcEndpoint

  case class Config(lookupTimeout: Timeout, login: LoginConfig, subscriptionData: SubscriptionConfig, activatorInfo: ActivatorInfoConfig)

  def withTypesafeComConfig[T](in: TSConfig)(body: TSConfig => T): T = {
    val c = in.getConfig("activator.typesafe-com-proxy")
    body(c)
  }

  def fromConfig(in: TSConfig): Config = {
    withTypesafeComConfig(in) { configRoot =>
      val lookupTimeout = Timeout(configRoot.getDuration("lookup-timeout", TimeUnit.MILLISECONDS).intValue.millis)
      val login = configRoot.getConfig("login")
      val subscriptionData = configRoot.getConfig("subscriber-data")
      val activatorInfo = configRoot.getConfig("activator-info")
      Config(lookupTimeout = lookupTimeout,
        login = LoginConfig(login.getString("url"), login.getDuration("timeout", TimeUnit.MILLISECONDS).intValue.millis),
        subscriptionData = SubscriptionConfig(subscriptionData.getString("url"), subscriptionData.getDuration("timeout", TimeUnit.MILLISECONDS).intValue.millis),
        activatorInfo = ActivatorInfoConfig(activatorInfo.getString("url"), activatorInfo.getDuration("timeout", TimeUnit.MILLISECONDS).intValue.millis))
    }
  }

  def props(initialCacheState: TypesafeComProxy.CacheState): Props =
    Props(new TypesafeComProxy(initialCacheState))
}

class TypesafeComProxy(initialCacheState: TypesafeComProxy.CacheState) extends Actor with ActorLogging {
  import TypesafeComProxy._

  def run(state: CacheState): Receive = {
    def doGet[T](msg: ActionPair[T]#Get): Unit = {
      state.lookup[T](msg.key).foreach { slot =>
        slot.value match {
          case Empty | Value(Failure(_)) =>
            val actor = context.actorOf(slot.filler(slot.version, self, msg.websocketActor))
            context.become(run(state.updateAll(slot.copy(value = Pending(actor), pendingRequests = slot.pendingRequests + msg), false)))
          case Pending(_) =>
            context.become(run(state.updateAll(slot.copy(pendingRequests = slot.pendingRequests + msg), false)))
          case Value(v @ Success(_)) =>
            msg.withValue(v, slot.version)
        }
      }
    }

    def doPut[T](msg: ActionPair[T]#Put): Unit = {
      state.lookup[T](msg.key).foreach { slot =>
        if (slot.version == msg.version) {
          slot.pendingRequests.foreach(x => x.withValue(msg.value, slot.version + 1))
          msg.success()
          context.become(run(state.updateAll(slot.copy(value = Value(msg.value), pendingRequests = Set.empty[ActionPair[T]#Get]))))
        } else {
          msg.failed()
        }
      }
    }

    {
      case x: ActionPair[_]#Get => doGet(x)
      case x: ActionPair[_]#Put => doPut(x)
    }
  }

  def receive: Receive = run(initialCacheState)
}

object TypesafeComProxyUIActor {
  import SubscriberData._
  import activator.JsonHelper._
  import play.api.libs.functional.syntax._
  import play.api.libs.json._
  import play.api.libs.json.Json._

  val requestTag = "TypesafeComProxy"
  val responseTag = requestTag

  sealed trait Response {
    def requestId: String
  }
  sealed trait LocalRequest[+T <: Response] {
    def requestId: String
  }

  sealed trait SubscriberResponse extends Response
  case class NotASubscriber(requestId: String) extends SubscriberResponse
  case class SubscriptionDetails(data: SubscriberData, requestId: String) extends SubscriberResponse
  case class GetSubscriptionDetail(requestId: String) extends LocalRequest[SubscriberResponse] {
    def notASubscriber(): SubscriberResponse = NotASubscriber(requestId)
    def details(data: SubscriberData): SubscriberResponse = SubscriptionDetails(data, requestId)
    def failure(message: String): SubscriberResponse = Failure(message, requestId)
  }

  sealed trait ActivatorInfoResponse extends Response
  case class ActivatorInfo(data: ActivatorLatestInfo, requestId: String) extends ActivatorInfoResponse
  case class GetActivatorInfo(requestId: String) extends LocalRequest[ActivatorInfoResponse] {
    def info(data: ActivatorLatestInfo): ActivatorInfoResponse = ActivatorInfo(data, requestId)
    def failure(message: String): ActivatorInfoResponse = Failure(message, requestId)
  }

  case class Failure(message: String, requestId: String) extends SubscriberResponse with ActivatorInfoResponse

  implicit val websocketReads: Reads[LocalRequest[_ <: Response]] =
    extractMessage[LocalRequest[_ <: Response]](requestTag)(new Reads[LocalRequest[_ <: Response]] {
      def reads(in: JsValue): JsResult[LocalRequest[_ <: Response]] =
        (((__ \ "type").read[String] and
          (__ \ "requestId").read[String]).apply { (t, rid) =>
            t match {
              case "getSubscriptionDetail" => GetSubscriptionDetail(rid)
              case "getActivatorInfo" => GetActivatorInfo(rid)
            }
          }).reads(in)
    })

  implicit val websocketWrites: Writes[Response] =
    emitMessage(responseTag)(_ match {
      case Failure(m, rid) => Json.obj("type" -> "proxyFailure", "message" -> m, "requestId" -> rid)
      case NotASubscriber(rid) => Json.obj("type" -> "notASubscriber", "requestId" -> rid)
      case x: SubscriptionDetails => Json.obj("type" -> "subscriptionDetails", "data" -> x.data, "requestId" -> x.requestId)
      case x: ActivatorInfo => Json.obj("type" -> "activatorInfo", "data" -> x.data, "requestId" -> x.requestId)
    })

  object Inbound {
    def unapply(in: JsValue): Option[LocalRequest[_ <: Response]] = Json.fromJson[LocalRequest[_ <: Response]](in).asOpt
  }

  object Outbound {
    def unapply(in: Any): Option[Response] = in match {
      case x: Response => Some(x)
      case _ => None
    }
  }

  def props(request: LocalRequest[_ <: Response], typesafeComActor: ActorRef, websocketsActor: ActorRef): Props =
    Props(new TypesafeComProxyUIActor(request, typesafeComActor, websocketsActor))
}

class TypesafeComProxyUIActor(request: TypesafeComProxyUIActor.LocalRequest[_ <: TypesafeComProxyUIActor.Response], typesafeComActor: ActorRef, websocketsActor: ActorRef) extends Actor with ActorLogging {
  import TypesafeComProxyUIActor._

  def receive: Receive = {
    request match {
      case GetActivatorInfo(_) =>
        typesafeComActor ! TypesafeComProxy.ActivatorInfo.Get(self, websocketsActor)
      case GetSubscriptionDetail(_) =>
        typesafeComActor ! TypesafeComProxy.SubscriberDetail.Get(self, websocketsActor)
    }

    def handleResponse[T](response: TypesafeComProxy.ActionPair[T]#Value): Unit = (response.value, request) match {
      case (Success(_: SubscriberData.NotASubscriber), x: GetSubscriptionDetail) =>
        websocketsActor ! x.notASubscriber()
      case (Success(data: SubscriberData.Detail), x: GetSubscriptionDetail) =>
        websocketsActor ! x.details(data)
      case (Success(data: ActivatorLatestInfo), x: GetActivatorInfo) =>
        websocketsActor ! x.info(data)
      case (scala.util.Failure(f), x) =>
        websocketsActor ! TypesafeComProxyUIActor.Failure(f.getMessage, x.requestId)
      case (other, x) =>
        val message = s"[${x.requestId}]Got unexpected response:$other for request: $request"
        websocketsActor ! TypesafeComProxyUIActor.Failure(message, x.requestId)
        log.error(message)
    }

    {
      case value: TypesafeComProxy.ActionPair[_]#Value =>
        handleResponse(value)
        context stop self
    }
  }
}
