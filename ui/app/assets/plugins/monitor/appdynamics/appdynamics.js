/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
  "text!./appdynamics.html",
  "css!./appdynamics",
  "css!widgets/modules/modules",
  "css!widgets/lists/logs"
], function(
  plugins,
  tpl
  ) {

  var needProvision = ko.observable();
  var deprovisionAppDynamics = ko.observable();
  var hostName = ko.observable();
  var port = ko.observable();
  var sslEnabled = ko.observable();
  var accountName = ko.observable();
  var accessKey = ko.observable();
  var nodeName = ko.observable();
  var tierName = ko.observable();

  var nodeNameInvalid = ko.observable();
  var tierNameInvalid = ko.observable();
  var hostNameInvalid = ko.observable();
  var portInvalid = ko.observable();
  var accountNameInvalid = ko.observable();
  var accessKeyInvalid = ko.observable();

  var changed = ko.observable();
  var canSave = ko.observable();
  var shouldSave = ko.observable();

  var error = ko.observable();
  /*
  var canSave = ko.computed(function () {
    return checkCanSave(hostName(),port(),sslEnabled(),accountName(),accessKey(),nodeName(),tierName());
  });

  var changed = ko.computed(function () {
    return checkIsDifferent(hostName(),port(),sslEnabled(),accountName(),accessKey(),nodeName(),tierName());
  });

  var shouldSave = ko.computed(function () {
    return (canSave() && changed());
  });

  var nodeNameInvalid = ko.computed(function() {
    return !appdynamics.validNodeName.test(nodeName());
  });

  var tierNameInvalid = ko.computed(function() {
    return !appdynamics.validTierName.test(tierName());
  });

  var hostNameInvalid = ko.computed(function() {
    return !appdynamics.validHostName.test(hostName());
  });

  var portInvalid = ko.computed(function () {
    return (!appdynamics.validPort.test(port()));
  });

  var accountNameInvalid = ko.computed(function () {
    return (!appdynamics.validAccountName.test(accountName()));
  });

  var accessKeyInvalid = ko.computed(function () {
    return (!appdynamics.validAccessKey.test(accessKey()));
  });
  */

  var State = {
    needProvision: needProvision,
    deprovisionAppDynamics: deprovisionAppDynamics,
    hostName: hostName,
    port: port,
    sslEnabled: sslEnabled,
    accountName: accountName,
    accessKey: accessKey,
    nodeName: nodeName,
    tierName: tierName,
    nodeNameInvalid: nodeNameInvalid,
    tierNameInvalid: tierNameInvalid,
    hostNameInvalid: hostNameInvalid,
    portInvalid: portInvalid,
    accountNameInvalid: accountNameInvalid,
    accessKeyInvalid: accessKeyInvalid,
    canSave: canSave,
    changed: changed,
    shouldSave: shouldSave,
    error: error
  };

  return {
    render: function(){
      return ko.bindhtml(tpl, State);
    }
  }
});
