/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package activator

import akka.actor._
import sbt.protocol._
import java.io._
import sbt.IO
import scala.concurrent.Future
import scala.util.Try
import scala.concurrent.ExecutionContext.Implicits.global

object ProjectPreprocessor {
  final case object Finished

  def noOpPreprocessor(appActor: ActorRef, socket: ActorRef, config: AppConfig): Unit =
    appActor ! Finished

  private final class ProjectPreprocessorUtil(appActor: ActorRef, config: AppConfig) {
    def log(level: String, message: String): Unit = appActor ! NotifyWebSocket(SbtProtocol.synthesizeLogEvent(level, message))
    def debug(message: String) = log("debug", message)
    def warn(message: String) = log("warn", message)
    def info(message: String) = log("info", message)
    def error(message: String) = log("error", message)

    def file(in: String) = new File(config.location.getAbsolutePath(), in)
    def withFile[T](in: String)(body: File => T): Option[T] = {
      val f = file(in)
      if (f.exists()) Some(body(f))
      else None
    }
    def exists(in: String) = {
      val f = file(in)
      f.exists()
    }
    def delete(in: String): Unit = {
      if (file(in).delete()) debug(s"deleting $in -> success")
      else debug(s"deleting $in -> FAILURE!!")
    }
    def readFile(in: String): Option[String] = withFile(in)(f => IO.read(f))
    def writeFile(inf: String, contents: String): Unit = {
      val f = file(inf)
      IO.write(f, contents)
    }

  }

  private final val targetPlay23Version = "2.3.10"
  private final val playPluginVersionRegex = """2\.\d+\.\d+"""
  private final val play24PluginVersionPattern = """(2\.4\.\d+)""".r
  private final val play23PluginVersionPattern = """2\.3\.(\d+)""".r
  private final val playPluginVersionPattern = playPluginVersionRegex.r
  private final val playPluginPattern = (""""com\.typesafe\.play"\s*%\s*"sbt-plugin"\s*%\s*"""" + playPluginVersionRegex + "\"").r
  private final val oldPlayPluginPattern = (""""play"\s*%\s*"sbt-plugin"\s*%\s*"""" + playPluginVersionRegex + "\"").r
  private final def playPluginReplacementString(version: String): String = s""""com.typesafe.play" % "sbt-plugin" % "$version""""
  private final def playForkRunPluginReplacementString(version: String): String = s""""com.typesafe.play" % "sbt-fork-run-plugin" % "$version""""
  private final val playForkRunPluginPattern = (""""com\.typesafe\.play"\s*%\s*"sbt-fork-run-plugin"\s*%\s*"""" + playPluginVersionRegex + "\"").r

  def readPlugins(util: ProjectPreprocessorUtil): Option[String] = {
    util.info("Examining project/plugins.sbt")
    util.readFile("project/plugins.sbt")
  }
  def readPlay(util: ProjectPreprocessorUtil): Option[String] = {
    util.info("Examining project/play.sbt")
    util.readFile("project/play.sbt")
  }
  def readPlayForkRunPlugin(util: ProjectPreprocessorUtil): Option[String] = {
    util.info("Examining project/play-fork-run.sbt")
    util.readFile("project/play-fork-run.sbt")
  }

  def getPlayVersion(source: String): Option[String] = for {
    playPlugin <- playPluginPattern.findFirstIn(source) orElse oldPlayPluginPattern.findFirstIn(source)
    version <- playPluginVersionPattern.findFirstIn(playPlugin)
  } yield version

  def rewritePlayPlugin(util: ProjectPreprocessorUtil, version: String): Unit = {
    util.info(s"Rewriting Play plugin version to $version")
    val nv = playPluginReplacementString(version)
    val p1 = for {
      source <- readPlay(util)
      _ <- getPlayVersion(source)
    } yield playPluginPattern.replaceAllIn(source, nv)
    val p2 = for {
      source <- readPlugins(util)
      _ <- getPlayVersion(source)
    } yield playPluginPattern.replaceAllIn(source, nv)
    p1.foreach(util.writeFile("project/play.sbt", _))
    p2.foreach(util.writeFile("project/plugins.sbt", _))
  }

  def rewritePlayForkRunPlugin(util: ProjectPreprocessorUtil, version: String): Unit = {
    val nv = playForkRunPluginReplacementString(version)
    val p1 = for {
      source <- readPlayForkRunPlugin(util)
    } yield playForkRunPluginPattern.replaceAllIn(source, nv)
    p1.foreach { s =>
      util.info(s"Rewriting Play fork run plugin version to $version")
      util.writeFile("project/play-fork-run.sbt", s)
    }
  }

  def examinePlay(util: ProjectPreprocessorUtil): Option[String] = for {
    source <- readPlay(util) orElse readPlugins(util)
    version <- getPlayVersion(source)
  } yield version

  def defaultPreprocessor(appActor: ActorRef, socket: ActorRef, config: AppConfig): Unit = {
    Future {
      val util = new ProjectPreprocessorUtil(appActor: ActorRef, config: AppConfig)
      val playVersion = examinePlay(util)
      val hasPlayForkRun = util.exists("project/play-fork-run.sbt")
      (playVersion, hasPlayForkRun) match {
        case (None, true) => util.delete("project/play-fork-run.sbt")
        case (None, false) => util.info("Does not appear to be a Play project")
        case (Some(play24PluginVersionPattern(_)), _) => util.info("Using Play 2.4.x -> OK")
        case (Some(play23PluginVersionPattern(m)), _) if m.toInt >= 8 => util.info("Using Play > 2.3.8 -> OK")
        case (Some(play23PluginVersionPattern(m)), _) if m.toInt < 8 =>
          util.warn(s"Using Play < 2.3.8 -> will update to $targetPlay23Version")
          rewritePlayPlugin(util, targetPlay23Version)
          rewritePlayForkRunPlugin(util, targetPlay23Version)
        case (Some(v), _) => util.error(s"Using unsupported version of Play: $v")
      }
    } onComplete (_ => appActor ! Finished)
  }

}
