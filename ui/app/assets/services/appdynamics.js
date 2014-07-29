/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/utils', 'commons/streams', 'commons/settings', 'services/build'], function(utils, streams, settings, build) {

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

  function onStreamOpen(handler) {
    streams.subscribe(function (event) {
      if (event.type == 'SourcesMayHaveChanged') {
        handler(event);
      }
    });
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

  streams.subscribe({
    filter: function(event) {
      return event.response == 'AppDynamicsResponse';
    },
    handler: function (event) {
      if (event.type == "availableResponse") {
        debug && console.log("setting available to: ",event.result);
        available(event.result);
      } else if (event.type == "provisioned") {
        debug && console.log("AppDynamics provisioned");
        streams.send(adMessage("available"));
      } else if (event.type == "deprovisioned") {
        debug && console.log("AppDynamics de-provisioned");
        streams.send(adMessage("available"));
      }
    }
  });

  onStreamOpen(function (event) {
    debug && console.log("Making initial request to check AD availability");
    streams.send(adMessage("available"));
  });

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
    configured: ko.computed(function () {
      return (validNodeName.test(nodeName()) &&
      validTierName.test(tierName()) &&
      validPort.test(port()) &&
      validAccountName.test(accountName()) &&
      validAccessKey.test(accessKey()) &&
      validHostName.test(hostName()));
    }),
    observeProvision: function(observable) {
      return streams.subscribe({
        filter: function(event) {
          return event.response == 'ProvisioningStatus';
        },
        handler: function (event) {
          observable(event);
        }
      });
    },
    cancelObserveProvision: function(o) {
      streams.unsubscribe(o);
    },
    available: available,
    provision: function(username,password) {
      streams.send(adMessageWith("provision",{username: username, password: password}))
    },
    deprovision: function() {
      streams.send(adMessage("deprovision"));
    },
    nodeNameSaved: ko.computed(function() {
      var name = nodeName();
      return validNodeName.test(name);
    }),
    tierNameSaved: ko.computed(function() {
      var name = tierName();
      return validTierName.test(name);
    })
  };
});
