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

  function nrMessage(type) {
    return { request: 'NewRelicRequest', type: type };
  }

  function nrMessageWith(type,attributes) {
    return jQuery.extend(nrMessage(type), attributes);
  }

  var validKey = /[0-9A-Za-z]{40}/;

  var newRelic = (new function(){
      var self = this;
      self.validKey = validKey;
      self.isProjectEnabled = ko.observable("unknown");
      self.checkIsProjectEnabled = function() {
        websocket.send(nrMessage("isProjectEnabled"));
      };
      self.hasPlay = ko.computed(function() {
        self.isProjectEnabled("unknown");
        // TODO : APP HAS PLAY???
        return true; // build.app.hasPlay();
      }, self);
      self.enableProject = function(key,name) {
        var message = nrMessageWith("enable",{key: key, name: name});
        debug && console.log("message: "+JSON.stringify(message,null,2));
        websocket.send(message);
      };
      self.observeProvision = function(observable) {
        return websocket.subscribe('response', 'ProvisioningStatus').each(observable);
      };
      self.cancelObserveProvision = function(o) {
        streams.unsubscribe(o);
      };
      self.available = ko.observable("checking");
      websocket.subscribe('response','NewRelicResponse')
        .each(function (event) {
          if (event.type == "availableResponse") {
            debug && console.log("setting available to: " + event.result);
            self.available(event.result);
          }
          if (event.type == "provisioned") {
            debug && console.log("New Relic provisioned");
            streams.send(nrMessage("available"));
          }
          if (event.type == "isProjectEnabledResponse") {
            debug && console.log("Setting isProjectEnabled to: " + event.result);
            self.isProjectEnabled(event.result);
          }
          if (event.type == "projectEnabled") {
            debug && console.log("Project enabled for New Relic");
            self.checkIsProjectEnabled();
          }
        });

      websocket.subscribe('type','SourcesMayHaveChanged').each(function (event) {
        debug && console.log("Making initial request to check NR availability");
        streams.send(nrMessage("available"));
        self.checkIsProjectEnabled();
      });

      self.licenseKey = licenseKey;
      self.provision = function() {
        streams.send(nrMessage("provision"))
      };

      self.licenseKeySaved = ko.computed(function() {
        var key = self.licenseKey();
        return self.validKey.test(key);
      }, self);
  }());

  return newRelic;
});
