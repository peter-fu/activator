/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "commons/settings"
], function(
  settings
) {

  var projects = ko.observableArray([
    "ProjectA",
    "ProjectB",
    "ProjectC",
    "ProjectD"
  ]);
  var currentProject =  ko.observable("ProjectA");

  var mainClasses = ko.observable([]);
  var currentMainClass = ko.observable();

  return {
    name:               "",
    id:                 "",
    location:           "",
    projects:           projects,
    currentProject:     currentProject,
    mainClasses:        mainClasses,
    currentMainClass:   currentMainClass,
    inspectorActivated: ko.observable(true),
    versions: {
      scala:            ko.observable(false),
      akka:             ko.observable(false),
      play:             ko.observable(false),
      spray:            ko.observable(false),
      slick:            ko.observable(false)
    },
    settings: {
      rerunOnBuild:             settings.observable("build.rerunOnBuild", true),
      retestOnSuccessfulBuild:  settings.observable("build.retestOnSuccessfulBuild", false),
      automaticResetInspect:    settings.observable("build.automaticResetInspect", false),
      recompileOnChange:        settings.observable("build.recompileOnChange", true),
      showLogDebug:             settings.observable("build.showLogDebug", false)
    }
  }

});
