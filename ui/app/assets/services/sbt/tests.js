define([
  './tasks',
  'commons/websocket'
],function(
  tasks,
  websocket
) {


  // ----------------------------------
  // GET ALL LogEvent from Execution id
  // ----------------------------------
  // var trackedExecutions = [];
  // var trackedTasks = [];
  // var logs = ko.observableArray([]);

  // var sbtEventStream = websocket.subscribe().equal('type','sbt');
  // var subTypeEventStream = function(subType) {
  //   return sbtEventStream.equal('subType',subType).fork();
  // }

  // subTypeEventStream("LogEvent").each(function(message) {
  //   if (message.event.entry.level != "debug" && trackedTasks.indexOf(message.event.taskId) >= 0){
  //     debug && console.log("log task", message.event.taskId, message);
  //     console.log(JSON.stringify(message));
  //     logs.push(message);
  //   }
  // });

  // subTypeEventStream("TaskStarted").each(function(message) {
  //   if (trackedExecutions.indexOf(message.event.executionId) >= 0){
  //     trackedTasks.push(message.event.taskId);
  //     debug && console.log("add task", message.event.taskId);
  //   }
  // });

  // subTypeEventStream("TaskFinished").each(function(message) {
  //   var index = trackedTasks.indexOf(message.event.taskId);
  //   if (index >= 0){
  //     trackedTasks.splice(index,1);
  //     debug && console.log("rem task", message.event.taskId);
  //   }
  // });

  // function removeExecution(id) {
  //   var index = trackedExecutions.indexOf(id);
  //   if (index >= 0){
  //     trackedExecutions.splice(index,1);
  //     debug && console.log("rem execution", id);
  //   }
  // }

  // subTypeEventStream("ExecutionWaiting").each(function(message) {
  //   if (message.event.command.slice(0,4) == "test" && trackedExecutions.indexOf(message.event.id) < 0){
  //     trackedExecutions.push(message.event.id);
  //     debug && console.log("add execution", message.event.id);
  //   }
  // });

  // subTypeEventStream("ExecutionFailure").each(function(message) {
  //   removeExecution(message.event.id);
  // });

  // subTypeEventStream("ExecutionSuccess").each(function(message) {
  //   removeExecution(message.event.id);
  // });














  return {
    tests:              ko.observableArray([]),
    runSelectedTests:   function() {}
  }

});
