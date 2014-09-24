/**
 * Copyright (C) 2014 Typesafe <http://typesafe.com/>
 */
define(['./generator', 'widgets/openIn/openIn'], function (generator, openIn) {
  var projectFile = ".project";
  var pluginFileLocation = "/project/eclipse.sbt";
  var pluginFileContent = "// This plugin adds commands to generate IDE project files\n\n" +
    "addSbtPlugin(\"com.typesafe.sbteclipse\" % \"sbteclipse-plugin\" % \"2.5.0\")";
  var sbtCommand = "eclipse";

  var generate = function(overrideExisting) {
    generator.startProcess(
      overrideExisting,
      projectFile,
      pluginFileLocation,
      pluginFileContent,
      sbtCommand);

    openIn.Eclipse(
      function() { generator.resetState(""); },
      {
        logs: generator.logs,
        complete: generator.complete
      })
  };

  return {
    generate: generate
  };
});
