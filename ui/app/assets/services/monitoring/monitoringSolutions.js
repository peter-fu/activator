/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "commons/settings"
], function(
  settings
) {

  var NO_MONITORING = 'Disabled';
  var INSPECT       = 'Activator Inspect';
  var NEW_RELIC     = "NewRelic";
  var APP_DYNAMICS  = "AppDynamics";

  // Set up default solutions
  var monitoringSolutions = ko.observableArray([NO_MONITORING,INSPECT]);
  var monitoringSolution = settings.observable("build.monitoringSolution-"+serverAppModel.id, NO_MONITORING);

  var inspectActivated = ko.computed(function() {
    return monitoringSolution() === INSPECT;
  });

  var runCommand = ko.computed(function() {
    if (monitoringSolution() === INSPECT) {
      return "echo:backgroundRun";
    } else if (monitoringSolution() === NEW_RELIC) {
      return "newrelic:backgroundRun";
    } else if (monitoringSolution() === APP_DYNAMICS) {
      return "appdynamics:backgroundRun";
    } else {
      return "backgroundRun";
    }
  });

  var runMainCommand = ko.computed(function() {
    return runCommand + "Main";
  });

  var appDynamicsActivated = ko.computed(function() {
    return monitoringSolution() === APP_DYNAMICS;
  });

  var newRelicActivated = ko.computed(function() {
    return monitoringSolution() === NEW_RELIC;
  });

  function addToSolutions(s){
    return function() {
      if (monitoringSolutions().indexOf(s) < 0){
        monitoringSolutions.push(s);
      }
    }
  }

  function removeFromSolutions(s){
    return function() {
      monitoringSolutions.remove(s);
    }
  }

  var addAppDynamics = addToSolutions(APP_DYNAMICS);
  var addNewRelic = addToSolutions(NEW_RELIC);

  var removeAppDynamics = removeFromSolutions(APP_DYNAMICS);
  var removeNewRelic = removeFromSolutions(NEW_RELIC);

  return {
    NO_MONITORING         : NO_MONITORING,
    INSPECT               : INSPECT,
    NEW_RELIC             : NEW_RELIC,
    APP_DYNAMICS          : APP_DYNAMICS,
    monitoringSolutions   : monitoringSolutions,
    monitoringSolution    : monitoringSolution,
    inspectActivated      : inspectActivated,
    appDynamicsActivated  : appDynamicsActivated,
    newRelicActivated     : newRelicActivated,
    addAppDynamics        : addAppDynamics,
    addNewRelic           : addNewRelic,
    removeAppDynamics     : removeAppDynamics,
    removeNewRelic        : removeNewRelic,
    runCommand            : runCommand,
    runMainCommand        : runMainCommand
  }
});
