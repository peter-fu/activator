/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/websocket',
  './tasks',
  './app'
], function(
  websocket,
  tasks,
  app
) {

  var logs = ko.observableArray([]);
  var stdout = ko.observableArray([]);

  // Websocket Handlers
  var logEvent = websocket.subscribe("type", "sbt");

  function pushTo(bucket){
    var buffer = ko.buffer();
    return function(message) {
      buffer(message, function(messages) {
        bucket.push.apply(bucket, messages);
      });
      if(bucket().length > 5000) {
        bucket.splice(0,1000); // Remove the first 100 items
      }
    }
  }

  /**
  Logs, by execution/task
  */
  logEvent.matchOnAttribute("subType", "TaskLogEvent")
    .each(function(m) {
      logs.push(m);
    });

  logEvent.matchOnAttribute("subType", "CoreLogEvent")
    .each(function(m) {
      logs.push(m);
    });

  logEvent
    .matchOnAttribute("subType", "BackgroundJobLogEvent")
    .each(pushTo(stdout));

  return {
    logs: logs,
    stdout: stdout
  }

});
