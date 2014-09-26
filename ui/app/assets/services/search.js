/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt',
  'services/ajax'
], function(
  sbt,
  fs
) {

  // options is the observable where we put the results
  var combinedSearch = function(keywords, options) {
    debug && console.log("starting search on " + keywords);
    return $.when(fs.search(keywords), sbt.tasks.deferredPossibleAutoCompletions(keywords))
      .then(function(searchValues, sbtCompletions) {
        var filtered = sbtCompletions.filter(function (el) { 
          return !endsWith(el.title, ":");
        });
        filtered.sort(function(a,b) { return a.title.length > b.title.length });
        var result =
          [{"heading": "Commands:"}].concat(
            filtered
          ).concat(
            [{"heading": "Files:"}]
          ).concat(
            searchValues
          );
        options(result);
    });
  }

  var endsWith = function(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  };

  return {
    combinedSearch: combinedSearch
  }
});
