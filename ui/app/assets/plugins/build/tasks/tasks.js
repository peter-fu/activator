/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "services/sbt",
  "main/plugins",
  "text!./tasks.html",
  "css!./tasks",
  "css!widgets/modules/modules"
], function(
  sbt,
  plugins,
  tpl
) {

  function openLogs(data) {
    window.location.hash = "#build/tasks/"+data.executionId;
  }
  function closeLogs() {
    window.location.hash = "#build/tasks/";
  }
  var currentExecution = ko.observable(0);

  function scrollToBottom() {
    $(".logs")[0].scrollTop = 9e9;
    State.memoLogsScroll('stick');
  }

  function selectedExecution(m) {
    return currentExecution() === 0 || m.executionId === currentExecution();
  }

  // logs for the currently-selected execution.
  var logs = ko.observableArray();
  // id the logs above go with, so we know if it
  // needs to be updated. 0 = unfiltered.
  var logsExecutionId = 0;

  function reloadLogsIfOutdated() {
    // if currentExecution is 0, we show all logs
    var currentId = currentExecution();
    if (logsExecutionId !== currentId) {
      sbt.app.settings.showLogDebug();
      // This is super-expensive, so it's vital NOT to do it
      // every time there's a new log message (or we get
      // N-squared complexity and performance fallover).
      logsExecutionId = currentId;
      logs(sbt.logs.logs().filter(selectedExecution));
    }
  }

  currentExecution.subscribe(function(newCurrentExecution) {
    reloadLogsIfOutdated();
  });

  // we know that the logs for a given task are append-only,
  // so on each addition to the global logs, we can append
  // to the task log. We can ignore deletions here because
  // we never delete from the logs for a task.
  // There's a Knockout Projections library which would
  // do this for us more cleanly, but seems like overkill
  // for the moment when we can do this simply.
  sbt.logs.logs.subscribe(function(changes) {
    changes.forEach(function(change) {
      if (change.status === 'added') {
        if (selectedExecution(change.value))
          logs.push(change.value);
      }
    });
  }, null, "arrayChange");

  var State = {
    memoTaskScroll: ko.observable(),
    memoLogsScroll: ko.observable(),
    sbt: sbt,
    openLogs: openLogs,
    closeLogs: closeLogs,
    logs: logs,
    currentExecution: currentExecution,
    scrollToBottom: scrollToBottom,
    clear: function() {
      sbt.logs.logs([]);
    },
    rerunTask: function(task, e) {
      e.preventDefault();
      e.stopPropagation();
      if (!task.finished()){
        sbt.tasks.kill(task);
      } else {
        sbt.tasks.requestExecution(task.command);
      }
    },
  };

  return {
    route: function(url, breadcrumb) {
      if (url.parameters){
        currentExecution(url.parameters[0])
      } else {
        currentExecution(null);
      }
    },

    render: function(){
      sbt.events.errorCounters.build(0);
      return ko.bindhtml(tpl, State)
    }
  }

});
