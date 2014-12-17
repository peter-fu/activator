define([
  './connection',
  'commons/format'
],function(
  connection,
  format
){

  function setListFilters(filters) {
    connection.filters.actors($.extend(connection.filters.actors(), filters));
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
      console.log(data)
      requestsList(data);
    });

  // DEMO
  setTimeout(function(){
    connection.streams.requests.push(fakeRequestsList);
  }, 1000)
  // END DEMO

  connection.filters.actors({
    'name': 'playRequestList',
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
    // DEMO
    if (id){
      connection.streams.request.push(fakeRequest);
    } else {
      connection.streams.request.push({});
    }
    // END DEMO
    if (id){
      connection.filters.request({
        'name': 'playRequest',
        'scope': { 'traceId': id }
      });
    } else {
      connection.filters.request({});
    }
  }

  // ---------------
  // DEMO DATA
  //----------------
  var fakeRequestsList = {data: { playRequestSummaries: [{
      "httpMethod": "GET",
      "path": "/assets/lib/bootstrap/css/bootstrap.min.css",
      "httpResponseCode": 200,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 2,
      "startTimeMillis": "10:51:37:870",
      "traceId": "105137870",
      "id": "FAKE-ID10:51:37:870"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/stylesheets/main.css",
      "httpResponseCode": 200,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 2,
      "startTimeMillis": "10:51:37:878",
      "traceId": "105137878",
      "id": "FAKE-ID10:51:37:878"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/jquery/jquery.min.js",
      "httpResponseCode": 200,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 2,
      "startTimeMillis": "10:51:37:887",
      "traceId": "105137887",
      "id": "FAKE-ID10:51:37:887"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/flot/jquery.flot.js",
      "httpResponseCode": 200,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 2,
      "startTimeMillis": "10:51:37:897",
      "traceId": "105137897",
      "id": "FAKE-ID10:51:37:897"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/javascripts/index.js",
      "httpResponseCode": 200,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 2,
      "startTimeMillis": "10:51:37:902",
      "traceId": "105137902",
      "id": "FAKE-ID10:51:37:902"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/jquery/jquery.min.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 1,
      "startTimeMillis": "10:51:40:889",
      "traceId": "105140889",
      "id": "FAKE-ID10:51:40:889"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/javascripts/index.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 1,
      "startTimeMillis": "10:51:40:890",
      "traceId": "105140890",
      "id": "FAKE-ID10:51:40:890"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/bootstrap/css/bootstrap.min.css",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 1,
      "startTimeMillis": "10:51:39:864",
      "traceId": "105139864",
      "id": "FAKE-ID10:51:39:864"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/jquery/jquery.min.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 1,
      "startTimeMillis": "10:51:40:477",
      "traceId": "105140477",
      "id": "FAKE-ID10:51:40:477"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/bootstrap/css/bootstrap.min.css",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 1,
      "startTimeMillis": "10:51:41:286",
      "traceId": "105141286",
      "id": "FAKE-ID10:51:41:286"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/stylesheets/main.css",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 9,
      "startTimeMillis": "10:51:41:287",
      "traceId": "105141287",
      "id": "FAKE-ID10:51:41:287"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/flot/jquery.flot.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 9,
      "startTimeMillis": "10:51:39:867",
      "traceId": "105139867",
      "id": "FAKE-ID10:51:39:867"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/jquery/jquery.min.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 9,
      "startTimeMillis": "10:51:41:287",
      "traceId": "105141287",
      "id": "FAKE-ID10:51:41:287"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/stylesheets/main.css",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 8,
      "startTimeMillis": "10:51:39:866",
      "traceId": "105139866",
      "id": "FAKE-ID10:51:39:866"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/flot/jquery.flot.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 8,
      "startTimeMillis": "10:51:41:288",
      "traceId": "105141288",
      "id": "FAKE-ID10:51:41:288"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/jquery/jquery.min.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 8,
      "startTimeMillis": "10:51:41:020",
      "traceId": "105141020",
      "id": "FAKE-ID10:51:41:020"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/stylesheets/main.css",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 8,
      "startTimeMillis": "10:51:41:020",
      "traceId": "105141020",
      "id": "FAKE-ID10:51:41:020"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/javascripts/index.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 8,
      "startTimeMillis": "10:51:41:288",
      "traceId": "105141288",
      "id": "FAKE-ID10:51:41:288"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/images/favicon.png",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 8,
      "startTimeMillis": "10:51:40:707",
      "traceId": "105140707",
      "id": "FAKE-ID10:51:40:707"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/stylesheets/main.css",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 8,
      "startTimeMillis": "10:51:40:384",
      "traceId": "105140384",
      "id": "FAKE-ID10:51:40:384"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/images/favicon.png",
      "httpResponseCode": 200,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 7,
      "startTimeMillis": "10:51:38:374",
      "traceId": "105138374",
      "id": "FAKE-ID10:51:38:374"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/lib/flot/jquery.flot.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 7,
      "startTimeMillis": "10:51:40:889",
      "traceId": "105140889",
      "id": "FAKE-ID10:51:40:889"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/javascripts/index.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 6,
      "startTimeMillis": "10:51:41:021",
      "traceId": "105141021",
      "id": "FAKE-ID10:51:41:021"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/stylesheets/main.css",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 7,
      "startTimeMillis": "10:51:40:477",
      "traceId": "105140477",
      "id": "FAKE-ID10:51:40:477"
    },
    {
      "httpMethod": "GET",
      "path": "/assets/javascripts/index.js",
      "httpResponseCode": 304,
      "controller": "controllers.Assets",
      "controllerMethod": "at",
      "invocationTimeMillis": 6,
      "startTimeMillis": "10:51:39:867",
      "traceId": "105139867",
      "id": "10:FAKE-ID51:39:867"
    }
  ]}};
  var fakeRequest = { data: { playRequestSummary: {
    "traceId": "xx",
    "id" : "xx",
    "path": "xx",
    "remoteAddress": "xx",
    "uri": "xx",
    "version": "xx",
    "controller": "xx",
    "controllerMethod": "xx",
    "httpMethod": "xx",
    "startTimeMillis": "xx",
    "endTimeMillis": "xx",
    "invocationTimeMillis": "xx",
    "httpResponseCode": "xx",
    "headers": "xx",
    "bytesIn": "xx",
    "bytesOut": "xx",
    "domain": "xx",
    "host": "xx",
    "node": "xx",
    "summaryType": "xx",
    "type": "xx",
    "actors": "xx"
  }}}
  //----------------

  return {
    list: requestsList,
    currentRequest: currentRequest,
    setListFilters: setListFilters,
    setCurrentRequestId: setCurrentRequestId
  }


})
