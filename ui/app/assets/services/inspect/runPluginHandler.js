/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
    'commons/utils',
    'commons/websocket',
    'services/sbt',
    'services/ajax',
    'widgets/openIn/openIn',
    "services/sbt"],
  function (
    utils,
    websocket,
    sbt,
    ajax,
    openIn,
    sbt) {

    // plugin information
    var backgroundRunPluginFileLocation = "/project/background.sbt";
    var backgroundRunPluginFileContent = "addSbtPlugin(\"com.typesafe.sbtrc\" % \"ui-interface-0-13\" % \"1.0-d5ba9ed9c1d31e3431aeca5e429d290b56cb0b14\")";

    var echoPluginFileLocation = "/project/echo.sbt";
    var echoPluginFileContent = "addSbtPlugin(\"com.typesafe.sbt\" % \"sbt-echo\" % \"0.1.6\")";

    // Is this safe to do, i.e. is the location and name always the same for an Activator project?
    var buildFileLocation = "/build.sbt";
    var buildFileEchoSettings = "\n\nechoSettings";

    var logs = ko.observableArray([]);
    var complete = ko.observable(false);

    var voidMode = 0;
    var listenMode = 1;
    var mode = voidMode;

    var pluginInstance = null;

    var RunPluginHandler = utils.Class("RunPluginHandler", {
      init: function (args) {
        this.subscription = websocket.subscribe('type', 'sbt');
        initializeSubscriptions(this.subscription);
      }
    });

    var initializeSubscriptions = function (s) {
      s.matchOnAttribute('subType', 'ExecutionFailure').each(function (msg) {
        failureExecutionHandler(msg);
      });
      s.matchOnAttribute('subType', 'ExecutionSuccess').each(function (msg) {
        successExecutionHandler(msg);
      });
      s.matchOnAttribute('subType', 'ClientOpened').each(function (msg) {
        clientOpenedHandler(msg);
      });
    };

    var failureExecutionHandler = function (msg) {
      if (mode === listenMode) {
        logs.push({message: "Required Inspect plugin missing. Adding it, please wait."});
        openIn.Inspect(
          function() { reset(); },
          {
            logs: logs,
            complete: complete
          });

        // TODO : we should only add these files if the project is an Akka or Play project...
        appendFileContent(buildFileLocation, buildFileEchoSettings);
        generateFile(backgroundRunPluginFileLocation, backgroundRunPluginFileContent);
        generateFile(echoPluginFileLocation, echoPluginFileContent);

        logs.push({message: "Plugin files added, now waiting for sbt to restart."});
        logs.push({message: "This window will automatically close when the sbt restart is done."});
      }
    };

    var successExecutionHandler = function (msg) {
      // TODO : check what the execution is all about to determine if we're all good or not...
      mode = voidMode;
      reset();
      // TODO : just show some info about how to proceed
    };

    /**
     * sbt has been restarted with the new plugins loaded.
     * close modal window and re-run sbt run command.
     */
    var clientOpenedHandler = function (msg) {
      if (mode === listenMode) {
        openIn.CloseModalWindow();
        sbt.tasks.actions.run();
        reset();
      }
    };

    var generateFile = function(fileName, fileContent) {
      var fileLocation = serverAppModel.location + fileName;
      ajax.create(fileLocation, false, fileContent).done(function () {
        // No need to do anything specific here as we listen to sbt changes triggered by this change
      }).fail(function(e) {
        logs.push({message : "Could not generate required plugin file(s). Please retry running."});
      });
    };

    var appendFileContent = function(fileName, fileContent) {
      var fileLocation = serverAppModel.location + fileName;
      ajax.append(fileLocation, fileContent).done(function () {
        // No need to do anything specific here as we listen to sbt changes triggered by this change
      }).fail(function (e) {
        logs.push({message : "Could not append the build.sbt with plugin information. Please retry running."});
      });
    };

    var running = function () {
      pluginInstance = new RunPluginHandler();
      mode = listenMode;
    };

    var reset = function () {
      logs([]);
      mode = voidMode;
      pluginInstance = null;
    };

    return {
      running: running
    };
});
