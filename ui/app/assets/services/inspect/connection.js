define([
  'commons/websocket'
],function(
  websocket
) {

  var defaultTime = { "startTime": "", "endTime": "", "rolling": "20minutes" };

  var streams = {
    overview:   websocket.subscribe('type', 'overview'),
    actor:      websocket.subscribe('type', 'actor'),
    actors:     websocket.subscribe('type', 'actors'),
    deviation:  websocket.subscribe('type', 'deviation'),
    deviations: websocket.subscribe('type', 'deviations'),
    request:    websocket.subscribe('type', 'playrequest'),
    requests:   websocket.subscribe('type', 'playrequests')
  }

  var filters = {
    active:     ko.observable([]).extend({ throttle: 50 }), // Store the activated filters labels

    actor:      ko.observable().extend({ throttle: 50 }),
    actors:     ko.observable().extend({ throttle: 50 }),
    deviation:  ko.observable().extend({ throttle: 50 }),
    deviations: ko.observable().extend({ throttle: 50 }),
    request:    ko.observable().extend({ throttle: 50 }),
    requests:   ko.observable().extend({ throttle: 50 })
  }

  var overview = [{
    "name": "overview",
    "paging": {
      "offset": 0,
      "limit": 10000
    },
    "scope": {}
  }];

  var stats = ko.observable({
    "type": "overview",
    "data": {
      "metadata": {
        "playPatternCount": 0,
        "actorPathCount": 0
      },
      "deviations": {
        "deviationCount": 0
      },
      "currentStorageTime": 0
    }
  });
  streams.overview.map(stats);

  /**
   Send an InspectRequest
   */
  function send(message){
    websocket.send({
      request: 'InspectRequest',
      location: message
    });
  }

  function reset(){
    send({
      "commands": [{
        "module": "lifecycle",
        "command": "reset"
      }]
    });
  }
  reset();


  function request(){
    setTimeout(function() {
      send({
        modules: filters.active().map(function(label) { return filters[label](); }).concat(overview),
        time: defaultTime // TODO: Time? Should we get rid of it?
      });
    },10)
  }
  // Every time a filter change, we do a request.
  $.each(filters, function(label, obs) {
    obs.subscribe(request);
  });

  return {
    stats:        stats,
    streams:      streams,
    filters:      filters,
    request:      request,
    send:         send,
    reset:        reset
  };

})
