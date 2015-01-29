/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/settings',
  'main/router',
  'css!./layoutManager'
], function(
  settings,
  router
) {


  var panelShape =        settings.observable("layoutManager.panelShape", "right1");
  var panelOpenedSet =    settings.observable("layoutManager.panelOpened", false);
  var navigationOpened =  settings.observable("layoutManager.navigationOpened", true);

  var panelOpened = ko.computed(function() {
    return panelOpenedSet() && router.current().id !== "tutorial";
  });

  var State = {
    panelShape: panelShape,
    panelOpened: panelOpened,
    navigationOpened: navigationOpened,

    panelChange: function(o,e) {
      panelShape(e.target.className);
      panelOpened(true);
    },
    panelToggle: function() {
      panelOpenedSet(!panelOpenedSet());
    },
    navigationToggle: function() {
      navigationOpened(!navigationOpened());
    },
    togglePanelOptions: function(o,e) {
      e.preventDefault();
      e.stopPropagation();
      $("#layoutManager dd").toggle();
    },
    closePanelOptions: function() {
      $("#layoutManager dd").hide();
    }
  }

  return State;

});
