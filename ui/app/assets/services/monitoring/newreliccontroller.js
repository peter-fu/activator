/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/websocket',
  'commons/settings'
], function(
  websocket,
  settings
){

  var licenseKey = settings.observable("newrelic.licenseKey", "");
  var isProjectEnabled = ko.observable(false);
  var available = ko.observable(false);
  var supportedJavaVersion = ko.observable({result:true, version:"Unknown"});
  var validKey = /^[0-9A-Z]{40}$/i;
  var observable = null;
  var observeProvision = ko.observable(false);

  var send = function (msg){
    websocket.send(msg);
  };

  function nrMessage(type) {
    return { request: 'NewRelicRequest', type: type };
  };

  function checkIsProjectEnabled() {
    send(nrMessage("isProjectEnabled"));
  };

  function checkIsSupportedJavaVersion() {
    send(nrMessage("isSupportedJavaVersion"));
  };

  function checkAvailable() {
    send(nrMessage("available"));
  };

  function enableProject() {
    send({ request: 'NewRelicRequest', type: "enable", key: licenseKey(), name: serverAppModel.name});
  };

  var setObserveProvision = function(obs) {
    observable = obs;
    observeProvision = true;
    send(nrMessage("provision"))
  };

  var unsetObserveProvision = function() {
    observeProvision = false;
    observable = null;
  };

  var licenseKeySaved = ko.computed(function() {
    var key = licenseKey();
    return validKey.test(key);
  });

  var stream = websocket.subscribe('type', 'monitoring');

  stream.map(function (response) {
    if (response.subtype === 'newrelic') {
      var event = response.event;
      if (event.type === "availableResponse") {
        debug && console.log("setting available to: " + event.result);
        available(event.result);
      }
      if (event.type === "provisioned") {
        debug && console.log("New Relic provisioned");
        send(nrMessage("available"));
      }
      if (event.type === "isProjectEnabledResponse") {
        debug && console.log("Setting isProjectEnabled to: " + event.result);
        isProjectEnabled(event.result);
      }
      if (event.type === "isSupportedJavaVersionResult") {
        debug && console.log("Setting isSupportedJavaVersionResult to: " + event.result);
        supportedJavaVersion({result: event.result, version: event.version});
      }
      if (event.type === "projectEnabled") {
        debug && console.log("Project enabled for New Relic");
        checkIsProjectEnabled();
        generateFiles();
      }
    } else if (response.subtype === 'ProvisioningStatus' && observeProvision) {
      observable(response.event);
    }
  });

  var generateFiles = function () {
    send({ request: 'NewRelicRequest', type: "generateFiles", location: serverAppModel.location, info: ""});
  };

  // Initial request
  var init = function () {
    debug && console.log("Making initial request to check NR availability");
    checkAvailable();
    checkIsSupportedJavaVersion();
    checkIsProjectEnabled();
  };

  init();

  return {
    licenseKeySaved: licenseKeySaved,
    available: available,
    licenseKey: licenseKey,
    validKey: validKey,
    setObserveProvision: setObserveProvision,
    unsetObserveProvision: unsetObserveProvision,
    enableProject: enableProject,
    isProjectEnabled: isProjectEnabled
  };
});
