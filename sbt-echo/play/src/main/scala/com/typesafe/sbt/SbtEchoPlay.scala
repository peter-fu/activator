/**
 *  Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
package com.typesafe.sbt

import sbt._
import sbt.Keys._
import play.{Play, PlayInternalKeys}
import Play.playBackgroundRunTaskBuilderWithClasspaths
import play.PlayImport._
import PlayKeys.playVersion
import sbt._
import sbt.Keys._

object SbtEchoPlay extends AutoPlugin with PlayInternalKeys {
  import SbtEcho.Echo
  import SbtEcho._
  import SbtEcho.EchoKeys._
  import echo.EchoPlayRun._
  import echo.EchoRun.EchoTraceCompile

  override def trigger = AllRequirements
  override def requires = play.Play && SbtEcho

  def javaOptions: Def.Initialize[Task[Seq[String]]] = Def.task {
    val result = echo.EchoRun.traceJavaOptions(aspectjWeaver.value, sigarLibs.value) ++
      Seq("-Daj.weaving.verbose=true", "-Dorg.aspectj.weaver.showWeaveInfo=true", "-Dorg.aspectj.tracing.debug=true", "-Dconfig.trace=loads", "-Dactivator.trace.send.warn=true", "-Dactivator.trace.report-config=true","-Dactivator.trace.debug=true")

    println(s"JavaOptions: ${result}")

    result
  }

  def echoPlayRunnerTask: Def.Initialize[Task[BackgroundJobHandle]] = Def.task {
    val jo = SbtEchoPlay.javaOptions.value
    val frClasspath = (playForkedRunnerBootstrapClasspath in Echo).value
    val dependencyClasspath = (externalDependencyClasspath in Echo).value

    println(s"echoPlayRunnerTask.frClasspath: $frClasspath")

    playBackgroundRunTaskBuilderWithClasspaths.value(jo, frClasspath, dependencyClasspath)
  }

  lazy val echoPlaySettings: Seq[Setting[_]] = echoCompileSettings ++ inConfig(Echo)(tracePlaySettings)

  def tracePlaySettings(): Seq[Setting[_]] = Seq(
    tracePlayVersion <<= playVersion map supportedPlayVersion,
    // we SHOULD require that the akka version is also supported, but commented out
    // for now because the check for akka does not chase transitive deps, so if
    // someone only explicitly depends on play, the akka code thinks we don't support akka.
    echoTraceSupported := { /* echoTraceSupported.value && */ tracePlayVersion.value.isDefined },
    echoPlayVersionReport := { playVersionReport(Some(playVersion.value)) },
    traceDependencies <++= (libraryDependencies, tracePlayVersion, echoVersion) map tracePlayDependencies,
    traceDependencies += "com.typesafe.play" %% "fork-runner" % playVersion.value % EchoTraceCompile.name,
    playForkedRunnerBootstrapDependencies := {
      val pv:String = playVersion.value
      val tpv = supportedPlayVersion(pv)
      val ev = echoVersion.value
      val pfrbd = (playForkedRunnerBootstrapDependencies in Compile).value.map(_.copy(configurations = Some(EchoTraceCompile.name)))
      val r = (pfrbd ++ tracePlayDependencies(pfrbd,tpv,ev)).toSet.toSeq

      println(s"echo:playForkedRunnerBootstrapDependencies = $r")

      r
    },
    playForkedRunnerBootstrapClasspath := {
      val types = classpathTypes.value
      val report = update.value
      val projectDir = (Keys.baseDirectory in ThisProject).value

      val r = (Classpaths.managedJars(EchoTraceCompile, types, report) :+ Attributed.blank(projectDir / "conf/application.conf")) ++ traceConfigClasspath.value

      println(s"echo:playForkedRunnerBootstrapClasspath = $r")

      r
    },
    UIKeys.backgroundRunMain in ThisProject := echoPlayRunnerTask.value,
    UIKeys.backgroundRun in ThisProject := echoPlayRunnerTask.value
  )

  override def projectSettings = echoPlaySettings
}
