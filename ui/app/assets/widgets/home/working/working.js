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

  var State = {
    logs: logs,
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
