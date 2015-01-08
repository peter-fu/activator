/**
 * Copyright (C) 2014 Typesafe <http://typesafe.com/>
 */
define([
  './generator',
  'services/ajax',
  'widgets/openIn/openIn'
], function (
  generator,
  fs,
  openIn
) {

  var projectFile = ".project";
  var pluginFileLocation = "/project/eclipse.sbt";
  var pluginFileContent = "// This plugin adds commands to generate IDE project files\n\n" +
    "addSbtPlugin(\"com.typesafe.sbteclipse\" % \"sbteclipse-plugin\" % \"2.5.0\")";
  var sbtCommand = "eclipse";

  var isInstalled = ko.observable(false);
  function checkInstalled() {
    fs.exists(fs.absolute(projectFile), function(r) {
      isInstalled(r.location);
    });
  }
  checkInstalled();

  var generate = function(overrideExisting) {
    if (isInstalled() && !window.confirm("Eclipse is already installed, do you want to re-grenerate the project?")) return;
    else isInstalled(false);

    generator.startProcess(
      overrideExisting,
      projectFile,
      pluginFileLocation,
      pluginFileContent,
      isInstalled,
      sbtCommand);

    openIn.Eclipse(
      function() {
        generator.resetState("");
      },
      {
        logs: generator.logs,
        isInstalled: isInstalled,
        complete: generator.complete,
        scrollMemo: ko.observable(null)
      })
  };

  return {
    generate: generate,
    isInstalled: isInstalled,
    checkInstalled: checkInstalled
  };
});
