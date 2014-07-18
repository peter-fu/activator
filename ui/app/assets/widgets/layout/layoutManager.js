define([
  'commons/settings',
  'css!./layoutManager'
], function(
  settings
) {

  var pannelShape =       settings.observable("layoutManager.pannelShape", "right1");
  var pannelOpened =      settings.observable("layoutManager.pannelOpened", false);
  var navigationOpened =  settings.observable("layoutManager.navigationOpened", true);

  var State = {
    pannelShape: pannelShape,
    pannelOpened: pannelOpened,
    navigationOpened: navigationOpened,

    pannelChange: function(e) {
      pannelShape(e.target.className);
      pannelOpened(true);
    },
    pannelToggle: function(e) {
      pannelOpened(!pannelOpened());
    },
    navigationToggle: function(e) {
      navigationOpened(!navigationOpened());
    },
    openPannelOptions: function(e) {
      e.preventDefault();
      e.stopPropagation();
      $("#layoutManager").toggleClass("opened");
    },
    closePannelOptions: function(e) {
      e.preventDefault();
      e.stopPropagation();
      $("#layoutManager").removeClass("opened");
    }
  }

  return State;

});
