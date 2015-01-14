/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "commons/websocket",
  './open/open',
  './templates/templates',
  './working/working',
  // 'css!./home'
],function(
  websocket,
  open,
  templates,
  working
) {

  var stream = websocket.subscribe('subType', 'BuildFailedToLoad');
  stream.map(function (e) {
    window.alert('Could not load project.\n' +
    'If you are creating Typesafe Reactive Platform project you must add a \'typesafe.propertied\' file in the \'<template>/project\' folder.\n' +
    'The file must contain your subscription id in the following format \'typesafe.subscription=<YOUR ID>\'\n' +
    'For more information see: http://typesafe.com/subscription');
  });

  var SharedState = {
    working: ko.observable(false)
  };

  var State = {
    open: open.render(SharedState),
    templates: templates.render(SharedState),
    working: working.render(SharedState)
  };

  return {
    render: function() {
      ko.applyBindings(State);
    }
  }
});
