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

  function scrollToBottom() {
    $(".logs")[0].scrollTop = 99999;
    State.memoLogsScroll('stick');
  }

  var State = {
    memoTaskScroll: ko.observable(),
    memoLogsScroll: ko.observable(),
    sbt: sbt,
    logs: sbt.logs.logs,
    scrollToBottom: scrollToBottom,
    clear: function() {
      sbt.logs.logs.removeAll();
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
    },

    render: function(){
      sbt.events.errorCounters.build(0);
      return ko.bindhtml(tpl, State)
    }
  }

});
