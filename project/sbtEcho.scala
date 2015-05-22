import sbt._
import sbt.Keys._
import com.typesafe.sbt.SbtGit
import com.typesafe.sbt.SbtScalariform
import com.typesafe.sbt.SbtScalariform.ScalariformKeys
import bintray.Plugin.bintrayPublishSettings
import bintray.Keys._
import sbtbuildinfo.Plugin._

object SbtEchoBuild extends Build {
  def baseVersions: Seq[Setting[_]] = SbtGit.versionWithGit

  lazy val sbtEcho = (
    Project("sbt-echo", base = file("sbt-echo"))
      settings (noPublishSettings: _*)
      settings (defaultSettings: _*)
      settings (version := Dependencies.echoVersion)
      aggregate(sbtEchoAkka, sbtEchoPlay)
    )

  lazy val defaultSettings: Seq[Setting[_]] = baseVersions ++ SbtScalariform.scalariformSettings ++
    bintrayPublishSettings ++ Seq(
    sbtPlugin := true,
    organization := "com.typesafe.sbt",
    version <<= version in ThisBuild,
    publishMavenStyle := false,
    bintrayOrganization in bintray := Some("typesafe"),
    repository in bintray := "ivy-releases",
    licenses += ("Apache-2.0", url("https://www.apache.org/licenses/LICENSE-2.0.html")),
    resolvers += "typesafe-mvn-releases" at "https://repo.typesafe.com/typesafe/releases/",
    resolvers += Resolver.url("typesafe-ivy-releases", new URL("https://repo.typesafe.com/typesafe/releases/"))(Resolver.ivyStylePatterns),
    ScalariformKeys.preferences in Compile := formatPrefs,
    ScalariformKeys.preferences in Test := formatPrefs
  )

  def formatPrefs = {
    import scalariform.formatter.preferences._
    FormattingPreferences()
      .setPreference(IndentSpaces, 2)
  }

  lazy val noPublishSettings: Seq[Setting[_]] = Seq(
    publish := {},
    publishLocal := {}
  )

  val aspectJVersion = taskKey[String]("aspectj version to go in buildinfo")

  lazy val sbtEchoAkka = (
    Project("sbt-echo-akka", file("sbt-echo/akka"))
      settings (defaultSettings: _*)
      settings (buildInfoSettings: _*)
      settings(
      name := "sbt-echo",
      version := Dependencies.echoVersion,
      aspectJVersion := Dependencies.aspectJVersion,
      libraryDependencies += Dependencies.sbtBackgroundRun,
      sourceGenerators in Compile <+= buildInfo,
      buildInfoKeys := Seq[BuildInfoKey](version, aspectJVersion),
      buildInfoPackage := "com.typesafe.sbt.echoakka"
      )
    )

  lazy val sbtEchoPlay = (
    Project("sbt-echo-play", file("sbt-echo/play"))
      dependsOn (sbtEchoAkka)
      settings (defaultSettings: _*)
      settings (Dependencies.playPlugin: _*)
      settings (
      version := Dependencies.echoVersion,
      name := "sbt-echo-play"
      )
    )
}
