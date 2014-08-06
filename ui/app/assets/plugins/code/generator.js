/**
 * Copyright (C) 2014 Typesafe <http://typesafe.com/>
 *
 * Base functionality responsible for creating IDE project files.
 * There are a couple of states that the generation goes through, some of which are callbacks from the sbt-server and some direct request/response calls.
 * This functionality should be used from a concrete IDE implementation (Eclipse/IDEA).
 * The concrete implementation will provide specific information about what command, files, etc to use in the process.
 *
 * Basically the steps that the process goes through are:
 * 1. check for existing project files (and abort if it exists)
 * 2. check if the sbt 'eclipse'/'gen-idea' command is available (to determine if the IDE sbt plugin is available)
 *    a. if available, invoke command and terminate process
 *    b. if not, add an idea.sbt file to the project
 * 3. restart sbt server (to pick up the new plugin information)
 * 4. run IDE sbt command to generate files
 *
 * The process continuously keeps track of what state is in and provides feedback to the UI what is going on.
 */
define(['commons/streams', 'services/sbt', 'services/ajax'], function (stream, sbt, ajax) {
  var projectFile;
  var pluginFileLocation;
  var pluginFileContent;
  var sbtCommand;

  // available states
  var idle = 1;
  var checkingProjectFile = 2;
  var checkingCommand = 3;
  var generatingFile = 4;
  var restartingSbt = 5;
  var runningCommand = 6;

  // State flags used to drive the process
  var currentState = idle;

  // Modal Window
  var logs = ko.observableArray([]);
  var complete = ko.observable(false);

  var processTimeIntervalId = 0;

  var setNewTimeout = function() {
    // Delete existing timeout
    clearInterval(processTimeIntervalId);
    // If the process takes more than n seconds we generate a message that it might be good to retry
    processTimeIntervalId = setInterval(function() { logs.push({message: "The process seems stuck. Press OK and please retry."})}, 120 * 1000);
  };

  var startProcess = function(overrideExisting, projFile, projLocation, pluginContent, sbtCmd) {
    projectFile = projFile;
    pluginFileLocation = projLocation;
    pluginFileContent = pluginContent;
    sbtCommand = sbtCmd;

    // Reset any previous messages
    logs([]);
    logs.push({message: "Generating files may take a while. Sit back and relax."});
    setNewTimeout();
    checkProjectFile(overrideExisting);
  };

  var checkProjectFile = function(overrideExisting) {
    if (overrideExisting === true) {
      checkCommand();
    } else {
      if (currentState !== idle) {
        logs.push({message: "Cannot start process since is already in progress."});
      } else {
        currentState = checkingProjectFile;
        logs.push({message: "Looking for an existing project files."});

        // Look for a ".project" file in the home directory to see if there already is an existing Eclipse project
        ajax.browse(serverAppModel.location + "/" + projectFile).done(function (data) {
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
    return sbt.requestExecution(sbtCommand);
  };

  var checkCommand = function() {
    currentState = checkingCommand;
    logs.push({message: "Checking if the " + sbtCommand + " command is available in sbt..."});
    var result = runSbtCommand();
    if (result === undefined) {
      resetState("Did not receive any response from server. Please try again.");
    }
  };

  var runCommand = function() {
    currentState = runningCommand;
    logs.push({message: "Running the " + sbtCommand + " command."});
    var result = runSbtCommand();
    if (result === undefined) {
      resetState("Did not receive any response from server. Please try again.");
    }
  };

  var generateFile = function() {
    currentState = generatingFile;
    var fileLocation = serverAppModel.location + pluginFileLocation;
    logs.push({message: "Creating sbt IDE plugin file (" + fileLocation + ")."});
    ajax.createContent(fileLocation, pluginFileContent).done(function () {
      restartSbt();
    }).fail(function(err) {
      resetState("Could not create sbt IDE plugin file. Please try again.");
    });
  };

  var restartSbt = function() {
    currentState = restartingSbt;
    // TODO: do we want to trigger an explicit restart or should the fact that a plugin file has been created trigger this automatically?
    // This has been implemented since the continuous restarting of sbt-server seemed to screw up the functionality of it
    setNewTimeout();
    logs.push({message: "Restarting sbt"});
    sbt.requestRestart();
  };

  var resetState = function(msg) {
    clearInterval(maxProcessTime);
    debug && console.log(msg);
    logs.push({message: msg});
    currentState = idle;
  };

  /**
   * Subscribes to the stream to drive the process after asynchronous calls have been made to the server-side.
   */
  stream.subscribe({
    handler: function (msg) {
      if (msg.type === 'sbt') {
        // State : After checking if the 'eclipse' command is available in sbt
        if (currentState === checkingCommand) {
          if (msg.subType === 'ExecutionFailure') {
            logs.push({message: "Command not available - trying to add it."});
            generateFile();
          } else if (msg.subType === 'ExecutionSuccess') {
            setNewTimeout();
            logs.push({message: "sbt command existed and has been executed."});
            resetState("Required files generated. Open your IDE and import project.");
          }
        }
        // State: After sbt restart
        else if (currentState === restartingSbt) {
          // TODO: implement a better indicator of a restart on the sbt-rc side
          // TODO: the string parsing below is only a temp solution to close the whole chain
          if (msg.event.entry.message.indexOf("Opened sbt") > -1) {
            setNewTimeout();
            runCommand();
          }
        }
        // State: After executing the eclipse command
        else if (currentState === runningCommand) {
          console.log("*** msg: ", msg);
          if (msg.subType === 'ExecutionFailure') {
            resetState("Could not run the eclipse command. Please try again.");
          } else if (msg.subType === 'ExecutionSuccess') {
            logs.push({message: "eclipse sbt command has been executed."});
            resetState("Required files generated. Open your IDE and import project.");
          }
        }
      }
    }
  });

  return {
    logs: logs,
    complete: complete,
    startProcess: startProcess,
    resetState: resetState
  };
});
