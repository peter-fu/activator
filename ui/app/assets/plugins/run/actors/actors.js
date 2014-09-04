/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "services/inspect/connection",
  "services/inspect/actors",
  "main/plugins",
  "text!./actors.html",
  "css!./actors",
  "css!widgets/modules/modules"
], function(
  connection,
  actors,
  plugins,
  tpl
) {

  var fullTextSearch  = ko.observable("");
  var limitSize       = ko.observable(50);
  var orderByDesc     = ko.observable(true);
  var orderBy         = ko.observable("");
  var hideAnonymous   = ko.observable(true);

  var limitSizeValues = [50, 100, 200, 500];
  var orderByValues   = ["Name", "Path", "Errors", "Throughput", "Max time in Mailbox", "Max Mailbox Size"];

  var listFilters = ko.computed(function() {
    return {
      fullTextSearch: fullTextSearch(),
      limitSize:      limitSize(),
      orderByDesc:    orderByDesc(),
      orderBy:        orderBy(),
      hideAnonymous:  hideAnonymous()
    }
  });

  var filteredActorsList = ko.computed(function() {
    return actors.list().filter(filterActorList).map(formatActorList).sort(sortActorList);
  });

  function formatActorList(_actor) {
    var actor = $.extend({}, _actor);
    var _path = actor.path.split("/");
    actor.actorLink = "#run/actors/"+actor.path;
    actor.name = _path.pop();
    actor.parent = _path.join("/");
    return actor;
  }

  function filterActorList(actor) {
    return true;
  }

  function sortActorList(actorA, actorB) {
    return actorA.path > actorB.path;
  }

  // Search
  function resetSearch(state, event) {
    fullTextSearch("");
  }
  function doSearch(state, event) {
    fullTextSearch(event.target.value);
  }

  var State = {
    actors: filteredActorsList,
    fullTextSearch: fullTextSearch,
    resetSearch: resetSearch,
    doSearch: doSearch,
    currentActor: actors.currentActor,
    filters: {
      limitSize:       limitSize,
      orderByDesc:     orderByDesc,
      orderBy:         orderBy,
      hideAnonymous:   hideAnonymous,
      limitSizeValues: limitSizeValues,
      orderByValues:   orderByValues
    }
  }

  return {
    route: function(url, breadcrumb) {
      console.log(">>>>>>", url)
      if (url.parameters){
        breadcrumb(breadcrumb().concat([['run/actors/'+url.parameters.join("/"), url.parameters.slice(-1)[0]]]));
        actors.setCurrentActorId(url.parameters.join("/"));
        connection.filters.active(['actors', 'actor']);
      } else {
        connection.filters.active(['actors']);
      }
    },

    render: function(){
      return ko.bindhtml(tpl, State);
    },

    keyboard: function(key, meta, e) {
      if (key == "/"){
        $("input.fullTextSearch").focus();
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }
});
