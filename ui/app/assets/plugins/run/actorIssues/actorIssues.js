/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt/app',
  'services/sbt/tasks',
  "services/inspect/connection",
  "services/inspect/deviations",
  "main/plugins",
  "text!./actorIssues.html",
  "css!./actorIssues",
  "css!../actors/actors",
  "css!widgets/modules/modules"
], function(
  app,
  tasks,
  connection,
  deviations,
  plugins,
  tpl
) {

  function closeDeviation(){
    window.location.hash = "#run/actorIssues";
    deviations.setCurrentDeviationId(null);
    deviations.currentDeviation(null);
  }
  function openDeviation(deviation){
    window.location.hash = deviation.eventLink;
  }

  var State = {
    closeDeviation: closeDeviation,
    hasDeviations: ko.computed(function() {
      var d = deviations.list();
      return d && d.deviationCount;
    }),
    data: deviations.list,
    currentDeviation: deviations.currentDeviation,
    errorDeviation: deviations.errorDeviation,
    openDeviation: openDeviation,
    prefs: app.deviationPrefs,
    inspect: tasks.inspect
  }

  return {
    render: function(){
      return ko.bindhtml(tpl, State)
    },
    route: function(url, breadcrumb) {
      if (url.parameters){
        breadcrumb(breadcrumb().concat([['run/actorIssues/'+url.parameters.join("/"), url.parameters.slice(-1)[0]]]));
        deviations.setCurrentDeviationId(url.parameters[0]);
        connection.filters.active(['deviations', 'deviation']);
      } else {
        closeDeviation();
        connection.filters.active(['deviations']);
      }
    },
    keyboard: function(key, meta, e) {
      if (key === "ESC"){
        closeDeviation();
      }
    }
  }


});
