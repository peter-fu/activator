define([
  './connection',
  'commons/format'
],function(
  connection,
  format
){

  var showFullPath = ko.observable();
  var formatUnits = function(u, v) { return format.shorten(v) + ' ' + u };

  function setListFilters(filters) {
    connection.filters.actors($.extend(connection.filters.actors(), filters));
  }
  var actorsList = ko.observable([]);

  connection.streams.actors
    .map(function(message) {
      return message.data.actors.actors;
    })
    .filterVal(function(actor) {
      return true; // TODO: hide anonymous if asked
    })
    .mapVal(function(actor) {
      var path              = actor.scope.actorPath;
      var elements          = path.split('/');
      var name              = elements.pop();
      var prefix            = showFullPath() ? elements : [];
      var hover             = showFullPath ? '' : path;
      var actorLink         = "#inspect/actor/" + path;
      var messageRate       = actor.totalMessageRate || 0;
      var throughput        = format.units('messages/second', messageRate, formatUnits);
      var maxTimeInMailbox  = format.units(actor.maxTimeInMailbox.unit, actor.maxTimeInMailbox.value, formatUnits);
      var maxMailboxSize    = actor.maxMailboxSize;
      var deviationCount    = actor.errorCount + actor.warningCount + actor.deadletterCount + actor.unhandledMessageCount;
      var deviations        = deviationCount > 0 ? deviationCount : "";
      // if (!fullActorPath() && path.indexOf('/user/') > -1) path = path.substring(path.indexOf('/user/') + 6);
      return {
        'path': path,
        'actorLink': actorLink,
        'prefix': prefix,
        'name': name,
        'hover': hover,
        'throughput': throughput,
        'maxTimeInMailbox': maxTimeInMailbox,
        'maxMailboxSize': maxMailboxSize,
        'deviations': deviations
      }
    })
    .map(function(data) {
      actorsList(data);
    });

  connection.filters.actors({
    'name': 'actors',
    'scope': {},
    'sortCommand': 'actorName',
    'sortDirection': 'desc',
    'paging': { 'offset': 0, 'limit': 100 }
  });


  // Single actor selected
  connection.streams.actor
    .map(function(message) {
      if (message){
        var actor = message.data.actor;
        actor.deviationCount = actor.errorCount + actor.warningCount + actor.deadletterCount + actor.unhandledMessageCount;
        currentActor(message.data.actor);
      }
    })

  var currentActor = ko.observable();
  function setCurrentActorId(id) {

    if (id){
      connection.filters.actor({
        'name': 'actor',
        'scope': { 'actorPath': id }
      });
    } else {
      connection.filters.actor({});
    }
  }


  return {
    list: actorsList,
    currentActor: currentActor,
    setListFilters: setListFilters,
    setCurrentActorId: setCurrentActorId
  }


})
