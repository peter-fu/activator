define([
  "commons/settings"
], function(
  settings
) {

  var subProjects = ko.observableArray([
    "ProjectA",
    "ProjectB",
    "ProjectC",
    "ProjectD"
  ]);
  var currentProject =  ko.observable("ProjectA");

  var mainFiles = ko.observable([]);
  var currentMainFile = ko.observable();

  return {
    name:               "",
    id:                 "",
    location:           "",
    subProjects:        subProjects,
    currentProject:     currentProject,
    mainFiles:          mainFiles,
    currentMainFile:    currentMainFile,
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
