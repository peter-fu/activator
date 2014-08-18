/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/utils', 'commons/streams', 'services/sbt', 'services/ajax'], function (utils, stream, sbt, ajax) {

  // available states
  var idle = 1;
  var checkingProjectFile = 2;
  var checkingCommand = 3;
  var generatingFile = 4;
  var restartingSbt = 5;
  var runningCommand = 6;

  // Modal Window
  var logs = ko.observableArray([]);
  var complete = ko.observable(false);

  var Generator = utils.Class("Generator", {
    // all the stuff in here
    init: function (args) {
      this.overrideExisting = args.overrideExisting;
      this.projectFile = args.projectFile;
      this.pluginFileLocation = args.projectFileLocation;
      this.pluginFileContent = args.pluginFileContent;
      this.sbtCommand = args.sbtCommand;
      this.processTimeoutId = -1;
      this.currentState = idle;
      this.currentExecutionId = 0;
      this.subscription = null;
    }
  });

  var setNewTimeout = function() {
    // Delete existing timeout
    clearTimeout(generator.processTimeoutId);
    // If the process takes more than n seconds we generate a message that it might be good to retry
    generator.processTimeoutId = setTimeout(function() { logs.push({message: "The process seems stuck. Press OK and please retry."})}, 60 * 1000);
  };

  var start = function() {
    // Reset any previous messages
    logs([]);
    subscribe();
    logs.push({message: "Generating files may take a while. Sit back and relax."});
    setNewTimeout();
    checkProjectFile();
  };

  var checkProjectFile = function() {
    if (generator.overrideExisting === true) {
      checkCommand();
    } else {
      if (generator.currentState !== idle) {
        logs.push({message: "Cannot start process since is already in progress."});
      } else {
        generator.currentState = checkingProjectFile;
        logs.push({message: "Looking for existing project files."});

        // Look for a ".project" file in the home directory to see if there already is an existing Eclipse project
        ajax.browse(serverAppModel.location + "/" + generator.projectFile).done(function (data) {
          resetState("Required file(s) exist. Open your IDE and import project.");
        }).error(function () {
          // No project files found - continue the process
          logs.push({message: "No project file(s) found - continuing the process."});
          checkCommand();
        });
      }
    }
  };

  var runSbtCommand = function() {
    return sbt.requestExecution(generator.sbtCommand);
  };

  var checkCommand = function() {
    generator.currentState = checkingCommand;
    logs.push({message: "Trying to run \'" + generator.sbtCommand + "\'..."});
    var result = runSbtCommand();
    result.done(function(data) {
      // Note: the result from sbt is asynchronous and the stream subscription below will continue to drive the process
      generator.currentExecutionId = data.id;
    }).fail(function() {
      resetState("Did not receive any response from server. Please try again.");
    });
  };

  var runCommand = function() {
    generator.currentState = runningCommand;
    logs.push({message: "Running the " + generator.sbtCommand + " command."});
    var result = runSbtCommand();
    result.done(function(data) {
      // Note: the result from sbt is asynchronous and the stream subscription below will continue to drive the process
      generator.currentExecutionId = data.id;
    }).fail(function() {
      resetState("Did not receive any response from server. Please try again.");
    });
  };

  var generateFile = function() {
    generator.currentState = generatingFile;
    var fileLocation = serverAppModel.location + generator.pluginFileLocation;
    logs.push({message: "Creating sbt IDE plugin file (" + fileLocation + ")."});
    ajax.create(fileLocation, false, generator.pluginFileContent).done(function () {
      // Adding the plugin file should trigger an automatic restart of sbt hence the state shift here
      // Note: the result from sbt is asynchronous and the stream subscription below will continue to drive the process
      generator.currentState = restartingSbt;
      setNewTimeout();
      logs.push({message: "Waiting for sbt to restart..."});
    }).fail(function(err) {
      resetState("Could not create sbt IDE plugin file. Please try again.");
    });
  };

  var resetState = function(msg) {
    clearInterval(generator.processTimeoutId);
    debug && console.log(msg);
    logs.push({message: msg});
    stream.unsubscribe(generator.subscription);
    generator = null;
  };

  /**
   * Subscribes to the stream to drive the process after asynchronous calls have been made to the server-side.
   */
  var subscribe = function () {
    generator.subscription = stream.subscribe({
      handler: function (msg) {
        if (msg.type === 'sbt') {
          // This is the id of the task that has been handled by sbt
          var executionId = msg.event.id;
          var subType = msg.subType;

          // State : After checking if the command is available in sbt
          if (generator.currentState === checkingCommand && generator.currentExecutionId == executionId) {
            if (subType === 'ExecutionFailure') {
              logs.push({message: "\'" + generator.sbtCommand + "\' not available, trying to add a plugin to provide it."});
              generateFile();
            } else if (subType === 'ExecutionSuccess') {
              setNewTimeout();
              logs.push({message: "\'" + generator.sbtCommand + "\' command was available and has been run."});
              resetState("Required files generated. Open your IDE and import project.");
            }
          }

          // State: After sbt restart
          else if (generator.currentState === restartingSbt && subType === "ClientOpened") {
            setNewTimeout();
            runCommand();
          }

          // State: After running the command
          else if (generator.currentState === runningCommand && generator.currentExecutionId == executionId) {
            if (subType === 'ExecutionFailure') {
              resetState("Could not run the \'" + generator.sbtCommand + "\' command. Please try again.");
            } else if (subType === 'ExecutionSuccess') {
              logs.push({message: "\'" + generator.sbtCommand + "\' command has been executed."});
              resetState("Required files generated. Open your IDE and import project.");
            }
          }
        }
      }
    });
  }

  var generator = null;
  var startProcess = function (overrideExisting, projectFile, projectFileLocation, pluginFileContent, sbtCommand) {
    if (generator !== null) {
      resetState(); // should this throw an error instead?
    }

    generator = new Generator({
      overrideExisting: overrideExisting,
      projectFile: projectFile,
      projectFileLocation: projectFileLocation,
      pluginFileContent: pluginFileContent,
      sbtCommand: sbtCommand
    });

    start();
  };

  return {
    logs: logs,
    complete: complete,
    startProcess: startProcess,
    resetState: resetState
  };
});
