/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
  "services/monitoring/newreliccontroller",
  "services/monitoring/monitoringSolutions",
  "services/sbt",
  "../monitoringInstaller",
  "text!./newrelic.html",
  "css!./newrelic",
  "css!widgets/modules/modules",
  "css!widgets/lists/logs"
], function(
  plugins,
  newrelic,
  monitoringSolutions,
  sbt,
  monitoringInstaller,
  tpl
  ) {

  var downloadDescriptions = {
    'downloadComplete': 'Download Complete',
    'validating': 'Validating',
    'extracting': 'Extracting',
    'complete': 'Complete'
  };

  var selectedTab = ko.observable("notice");

  var licenseKeySaved = newrelic.licenseKeySaved();
  var available = newrelic.available();
  var isProjectEnabled = newrelic.isProjectEnabled();
  var downloadEnabled = ko.observable(false);
  var developerKeyEnabled = ko.observable(false);
  var licenseKey = ko.observable(newrelic.licenseKey());
  var downloading = ko.observable("");
  var error = ko.observable();

  var needProvision = ko.computed(function() {
    return !available || !licenseKeySaved;
  });

  var enabled = ko.computed(function() {
    return !available;
  });

  var downloadClass = ko.computed(function() {
    downloadEnabled(enabled());
    return enabled ? "enabled" : "disabled";
  });

  var developerKeyClass = ko.computed(function() {
    developerKeyEnabled(enabled());
    return enabled ? "enabled" : "disabled";
  });

  var provisionObserver = function(event) {
    var message = "";
    if (event.type === "provisioningError") {
      message = "Error provisioning New Relic: " + event.message
      error(message);
    } else if (event.type === "downloading") {
      message = "Downloading: " + event.url;
    } else if (event.type === "progress") {
      message = "";
      if (event.percent) {
        message = event.percent.toFixed(0) + "%";
      } else {
        message = event.bytes + " bytes";
      }
      downloading("Progress: " + message);
    } else {
      message = downloadDescriptions[event.type] || "UNKNOWN STATE";
    }

    downloading(message);

    if (event.type == "complete" || event.type == "provisioningError") {
      newrelic.unsetObserveProvision();
    }
  };

  var provisionNewRelic = function () {
    if (downloadEnabled()) {
      error("");
      newrelic.setObserveProvision(provisionObserver);
    } else {
      error("Download is not enabled. Please fix all warnings and retry.");
    }
  };

  var saveLicenseKey = function () {
    if (licenseKeyInvalid()) {
      error("Invalid license key (must be 40 characters long and can only contain A-Z and 0-9).");
    } else if (developerKeyEnabled()) {
      error("");
      newrelic.licenseKey(licenseKey());
      // TODO: do this step after NR is enabled
      monitoringSolutions.addNewRelicToSolutions();
    } else {
      monitoringSolutions.removeNewRelicFromSolutions();
    }
  };

  var licenseKeyInvalid = ko.computed(function() {
    return !newrelic.validKey.test(licenseKey());
  });

  var resetLicenseKey = function () {
    licenseKey("");
    newrelic.licenseKey("");
  };

  var enableNewRelic = function () {
    sbt.tasks.actions.kill();
    newrelic.enableProject();
    monitoringInstaller({
      provider: "New Relic",
      addingFile: "project/sbt-nr.sbt",
      addedFile: newrelic.available,
      echoReady: sbt.tasks.echoReady
    });
  };

  var State = {
    needProvision: needProvision,
    provisionNewRelic: provisionNewRelic,
    downloading: downloading,
    licenseKey: licenseKey,
    saveLicenseKey: saveLicenseKey,
    resetLicenseKey: resetLicenseKey,
    error: error,
    selectedTab: selectedTab,
    enableNewRelic: enableNewRelic,
    isProjectEnabled: isProjectEnabled
  };

  return {
    render: function(){
      return ko.bindhtml(tpl, State);
    }
  }
});
