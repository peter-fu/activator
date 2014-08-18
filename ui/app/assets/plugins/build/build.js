/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
  "services/sbt",
  "text!./build.html",
  "widgets/layout/layout",
  "css!./build",
  "css!widgets/buttons/switch",
  "css!widgets/menu/menu",
  "css!widgets/buttons/button",
  "css!widgets/buttons/select",
  "css!widgets/lists/logs"
], function(
  plugins,
  sbt,
  tpl,
  layout
) {

  var subplugin = ko.observable();

  var sbtExecCommand = function(cmd){
    sbt.tasks.requestExecution(cmd);
  }
  var setProject = function(project){
    sbt.app.currentProject(project);
  }

  var subPlugins = {
    dependencies:   "Dependencies",
    configuration:  "Project configuration",
    console:        "Console",
    tasks:          "Tasks"
  }

  var State = {
    subplugin: subplugin,
    sbtExecCommand: sbtExecCommand,
    setProject: setProject,
    recompileOnChange: sbt.app.settings.recompileOnChange,
    sbt: sbt
  }

  return {
    render: function(url) {
      layout.renderPlugin(bindhtml(tpl, State))
    },
    route: plugins.route('build', function(url, breadcrumb, plugin) {
      subplugin(plugin.render());
      breadcrumb([['build/', "Build"],['build/'+url.parameters[0], subPlugins[url.parameters[0]]]]);
    }, "build/tasks")
  }

});
