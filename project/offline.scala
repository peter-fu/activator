import java.io.FileInputStream

import sbt._
import Keys._

import SbtSupport.sbtLaunchJar
import LocalTemplateRepo.localTemplateCacheCreated
import Packaging.localRepoCreated

object offline {
  
  val runOfflineTests = TaskKey[Unit]("offline-tests", "runs tests to ensure templates can work with the offline repository.")
  
  // set up offline repo tests as integration tests.
  def settings: Seq[Setting[_]] = Seq(
    runOfflineTests <<= (localTemplateCacheCreated in TheActivatorBuild.localTemplateRepo,
                         target,
                         localRepoCreated in TheActivatorBuild.dist,
                         sbtLaunchJar,
                         streams) map offlineTestsTask,
    integration.tests <<= runOfflineTests
  )
  
  def offlineTestsTask(templateRepo: File, targetDir: File, localIvyRepo: File, launcher: File, streams: TaskStreams): Unit = {
    val testDir = new File(targetDir, "to-try-updating")
    if (testDir.exists) {
      streams.log.info(s"Deleting ${testDir}")
      IO.delete(testDir)
    }
    streams.log.info(s"Creating template projects to try updating in ${testDir}")
    IO.copyDirectory(templateRepo, testDir)
    runofflinetests(testDir, localIvyRepo, launcher, streams.log)
  }
  
  def runofflinetests(testDir: File, localIvyRepo: File, launcher: File, log: sbt.Logger): Unit = {
    val results =
      for {
        projectInfo <- findAndRenameTestDirs(testDir)
        name = projectInfo._2
        _ = log.info("[OFFLINETEST]")
        _ = log.info("[OFFLINETEST]")
        _ = log.info("[OFFLINETEST] Running offline update test for template: " + name)
        _ = log.info("[OFFLINETEST]")
        _ = log.info("[OFFLINETEST]")
        result = runTest(localIvyRepo, testDir, projectInfo._1, projectInfo._2, launcher, log)
      } yield name -> result
    // TODO - Recap failures!
    if(results exists (_._2 != true)) {
      val failureCount = results.filterNot(_._2).length
      log.info("[OFFLINETEST] " + failureCount + " failures in " + results.length + " tests...")
      for((name, result) <- results) {
        log.info(" [OFFLINETEST] " + name + " - " + (if (result) "SUCCESS" else "FAILURE"))
      }
      log.info(s"[OFFLINETEST] Problems and dependency graph from building the local repository are in ${localIvyRepo.getParentFile}/local-repo-deps.txt")
      log.info(s"[OFFLINETEST] Problems compiling the individual templates are in the logs above")
      log.info(s"[OFFLINETEST] Projects we tried to update are in ${testDir}")
      val failures = results.filter(_._2 != true).map(_._1).mkString(", ")
      log.info(s"[OFFLINETEST] Failed-to-update projects: " + failures)
      sys.error("Offline tests were unsuccessful: " + failures)
    } else {
      log.info("[OFFLINETEST] " + results.length + " tests successful.")
    }
    ()
  }

  def findAndRenameTestDirs(root: File): Seq[(File, String)] = {
    // extract the template name from the activator.properties file
    def extractTemplateName(file: File): String = {
      val fis = new FileInputStream(file.getAbsolutePath)
      try {
        val properties = new java.util.Properties
        properties.load(fis)
        properties.getProperty("name")
      } finally {
        fis.close()
      }
    }

    for {
      dir <- (root.***).get
      if (dir / "project/build.properties").exists
      if (dir / "activator.properties").exists
      projectName = extractTemplateName((dir / "activator.properties").getAbsoluteFile)
      // rename UUID dir to project name dir
      niceDir = new File(dir.getParentFile(), projectName)
    } yield {
      IO.move(dir, niceDir)
      (niceDir, projectName)
    }
  }
  
  def runTest(localIvyRepo: File, testDir: File, template: File, templateName: String, launcher: File, log: sbt.Logger): Boolean = {
    val repoFile = new File(testDir, templateName + "-repo.properties")
    makeRepoFile(repoFile, localIvyRepo)
    log.info(s"Offline repo config for $templateName is in $repoFile")
    def sbt(args: String*) = runSbt(launcher, repoFile, template, log)(args)
    sbt("update")
  }
  
  def runSbt(launcher: File, repoFile: File, cwd: File, log: sbt.Logger)(args: Seq[String]): Boolean = 
    IO.withTemporaryDirectory { globalBase =>
      val jvmargs = Seq(
        "-Dsbt.repository.config="+repoFile.getCanonicalPath,
        "-Dsbt.override.build.repos=true",
        // TODO - Enough for fresh cache?
        "-Dsbt.ivy.home="+(globalBase / ".ivy2").getAbsolutePath,
        // TODO - we should consolidate on the two supported sbt versoins if we can.
        "-Dsbt.global.base="+globalBase.getAbsolutePath
      )
      val cmd = Seq("java") ++ jvmargs ++ Seq("-jar", launcher.getCanonicalPath) ++ args
      Process(cmd, cwd) ! log match {
        case 0 => true
        case n => false
      }
    }
  
  def makeRepoFile(props: File, localIvyRepo: File): Unit = {
    // TODO - Don't hardcode the props file!
    IO.write(props,
"""
[repositories]
  activator-local: %s, [organization]/[module]/(scala_[scalaVersion]/)(sbt_[sbtVersion]/)[revision]/[type]s/[artifact](-[classifier]).[ext]
""" format(localIvyRepo.getCanonicalFile.toURI.toString))
  }
}
