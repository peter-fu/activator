/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/utils', 'commons/streams', 'commons/settings', 'services/build'], function(utils, streams, settings, build) {

  var licenseKey = settings.observable("newrelic.licenseKey", "");
  var isProjectEnabled = ko.observable(false);
  var available = ko.observable(false);
  var supportedJavaVersion = ko.observable({result:true,version:"Unknown"});

  function nrMessage(type) {
    return { request: 'NewRelicRequest', type: type };
  }

  function nrMessageWith(type,attributes) {
    return jQuery.extend(nrMessage(type), attributes);
  }

  function onStreamOpen(handler) {
    streams.subscribe(function (event) {
      if (event.type == 'SourcesMayHaveChanged') {
        handler(event);
      }
    });
  }

  function checkIsProjectEnabled() {
    streams.send(nrMessage("isProjectEnabled"));
  }

  function checkIsSupportedJavaVersion() {
    streams.send(nrMessage("isSupportedJavaVersion"));
  }

  function checkAvailable() {
    streams.send(nrMessage("available"));
  }

  var validKey = /^[0-9A-Z]{40}$/i;

  streams.subscribe({
    filter: function(event) {
      return event.response == 'NewRelicResponse';
    },
    handler: function (event) {
      if (event.type == "availableResponse") {
        debug && console.log("setting available to: " + event.result);
        available(event.result);
      } else if (event.type == "provisioned") {
        debug && console.log("New Relic provisioned");
        streams.send(nrMessage("available"));
      } else if (event.type == "deprovisioned") {
        debug && console.log("New Relic deprovisioned");
        streams.send(nrMessage("available"));
      } else if (event.type == "isProjectEnabledResponse") {
        debug && console.log("Setting isProjectEnabled to: " + event.result);
        isProjectEnabled(event.result);
      } else if (event.type == "isSupportedJavaVersionResult") {
        debug && console.log("Setting supportedJavaVersion to: ",event);
        supportedJavaVersion(event);
      } else if (event.type == "projectEnabled") {
        debug && console.log("Project enabled for New Relic");
        checkIsProjectEnabled();
      }
    }
  });

  onStreamOpen(function (event) {
    debug && console.log("Making initial request to check NR availability");
    checkAvailable();
    checkIsSupportedJavaVersion();
    checkIsProjectEnabled();
  });

  return {
    validKey: validKey,
    isProjectEnabled: isProjectEnabled,
    checkIsSupportedJavaVersion: checkIsSupportedJavaVersion,
    checkAvailable: checkAvailable,
    checkIsProjectEnabled: checkIsProjectEnabled,
    hasPlay: build.app.hasPlay,
    enableProject: function(key,name) {
      var message = nrMessageWith("enable",{key: key, name: name});
      debug && console.log("message: "+JSON.stringify(message,null,2));
      streams.send(message);
    },
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
    available: available,
    supportedJavaVersion: supportedJavaVersion,
    cancelObserveProvision: function(o) {
      streams.unsubscribe(o);
    },
    licenseKey: licenseKey,
    provision: function() {
      streams.send(nrMessage("provision"))
    },
    deprovision: function() {
      streams.send(nrMessage("deprovision"))
    },
    licenseKeySaved: ko.computed(function() {
      var key = licenseKey();
      return validKey.test(key);
    })
  };
});
