/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(function() {

  var register = {};
  var receiveMessage = function(event) {
    if (event.origin === "https://typesafe.com") { // TODO change to typesafe.com
      var obj = JSON.parse(event.data);
      debug && console.log("received message:", obj);
      for (var eventType in register){
        if (eventType in obj) {
          for (var i in register[eventType]) {
            register[eventType][i](obj[eventType]);
          }
        }
      }
    }
  }
  window.addEventListener("message", receiveMessage, false);

  function subscribe(label, callback){
    register[label] = register[label] || [];
    register[label].push(callback);
  }

  function send(target, msg){
    target.postMessage(JSON.stringify(msg), "https://typesafe.com");
  }

  return {
    subscribe: subscribe,
    send: send
  }

});
