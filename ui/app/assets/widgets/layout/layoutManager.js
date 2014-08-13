/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/settings',
  'css!./layoutManager'
], function(
  settings
) {

  var panelShape =       settings.observable("layoutManager.panelShape", "right1");
  var panelOpened =      settings.observable("layoutManager.panelOpened", false);
  var navigationOpened =  settings.observable("layoutManager.navigationOpened", true);

  var State = {
    panelShape: panelShape,
    panelOpened: panelOpened,
    navigationOpened: navigationOpened,

    panelChange: function(e) {
      panelShape(e.target.className);
      panelOpened(true);
    },
    panelToggle: function(e) {
      panelOpened(!panelOpened());
    },
    navigationToggle: function(e) {
      navigationOpened(!navigationOpened());
    },
    openpanelOptions: function(e) {
      e.preventDefault();
      e.stopPropagation();
      $("#layoutManager").toggleClass("opened");
    },
    closepanelOptions: function(e) {
      e.preventDefault();
      e.stopPropagation();
      $("#layoutManager").removeClass("opened");
    }
  }

  return State;

});
