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

  var State = {
    sbt: sbt,
    clear: function() {
      sbt.logs.stdout.removeAll();
    },
    memoLogsScroll: ko.observable()
  }

  return {
    render: function(){
      return ko.bindhtml(tpl, State)
    }
  }

});
