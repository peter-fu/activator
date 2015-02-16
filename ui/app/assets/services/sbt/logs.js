/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/websocket',
  './tasks',
  './events',
  './app'
], function(
  websocket,
  tasks,
  events,
  app
) {

  var logs = ko.observableArray([]);
  var stdout = ko.observableArray([]);

  // Websocket Handlers
  var logEvent = websocket.subscribe("type", "sbt");

  function filterDebug(m) {
    if (m.event.entry && m.event.entry.level)
      return m.event.entry.level !== "debug" || (app.settings.showLogDebug() || debug);
    else
      return true;
  }

  /**
  Logs, by execution/task
  */
  logEvent.matchOnAttribute("subType", "TaskLogEvent")
    .filter(filterDebug)
    .each(function(m) {
      logs.push(m);
    });

  logEvent.matchOnAttribute("subType", "DetachedLogEvent")
    .filter(filterDebug)
    .each(function(m) {
      // Increment the build error counter
      if (m.event.entry && m.event.entry.level && m.event.entry.level === "error") {
        events.incrementCounters.build();
      }
      logs.push(m);
    });

  logEvent
    .matchOnAttribute("subType", "BackgroundJobLogEvent")
    .each(function(m) {
      // Increment the build error counter
      if (m.event.entry && m.event.entry.level && m.event.entry.level === "error") {
        events.incrementCounters.run();
      }
      stdout.push(m);
    });

  return {
    logs: logs,
    stdout: stdout
  }

});
