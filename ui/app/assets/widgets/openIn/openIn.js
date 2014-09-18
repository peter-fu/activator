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

  var OpenInEclipse = function(callback, state) {
    modals.show({
      title: "Generating Eclipse Files",
      body: ko.bindhtml(openInEclipse, state),
      callback: callback,
      ok: "OK"
    });
  }

  var OpenInIdea = function(callback, state) {
    modals.show({
      title: "Generating IntelliJ IDEA Files",
      body: ko.bindhtml(openInIdea, state),
      callback: callback,
      ok: "OK"
    });
  }

  return {
    Eclipse : OpenInEclipse,
    Idea : OpenInIdea
  };
});
