package snap

import org.junit.Assert._
import org.junit._
import akka.util.Timeout
import scala.concurrent.duration._
import scala.concurrent.{ Await, ExecutionContext }
import ExecutionContext.Implicits.global
import java.io.File
import monitor.Provisioning

object NewRelicTest {
  import FileHelper._
  def assertDirectory(file: File): Unit =
    assertTrue(s"$file is a directory", file.isDirectory)

  def assertFile(file: File): Unit =
    assertTrue(s"$file is a file", file.isFile)

  def assertLayout(root: File): Unit = {
    val nrRoot = relativeTo(root)("newrelic")
    def withRoot(file: String): File = relativeTo(nrRoot)(file)
    assertDirectory(nrRoot)
    assertFile(withRoot("newrelic.jar"))
    assertFile(withRoot("LICENSE"))
    assertFile(withRoot("README.txt"))
    assertFile(withRoot("extension-example.xml"))
    assertFile(withRoot("extension.xsd"))
    assertFile(withRoot("nrcerts"))
    assertFile(withRoot("newrelic.yml"))
    assertFile(withRoot("CHANGELOG"))
    assertFile(withRoot("newrelic-api.jar"))
    assertFile(withRoot("newrelic-api-sources.jar"))
  }
}

class NewRelicTest {
  import NewRelicTest._, FileHelper._

  @Test
  def testDownloadNewRelic(): Unit = {
    val config = NewRelic.Config("http://download.newrelic.com/newrelic/java-agent/newrelic-agent/{version}/newrelic-java-{version}.zip",
      "3.5.1",
      "1c8cb0ba31142d62d10620c8b6f78b0e2d0a6725e4ef23d5a4cc9a22067a01c2",
      Timeout(10.seconds),
      "new-relic/{version}")

    //    val result: File = Await.result(config.downloadAgent(HttpHelper.devNullBuilder), config.timeout.duration * 2.0)
    //    assertTrue("Downloaded New Relic agent passes validation", result.exists() && result.isFile())
    //
    //    val root = createTempDirectory("test_", "_dir")
    //    val extracted = config.extractFile(result, root)
    //    assertTrue("Extracted new relic archive", extracted.exists() && extracted.isDirectory())
    //    assertLayout(extracted)
    //
    //    deleteAll(root)
    //    result.delete()
  }
}
