package activator

import org.junit.Assert._
import org.junit._
import play.api.libs.json._

class AppActorTest {
  @Test
  def testMessageSerialization(): Unit = {
    val message1 = InspectRequest(Json.obj("foo" -> "bar"))
    val message1Json = Json.toJson(message1)
    val message1Return = message1Json.as[InspectRequest]
    assertTrue("InspectRequest message makes JSON round trip", message1 == message1Return)

    val message2 = InspectRequest(Json.obj("foo" -> "bar"))
    val message2Json = Json.toJson(message2).asInstanceOf[JsObject] ++ Json.obj("request" -> "NotInspectRequest")
    val message2Return = Json.fromJson[InspectRequest](message2Json)
    assertTrue("Not parse a request for InspectRequest if not tagged appropriately", message2Return.isInstanceOf[JsError])
  }
}
