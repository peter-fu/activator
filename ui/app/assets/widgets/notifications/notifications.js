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
      return { id: "buildFailed", label: "Build loading has failed", url: "#build" }
    } else if(sbt.tasks.compilationErrors().length){
      var ers = sbt.tasks.compilationErrors();
      // Goto first compile error
      var url = "#code"+ fs.relative(ers[0].position.sourcePath)+":"+ers[0].position.line;
      return { id: "compilationError", label: ers.length+" compilation error(s)", url: url }
    } else if(sbt.tasks.testErrors().length){
      return { id: "testFailed", label: sbt.tasks.testErrors().length+" test(s) failed", url: "#test" }
    } else if(!websocket.isOpened()){
      return { id: "disconnected", label: "Connection lost", url: "#build" }
    } else {
      return { id: "ok", label: "Activator is running smoothly", url: "#build" }
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

  return dom = ko.bindhtml(tpl, State);

});
