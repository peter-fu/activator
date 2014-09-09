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

  var State = {
    memoTaskScroll: ko.observable(),
    memoLogsScroll: ko.observable(),
    sbt: sbt,
    clear: function() {
      sbt.logs.logs([]);
    },
    rerunTask: function(task) {
      if (!task.finished()){
        sbt.tasks.kill(task);
      } else {
        sbt.tasks.requestExecution(task.command);
      }
    },
  };

  return {
    render: function(){
      sbt.tasks.errorCounters.build(0);
      return ko.bindhtml(tpl, State)
    }
  }

});
