/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'main/router',
  'commons/websocket',
  'commons/types',
  './app'
], function(
  router,
  websocket,
  types,
  app
) {

  /**
  Tasks lists
  */
  var executionsById = {};
  var executions = ko.observableArray([]);
  var tasksById = {};

  /**
  Tasks status
  */
  var workingTasks = {
    compile: ko.observable(false),
    run: ko.observable(false),
    test: ko.observable(false)
  }

  /**
  Error counters
  */
  var errorCounters = {
    build: ko.observable(0),
    code:  ko.observable(0),
    run:   ko.observable(0),
    test:  ko.observable(0)
  }

  /**
  Notification list
  TODO: Improve what we display, and where it links
  */
  var notifications = ko.observableArray([]);

  /**
  Observable as an event dispatcher for complete tasks
  */
  var taskCompleteEvent = ko.observable({});
  taskCompleteEvent.extend({ notify: 'always' });
  function taskComplete(command, succeded){
    taskCompleteEvent({
      command: command,
      succeded: succeded
    });
  }

  /**
  Task Event results (compile errors and tests)
  */
  var testResults = ko.observableArray([]);
  var compilationErrors = ko.observableArray([]);
  // We use a temporary local values to avoid reseting the numbers in the UI if the errors are still here
  var testResultsAccumulator = [];
  var compilationErrorsAccumulator = [];

  /**
  Temp holder for deferred possible outcomes.
  Uses the serialId as key to the deferred object.
  */
  var deferredRequests = {};
  var clientSerialId = 1;

  function sbtRequest(what, command, executionId) {
    var id = clientSerialId++
    var request = {
      "request" : "sbt",
      "payload" : {
        "serialId": id,
        "type" : what,
        "command": command,
        "executionId": executionId
      }
    };
    websocket.send(request);
    return id;
  }

  /**
   * Returns the client serial id used for this action.
   */
  function requestExecution(command) {
    if (command == "run") {
      command = runCommand(); // typing 'run' execute runMain
    }

    return sbtRequest('RequestExecution', command);
  }

  /**
  Run command
  */
  var runCommand = ko.computed(function() {
    if (app.currentMainClass()){
      return "runMain "+ app.currentMainClass();
    }
    else {
      return "run";
    }
  });

  /**
   * Returns the result of the execution directly (deferred).
   * Use only when the caller must get the result back in "this" call.
   * Default should be to use "requestExection" as this has better overall performance.
   */
  function requestDeferredExecution(command) {
    var serialId = requestExecution(command);
    var result = $.Deferred();
    deferredRequests[serialId] = result;
    return result;
  }

  /**
   * Returns the client serial id used for this action.
   */
  function cancelExecution(id) {
    return sbtRequest('CancelExecution', "", id);
  }

  /**
   * Returns the result of the cancel execution directly (deferred).
   * Use only when the caller must get the result back in "this" call.
   * Default should be to use "cancelExection" as this has better overall performance.
   */
  function cancelDeferredExecution(id) {
    var serialId = cancelExecution(id);
    var result = $.Deferred();
    deferredRequests[serialId] = result;
    return result;
  }

  /**
   * Uses a deferred object to "wait" for the result to come back from the server.
   * In other words the caller of this method can expect a result back.
   * See method 'subTypeEventStream("PossibleAutoCompletions")' below for more information about the result layout.
   */
  function deferredPossibleAutoCompletions(partialCommand) {
    var serialId = sbtRequest('PossibleAutoCompletions', partialCommand);
    var result = $.Deferred();
    deferredRequests[serialId] = result;
    return result;
  }

  var sbtEventStream = websocket.subscribe('type','sbt');
  var subTypeEventStream = function(subType) {
    return sbtEventStream.matchOnAttribute('subType',subType);
  }

  // Tasks complete
  subTypeEventStream("TaskEvent").each(function(message) {
    var event = message.event;

    if (event.name === "CompilationFailure") {
      debug && console.log("CompilationFailure: ", event);
      compilationErrorsAccumulator.push(event.serialized);
    } else if (event.name === "TestEvent") {
      debug && console.log("TestEvent: ", event);
      testResults.push(event.serialized);
    }
  });

  subTypeEventStream("ExecutionWaiting").each(function(message) {

    var execution = new Execution(message);
    debug && console.log("Waiting execution ", execution);
    // we want to be in the by-id hash before we notify
    // on the executions array
    executionsById[execution.executionId] = execution;
    executions.push(execution);

    // Increment active tasks (to make icons glowing)
    switch(execution.command){
      case "compile":
        // Reset the compilation errors
        compilationErrorsAccumulator = [];
        workingTasks.compile(workingTasks.compile()+1);
        break;
      case "run":
        workingTasks.run(workingTasks.run()+1);
        break;
      case "test":
        testResults([]); // Reset test results
        workingTasks.test(workingTasks.test()+1);
        break;
    }
  });

  subTypeEventStream("ExecutionStarting").each(function(message) {
    var execution = executionsById[message.event.executionId];
    if (execution) {
      execution.started(new Date());
    }
  });

  subTypeEventStream("ExecutionFailure").each(handleSuccessOrFailure);
  subTypeEventStream("ExecutionSuccess").each(handleSuccessOrFailure);
  function handleSuccessOrFailure(message){
    var id = message.event.id;
    var succeeded = message.subType == "ExecutionSuccess";
    var execution = executionsById[id];

    if (!execution) throw "No execution for this id."
    // we want succeeded flag up-to-date when finished notifies
    execution.succeeded(succeeded);
    execution.finished(new Date());

    taskComplete(execution.command, succeeded); // Throw an event

    // Decrement active tasks (to stop icons glowing if no pending task ;; if counter is 0)
    switch(execution.command){
      case "compile":
        workingTasks.compile(workingTasks.compile()-1);
        break;
      case "run":
        workingTasks.run(workingTasks.run()-1);
        break;
      case "test":
        workingTasks.test(workingTasks.test()-1);
        break;
    }

    // Update counters
    if (execution.command == "compile"){
      compilationErrors(compilationErrorsAccumulator);
      errorCounters.code(compilationErrorsAccumulator.length);
    }
    // Failed tasks
    if (!succeeded){
      if (execution.command == "run" && router.current().id != "run"){
        errorCounters.run(errorCounters.run()+1);
        new Notification("Runtime error", "#run/", "run");
      } else if (execution.command == "test"  && router.current().id != "test"){
        errorCounters.test(errorCounters.test()+1);
        new Notification("Test failed", "#test/results", "test");
      } else if (router.current().id != "build"){
        errorCounters.build(errorCounters.build()+1);
        new Notification("Build error", "#build/tasks", "build");
      }
    }

    delete executionsById[id];
    return execution;
  }

  subTypeEventStream("BuildStructureChanged").each(function(message) {
    var projects = message.event.structure.projects;
    if (projects !== undefined && projects.length > 0) {
      app.removeExistingProjects();

      $.each(projects, function(i, v) {
        app.projects.push(v.id.name);
      });

      // FIXME : is there any way to get the current project from the build structure?
      // Right now we just say that the first project in the list also is the current one.
      app.currentProject(app.projects()[0]);
    }
  });

  subTypeEventStream("ClientOpened").each(function(message) {
    debug && console.log("Client opened");
  });

  subTypeEventStream("RequestExecution").each(function(message) {
    debug && console.log("Received request execution result", message);

    var req = deferredRequests[message.serialId];
    if (req !== undefined) {
      delete deferredRequests[message.serialId];
      req.resolve({"result": message.result});
    }
  });

  subTypeEventStream("CancelExecution").each(function(message) {
    debug && console.log("Received cancel execution result", message);

    var req = deferredRequests[message.serialId];
    if (req !== undefined) {
      delete deferredRequests[message.serialId];
      req.resolve({"result": message.result});
    }
  });

  subTypeEventStream("PossibleAutoCompletions").each(function(message) {
    debug && console.log("Received possible auto completions", message);

    var pac = deferredRequests[message.serialId]
    if (pac !== undefined) {
      delete deferredRequests[message.serialId];
      pac.resolve(
        $.map(message.result, function(completion) {
        return {
          title: completion.display,
          subtitle: "run sbt task " + completion.display,
          type: "Sbt",
          url: false,
          execute: message.partialCommand + completion.append,
          callback: function () {
            requestExecution(message.partialCommand + completion.append);
          }
        }
      }));
    }
  });

  var valueChanged = subTypeEventStream("ValueChanged").map(function(message) {
    return {
      key: message.event.key.key.name,
      value: message.event.value.value
    }
  });

  // discoveredMainClasses
  valueChanged.matchOnAttribute('key', 'discoveredMainClasses').each(function(message) {
    app.mainClasses(message.value); // All main classes
    if (!app.currentMainClass() && message.value[0]){
      app.currentMainClass(message.value[0]); // Selected main class, if empty
    }
  });

  /**
  Execution object constructor
  */
  function Execution(message) {
    var self = this;
    if (message.event.command[0] == "{"){
      // Get rid of {file://path/to/project} in task names
      message.event.command = message.event.command.replace(/\{.*\}/ig, "");
    }

    self.executionId = message.event.id;
    self.command     = message.event.command;
    self.started     = ko.observable(new Date());
    self.finished    = ko.observable(0); // 0 here stands for no Date() object, yet
    self.finished.extend({ notify: 'always' });
    self.succeeded   = ko.observable();

    self.running = ko.computed(function() {
      return !self.finished();
    });
    self.error = ko.computed(function() {
      return self.finished() && !self.succeeded();
    });
    self.time = ko.computed(function() {
      if (self.finished() && self.started()){
        return "Completed in " + Math.round((self.finished() - self.started()) /1000) +" s";
      } else if (self.started()) {
        return "Running for " + Math.round((new Date() - self.started()) /1000) +" s";
      } else {
        return "Pending...";
      }
    });

    // Update counters in UI
    (function timer() {
      if (!self.finished()){
        self.finished(0); // Force the update of the counter
        setTimeout(timer, 100)
      }
    }());
  }

  /**
  Notification object constructor
  */
  function Notification(text, link, type) {
    this.text = text;
    this.link = link;
    this.type = type;
    this.read = ko.observable(false);
    notifications.unshift(this);
  }

  return {
    sbtRequest:              sbtRequest,
    deferredPossibleAutoCompletions: deferredPossibleAutoCompletions,
    requestExecution:        requestExecution,
    requestDeferredExecution: requestDeferredExecution,
    cancelExecution:         cancelExecution,
    cancelDeferredExecution: cancelDeferredExecution,
    executions:              executions,
    workingTasks:            workingTasks,
    testResults:             testResults,
    compilationErrors:       compilationErrors,
    errorCounters:           errorCounters,
    taskCompleteEvent:       taskCompleteEvent,
    notifications:           notifications,
    active: {
      turnedOn:     "",
      compiling:    "",
      running:      "",
      testing:      ""
    },
    actions: {
      turnOnOff:    function() {},
      compile:      function() {
        requestExecution("compile");
      },
      run:          function() {
        requestExecution('run');
      },
      test:         function() {
        requestExecution("test");
      }
    }
  }

});
