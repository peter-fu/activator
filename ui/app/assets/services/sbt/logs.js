/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/websocket',
  './app'
], function(
  websocket,
  app
) {

  var logs = ko.observableArray([]);
  var stdout = ko.observableArray([]);

  // Websocket Handlers
  var logEvent = websocket.subscribe("type", "sbt");

  logEvent
    .match(function(m) {
      return (m.subType == "CoreLogEvent" || m.subType == "TaskLogEvent");
    })
    .filter(filterDebug)
    .each(pushTo(logs));

  logEvent
    .matchOnAttribute("subType", "BackgroundJobLogEvent")
    .each(pushTo(stdout));

  function pushTo(bucket){
    var buffer = ko.buffer();
    return function(message) {
      buffer(message, function(messages) {
        bucket.push.apply(bucket, messages);
      });
      if(bucket().length > 1000) {
        bucket.splice(0,100); // Remove the first 100 items
      }
    }
  }

  function filterDebug(m) {
    if (m.event.entry && m.event.entry.level)
      return !(m.event.entry.level == "debug" && !(app.settings.showLogDebug() || debug));
    else
      return true;
  }

  return {
    logs: logs,
    stdout: stdout
  }

});
