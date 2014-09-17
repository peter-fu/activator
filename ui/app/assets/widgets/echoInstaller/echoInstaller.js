/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/inspect/echoInstaller',
  'widgets/modals/modals',
  'text!./echoInstaller.html',
  'css!./echoInstaller',
],function(
  echoIntallerService,
  modals,
  tpl
){

  return function(callback) {
    modals.show({
      title: "Configuring project...",
      text: "Activator is adding the Inspector to your project.",
      body: ko.bindhtml(tpl, echoIntallerService)
    });
    echoIntallerService.echoInstalledAndReady(function() {
      modals.hideModal();
      callback();
    });
  };

});
