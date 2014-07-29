/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/utils', 'commons/widget'], function(utils, Widget) {
  var ConsoleWidget = utils.Class(Widget, {
    dataName: '',
    dataTypes: [],
    dataRequest: function() { return {}; },
    onData: function() {}
  });
  return ConsoleWidget;
});
