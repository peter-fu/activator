/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "services/sbt/tasks",
  "services/inspect/connection",
  "services/inspect/actors",
  "main/plugins",
  "commons/format",
  "text!./actors.html",
  "css!./actors",
  "css!widgets/modules/modules"
], function(
  tasks,
  connection,
  actors,
  plugins,
  format,
  tpl
) {

  var limitSizeValues = [50, 100, 200, 500];
  // var orderByValues   = ["Name", "Path", "Errors", "Throughput", "Max time in Mailbox", "Max Mailbox Size"];
  var orderByValues = [
    { value: "actorName",        text: "Name" },
    { value: "actorPath",        text: "Path" },
    { value: "maxMailboxSize",   text: "Max Mailbox Size" },
    { value: "maxTimeInMailbox", text: "Max time in Mailbox" },
    { value: "deviation",        text: "Errors" }
  ]

  var fullTextSearch  = ko.observable("");
  var limitSize       = ko.observable(limitSizeValues[0]);
  var orderByDesc     = ko.observable(true);
  var orderBy         = ko.observable(orderByValues[0]);
  var hideAnonymous   = ko.observable(true);

  var listFilters = ko.computed(function() {
    return {
      // fullTextSearch: fullTextSearch(),
      // limitSize:      limitSize(),
      sortDirection:  orderByDesc(),
      sortCommand:    orderBy()
      // hideAnonymous:  hideAnonymous()
    }
  });
  listFilters.subscribe(function(v) {
    actors.setListFilters(v);
  });

  var filteredActorsList = ko.computed(function() {
    return actors.list().map(formatActorList);
  });

  function formatActorList(_actor) {
    var actor = $.extend({}, _actor);
    var _path = actor.path.split("/");
    actor.actorLink = "#run/actors/"+actor.path;
    actor.name = _path.pop();
    actor.parent = _path.join("/");
    return actor;
  }

  // Search
  function resetSearch(state, event) {
    fullTextSearch("");
  }
  function doSearch(state, event) {
    fullTextSearch(event.target.value);
  }

  function openActor(actor){
    window.location.hash = actor.actorLink;
  }
  function closeActor(actor){
    window.location.hash = "#run/actors";
    actors.setCurrentActorId(null);
    actors.currentActor(null);
  }

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

  var State = {
    actors: filteredActorsList,
    fullTextSearch: fullTextSearch,
    resetSearch: resetSearch,
    doSearch: doSearch,
    currentActor: actors.currentActor,
    openActor: openActor,
    closeActor: closeActor,
    filters: {
      isOrdering:      isOrdering,
      toggleOrdering:  toggleOrdering,
      limitSize:       limitSize,
      orderByDesc:     orderByDesc,
      orderBy:         orderBy,
      hideAnonymous:   hideAnonymous,
      limitSizeValues: limitSizeValues,
      orderByValues:   orderByValues
    },
    formatTime: format.formatTime,
    formatUnits: format.units,
    shorten: format.shortenNumber,
    inspect: tasks.inspect
  }

  return {
    route: function(url, breadcrumb) {
      if (url.parameters){
        breadcrumb(breadcrumb().concat([['run/actors/'+url.parameters.join("/"), url.parameters.slice(-1)[0]]]));
        actors.setCurrentActorId(url.parameters.join("/"));
        connection.filters.active(['actors', 'actor']);
      } else {
        closeActor();
        connection.filters.active(['actors']);
      }
    },

    render: function(){
      return ko.bindhtml(tpl, State);
    },

    keyboard: function(key, meta, e) {
      if (key === "/"){
        $("input.fullTextSearch").focus();
        e.preventDefault();
        e.stopPropagation();
        return false;
      } else if (key === "ESC"){
        closeActor();
      }
    }
  }
});
