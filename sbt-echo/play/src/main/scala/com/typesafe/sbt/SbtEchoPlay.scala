/**
 *  Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
package com.typesafe.sbt

import sbt._
import sbt.Keys._
import play.{Play, PlayInternalKeys }
import play.sbt.forkrun.{ PlayForkRun, PlayForkOptions }
import play.forkrun.protocol.ForkConfig
import PlayForkRun.autoImport._
import play.PlayImport._
import PlayKeys.playVersion
import sbt._
import sbt.Keys._
import sbt.plugins.BackgroundRunPlugin
import sbt.BackgroundJobServiceKeys

object SbtEchoPlay extends AutoPlugin with PlayInternalKeys {
  import SbtEcho.Echo
  import SbtEcho._
  import SbtEcho.EchoKeys._
  import echo.EchoPlayRun._
  import echo.EchoRun.EchoTraceCompile

  override def trigger = AllRequirements
  override def requires = Play && PlayForkRun && SbtEcho && BackgroundRunPlugin

  def playTraceJavaOptionsTask: Def.Initialize[Task[Seq[String]]] = Def.task {
    echo.EchoRun.traceJavaOptions(aspectjWeaver.value, sigarLibs.value) ++
      Seq("-Dconfig.resource=application.conf")
  }

  def playForkOptionsTask: Def.Initialize[Task[PlayForkOptions]] = Def.task {
    val in = (PlayForkRunKeys.playForkOptions in ThisProject).value
    val jo = (javaOptions in Echo).value
    in.copy(jvmOptions = in.jvmOptions ++ jo,
            configKey = thisProjectRef.value.project + "/echo:" + PlayForkRunKeys.playForkConfig.key.label)
  }

  def playForkConfigTask: Def.Initialize[Task[ForkConfig]] = Def.task {
    val in = (PlayForkRunKeys.playForkConfig in ThisProject).value
    val dependencyClasspath = (externalDependencyClasspath in Echo).value.files
    in.copy(dependencyClasspath = dependencyClasspath)
   }

  lazy val echoPlaySettings: Seq[Setting[_]] = echoCompileSettings ++ inConfig(Echo)(tracePlaySettings(Runtime, EchoTraceCompile))

  def tracePlaySettings(extendConfig: Configuration, classpathConfig: Configuration): Seq[Setting[_]] = Seq(
    javaOptions <<= playTraceJavaOptionsTask,
    tracePlayVersion <<= playVersion map supportedPlayVersion,
    traceDependencies <++= (libraryDependencies, tracePlayVersion, echoVersion) map tracePlayDependencies,
    echoTraceSupported := { /* echoTraceSupported.value && */ tracePlayVersion.value.isDefined },
    echoPlayVersionReport := { playVersionReport(Some(playVersion.value)) },
    PlayForkRunKeys.playForkOptions <<= playForkOptionsTask,
    PlayForkRunKeys.playForkConfig <<= playForkConfigTask,
    BackgroundJobServiceKeys.backgroundRun in ThisProject <<= PlayForkRun.backgroundForkRunTask
  )

  override def projectSettings = echoPlaySettings
}
