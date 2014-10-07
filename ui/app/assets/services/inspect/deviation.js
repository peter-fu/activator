define([
  'widgets/trace/trace',
  'commons/format'
],function(
  trace,
  format
){

  // Create a new deviation everytime.
  //Much more efficient than tons of observables
  var Deviation = function(data) {
    if (!data) throw "There is no data for this deviation. It might have expired.";

    var self = this;
    self.node                 = data.traceEvent.node;
    self.message              = data.traceEvent.message;
    self.actorSystem          = data.traceEvent.actorSystem;
    self.deviationType        = data.traceEvent.type;
    self.deviationTime        = data.traceEvent.timestamp;
    self.deviationReason      = data.traceEvent.annotation && data.traceEvent.annotation.reason;
    self.deviationActorPath   = data.traceEvent.annotation && data.traceEvent.annotation.actorInfo;
    self.deviationReason      = data.traceEvent.annotation && data.traceEvent.annotation.reaseon;
    self.errorMessage         = data.traceEvent.annotation.message;
    self.messageFrom          = data.traceEvent.annotation && data.traceEvent.annotation.sender && data.traceEvent.annotation.sender.actorPath;
    self.messageTo            = data.traceEvent.annotation && data.traceEvent.annotation.recipient && data.traceEvent.annotation.recipient.actorPath;

    self.traceTreeHtml        = "";

    self.trace                = extractTrace(data.trace);
    self.traceId              = extractTrace(data.id);
    self.formattedTime        = format.formatTime(new Date(data.timestamp));

    self.isSystemEvent        = isSystemEvent(data);
    self.isActorEvent         = isActorEvent(data);
    self.isFailureEvent       = isFailureEvent(data);

    self.extractActorInfo     = extractActorInfo(data);
    self.extractActorPath     = extractActorPath(data);

    // Parse all the children, until finding an event with the same type as the deviation
    extractData(data);
    function extractData(trace){
      if (self.deviationType == data.traceEvent.type) {
        trace.highlight = true;
        trace = trace.traceEvent;
        // Ok, this is the child we're looking for...
        if (trace && trace.type && trace.type == "Error") // ???? Not sure
          $.extend(self, {
            reason: trace.annotation.reason,
            actorPath: trace.annotation.actorInfo && trace.annotation.actorInfo.actorPath // Maybe(actorPath)
          });
        else if (trace && trace.type && (trace.type == "EventStreamDeadLetter" || trace.type == "EventStreamUnhandledMessage"))
          $.extend(self, {
            deviationTime : format.formatTime(new Date(trace.timestamp)),
            errorMessage  : trace.annotation.message,
            messageFrom   : trace.annotation.sender.actorPath,
            messageTo     : trace.annotation.recipient.actorPath
          });
        else if (trace && trace.type && (trace.type == "EventStreamWarning" || trace.type == "EventStreamError"))
          $.extend(self, {
            deviationReason: trace.annotation.message
          });
        else if (trace && trace.type && trace.type == "DeadlockedThreads")
          $.extend(self, {
            deviationReason: trace.annotation.message
            // deadlocks      : trace.annotation.join("\n") // This must be some kind of mistake, copied from original
          });
        else
          throw "No data for this error";
      } else {
        if (trace.children && trace.children.length > 0) {
          var r;
          for(var i = 0; i < json.children.length; i++) {
            r = extractData(self, trace.children[i]);
            if (r) return r;
          }
        }
      }
    }

    self.traceTree = trace(data);
  }

  // -- SYSTEM
  var systemEvents = ["EventStreamError","EventStreamWarning","EventStreamDeadLetter","EventStreamUnhandledMessage",
            "TopLevelActorRequested","TopLevelActorCreated","SysMsgDispatched","SysMsgReceived","SysMsgCompleted"];

  function isSystemEvent(event) {
    var index = $.inArray(event.type,systemEvents);
    return index >= 0;
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

  // -- ERRORS
  var failureEvents = ["ActorFailed","EventStreamError","EventStreamWarning","EventStreamDeadLetter",
             "EventStreamUnhandledMessage", "DeadlockedThreads"];

  function isFailureEvent(type) {
    return ($.inArray(type,failureEvents) >= 0);
  }

  // -- EXTRACT INFOS
  function extractTrace(trace) {
    return (trace == undefined) ? "N/A" : result = trace.substring(trace.lastIndexOf("/") + 1);
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

  function recreateMessage(message,prefix) { return prefix+"("+message+")"; }

  function extractMessage(message, sysMsgType) {
    var msgPrefix = sysMsgType || "[Unknown]";

    var result;
    if (message != undefined) {
      if (typeof message == "string"){
        result = message;
      }
      else if (message.cause   != undefined) {
        result = recreateMessage(message.cause,msgPrefix);
      }
      else if (message.child   != undefined && message.cause != undefined) {
        result = recreateMessage(extractActorInfo(message.child)+", "+message.cause,msgPrefix);
      }
      else if (message.child   != undefined) {
        result = recreateMessage(extractActorInfo(message.child),msgPrefix);
      }
      else if (message.subject != undefined) {
        result = recreateMessage(extractActorInfo(message.subject),msgPrefix);
      }
      else if (message.watchee != undefined && message.watcher != undefined) {
        result = recreateMessage(extractActorInfo(message.watchee)+", "+extractActorInfo(message.watcher),msgPrefix);
      }
      else if (message.watched != undefined && message.existenceConfirmed != undefined && message.addressTerminated != undefined) {
        result = recreateMessage(extractActorInfo(message.watched)+", "+message.existenceConfirmed+", "+message.addressTerminated,msgPrefix);
      }
      else {
        result = "[unknown message]";
      }
    } else result = "";

    return result;
  }

  return Deviation;
});
