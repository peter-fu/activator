/**
 * Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
require.config({
  baseUrl:  '/public',
});

var vendors = [
  'lib/jquery/jquery',
  'lib/knockout/knockout.debug',
  'css',
  'text',
  // 'ace/ace'
]

var commons = [
  'commons/templates',
  'commons/effects',
  'commons/utils',
  'commons/settings',
  'commons/stream'
]

var services = [
  'services/sbt',
  'services/fs'
]

var core = [
  'debug/view',
  'commons/websocket'
]

require(vendors, function($, ko) {
  window.ko = ko; // it's used on every page...
  require(commons, function() {
    require(services, function(sbt, fs) {
      window.sbt = sbt;
      window.fs = fs;
      require(core, function(view, WS) {

        view.render();
        WS.connect();

      })
    })
  })
})
