/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "services/inspect/connection",
  "services/inspect/deviations",
  "services/inspect/deviation",
  "main/plugins",
  "text!./deviations.html",
  "css!./deviations",
  "css!../actors/actors",
  "css!widgets/modules/modules"
], function(
  connection,
  deviations,
  deviation,
  plugins,
  tpl
) {

  function closeDeviation(){
    window.location.hash = "#run/deviations";
    deviations.setCurrentDeviationId(null);
    deviations.currentDeviation(null);
  }
  function openDeviation(deviation){
    window.location.hash = deviation.eventLink;
  }

  var State = {
    hasDeviations: ko.computed(function() {
      var d = deviations.list();
      return d && d.deviationCount;
    }),
    data: deviations.list,
    currentDeviation: deviation,
    openDeviation: openDeviation
  }

  return {
    render: function(){
      return ko.bindhtml(tpl, State)
    },
    route: function(url, breadcrumb) {
      if (url.parameters){
        breadcrumb(breadcrumb().concat([['run/deviations/'+url.parameters.join("/"), url.parameters.slice(-1)[0]]]));
        deviations.setCurrentDeviationId(url.parameters[0]);
        connection.filters.active(['deviations', 'deviation']);
      } else {
        closeDeviation();
        connection.filters.active(['deviations']);
      }
    },
  }

});
