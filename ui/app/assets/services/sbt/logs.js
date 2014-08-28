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
  var logsBuffer = ko.buffer();
  var stdoutBuffer = ko.buffer();

  // Websocket Handlers
  var logEvent = websocket.subscribe({ type:'sbt', subType:'LogEvent' })

  logEvent
    .match(function(m) {
      // Filter debug on demand
      return !((m.event.entry.level == "debug" || m.event.entry.type == "stdout") && !(app.settings.showLogDebug() || debug))
    })
    .each(function(message){
      logsBuffer(message, function(messages) {
        logs.push.apply(logs, messages);
      });
      if(logs().length > 1000) {
        logs.splice(0,100); // Remove the first 100 items
      }
    });

  logEvent
    .match(function(m) {
      // Standard out
      return m.event.entry && m.event.entry.type == "stdout";
    })
    .each(function(message){
      stdoutBuffer(message, function(messages) {
        stdout.push.apply(stdout, messages);
      });
      if(stdout().length > 1000) {
        stdout.splice(0,100); // Remove the first 100 items
      }
    });

  return {
    logs: logs,
    stdout: stdout
  }

});
