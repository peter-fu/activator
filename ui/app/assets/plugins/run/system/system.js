/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
  "text!./system.html",
  "services/sbt",
  "css!./system",
  "css!widgets/modules/modules",
  "css!widgets/lists/logs"
], function(
  plugins,
  tpl,
  sbt
) {

  function scrollToBottom() {
    $(".logs")[0].scrollTop = 99999;
    State.memoLogsScroll('stick');
  }

  var State = {
    sbt: sbt,
    clear: function() {
      sbt.logs.stdout.removeAll();
    },
    memoLogsScroll: ko.observable(),
    scrollToBottom: scrollToBottom
  }

  return {
    render: function(){
      return ko.bindhtml(tpl, State)
    }
  }

});
