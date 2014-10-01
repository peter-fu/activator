define([
  './connection',
  'commons/format'
],function(
  connection,
  format
){

  var currentDeviation = ko.observable();

  var DeviationState = function(data) {
    var self = this;
    this.eventId = "unknown";
    this.deviationTypeName = "unknown";
    this.parameters = function(params) {
      this.deviationTypeName = params[0];
      this.deviationType(params[0]);
      this.eventId = params[1];
    };
    // Helper functions for the trace tree template
    this.showOnlyMessage = function() {
      return this.deviationTypeName == "Warning";
    }
    this.showDeadlocks = function() {
      return this.deviationTypeName == "Deadlock";
    }
    this.showActorInfo = function() {
      return this.deviationTypeName == "Error";
    }
    this.showFromTo = function() {
      return this.deviationTypeName == "Deadletter" || this.deviationTypeName == "Unhandled Message";
    }
    this.showEvent = function(type) { return !(isSystemEvent(type) && !self.showSystemMessages()); }

  };

  function UpdateDeviation(data) {
    DeviationState.deviationReason(DeviationState.deviationTypeName);
    DeviationState.deviationActorPath("[unknown]");
    DeviationState.deviationTime("[unknown]");
    DeviationState.errorMessage("[unknown]");
    DeviationState.messageFrom("[unknown]");
    DeviationState.messageTo("[unknown]");
    DeviationState.deadlocks("[unknown]");

    if (data != null) {
      DeviationState.dataFound(true);
      if (DeviationState.deviationTypeName == "Error") {
        DeviationState.extractReason(data.traceTree);
      } else if (DeviationState.deviationTypeName == "Deadletter" || DeviationState.deviationTypeName == "Unhandled Message") {
         extractFromToInfo(data.traceTree, DeviationState);
      } else if (DeviationState.deviationTypeName == "Warning") {
         extractWarning(data.traceTree, DeviationState);
      } else if (DeviationState.deviationTypeName == "Deadlock") {
         extractDeadlock(data.traceTree, DeviationState);
      }
      DeviationState.traceTree(data.traceTree);
    } else {
      DeviationState.dataFound(false);
    }

    return DeviationState;
  }

  connection.streams.deviation
    .map(function(message) {
      debug && console.log("Deviation received",message)
      return currentDeviation(new DeviationState(message.data));
    })


  // -- SYSTEM
  var systemEvents = ["EventStreamError","EventStreamWarning","EventStreamDeadLetter","EventStreamUnhandledMessage",
            "TopLevelActorRequested","TopLevelActorCreated","SysMsgDispatched","SysMsgReceived","SysMsgCompleted"];

  function isSystemEvent(type) {
    var index = $.inArray(type,systemEvents);
    return index >= 0;
  }

  function recreateMessage(message,prefix) { return prefix+"("+message+")"; }

  function extractMessage(message, sysMsgType) {
    var msgPrefix = "[Unknown]";
    if (sysMsgType != undefined) msgPrefix = sysMsgType;
    var result = "[unknown message]";
    if (message != undefined) {
      if (typeof message == "string") result = message;
      else if (message.cause != undefined) result = recreateMessage(message.cause,msgPrefix);
      else if (message.child != undefined && message.cause != undefined) result = recreateMessage(extractActorInfo(message.child)+", "+message.cause,msgPrefix);
      else if (message.child != undefined) result = recreateMessage(extractActorInfo(message.child),msgPrefix);
      else if (message.subject != undefined) result = recreateMessage(extractActorInfo(message.subject),msgPrefix);
      else if (message.watchee != undefined && message.watcher != undefined) result = recreateMessage(extractActorInfo(message.watchee)+", "+extractActorInfo(message.watcher),msgPrefix);
      else if (message.watched != undefined && message.existenceConfirmed != undefined && message.addressTerminated != undefined) result = recreateMessage(extractActorInfo(message.watched)+", "+message.existenceConfirmed+", "+message.addressTerminated,msgPrefix);
      else if (typeof message == "object") result = msgPrefix;
    } else result = "";
    return result;
  }

  // -- ACTORS
  var actorEvents = ["SysMsgDispatched","SysMsgReceived","SysMsgCompleted","ActorRequested","ActorCreated","ActorTold",
             "ActorAutoReceived","ActorAutoCompleted","ActorReceived","ActorCompleted","ActorAsked","ActorFailed","TempActorCreated",
             "TempActorStopped","ActorSelectionTold","RemoteMessageSent","RemoteMessageReceived","RemoteMessageCompleted",
             "EventStreamDeadLetter","EventStreamUnhandledMessage"];

  function isActorEvent(event) {
    var index = $.inArray(event.type, actorEvents);
    return index >= 0;
  }

  function formatTime(time) { return formatter.formatTime(new Date(time)); }

  function extractTrace(trace) {
    var result = "N/A";
    if (trace != undefined) result = trace.substring(trace.lastIndexOf("/") + 1);
    return result;
  }

  // -- ERRORS
  var failureEvents = ["ActorFailed","EventStreamError","EventStreamWarning","EventStreamDeadLetter",
             "EventStreamUnhandledMessage", "DeadlockedThreads"];

  function isFailureEvent(type) {
    return ($.inArray(type,failureEvents) >= 0);
  }

  function extractActorInfo(info) {
    var result = "N/A";
    if (info != undefined) result = info.actorPath;
    return result;
  }

  function extractActorPath(annotation) {
    var result = "N/A";
    if (annotation != undefined) result = extractActorInfo(annotation.actorInfo);
    return result;
  }


  // -- JSON TRANSFORMERS
  function extractReason(json, _deviation) {
    var event = json.event;
    if (event && event.annotation && event.annotation.reason != undefined) {
      _deviation.deviationTime(formatter.formatTime(new Date(event.timestamp)));
      if (event.annotation.actorInfo != undefined) {
        _deviation.deviationActorPath(event.annotation.actorInfo.actorPath);
      }
      _deviation.deviationReason(event.annotation.reason);
    } else {
       if (json.children != undefined && json.children.length > 0) {
         for(var i = 0; i < json.children.length; i++) {
          _deviation.extractReason(json.children[i]);
         }
       }
    }
  }
  function extractFromToInfo(json, _deviation) {
    var event = json.event;
    if (event && event.type && (event.type == "EventStreamDeadLetter" || event.type == "EventStreamUnhandledMessage")) {
      _deviation.deviationTime(formatter.formatTime(new Date(event.timestamp)));
      _deviation.errorMessage(event.annotation.message);
      _deviation.messageFrom(event.annotation.sender.actorPath);
      _deviation.messageTo(event.annotation.recipient.actorPath);
    } else {
       if (json.children != undefined && json.children.length > 0) {
         for(var i = 0; i < json.children.length; i++) {
          _deviation.extractFromToInfo(json.children[i]);
         }
       }
    }
  }
  function extractWarning(json, _deviation) {
    var event = json.event;
    if (event && event.type && (event.type == "EventStreamWarning" || event.type == "EventStreamError")) {
      _deviation.deviationReason(event.annotation.message);
    } else {
       if (json.children != undefined && json.children.length > 0) {
         for(var i = 0; i < json.children.length; i++) {
          _deviation.extractWarning(json.children[i]);
         }
       }
    }
  }
  function extractDeadlock(json, _deviation) {
    var event = json.event;
    if (event && event.type && event.type == "DeadlockedThreads") {
      _deviation.deviationReason(event.annotation.message);
      _deviation.deadlocks(event.annotation.join("\n"));
    } else {
       if (json.children != undefined && json.children.length > 0) {
         for(var i = 0; i < json.children.length; i++) {
          _deviation.extractWarning(json.children[i]);
         }
       }
    }
  }

  return currentDeviation;
});
