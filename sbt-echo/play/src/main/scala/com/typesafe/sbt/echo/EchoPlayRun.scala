/**
 *  Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
package com.typesafe.sbt
package echo

import sbt._
import sbt.Keys._
import play.Play.ClassLoaderCreator

object EchoPlayRun {
  import EchoRun._
  import SbtEcho.Echo
  import SbtEcho.EchoKeys._

  val Play23Version = "2.3.8"
  val supportedPlayVersions = Seq(Play23Version)

  def tracePlayDependencies(dependencies: Seq[ModuleID], tracePlayVersion: Option[String], echoVersion: String): Seq[ModuleID] = {
    if (containsTracePlay(dependencies)) Seq.empty[ModuleID]
    else tracePlayVersion match {
      case Some(playVersion) => Seq(tracePlayDependency(playVersion, echoVersion))
      case None => Seq.empty[ModuleID]
    }
  }

  def tracePlayDependency(playVersion: String, echoVersion: String): ModuleID =
    if (playVersion startsWith "2.3.") "com.typesafe.trace" % ("echo-trace-play-" + playVersion) % echoVersion % EchoTraceCompile.name cross CrossVersion.binary
    else "com.typesafe.trace" % ("echo-trace-play-" + playVersion) % echoVersion % EchoTraceCompile.name cross CrossVersion.Disabled

  def supportedPlayVersion(playVersion: String): Option[String] = {
    if (playVersion startsWith "2.3.") Some(Play23Version)
    else None
  }

  def playVersionReport(playVersionOption: Option[String]): String = {
    playVersionOption match {
      case Some(playVersion) =>
        supportedPlayVersion(playVersion) match {
          case Some(supported) =>
            s"Inspect supports Play $supported and this project has compatible version $playVersion."
          case None =>
            s"This project's Play version $playVersion is not supported; supported versions are ${supportedPlayVersions.mkString(",")}"
        }
      case None =>
        s"This project does not appear to depend on any known version of Play. Supported Akka versions are ${supportedPlayVersions.mkString(",")}."
    }
  }

  def containsTracePlay(dependencies: Seq[ModuleID]): Boolean = dependencies exists { module =>
    module.organization == "com.typesafe.trace" && module.name.startsWith("echo-trace-play")
  }
}
