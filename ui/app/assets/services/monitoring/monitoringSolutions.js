/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "commons/websocket",
  "commons/settings"
], function(
  websocket,
  settings
) {

  var stream = websocket.subscribe('type', 'monitoring');

  var NO_MONITORING = 'Disabled';
  var INSPECT       = 'Activator Inspect';
  var NEW_RELIC     = "NewRelic";
  var APP_DYNAMICS  = "AppDynamics";

  // Set up default solutions
  var monitoringSolutions = ko.observableArray([NO_MONITORING,INSPECT]);
  var monitoringSolution = settings.observable("build.monitoringSolution-"+serverAppModel.id, NO_MONITORING);
  var isPlayApplication = ko.observable(false); // used to determine what runner to execute (see runCommand below)

  var inspectActivated = ko.computed(function() {
    return monitoringSolution() === INSPECT;
  });

  var prependCommand = ko.computed(function() {
    if (monitoringSolution() === INSPECT) {
      return "echo:";
    } else if (monitoringSolution() === NEW_RELIC && !isPlayApplication()) {
      return "newrelic:";
    } else if (monitoringSolution() === NEW_RELIC && isPlayApplication()) {
      return "newrelicplay:";
    } else if (monitoringSolution() === APP_DYNAMICS && !isPlayApplication()) {
      return "appdynamics:";
    } else if (monitoringSolution() === APP_DYNAMICS && isPlayApplication()) {
      return "appdynamicsplay:";
    } else {
      return "";
    }
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

  // Weird thing about provisioning (downloading the agents):
  // AD and NR are using the exact same event from the websocket.
  // So we redirect the events to who's asking last
  var provisioningProgress = (function() {
    var currentProvisioningCallback = null;
    stream.matchOnAttribute("subtype", "ProvisioningStatus")
      .map(function(evt) {
        if (currentProvisioningCallback) {
          currentProvisioningCallback(evt);
        } else {
          throw "Can't forward provisioning event: no callback setted";
        }
      });
    return {
      set: function(callback) {
        currentProvisioningCallback = callback;
      },
      reset: function() {
        currentProvisioningCallback = null;
      }
    }
  }());

  return {
    stream                : stream,
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
    prependCommand        : prependCommand,
    provisioningProgress  : provisioningProgress,
    isPlayApplication     : isPlayApplication
  }
});
