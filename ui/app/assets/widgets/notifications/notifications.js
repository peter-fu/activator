/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt',
  'text!./notifications.html',
  'css!widgets/buttons/dropdown',
  'css!./notifications',
  'css!widgets/stickers/stickers'
], function(
  sbt,
  tpl
){

  var State = {
    notifications: sbt.tasks.notifications,
    notificationsReadCount: ko.computed(function() {
      return sbt.tasks.notifications().filter(function(n) {
        return !n.read();
      }).length;
    }),
    markAsRead: function() {
      sbt.tasks.notifications().forEach(function(n) {
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

})
