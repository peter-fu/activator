define([
  'services/sbt'
],function(sbt) {

  function searchTasks(argument) {}

  function searchFiles(argument) {}

  function searchDocs(argument) {}

  var combinedSearch = function(keywords, options) {
    debug && console.log("starting search on " + keywords);
    return $.when(/*search.doSearch(keywords), */sbt.tasks.possibleAutocompletions(keywords))
    .then(function(/*searchValues, */sbtCompletions) {
        console.log(sbtCompletions)
        // TODO not handling errors here...
        var sbtValues = $.map(sbtCompletions.choices, function(completion, i) {
          return {
            title: completion.display,
            subtitle: "run sbt task " + completion.display,
            type: "Sbt",
            url: false,
            execute: keywords + completion.append
          };
        });
        // var values = sbtValues.concat(searchValues[0]);
        options(sbtValues);

        // return values;
    });
  }

  return {
    search:         combinedSearch
  }

});
