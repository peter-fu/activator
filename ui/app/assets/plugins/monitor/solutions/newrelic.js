/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/utils', 'commons/widget', 'services/newrelic', 'text!./newrelic.html', 'css!./newrelic.css'],
  function(utils, Widget, newrelic, template, css){

    var downloadDescriptions = {
      'downloadComplete': 'Download complete',
      'validating': 'Validating',
      'extracting': 'Extracting',
      'complete': 'Complete'
    };

    var NewRelic = utils.Class(Widget,{
      id: 'newrelic-widget',
      template: template,
      init: function(args) {
        var self = this;
        newrelic.checkIsSupportedJavaVersion();
        self.licenseKeySaved = newrelic.licenseKeySaved;
        self.available = newrelic.available;
        self.supportedJavaVersion = newrelic.supportedJavaVersion;
        self.needProvision = ko.computed(function() {
          return !self.available() || !self.licenseKeySaved();
        }, self);
        self.downloadEnabled = ko.observable(false);
        self.developerKeyEnabled = ko.computed(function() {
          return (self.available() == true);
        }, self);
        self.licenseKey = ko.observable(newrelic.licenseKey());
        self.downloadClass = ko.computed(function() {
          var enabled = (self.available() == false);
          self.downloadEnabled(enabled);
          return enabled ? "enabled" : "disabled";
        }, self);
        self.developerKeyClass = ko.computed(function() {
          return ((self.available() == true) ? "enabled" : "disabled");
        }, self);
        self.provisionDownloadSubscription = ko.observable(null);
        self.downloading = ko.observable("");
        self.downloading.subscribe(function(value) {
          debug && console.log("downloading: ",value);
        });
        self.hasPlay = newrelic.hasPlay;
        self.provisionObserver = function(value) {
          var message = "";
          if (value.type == "provisioningError") {
            message = "Error provisioning New Relic: "+value.message
            self.downloading(message);
            self.error(message);
          } else if (value.type == "downloading") {
            self.downloading("Downloading: "+value.url);
          } else if (value.type == "progress") {
            message = "";
            if (value.percent) {
              message = value.percent.toFixed(0)+"%";
            } else {
              message = value.bytes+" bytes";
            }
            self.downloading("Progress: "+message);
          } else {
            message = downloadDescriptions[value.type] || "UNKNOWN STATE!!!";
            self.downloading(message);
          }

          if (value.type == "complete" || value.type == "provisioningError") {
            newrelic.cancelObserveProvision(self.provisionDownloadSubscription());
            self.provisionDownloadSubscription(null);
          }
        };
        self.error = ko.observable("");
        self.provisionNewRelic = function () {
          if (self.downloadEnabled()) {
            self.error("");
            self.provisionDownloadSubscription(newrelic.observeProvision(self.provisionObserver));
            newrelic.provision();
          }
        };
        self.deprovisionNewRelic = function () {
          if (!self.downloadEnabled()) {
            self.error("");
            newrelic.deprovision();
          }
        };
        self.saveLicenseKey = function () {
          if (!self.licenseKeyInvalid()) {
            newrelic.licenseKey(self.licenseKey());
          }
        };
        self.resetKey = function () {
          self.licenseKey("");
          newrelic.licenseKey("");
        };
        self.licenseKeyInvalid = ko.computed(function() {
          var key = self.licenseKey();
          return !newrelic.validKey.test(key);
        }, self);
      }
    });

    return NewRelic;
  });
