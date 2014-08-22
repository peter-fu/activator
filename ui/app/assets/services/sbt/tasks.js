/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/websocket',
  'commons/types',
  './app'
], function(
  websocket,
  types,
  app
) {

  /**
  Temp holder for deferred possible outcomes.
  Uses the serialId as key to the deferred object.
  */
  var deferredRequests = {};
  var clientSerialId = 1;

  /*
   Simple function to create a serial id that is unique per client.
   No need to bother about atomic-ness or number overflow or similar.
   It is intentionally kept this simple until we integrate the concept of serial ids with sbt server.
   */
  function getClientSerialId() {
    return "activator" + clientSerialId++;
  }

  function sbtRequest(what, command, executionId) {
    var id = getClientSerialId();
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

  // -----------
  // Run command
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
  function possibleAutoCompletions(partialCommand) {
    var serialId = sbtRequest('PossibleAutoCompletions', partialCommand);
    var result = $.Deferred();
    deferredRequests[serialId] = result;
    return result;
  }

  // ------------------
  // Websocket Handlers
  var executionsById = {};
  var executions = ko.observableArray([]);
  var tasksById = {};

  var workingTasks = {
    compile: ko.observable(false),
    run: ko.observable(false),
    test: ko.observable(false)
  }

  function removeExecution(id, succeeded) {
    var execution = executionsById[id];
    if (execution) {
      // we want succeeded flag up-to-date when finished notifies
      execution.succeeded(true);
      execution.finished(new Date());

      var event = new CustomEvent('TaskSuccess', { detail: { command: execution.command } });
      document.body.dispatchEvent(event);

      switch(execution.command){
        case "compile":
          workingTasks.compile(false);
          break;
        case "run":
          workingTasks.run(false);
          break;
        case "test":
          workingTasks.test(false);
          break;
      }

      delete executionsById[execution.executionId];
    }
  }

  var sbtEventStream = websocket.subscribe().matchOnAttribute('type','sbt');

  var subTypeEventStream = function(subType) {
    return sbtEventStream.fork().matchOnAttribute('subType',subType);
  }

  subTypeEventStream("TaskStarted").each(function(message) {
    var execution = executionsById[message.event.executionId]
    if (execution) {
      var task = {
        execution: execution,
        taskId: message.event.taskId,
        key: message.event.key ? message.event.key.key.name : null,
        finished: ko.observable(0), // 0 here stands for no Date() object
        succeeded: ko.observable(0) // 0 here stands for no Date() object
      }
      debug && console.log("Starting task ", task);
      // we want to be in the by-id hash before we notify
      // on the tasks array
      tasksById[task.taskId] = task;
      execution.tasks.push(task);
    } else {
      debug && console.log("Ignoring task for unknown execution " + message.event.executionId)
    }
  });


  subTypeEventStream("TaskFinished").each(function(message) {
    var task = tasksById[message.event.taskId];
    if (task) {
      task.execution.tasks.remove(function(item) {
        return item.taskId == task.taskId;
      });
      // we want succeeded flag up-to-date when finished notifies
      // task.succeeded(message.event.success);
      task.finished(true);
      delete tasksById[task.taskId];
    }
  });

  subTypeEventStream("ExecutionWaiting").each(function(message) {
    var execution = {
      executionId: message.event.id,
      command: message.event.command,
      started: ko.observable(new Date()),
      finished: ko.observable(0), // 0 here stands for no Date() object
      succeeded: ko.observable(0), // 0 here stands for no Date() object
      tasks: ko.observableArray([])
    }
    execution.finished.extend({ notify: 'always' });
    execution.running = ko.computed(function() {
      return !execution.finished();
    });
    execution.error = ko.computed(function() {
      return execution.finished() && !execution.succeeded();
    });
    execution.time = ko.computed(function() {
      if (execution.finished() && execution.started()){
        return "Completed in " + Math.round((execution.finished() - execution.started()) /1000) +" s";
      } else if (execution.started()) {
        return "Running for " + Math.round((new Date() - execution.started()) /1000) +" s";
      } else {
        return "Pending...";
      }
    });
    (function timer() { // Update counters in UI
      if (!execution.finished()){
        execution.finished(0); // 0 here stands for no Date() object
        setTimeout(timer, 100)
      }
    }());

    switch(execution.command){
      case "compile":
        workingTasks.compile(true);
        break;
      case "run":
        workingTasks.run(true);
        break;
      case "test":
        testResults([]); // Reset test results
        workingTasks.test(true);
        break;
    }

    debug && console.log("Waiting execution ", execution);
    // we want to be in the by-id hash before we notify
    // on the executions array
    executionsById[execution.executionId] = execution;
    executions.push(execution);
  });

  subTypeEventStream("ExecutionStarting").each(function(message) {
    var execution = executionsById[message.event.executionId];
    if (execution) {
      execution.started(new Date());
    }
  });

  subTypeEventStream("ExecutionFailure").each(function(message) {
    removeExecution(message.event.id, false /* succeeded */);
  });

  subTypeEventStream("ExecutionSuccess").each(function(message) {
    removeExecution(message.event.id, true /* succeeded */);
  });

  var testResults = ko.observableArray([]);
  subTypeEventStream("TaskEvent").each(function(message) {
    var event = message.event;
    if (event.name === "CompilationFailure") {
      debug && console.log("CompilationFailure: ", event);
    } else if (event.name === "TestEvent") {
      debug && console.log("TestEvent: ", event);
      testResults.push(event.serialized);
    }
  });

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

  return {
    sbtRequest: sbtRequest,
    possibleAutoCompletions: possibleAutoCompletions,
    requestExecution: requestExecution,
    requestDeferredExecution: requestDeferredExecution,
    cancelExecution: cancelExecution,
    cancelDeferredExecution: cancelDeferredExecution,
    executions: executions,
    workingTasks: workingTasks,
    testResults: testResults,
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
