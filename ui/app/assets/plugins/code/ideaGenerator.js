/**
 * Copyright (C) 2014 Typesafe <http://typesafe.com/>
 */
define(['./generator', 'widgets/openIn/openIn'], function (generator, openIn) {
  var projectFile = ".idea";
  var projectLocation = "/project/idea.sbt";
  var pluginFileContent = "addSbtPlugin(\"com.github.mpeltonen\" % \"sbt-idea\" % \"1.6.0\")";
  var sbtCommand = "gen-idea";

  var generate = function(overrideExisting) {
    generator.startProcess(
      overrideExisting,
      projectFile,
      projectLocation,
      pluginFileContent,
      sbtCommand);

    openIn.Idea(
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
