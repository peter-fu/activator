package snap

import org.junit.Assert._
import org.junit._
import akka.util.Timeout
import scala.concurrent.duration._
import scala.concurrent.{ Await, ExecutionContext }
import ExecutionContext.Implicits.global
import java.io.File
import play.api.libs.json._
import play.api.libs.json.Json._

class NewRelicJsonTest {
  import NewRelicRequest._

  @Test
  def testRequests(): Unit = {
    val a = Available
    val aJson = Json.toJson(a)
    val aResponse = a.response(true)
    val aResponseJson = Json.toJson(aResponse)
  }
}
