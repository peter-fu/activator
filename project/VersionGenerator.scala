import sbt._
import Keys._

object VersionGenerator {
  final val fileLocation = "/target/web/public/main/public/generated/dependencies.js"

  def createInformation(path: File): Unit = {
    val content =
      s"""/**
         | * Copyright (C) 2015 Typesafe <http://typesafe.com/>
         | */
         |
         |// *** AUTO GENERATED FILE - DO NOT CHANGE ****************************
         |// This file is being generated as part of the build step in Activator.
         |// For more information see project ui in project/build.scala.
         |// ********************************************************************
         |
         |define([
         |],function (
         |) {
         |  var playVersion = "${Dependencies.play23Version}";
         |  var echoVersion = "${Dependencies.echoPluginVersion}";
         |  var ideaVersion = "${Dependencies.ideaVersion}";
         |  var eclipseVersion = "${Dependencies.eclipseVersion}";
         |  var sbtCoreNextVersion = "${Dependencies.sbtCoreNextVersion}";
         |
         |  return {
         |    playVersion: playVersion,
         |    echoVersion: echoVersion,
         |    ideaVersion: ideaVersion,
         |    eclipseVersion: eclipseVersion,
         |    sbtCoreNextVersion: sbtCoreNextVersion
         |  };
         |});""".stripMargin

    println(s"Generating file: ${path}${fileLocation}")
    Properties.writeIfChanged(file = new File(path + fileLocation), content = content)
  }
}