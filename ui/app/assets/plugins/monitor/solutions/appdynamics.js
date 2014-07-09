/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/utils', 'commons/widget', 'services/appdynamics', 'text!./appdynamics.html', 'css!./appdynamics.css'],
  function(utils, Widget, appdynamics, template, css){

    var downloadDescriptions = {
      'authenticating': 'Authenticating',
      'downloadComplete': 'Download complete',
      'validating': 'Validating',
      'extracting': 'Extracting',
      'complete': 'Complete'
    };

    var AppDynamics = utils.Class(Widget,{
      id: 'appdynamics-widget',
      template: template,
      init: function(args) {
        var self = this;
        self.available = appdynamics.available;
        self.needProvision = ko.computed(function() {
          return !self.available();
        }, self);
        self.downloadEnabled = ko.observable(false);
        self.downloadClass = ko.computed(function() {
          var enabled = (self.available() == false);
          self.downloadEnabled(enabled);
          return enabled ? "enabled" : "disabled";
        }, self);
        self.provisionDownloadSubscription = ko.observable(null);
        self.downloading = ko.observable("");
        self.username = ko.observable("");
        self.usernameInvalid = ko.computed(function() {
          var key = self.username();
          return !appdynamics.validUsername.test(key);
        }, self);
        self.password = ko.observable("");
        self.passwordInvalid = ko.computed(function() {
          var key = self.password();
          return !appdynamics.validPassword.test(key);
        }, self);
        self.downloading.subscribe(function(value) {
          debug && console.log("downloading: ",value);
        });
        self.provisionObserver = function(value) {
          var message = "";
          if (value.type == "provisioningError") {
            message = "Error provisioning AppDynamics: "+value.message;
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
            var message = downloadDescriptions[value.type] || "UNKNOWN STATE!!!";
            self.downloading(message);
          }

          if (value.type == "complete" || value.type == "provisioningError") {
            appdynamics.cancelObserveProvision(self.provisionDownloadSubscription());
            self.provisionDownloadSubscription(null);
          }
        };
        self.error = ko.observable("");
        self.provisionAppDynamics = function () {
          if (self.downloadEnabled()) {
            self.error("");
            self.provisionDownloadSubscription(appdynamics.observeProvision(self.provisionObserver));
            appdynamics.provision(self.username(),self.password());
          }
        };
        self.deprovisionAppDynamics = function () {
          if (!self.downloadEnabled()) {
            appdynamics.deprovision();
          }
        };

        self.hostName = ko.observable((function () {
          var hn = appdynamics.hostName();
          if (hn == "") {
            return ".saas.appdynamics.com";
          } else {
            return hn;
          }
        })());
        self.port = ko.observable(appdynamics.port());
        self.sslEnabled = ko.observable(appdynamics.sslEnabled());
        self.accountName = ko.observable(appdynamics.accountName());
        self.accessKey = ko.observable(appdynamics.accessKey());
        self.nodeName = ko.observable(appdynamics.nodeName());
        self.tierName = ko.observable(appdynamics.tierName());

        self.doSaveConfig = function (hostName,port,sslEnabled,accountName,accessKey,nodeName,tierName) {
          if (appdynamics.validNodeName.test(nodeName) &&
              appdynamics.validTierName.test(tierName) &&
              appdynamics.validHostName.test(hostName) &&
              appdynamics.validPort.test(port) &&
              appdynamics.validAccountName.test(accountName) &&
              appdynamics.validAccessKey.test(accessKey)) {
            appdynamics.nodeName(nodeName);
            appdynamics.tierName(tierName);
            appdynamics.hostName(hostName);
            appdynamics.port(port);
            appdynamics.accountName(accountName);
            appdynamics.accessKey(accessKey);
            appdynamics.sslEnabled(sslEnabled);
            return true;
          } else {
            return false;
          }
        };
        self.saveConfig = function() {
          return self.doSaveConfig(self.hostName(),self.port(),self.sslEnabled(),self.accountName(),self.accessKey(),self.nodeName(),self.tierName());
        };
        self.cancelSave = function() {
          self.hostName((function () {
            var hn = appdynamics.hostName();
            if (hn == "") {
              return ".saas.appdynamics.com";
            } else {
              return hn;
            }
          })());
          self.port(appdynamics.port());
          self.sslEnabled(appdynamics.sslEnabled());
          self.accountName(appdynamics.accountName());
          self.accessKey(appdynamics.accessKey());
          self.nodeName(appdynamics.nodeName());
          self.tierName(appdynamics.tierName());
        };
        self.checkCanSave = function (hostName,port,sslEnabled,accountName,accessKey,nodeName,tierName) {
          return (appdynamics.validNodeName.test(nodeName) &&
                  appdynamics.validTierName.test(tierName) &&
                  appdynamics.validHostName.test(hostName) &&
                  appdynamics.validPort.test(port) &&
                  appdynamics.validAccountName.test(accountName) &&
                  appdynamics.validAccessKey.test(accessKey));
        };
        self.checkIsDifferent = function (hostName,port,sslEnabled,accountName,accessKey,nodeName,tierName) {
          return (appdynamics.nodeName() != nodeName ||
                  appdynamics.tierName() != tierName ||
                  appdynamics.sslEnabled() != sslEnabled ||
                  appdynamics.hostName() != hostName ||
                  appdynamics.port() != port ||
                  appdynamics.accountName() != accountName ||
                  appdynamics.accessKey() != accessKey);
        };

        self.canSave = ko.computed(function () {
          return self.checkCanSave(self.hostName(),self.port(),self.sslEnabled(),self.accountName(),self.accessKey(),self.nodeName(),self.tierName());
        }, self);
        self.changed = ko.computed(function () {
          return self.checkIsDifferent(self.hostName(),self.port(),self.sslEnabled(),self.accountName(),self.accessKey(),self.nodeName(),self.tierName());
        }, self);
        self.shouldSave = ko.computed(function () {
          return (self.canSave() && self.changed());
        }, self);

        self.nodeNameInvalid = ko.computed(function() {
          return !appdynamics.validNodeName.test(self.nodeName());
        }, self);
        self.tierNameInvalid = ko.computed(function() {
          return !appdynamics.validTierName.test(self.tierName());
        }, self);
        self.hostNameInvalid = ko.computed(function() {
          return !appdynamics.validHostName.test(self.hostName());
        }, self);
        self.portInvalid = ko.computed(function () {
          return (!appdynamics.validPort.test(self.port()));
        },self);
        self.accountNameInvalid = ko.computed(function () {
          return (!appdynamics.validAccountName.test(self.accountName()));
        },self);
        self.accessKeyInvalid = ko.computed(function () {
          return (!appdynamics.validAccessKey.test(self.accessKey()));
        },self);
      }
    });

    return AppDynamics;
  });
