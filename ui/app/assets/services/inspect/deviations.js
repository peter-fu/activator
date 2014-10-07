define([
  './connection',
  './deviation',
  'commons/format'
  // './deviation'
],function(
  connection,
  Deviation,
  format
  // deviation
){

  connection.streams.deviations
    .map(function(message) {
      return message.data.deviations[0];
    })
    .map(function(data) {
      data.deadletters       = formatList(data.deadletters);
      data.deadlocks         = formatList(data.deadlocks);
      data.errors            = formatList(data.errors);
      data.unhandledMessages = formatList(data.unhandledMessages);
      data.warnings          = formatList(data.warnings);
      deviationsList(data);
    });

  connection.filters.deviations({
    'name': 'deviations',
    'scope': {}
  });

  var deviationsList = ko.observable();
  var currentDeviation = ko.observable();
  var errorDeviation = ko.observable();
  var setListFilters = function() {};

  // format list
  function formatList(list){
    return list.map(function(item) {
      debug && console.log(item);
      item.timestamp = format.formatTime(new Date(item.timestamp));
      item.eventLink = "#run/actorIssues/"+item.event
      return item;
    });
  }

  function setCurrentDeviationId(id) {
    if (id){
      connection.filters.deviation({
        'name': 'deviation',
        'eventId': id,
        'scope': {}
      });
    } else {
      connection.filters.deviation({});
    }
  }

  connection.streams.deviation
    .map(function(message) {
      debug && console.log("Deviation received",message)
      try {
        var d = new Deviation(message.data);
        currentDeviation(d);
        errorDeviation(null);
      } catch (er) {
        currentDeviation(null);
        errorDeviation(er);
      }
    });

  return {
    list: deviationsList,
    currentDeviation: currentDeviation,
    errorDeviation: errorDeviation,
    setListFilters: setListFilters,
    setCurrentDeviationId: setCurrentDeviationId
  }

})
