define([
  './connection',
  'commons/format'
],function(
  connection,
  format
){

  function setListFilters(filters) {
    connection.filters.requests($.extend(connection.filters.requests(), filters));
  }
  var requestsList = ko.observable([]);

  connection.streams.requests
    .map(function(message) {
      if (message && message.data && message.data.playRequestSummaries)
        return message.data.playRequestSummaries;
    })
    // .filterVal(function(actor) {
    //   TODO
    // })
    // .mapVal(function(request) {
    //   return {
    //     TODO
    //
    //      Json.obj(
    //        "traceId" -> req.traceId.toString,
    //        "id" -> req.invocationInfo.id,
    //        "startTimeMillis" -> req.start.millis,
    //        "path" -> req.invocationInfo.path,
    //        "controller" -> req.invocationInfo.controller,
    //        "controllerMethod" -> req.invocationInfo.method,
    //        "httpMethod" -> req.invocationInfo.httpMethod,
    //        "httpResponseCode" -> req.response.resultInfo.httpResponseCode,
    //        "invocationTimeMillis" -> (req.end.millis - req.start.millis))
    //
    //   }
    // })
    .map(function(data) {
      requestsList(data);
    });


  connection.filters.requests({
    'name': 'requests',
    'scope': {},
    'sortCommand': 'startTime',
    // "startTime"    -- i.startNanoTime
    // "responseTime" -- i.duration
    // "path"         -- i.invocationInfo.path
    // "bytesIn"      -- i.bytesIn
    // "bytesOut"     -- i.bytesOut
    'sortDirection': 'desc',
    'paging': { 'offset': 0, 'limit': 100 }
  });


  // Single request selected
  connection.streams.request
    .map(function(message) {
      if (message && message.data && message.data.playRequestSummary){
        currentRequest(message.data.playRequestSummary);
      }
    });

  var currentRequest = ko.observable();
  function setCurrentRequestId(id) {
    if (id){
      connection.filters.request({
        'name': 'request',
        'scope': {},
        'traceId': id
      });
    } else {
      connection.filters.request({});
    }
  }

  return {
    list: requestsList,
    currentRequest: currentRequest,
    setListFilters: setListFilters,
    setCurrentRequestId: setCurrentRequestId
  }

});
