package snap.typesafeproxy

import org.joda.time.DateTime
import play.api.libs.functional.syntax._
import play.api.libs.json._
import play.api.libs.json.Json._

sealed trait SubscriptionLevel {
  def name: String
}
object SubscriptionLevels {
  sealed abstract class NamedSubscription(override val name: String) extends SubscriptionLevel
  case object Developer extends NamedSubscription("developer")
  case object Production extends NamedSubscription("production")
  case object TwentyFourSeven extends NamedSubscription("twentyFourSeven")

  val subscriptionLevelReads: Reads[SubscriptionLevel] = new Reads[SubscriptionLevel] {
    def reads(in: JsValue): JsResult[SubscriptionLevel] = in match {
      case JsString(Developer.name) => JsSuccess(Developer)
      case JsString(Production.name) => JsSuccess(Production)
      case JsString(TwentyFourSeven.name) => JsSuccess(TwentyFourSeven)
      case v => JsError(s"Expected one of 'developer', 'production', or 'twentyFourSeven' got: $v")
    }
  }

  val subscriptionLevelWrites: Writes[SubscriptionLevel] = new Writes[SubscriptionLevel] {
    def writes(in: SubscriptionLevel): JsValue = JsString(in.name)
  }

  implicit val subscriptionLevelFormat: Format[SubscriptionLevel] = Format[SubscriptionLevel](subscriptionLevelReads, subscriptionLevelWrites)

}

sealed trait SubscriberData
object SubscriberData {
  import SubscriptionLevels._

  case class NotASubscriber(message: String) extends SubscriberData
  case class Detail(id: String, subscription: SubscriptionLevel, isPaidSubscriber: Boolean, acceptedDate: Option[DateTime], majorVersion: String, currentReleaseVersion: String) extends SubscriberData

  private val exampleId = "id"
  private val exampleMajorVersion = "majorVersion"
  private val exampleCurrentReleaseVersion = "currentReleaseVersion"

  def exampleDetail(id: String = exampleId,
    subscription: SubscriptionLevel = SubscriptionLevels.Developer,
    isPaidSubscriber: Boolean = false,
    acceptedDate: Option[DateTime] = None,
    majorVersion: String = exampleMajorVersion,
    currentReleaseVersion: String = exampleCurrentReleaseVersion): Detail =
    Detail(id, subscription, isPaidSubscriber, acceptedDate, majorVersion, currentReleaseVersion)

  private val exampleMessage = "message"

  def exampleNotASubscriber(message: String = exampleMessage): NotASubscriber =
    NotASubscriber(message)

  val subscriberDataReads: Reads[SubscriberData] = new Reads[SubscriberData] {
    def reads(in: JsValue): JsResult[SubscriberData] = {
      val id = Json.fromJson[String](in \ "id").asOpt
      val subscription = Json.fromJson[Option[SubscriptionLevel]](in \ "subscription").asOpt
      val isPaidSubscriber = Json.fromJson[Boolean](in \ "isPaidSubscriber").asOpt
      val acceptedDate = Json.fromJson[Option[DateTime]](in \ "acceptedDate").asOpt
      val majorVersion = Json.fromJson[String](in \ "majorVersion").asOpt
      val currentReleaseVersion = Json.fromJson[String](in \ "currentReleaseVersion").asOpt
      val message = Json.fromJson[Option[String]](in \ "message").asOpt

      (id, subscription, isPaidSubscriber, acceptedDate, majorVersion, currentReleaseVersion, message) match {
        case (_, Some(None), _, _, _, _, Some(Some(m))) => JsSuccess(NotASubscriber(m))
        case (_, Some(None), _, _, _, _, Some(None)) => JsSuccess(NotASubscriber("User not a subscriber"))
        case (Some(id), Some(Some(s)), Some(ips), Some(ad), Some(mv), Some(crv), _) => JsSuccess(Detail(id, s, ips, ad, mv, crv))
        case _ => JsError(s"'$in' could not be parsed into subscriber data")
      }
    }
  }

  val subscriberDataWrites: Writes[SubscriberData] = new Writes[SubscriberData] {
    def writes(in: SubscriberData): JsValue = in match {
      case NotASubscriber(m) => Json.obj("message" -> m)
      case Detail(id, s, ips, ad, mv, crv) => Json.obj("id" -> id,
        "subscription" -> s,
        "isPaidSubscriber" -> ips,
        "acceptedDate" -> ad,
        "majorVersion" -> mv,
        "currentReleaseVersion" -> crv)
    }
  }

  implicit val subscriberDataFormat: Format[SubscriberData] = Format[SubscriberData](subscriberDataReads, subscriberDataWrites)

}

case class UserProperties(subscriberData: Option[SubscriberData] = None)
