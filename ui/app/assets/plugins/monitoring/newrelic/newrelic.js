/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
  "services/monitoring/newreliccontroller",
  "text!./newrelic.html",
  "css!./newrelic",
  "css!widgets/modules/modules",
  "css!widgets/lists/logs"
], function(
  plugins,
  newrelic,
  tpl
  ) {

  var downloadDescriptions = {
    'downloadComplete': 'Download Complete',
    'validating': 'Validating',
    'extracting': 'Extracting',
    'complete': 'Complete'
  };

  var licenseKeySaved = newrelic.licenseKeySaved();
  var available = newrelic.available();
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
    console.log("**** saving...1");
    console.log(">> ", developerKeyEnabled());
    console.log(">> ", !licenseKeyInvalid());
    if (developerKeyEnabled() && !licenseKeyInvalid()) {
      console.log("**** saving...2");
      newrelic.licenseKey(licenseKey());
    }
  };

  var licenseKeyInvalid = ko.computed(function() {
    var key = licenseKey();
    return !newrelic.validKey.test(key);
  });

  var resetKey = function () {
    licenseKey("");
    newrelic.licenseKey("");
  };

  var State = {
    needProvision: needProvision,
    provisionNewRelic: provisionNewRelic,
    downloading: downloading,
    licenseKey: licenseKey,
    saveLicenseKey: saveLicenseKey,
    error: error
  };

  return {
    render: function(){
      return ko.bindhtml(tpl, State);
    }
  }
});
