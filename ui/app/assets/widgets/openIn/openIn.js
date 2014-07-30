/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
  'widgets/modals/modals',
  'text!./openInEclipse.html',
  'text!./openInIdea.html',
  'css!./openIn'
],function(
  modals,
  openInEclipse,
  openInIdea
){

  // SAMPLE:
  // setTimeout(function() {
  //   var logs = ko.observableArray([{ message: "hola" }]);
  //   var complete = ko.observable(false);
  //   var logging = setInterval(function() {
  //     logs.push({ message: "log line " });
  //   }, 400);
  //   setTimeout(function() {
  //     clearInterval(logging);
  //     complete(true);
  //   }, 3000);

  //   openIn.Eclipse({
  //     logs: logs,
  //     complete: complete
  //   });
  // },500);

  var OpenInEclipse = function(state) {

    modals.show({
      title:   "Generating Eclipse files...",
      body:    bindhtml(openInEclipse, state),
      cancel:  "Hide"
    });

  }

  var OpenInIdea = function(state) {

    modals.show({
      title:   "Generating Idea files...",
      body:    bindhtml(openInEclipse, state),
      cancel:  "Hide"
    });

  }

  return {
    Eclipse : OpenInEclipse,
    Idea : OpenInIdea
  };
});
