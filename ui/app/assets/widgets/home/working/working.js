/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/websocket',
  'text!./working.html'
], function(
  websocket,
  tpl
) {

  var logs = ko.observableArray([]);
  var scroll = ko.observable("stick");


  // Cache the dom Logs, for better performances
  // Not very elegant, but much, much, much more efficient.
  var logsView = ko.tpl("ul", {logEach: logs, css: "logs", id: "loading-logs"}, [
    ko.tpl("li", { attr: { 'data-bind': "text: message"} }, [])
  ]);

  var State = {
    logsView: logsView,
    scroll: scroll
  }

  websocket.subscribe({type: "sbt", subType: "CoreLogEvent"}).fork().each(function(message) {
    logs.push({
      message: message.event.entry.message,
      type: "info"
    });
  });

  websocket.subscribe({ response: String }).fork().each(function(message) {
    switch(message.response) {
      case 'Status':
        logs.push({
          message: message.info,
          type: "info"
        })
        break;
      case 'BadRequest':
        // TODO - Do better than an alert!
        window.alert('Unable to perform request: ' + message.errors.join(' \n'));
        $('#working, #open, #new').toggle();
        break;
      case 'RedirectToApplication':
        // NOTE - Comment this out if you want to debug showing logs!
        window.location.href = window.location.href.replace('home', 'app/'+message.appId+'/');
        break;
    }
  });


  return {
    render: function() {
      var dom = ko.bindhtml(tpl, State);

      return dom;
    }
  }

})
