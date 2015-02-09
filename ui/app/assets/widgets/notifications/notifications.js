/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt',
  'commons/websocket',
  'services/ajax',
  'text!./notifications.html',
  'css!widgets/buttons/dropdown',
  'css!./notifications',
  'css!widgets/stickers/stickers'
], function(
  sbt,
  websocket,
  fs,
  tpl
){

  var appStatus = ko.computed(function() {
    if(!sbt.tasks.buildReady()){
      return { id: "buildFailed", label: "Build loading has failed", url: "#build/tasks" }
    } else if(sbt.tasks.compilationErrors().length){
      var errors = sbt.tasks.compilationErrors();
      // Go to first compile error (if position information exists)
      var url = "#build/tasks";
      if (errors[0].position) {
        url = "#code"+ fs.relative(errors[0].position.sourcePath)+":"+errors[0].position.line;
      }
      var label = " compilation error(s)";
      if (errors[0].severity === "Warn") {
        label = " compilation warning(s)";
      }
      return { id: "compilationError", label: errors.length+label, url: url }
    } else if(sbt.tasks.testErrors().length){
      return { id: "testFailed", label: sbt.tasks.testErrors().length+" test(s) failed", url: "#test" }
    } else if(!websocket.isOpened()){
      return { id: "disconnected", label: "Connection lost", url: "#build/tasks" }
    } else if(sbt.tasks.applicationNotReady()){
      return { id: "activity", label: "Building project", url: "#build/tasks" }
    } else if(sbt.tasks.workingTasks.compile()){
      return { id: "activity", label: "Compiling project", url: "#build/tasks" }
    } else if(sbt.tasks.workingTasks.test()){
      return { id: "activity", label: "Testing project", url: "#build/test" }
    } else if(sbt.tasks.workingTasks.run()){
      return { id: "activity", label: "Running project", url: "#build/run" }
    } else {
      return { id: "ok", label: "Activator is running smoothly", url: "#build/tasks" }
    }
  });

  var State = {
    appStatus: appStatus,
    unreadBuildErrors: sbt.events.unreadBuildErrors,
    notifications: sbt.events.notifications,
    notificationsReadCount: ko.computed(function() {
      return sbt.events.notifications().filter(function(n) {
        return !n.read();
      }).length;
    }),
    markAsRead: function() {
      sbt.events.notifications().forEach(function(n) {
        n.read(true);
      });
    }
  }

  sbt.tasks.taskCompleteEvent.subscribe(function(e) {
    var el = $("#notifications ."+(e.succeded?"success":"error")).removeClass('animate');
    setTimeout(function(){
      el.addClass('animate');
    },50);
  })

  return ko.bindhtml(tpl, State);

});
