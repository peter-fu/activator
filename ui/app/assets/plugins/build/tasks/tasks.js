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
  var currentExecution = ko.observable();

  function scrollToBottom() {
    $("ul.logs")[0].scrollTop = 9e9;
    State.memoLogsScroll('stick');
  }

  function selectedTask(m) {
    return !currentExecution() || m.executionId == currentExecution();
  }

  var logs = ko.computed(function() {
    sbt.app.settings.showLogDebug();
    return sbt.logs.logs().filter(selectedTask);
  })

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
        currentExecution(null)
      }
    },

    render: function(){
      sbt.tasks.errorCounters.build(0);
      return ko.bindhtml(tpl, State)
    }
  }

});
