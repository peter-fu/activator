/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'main/plugins',
  'services/sbt',
  'text!./test.html',
  "widgets/layout/layout",
  'css!./test',
  "css!widgets/buttons/switch",
  "css!widgets/menu/menu",
  "css!widgets/buttons/select",
  "css!widgets/buttons/button",
  "css!widgets/modules/modules"
], function(
  plugins,
  sbt,
  tpl,
  layout
){

  var enabled = function(e){
    var o = ko.observable(!e());
    e.on("change", function(v){ return o(!v) });
    o.on("change", function(v){ return e(!v) });
    return o;
  }

  var sbtExecCommand = function(cmd){
    sbt.tasks.requestExecution(cmd);
  }

  var State = {
    results: sbt.tasks.testResults,
    sbtExecCommand: sbtExecCommand
  }

  return {
    render: function(url){
      layout.renderPlugin(ko.bindhtml(tpl, State))
    },

    route: function(url, breadcrumb){
      var all = [
        ['test/', "Test"]
      ];
      if(url.parameters[0]){
        breadcrumb(all);
      } else {
        breadcrumb(all);
      }
    }
  }
});
