/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/settings',
  "text!./panels.html",
  "css!./panels"
], function(
  settings,
  template
){

  // Find the plugins who have panels
  // var panels = plugins.plugins.reduce(function(list, group) {
  //   return list.concat(group.links.filter(function(it) {
  //     return it.panel;
  //   }));
  // }, []);
  var panels = ['plugins/tutorial/tutorialPanel'];

  var currentPanel = ko.observable();

  var switchPanel = function(panel) {
    require([panel], function(p) {
      $("#panelWrapper").replaceWith(p.render());
      currentPanel(panel);
    });
  }

  var PanelState = {
    panels: panels,
    currentPanel: currentPanel,
    switchPanel: switchPanel,
  };

  // Default panel:
  setTimeout(function() {
    PanelState.switchPanel(panels[0]);
  },100);

  return {
    render: function() {
      return ko.bindhtml(template, PanelState)
    },
    state: PanelState
  }

});
