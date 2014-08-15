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

  return {
    render: function() {
      var dom = bindhtml(tpl, {});
      var logs = $("#loading-logs", dom);
      var wrapper = $("article", dom)[0];

      websocket.subscribe({type: "sbt", subType: "LogEvent"}).fork().each(function(message) {
        logs.append($("<li/>").html(message.event.entry.message).attr("data-type", message.event.entry.level));
        wrapper.scrollTop = 9e9;
      });

      websocket.subscribe({ response: String }).fork().each(function(message) {
        switch(message.response) {
          case 'Status':
            logs.append($("<li/>").html(message.info).attr("data-type", "info"));
            logs[0].scrollTop = 9e9;
            break;
          case 'BadRequest':
            // TODO - Do better than an alert!
            alert('Unable to perform request: ' + message.errors.join(' \n'));
            toggleWorking();
            break;
          case 'RedirectToApplication':
            // NOTE - Comment this out if you want to debug showing logs!
            window.location.href = window.location.href.replace('home', 'app/'+message.appId+'/');
            break;
        }
      });

      return dom;
    }
  }

})
