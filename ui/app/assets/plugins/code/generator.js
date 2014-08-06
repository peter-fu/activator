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
      var self = this;
      this.overrideExisting = args.overrideExisting;
      this.projectFile = args.projectFile;
      this.pluginFileLocation = args.projectFileLocation;
      this.pluginFileContent = args.pluginFileContent;
      this.sbtCommand = args.sbtCommand;
      this.processTimeIntervalId = -1;
      this.currentState = idle;
      this.currentProcessId = 0;
      this.subscription = null;
    }
  });

  var setNewTimeout = function() {
    // Delete existing timeout
    clearInterval(generator.processTimeIntervalId);
    // If the process takes more than n seconds we generate a message that it might be good to retry
    generator.processTimeIntervalId = setInterval(function() { logs.push({message: "The process seems stuck. Press OK and please retry."})}, 120 * 1000);
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
        logs.push({message: "Looking for an existing project files."});

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
    logs.push({message: "Checking if the " + generator.sbtCommand + " command is available in sbt..."});
    var result = runSbtCommand();
    result.done(function(data) {
      generator.currentProcessId = data.id;
    }).fail(function() {
      resetState("Did not receive any response from server. Please try again.");
    });
  };

  var runCommand = function() {
    generator.currentState = runningCommand;
    logs.push({message: "Running the " + generator.sbtCommand + " command."});
    var result = runSbtCommand();
    result.done(function(data) {
      generator.currentProcessId = data.id;
    }).fail(function() {
      resetState("Did not receive any response from server. Please try again.");
    });
  };

  var generateFile = function() {
    generator.currentState = generatingFile;
    var fileLocation = serverAppModel.location + generator.pluginFileLocation;
    logs.push({message: "Creating sbt IDE plugin file (" + fileLocation + ")."});
    ajax.createContent(fileLocation, generator.pluginFileContent).done(function () {
      // Adding the plugin file should trigger an automatic restart of sbt hence the state shift here
      generator.currentState = restartingSbt;
      setNewTimeout();
      logs.push({message: "Waiting for sbt to restart"});
    }).fail(function(err) {
      resetState("Could not create sbt IDE plugin file. Please try again.");
    });
  };

  var resetState = function(msg) {
    clearInterval(generator.processTimeIntervalId);
    debug && console.log(msg);
    logs.push({message: msg});
    generator.currentState = idle;
    generator.currentProcessId = 0;
    stream.unsubscribe(generator.subscription);
    // theGenerator = null ?
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

          // State : After checking if the 'eclipse' command is available in sbt
          if (generator.currentState === checkingCommand && generator.currentProcessId == executionId) {
            if (subType === 'ExecutionFailure') {
              logs.push({message: "Command not available - trying to add it."});
              generateFile();
            } else if (subType === 'ExecutionSuccess') {
              setNewTimeout();
              logs.push({message: "sbt command existed and has been executed."});
              resetState("Required files generated. Open your IDE and import project.");
            }
          }

          // State: After sbt restart
          else if (generator.currentState === restartingSbt && subType === "ClientOpened") {
            setNewTimeout();
            runCommand();
          }

          // State: After executing the eclipse command
          else if (generator.currentState === runningCommand && generator.currentProcessId == executionId) {
            if (subType === 'ExecutionFailure') {
              resetState("Could not run the eclipse command. Please try again.");
            } else if (subType === 'ExecutionSuccess') {
              logs.push({message: "eclipse sbt command has been executed."});
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
