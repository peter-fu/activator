/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt/configuration',
  'widgets/modals/modals',
  'text!./monitoringInstaller.html'
],function(
  configuration,
  modals,
  tpl
){

  return function(state) {
    modals.show({
      title: "Configuring "+state.provider+"...",
      text: "Activator is adding "+state.provider+" to your project. This might take a minute.",
      body: ko.bindhtml(tpl, state),
      cancel: "close"
    });
    configuration.echoInstalledAndReady(function() {
      modals.hideModal();
    });
  };

});
