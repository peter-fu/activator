/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/utils',
  'commons/websocket',
  'commons/settings'
], function(utils, websocket, settings) {

  var nodeName = settings.observable("appDynamics.nodeName", "activator-"+new Date().getTime());
  var tierName = settings.observable("appDynamics.tierName", "development");
  var hostName = settings.observable("appDynamics.hostName", "");
  var port = settings.observable("appDynamics.port", 443);
  var sslEnabled = settings.observable("appDynamics.sslEnabled", true);
  var accountName = settings.observable("appDynamics.accountName", "");
  var accessKey = settings.observable("appDynamics.accessKey", "");
  var available = ko.observable("checking");

  function adMessage(type) {
    return { request: 'AppDynamicsRequest', type: type };
  }

  function adMessageWith(type,attributes) {
    return jQuery.extend(adMessage(type), attributes);
  }

  var validNodeName = /^[0-9a-z@\._-]{1,40}$/i;
  var validTierName = /^[0-9a-z@\._-]{1,40}$/i;
  var validUsername = /^.{1,40}$/i;
  var validPassword = /^[0-9a-z@\.,-\/#!$%\^&\*;:{}=\-_`~()]{1,40}$/i;
  var validPort = {
    test: function(v) {
      var n = Number(v);
      return (n > 0) && (n < 65536);
    }
  };
  var validAccountName = validNodeName;
  var validAccessKey = /^[0-9a-z]{12}$/i;
  var validHostName = /^[0-9a-z][0-9a-z\.\-$*_]{1,128}/i;

  var configured = ko.computed(function () {
    return (validNodeName.test(nodeName()) &&
      validTierName.test(tierName()) &&
      validPort.test(port()) &&
      validAccountName.test(accountName()) &&
      validAccessKey.test(accessKey()) &&
      validHostName.test(hostName()));
  });

  var stream = websocket.subscribe('type', 'monitoring');

  stream.map(function (response) {
    if (response.subtype === 'appdynamics') {
      if (response.event.type === "availableResponse") {
        debug && console.log("setting available to: ",response.event.result);
        available(response.event.result);
      } else if (response.event.type === "provisioned") {
        debug && console.log("AppDynamics provisioned");
        send(adMessage("available"));
      } else if (response.event.type === "deprovisioned") {
        debug && console.log("AppDynamics de-provisioned");
        send(adMessage("available"));
      }
    } else if (response.subtype === "ProvisioningStatus" && observeProvision() === true) {
      observable(response.event);
    }
  });

  var send = function (msg){
    websocket.send(msg);
  }

  var provision = function (username, password) {
    send(adMessageWith("provision",{username: username, password: password}))
  };

  var deprovision = function() {
    send(adMessage("deprovision"));
  };

  var observable = null;
  var observeProvision = ko.observable(false);

  var setObserveProvision = function (obs) {
    observeProvision(true);
    observable = obs;
  };

  var unsetObserveProvision = function () {
    observeProvision(false);
    observable = null;
  }

  var nodeNameSaved = ko.computed(function() {
    var name = nodeName();
    return validNodeName.test(name);
  });

  var tierNameSaved = ko.computed(function() {
    var name = tierName();
    return validTierName.test(name);
  });

  var enableProject = function () {
    send(adMessageWith("generateFiles", {
      location: serverAppModel.location,
      applicationName: "n/a",
      nodeName: nodeName(),
      tierName: tierName(),
      accountName: accountName(),
      accessKey: accessKey(),
      hostName: hostName(),
      port: port(),
      sslEnabled: sslEnabled()
    }));
  };

  debug && console.log("Making initial request to check AD availability");
  send(adMessage("available"));

  return {
    validNodeName: validNodeName,
    validTierName: validTierName,
    validUsername: validUsername,
    validPassword: validPassword,
    validPort: validPort,
    validAccountName: validAccountName,
    validAccessKey: validAccessKey,
    validHostName: validHostName,
    hostName: hostName,
    port: port,
    sslEnabled: sslEnabled,
    accountName: accountName,
    accessKey: accessKey,
    nodeName: nodeName,
    tierName: tierName,
    configured: configured,
    available: available,
    provision: provision,
    deprovision: deprovision,
    setObserveProvision: setObserveProvision,
    unsetObserveProvision: unsetObserveProvision,
    nodeNameSaved: nodeNameSaved,
    tierNameSaved: tierNameSaved,
    enableProject: enableProject
  };
});
