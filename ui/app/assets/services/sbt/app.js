/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "commons/settings"
], function(
  settings
) {

  var projects = ko.observableArray([]);
  var currentProject =  ko.observable("");
  var removeExistingProjects = function() {
    this.currentProject()
    this.projects([]);
  };

  var mainClasses = ko.observable([]);
  var currentMainClass = ko.observable();

  return {
    name:               "",
    id:                 "",
    location:           "",
    projects:           projects,
    currentProject:     currentProject,
    removeExistingProjects: removeExistingProjects,
    mainClasses:        mainClasses,
    currentMainClass:   currentMainClass,
    inspectorActivated: ko.observable(false),
    versions: {
      scala:            ko.observable(false),
      akka:             ko.observable(false),
      play:             ko.observable(false),
      spray:            ko.observable(false),
      slick:            ko.observable(false)
    },
    settings: {
      rerunOnBuild:             settings.observable("build.rerunOnBuild", false),
      retestOnSuccessfulBuild:  settings.observable("build.retestOnSuccessfulBuild", false),
      automaticResetInspect:    settings.observable("build.automaticResetInspect", false),
      recompileOnChange:        settings.observable("build.recompileOnChange", true),
      showLogDebug:             settings.observable("build.showLogDebug", false)
    }
  }

});
