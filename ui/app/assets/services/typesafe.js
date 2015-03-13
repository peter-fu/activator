/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/websocket',
         'commons/stream'
], function(websocket,Stream) {

  var proxyEventStream = websocket.subscribe('tag','TypesafeComProxy');

  proxyEventStream.each(function(message) {
    var type = message.type;
    var state = {
      type: type
    };
    if (type === "requestCredentials") {
      if (message.message) {
        state.message = message.message;
      }
      state.cancel = function () {
        sendCancel();
      }
      state.credentials = function (username,password) {
        sendCredentials(username,password);
      }
    } else if (type === "authenticating") {
      state.cancel = function () {
        sendCancel();
      }
    } else if (type === "fetchingSubscriptionData"){
      state.cancel = function () {
        sendCancel();
      }
    } else if (type === "failure" && message.retryable === true) {
      state.message = message.message
      state.cancel = function () {
        sendCancel();
      }
      state.retry = function () {
        sendRetry();
      }
    }

    proxyUiRequestState(state);

  });

  var proxyUiRequestState = ko.observable(null);

  function proxyRequest(type,payload) {
    var request = {
      "tag" : "TypesafeComProxy",
      "type" : type
    };

    if (payload) {
      request = $.extend(request,payload);
    }

    websocket.send(request);
  }

  function getSubscriptionDetail() {
    var response = ko.observable();
    proxyRequest("getSubscriptionDetail",null);
    var subs = proxyEventStream.each(function(message) {
      var type = message.type;
      if (type === "notASubscriber") {
        response(message);
      } else if (type === "subscriptionDetails") {
        response(message);
      } else if (type === "failure" && message.retryable === false) {
        response(message);
      }
    });

    response.subscribe(function(newValue) {
      subs.close();
    });
    return response;
  }

  function sendCancel() {
    proxyRequest("cancel",null);
  }

  function sendCredentials(username,password) {
    proxyRequest("credentials",{username: username, password: password});
  }

  function sendRetry() {
    proxyRequest("retry",null);
  }


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
    send: send,
    getSubscriptionDetail: getSubscriptionDetail,
    proxyUiRequestState: proxyUiRequestState
  }

});
