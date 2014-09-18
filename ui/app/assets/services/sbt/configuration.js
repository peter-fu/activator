/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  './tasks',
  'services/ajax'
], function (
    tasks,
    ajax) {

    // plugin information
    var backgroundRunPluginFileLocation = "/project/background.sbt";
    var backgroundRunPluginFileContent = "addSbtPlugin(\"com.typesafe.sbtrc\" % \"ui-interface-0-13\" % \"1.0-d5ba9ed9c1d31e3431aeca5e429d290b56cb0b14\")";
    var uiFileEchoSettings = "\n\nfork in run := true";

    var echoPluginFileLocation = "/project/echo.sbt";
    var echoPluginFileContent = "addSbtPlugin(\"com.typesafe.sbt\" % \"sbt-echo\" % \"0.1.6\")";

    // Is this safe to do, i.e. is the location and name always the same for an Activator project?
    var buildFileLocation = "/build.sbt";
    var buildFileEchoSettings = "\n\nechoSettings";

    var addingEchoFile = ko.observable(false);
    var addingBackgroundFile = ko.observable(false);
    var editingBuildFile = ko.observable(false);

    checkFileContent(serverAppModel.location+backgroundRunPluginFileLocation, backgroundRunPluginFileContent, function() {
      addingEchoFile(true);
    });
    checkFileContent(serverAppModel.location+buildFileLocation, uiFileEchoSettings, function() {
      editingBuildFile(true);
    }, true);

    var echoReady = ko.computed(function() {
      return (tasks.applicationReady() && addingEchoFile() && addingBackgroundFile() && editingBuildFile());
    });

    function echoInstalledAndReady(callback){
      checkFileContent(serverAppModel.location+echoPluginFileLocation, echoPluginFileContent, function() {
        addingBackgroundFile(true);
      });
      checkFileContent(serverAppModel.location+buildFileLocation, buildFileEchoSettings, function() {
        editingBuildFile(true);
      }, true);

      echoReady() && callback();
      ko.once(echoReady, function(ready) {
        if (ready){
          callback();
        }
      });
    }

    function checkFileContent(path, content, callback, appendTofile){
      return $.ajax({
        url: '/api/local/show',
        type: 'GET',
        dataType: 'text',
        data: { location: path }
      }).error(function(e) {
        // File is not here / can't be opened
        ajax.create(path, false, content).then(callback);
      }).success(function(data) {
        // File is here
        if (data.indexOf(content) >= 0){
          callback();
        } else {
          ajax.save(path, appendTofile?data+content:content).success(callback);
        }
      })
    }

    return {
      echoInstalledAndReady: echoInstalledAndReady,
      addingEchoFile:        addingEchoFile,
      addingBackgroundFile:  addingBackgroundFile,
      editingBuildFile:      editingBuildFile,
      echoReady:             echoReady
    };
});
