/**
 * Copyright (C) 2014 Typesafe <http://typesafe.com/>
 */
define(['./generator', 'widgets/openIn/openIn'], function (generator, openIn) {
  var projectFile = ".project";
  var projectLocation = "/project/eclipse.sbt";
  var pluginFileContent = "addSbtPlugin(\"com.typesafe.sbteclipse\" % \"sbteclipse-plugin\" % \"2.3.0\")";
  var sbtCommand = "eclipse";

  var generate = function(overrideExisting) {
    generator.startProcess(
      overrideExisting,
      projectFile,
      projectLocation,
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
