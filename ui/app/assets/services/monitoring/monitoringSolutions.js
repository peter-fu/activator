/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "commons/settings"
], function(
  settings
) {

  var NO_MONITORING = 'Monitoring disabled';
  var INSPECT       = 'Activator inspect';
  var NEW_RELIC     = "NewRelic";
  var APP_DYNAMICS  = "AppDynamics";

  // Set up default solutions
  var monitoringSolutions = ko.observableArray([NO_MONITORING,INSPECT]);
  var monitoringSolution = settings.observable("build.monitoringSolution-"+serverAppModel.id, NO_MONITORING);

  var inspectActivated = ko.computed(function() {
    return monitoringSolution() === INSPECT;
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

  var addAppDynamicsToSolutions = addToSolutions(APP_DYNAMICS);
  var addNewRelicToSolutions = addToSolutions(NEW_RELIC);

  var removeAppDynamicsFromSolutions = removeFromSolutions(APP_DYNAMICS);
  var removeNewRelicFromSolutions = removeFromSolutions(NEW_RELIC);

  return {
    NO_MONITORING        : NO_MONITORING,
    INSPECT              : INSPECT,
    NEW_RELIC            : NEW_RELIC,
    APP_DYNAMICS         : APP_DYNAMICS,
    monitoringSolutions  : monitoringSolutions,
    monitoringSolution   : monitoringSolution,
    inspectActivated     : inspectActivated,
    appDynamicsActivated : appDynamicsActivated,
    newRelicActivated    : newRelicActivated,
    addAppDynamicsToSolutions: addAppDynamicsToSolutions,
    addNewRelicToSolutions: addNewRelicToSolutions,
    removeAppDynamicsFromSolutions: removeAppDynamicsFromSolutions,
    removeNewRelicFromSolutions: removeNewRelicFromSolutions
  }

});
