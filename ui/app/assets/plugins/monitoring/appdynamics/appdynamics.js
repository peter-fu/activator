/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
  "services/monitoring/appdynamicscontroller",
  "services/monitoring/monitoringSolutions",
  "text!./appdynamics.html",
  "css!./appdynamics"
], function(
  plugins,
  appdynamics,
  monitoringSolutions,
  tpl
  ) {

    var downloadDescriptions = {
      'authenticating': 'Authenticating',
      'downloadComplete': 'Download Complete',
      'validating': 'Validating',
      'extracting': 'Extracting',
      'complete': 'Complete'
    };

    var selectedTab = ko.observable("notice");

    var available = appdynamics.available;
    var needProvision = ko.computed(function () {
      return !available();
    });

    var downloadEnabled = ko.observable(false);
    var downloadClass = ko.computed(function() {
      var enabled = (available() == false);
      downloadEnabled(enabled);
      return enabled ? "enabled" : "disabled";
    });

    var provisionDownloadSubscription = ko.observable(null);

    var username = ko.observable();
    var password = ko.observable();
    var usernameInvalid = ko.observable();
    var passwordInvalid = ko.observable();
    var downloading = ko.observable("");

    var hostName = ko.observable(appdynamics.hostName());
    var port = ko.observable(appdynamics.port());
    var sslEnabled = ko.observable(appdynamics.sslEnabled());
    var accountName = ko.observable(appdynamics.accountName());
    var accessKey = ko.observable(appdynamics.accessKey());
    var nodeName = ko.observable(appdynamics.nodeName());
    var tierName = ko.observable(appdynamics.tierName());
    var isProjectEnabled = ko.computed(function () {
      return appdynamics.projectEnabled();
    });

    var hostNameInvalid = ko.computed(function() {
      return !appdynamics.validHostName.test(hostName());
    });

    var portInvalid = ko.computed(function () {
      return (!appdynamics.validPort.test(port()));
    });

    var nodeNameInvalid = ko.computed(function() {
      return !appdynamics.validNodeName.test(nodeName());
    });

    var tierNameInvalid = ko.computed(function() {
      return !appdynamics.validTierName.test(tierName());
    });

    var accountNameInvalid = ko.computed(function () {
      return (!appdynamics.validAccountName.test(accountName()));
    });

    var accessKeyInvalid = ko.computed(function () {
      return (!appdynamics.validAccessKey.test(accessKey()));
    });

    var provisionAppDynamics = function() {
      if (downloadEnabled()) {
        error("");
        provisionDownloadSubscription(appdynamics.setObserveProvision(provisionObserver));
        appdynamics.provision(username(), password());
      } else {
        error("Download is not enabled. Please fix all warnings and retry.");
      }
    };

    var deprovisionAppDynamics = function () {
      if (!downloadEnabled()) {
        error("");
        appdynamics.deprovision();
      }
    };

    var provisionObserver = function(event) {
      var message = "";
      if (event.type == "provisioningError") {
        message = "Error provisioning AppDynamics: " + event.message;
        error(message);
      } else if (event.type == "downloading") {
        message = "Downloading: " + event.url;
      } else if (event.type == "progress") {
        message = "";
        if (event.percent) {
          message = event.percent.toFixed(0) + "%";
        } else {
          message = event.bytes + " bytes";
        }
      } else {
        message = downloadDescriptions[event.type] || "UNKNOWN STATE";
      }

      if (event.type != "provisioningError") {
        downloading(message);
      } else {
        downloading('');
      }

      if (event.type == "complete" || event.type == "provisioningError") {
        appdynamics.unsetObserveProvision();
        provisionDownloadSubscription(null); // TODO: is this observable needed anymore?
      }
    };

    var canSave = ko.computed(function () {
      return (appdynamics.validNodeName.test(nodeName()) &&
        appdynamics.validTierName.test(tierName()) &&
        appdynamics.validHostName.test(hostName()) &&
        appdynamics.validPort.test(port()) &&
        appdynamics.validAccountName.test(accountName()) &&
        appdynamics.validAccessKey.test(accessKey()));
    });

    var changed = ko.computed(function () {
      return (appdynamics.nodeName() != nodeName() ||
        appdynamics.tierName() != tierName() ||
        appdynamics.sslEnabled() != sslEnabled() ||
        appdynamics.hostName() != hostName() ||
        appdynamics.port() != port() ||
        appdynamics.accountName() != accountName() ||
        appdynamics.accessKey() != accessKey());
    });

    var shouldSave = ko.computed(function () {
      return (canSave() && changed());
    });

    var saveConfig = function() {
      if (appdynamics.validNodeName.test(nodeName()) &&
        appdynamics.validTierName.test(tierName()) &&
        appdynamics.validHostName.test(hostName()) &&
        appdynamics.validPort.test(port()) &&
        appdynamics.validAccountName.test(accountName()) &&
        appdynamics.validAccessKey.test(accessKey())) {
        appdynamics.nodeName(nodeName());
        appdynamics.tierName(tierName());
        appdynamics.hostName(hostName());
        appdynamics.port(port());
        appdynamics.accountName(accountName());
        appdynamics.accessKey(accessKey());
        appdynamics.sslEnabled(sslEnabled());

        monitoringSolutions.addAppDynamicsToSolutions();
        return true;
      } else {
        monitoringSolutions.removeAppDynamicsFromSolutions();
        return false;
      }
    };

    var cancelSave = function() {
      hostName((function () {
        var hn = appdynamics.hostName();
        if (hn == "") {
          return ".saas.appdynamics.com";
        } else {
          return hn;
        }
      })());
      port(appdynamics.port());
      sslEnabled(appdynamics.sslEnabled());
      accountName(appdynamics.accountName());
      accessKey(appdynamics.accessKey());
      nodeName(appdynamics.nodeName());
      tierName(appdynamics.tierName());
    };

    var error = ko.observable();

    var enableAppDynamics = function () {
      appdynamics.enableProject();
    };

    var State = {
      needProvision: needProvision,
      provisionAppDynamics: provisionAppDynamics,
      username: username,
      password: password,
      usernameInvalid: usernameInvalid,
      passwordInvalid: passwordInvalid,
      downloading: downloading,
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
      saveConfig: saveConfig,
      cancelSave: cancelSave,
      error: error,
      selectedTab: selectedTab,
      isProjectEnabled: isProjectEnabled,
      enableAppDynamics: enableAppDynamics
    };

    return {
      render: function () {
        return ko.bindhtml(tpl, State);
      }
    }
 });
