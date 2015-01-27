/**
 * Copyright (C) 2015 Typesafe <http://typesafe.com/>
 */
package activator

import scala.util.control.NonFatal
import activator.properties.ActivatorProperties._
import java.io.File

object RepositoryConfig {
  private val repositoriesSectionName = "repositories"

  // configure your per-user repos to have the offline
  // repo in activator.home, if possible.
  def configureUserRepositories(): Unit =
    // FIXME look at sbt.repository.config and possibly sbt.global.base
    configureUserRepositories(new File(new File(GLOBAL_USER_HOME), ".sbt/repositories"))

  // this overload exists for unit tests only
  def configureUserRepositories(repositoriesFile: java.io.File): Unit = try {
    // leave configuration alone if we don't have an offline repo, which
    // means we'll use the config embedded in the launcher by project/Packaging.scala
    if ((new java.io.File(ACTIVATOR_HOME, "repository")).exists)
      replaceSection(repositoriesFile, repositoriesSectionName, newRepositorySection _)
  } catch {
    case NonFatal(e) =>
      System.err.println(s"Configuring Activator offline repository failed: ${e.getMessage}")
  }

  private def quoteForFileURI(path: String): String = {
    val uriString = (new java.io.File(path)).toURI.toASCIIString()
    if (uriString.startsWith("file://"))
      uriString.substring("file://".length)
    else
      path // give up, hope for best?
  }

  private def newRepositorySection(oldOption: Option[Section]): Section = {
    val activatorLocalLine =
      """  activator-local: file://${activator.local.repository-""" +
        quoteForFileURI(ACTIVATOR_HOME) +
        """/repository}, [organization]/[module]/(scala_[scalaVersion]/)(sbt_[sbtVersion]/)[revision]/[type]s/[artifact](-[classifier]).[ext]"""

    oldOption match {
      case Some(old) =>
        // replace or insert the activator-local line
        val (before, after) =
          old.lines.filterNot(_.trim.startsWith("activator-local:")).partition(_.trim == "local")
        val oldLine = old.lines.find(_.trim.startsWith("activator-local:"))
        // this check is to avoid adding the comment if we haven't really changed anything
        if (oldLine != Some(activatorLocalLine))
          old.copy(lines = before ++ Seq("  # Activator added this local repository",
            activatorLocalLine) ++ after)
        else
          old
      case None =>
        // create the entire repositories section
        val allRepoLines = """  # Activator added these repositories
  local
""" + activatorLocalLine + """
  maven-central
  typesafe-releases: http://repo.typesafe.com/typesafe/releases
  typesafe-ivy-releasez: http://repo.typesafe.com/typesafe/ivy-releases, [organization]/[module]/(scala_[scalaVersion]/)(sbt_[sbtVersion]/)[revision]/[type]s/[artifact](-[classifier]).[ext]"""

        Section(repositoriesSectionName, allRepoLines.split('\n').toVector, s"[$repositoriesSectionName]")
    }
  }

  // outputting the "rawLine" followed by "lines" for each section is supposed
  // to preserve the original file
  private case class Section(name: String, lines: Vector[String], rawLine: String) {
    def isStuffBeforeFirstSection: Boolean = name.isEmpty
  }
  private object Section {
    def stuffBeforeFirstSection = Section("", Vector.empty, "")
  }

  private def sectionSplit(reader: java.io.BufferedReader): Seq[Section] = {
    // sbt parser defines a "section" as a trimmed line that starts with '['.
    // if a line that starts with '[' isn't a section, it's an error.
    def accumulate(reversedSections: List[Section], currentSection: Section): List[Section] = {
      reader.readLine() match {
        case null =>
          (currentSection :: reversedSections).reverse
        case line =>
          val trimmed = line.trim()
          if (trimmed.nonEmpty && trimmed.charAt(0) == '[') {
            val i = trimmed.indexOf(']')
            // if there's no ']' sbt throws an error, but we don't want to barf on anything here.
            val name = trimmed.substring(1, if (i >= 0) i else trimmed.length)
            accumulate(currentSection :: reversedSections, Section(name, Vector.empty, line))
          } else {
            // use original, not trimmed line because we don't want to gratuitously reformat the file
            accumulate(reversedSections, currentSection.copy(lines = currentSection.lines :+ line))
          }
      }
    }
    accumulate(Nil, Section.stuffBeforeFirstSection)
  }

  private def writeSections(writer: java.io.BufferedWriter, sections: Seq[Section]): Unit = {
    sections foreach { section =>
      if (!section.isStuffBeforeFirstSection) {
        writer.append(section.rawLine)
        writer.newLine()
      }
      section.lines.foreach { l =>
        writer.append(l)
        writer.newLine()
      }
      // put a blank line after each section even if there wasn't before
      section.lines.lastOption foreach { lastLine =>
        if (lastLine.trim.nonEmpty) {
          writer.newLine()
        }
      }
    }
  }

  private def replaceSection(sections: Seq[Section], name: String, f: Option[Section] => Section): Seq[Section] = {
    if (sections.exists(_.name == name)) {
      sections map {
        case s if s.name == name =>
          f(Some(s))
        case s => s
      }
    } else {
      sections :+ f(None)
    }
  }

  private def replaceSection(file: java.io.File, name: String, f: Option[Section] => Section): Unit = {
    val reader = try new java.io.BufferedReader(new java.io.FileReader(file))
    catch {
      case _: java.io.IOException =>
        // pretend file was empty
        new java.io.BufferedReader(new java.io.StringReader(""))
    }
    val (newSections, oldSections) = try {
      val sections = sectionSplit(reader)
      (replaceSection(sections, name, f), sections)
    } finally {
      reader.close()
    }

    // check if we won't change anything because we don't want to gratuitously
    // do file IO that might break or alter timestamps or whatever
    if (newSections != oldSections) {
      sbt.IO.createViaTemporary(file) { file =>
        // this is half-ass vs. writing and atomically renaming a tmpfile,
        // but java makes that annoying cross-platform
        val writer = new java.io.BufferedWriter(new java.io.FileWriter(file))
        try writeSections(writer, newSections)
        finally {
          writer.close()
        }
      }
    }
  }
}
