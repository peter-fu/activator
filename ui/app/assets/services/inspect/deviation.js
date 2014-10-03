define([
  './connection',
  'widgets/trace/trace',
  'commons/format'
],function(
  connection,
  trace,
  format
){

  var currentDeviation = ko.observable();

  // Create a new deviation everytime.
  //Much more efficient than tons of observables
  var Deviation = function(data) {
    var self = this;
    self.node                 = data.traceEvent.node;
    self.actorSystem          = data.traceEvent.actorSystem;
    self.deviationType        = data.traceEvent.type;
    self.deviationTime        = data.traceEvent.timestamp;
    self.deviationReason      = data.traceEvent.annotation && data.traceEvent.annotation.reason;
    self.deviationActorPath   = data.traceEvent.annotation && data.traceEvent.annotation.actorInfo;
    self.deadlocks            = data.traceEvent.id;
    self.deviationReason      = data.traceEvent.annotation.message;
    self.errorMessage         = data.traceEvent.id;
    self.messageFrom          = data.traceEvent.id;
    self.messageTo            = data.traceEvent.id;

    self.traceTreeHtml        = "";

    self.trace                = extractTrace(data.trace);
    self.traceId              = extractTrace(data.id);
    self.formattedTime        = format.formatTime(new Date(data.timestamp));

    self.isSystemEvent        = isSystemEvent(data);
    self.isActorEvent         = isActorEvent(data);
    self.isFailureEvent       = isFailureEvent(data);

    self.extractActorInfo     = extractActorInfo(data);
    self.extractActorPath     = extractActorPath(data);

    extractData(self, data);

    self.traceTree = trace(data.traceTree);
  }

  connection.streams.deviation
    .map(function(message) {
      debug && console.log("Deviation received",message)
      return currentDeviation(new Deviation(message.data));
    })


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

  // Parse all the children, until finding an event with the same type as the deviation
  function extractData(self, data){
    if (self.deviationType == data.traceEvent.type) {
      data = data.traceEvent;
      // Ok, this is the child we're looking for...
      if (data && data.type && data.type == "Error") // ???? Not sure
        $.extend(self, {
          reason: data.annotation.reason,
          actorPath: data.annotation.actorInfo && data.annotation.actorInfo.actorPath // Maybe(actorPath)
        });
      else if (data && data.type && (data.type == "EventStreamDeadLetter" || data.type == "EventStreamUnhandledMessage"))
        $.extend(self, {
          deviationTime : format.formatTime(new Date(data.timestamp)),
          errorMessage  : data.annotation.message,
          messageFrom   : data.annotation.sender.actorPath,
          messageTo     : data.annotation.recipient.actorPath
        });
      else if (data && data.type && (data.type == "EventStreamWarning" || data.type == "EventStreamError"))
        $.extend(self, {
          deviationReason: data.annotation.message
        });
      else if (data && data.type && data.type == "DeadlockedThreads")
        $.extend(self, {
          deviationReason: data.annotation.message
          // deadlocks      : data.annotation.join("\n") // This must be some kind of mistake, copied from original
        });
      else
        throw "No data for this error";
    } else {
      if (data.children && data.children.length > 0) {
        var r;
        for(var i = 0; i < json.children.length; i++) {
          r = extractData(self, data.children[i]);
          if (r) return r;
        }
      }
    }
  }

  return currentDeviation;
});
