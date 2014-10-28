/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
  "text!./newrelic.html",
  "css!./newrelic",
  "css!widgets/modules/modules",
  "css!widgets/lists/logs"
], function(
  plugins,
  tpl
  ) {

  var State = {};

  return {
    render: function(){
      return ko.bindhtml(tpl, State);
    }
  }
});
