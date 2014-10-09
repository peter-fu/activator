/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt/configuration',
  'widgets/modals/modals',
  'text!./echoInstaller.html',
  'css!./echoInstaller',
],function(
  configuration,
  modals,
  tpl
){

  return function(callback) {
    modals.show({
      title: "Configuring project...",
      text: "Activator is adding the Inspector to your project. This might take a minute.",
      body: ko.bindhtml(tpl, configuration),
      cancel: "close"
    });
    configuration.echoInstalledAndReady(function() {
      modals.hideModal();
      callback();
    });
  };

});
