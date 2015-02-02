/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "services/sbt/tasks",
  "services/inspect/connection",
  "services/inspect/requests",
  "main/plugins",
  "commons/format",
  "text!./requests.html",
  "css!widgets/modules/modules",
  "css!./requests"
], function(
  tasks,
  connection,
  requests,
  plugins,
  format,
  tpl
) {

  var limitSizeValues = [50, 100, 200, 500];
  var orderByValues = [
    { value: "httpMethod",           text: "Method" },
    { value: "path",                 text: "Path" },
    { value: "httpResponseCode",     text: "Response Code" },
    { value: "controller",           text: "Controller" },
    { value: "invocationTimeMillis", text: "Invocation Time" },
    { value: "startTimeMillis",      text: "Time" }
  ];

  var listFilters = ko.computed(function() {
    return {
      // limitSize:      limitSize(),
      sortDirection:  "orderByDesc",
      sortCommand:    "orderBy"
      // hideAssets:  hideAssets()
    }
  });
  listFilters.subscribe(function(v) {
    requests.setListFilters(v);
  });
  var limitSize       = ko.observable(limitSizeValues[0]);
  var orderByDesc     = ko.observable(true);
  var orderBy         = ko.observable(orderByValues[0]);
  var hideAssets      = ko.observable(false);


  var filteredRequestsList = ko.computed(function() {
    return requests.list().map(formatRequestsList);
  });

  function toggleOrdering(name){
    return function() {
      if (orderBy() === name)
        orderByDesc(orderByDesc()==="asc"?"desc":"asc")
      else
        orderBy(name)
    }
  }

  function isOrdering(name) {
    return ko.computed(function() {
      return orderBy() === name?orderByDesc():false;
    });
  }

  function formatRequestsList(_req) {
    var request = $.extend({}, _req);
    request.requestLink = "#run/requests/"+request.id;
    return request;
  }

  function openRequest(req){
    window.location.hash = req.requestLink;
  }

  function closeRequest(){
    window.location.hash = "#run/requests";
    requests.setCurrentRequestId(null);
    requests.currentRequest(null);
  }

  var State = {
    requests:       filteredRequestsList,
    currentRequest: requests.currentRequest,
    openRequest:    openRequest,
    closeRequest:   closeRequest,
    inspect:        tasks.inspect,
    filters: {
      isOrdering:      isOrdering,
      toggleOrdering:  toggleOrdering,
      limitSize:       limitSize,
      orderByDesc:     orderByDesc,
      orderBy:         orderBy,
      hideAssets:      hideAssets,
      limitSizeValues: limitSizeValues,
      orderByValues:   orderByValues
    }
  }

  return {
    route: function(url, breadcrumb) {
      if (url.parameters){
        breadcrumb(breadcrumb().concat([['run/requests/'+url.parameters.join("/"), url.parameters.slice(-1)[0]]]));
        requests.setCurrentRequestId(url.parameters.join("/"));
        connection.filters.active(['requests', 'request']);
      } else {
        closeRequest();
        connection.filters.active(['requests']);
      }
    },

    render: function(){
      return ko.bindhtml(tpl, State)
    },

    keyboard: function(key, meta, e) {
      if (key === "ESC"){
        closeRequest();
      }
    }

  }

});
