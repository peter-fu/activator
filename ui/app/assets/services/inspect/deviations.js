define([
  './connection',
  'commons/format'
  // './deviation'
],function(
  connection,
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
  var setListFilters = function() {};

  // format list
  function formatList(list){
    return list.map(function(item) {
      debug && console.log(item);
      item.timestamp = format.formatTime(new Date(item.timestamp));
      item.eventLink = "#run/deviations/"+item.event
      return item;
    });
  }

  // Single actor selected
  // connection.streams.deviation
  //   .map(function(message) {
  //     debug && console.log(message)
  //     currentDeviation(new Deviation(message.data))
  //   })

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

  return {
    list: deviationsList,
    currentDeviation: currentDeviation,
    setListFilters: setListFilters,
    setCurrentDeviationId: setCurrentDeviationId
  }

})
