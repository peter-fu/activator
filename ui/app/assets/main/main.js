/**
 * Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
require.config({
  baseUrl:  '/public',
});

var vendors = [
  'lib/jquery/jquery',
  'lib/knockout/knockout',
  'css',
  'text',
  'lib/ace/src/ace'
]

var commons = [
  'commons/templates',
  'commons/effects',
  'commons/utils',
  'commons/settings',
  'commons/stream'
]

var services = [
  'commons/websocket',

  'services/sbt'
]

// DEBUG
debug = true;

// var core = [
//   'main/view',
//   'main/router',
//   'main/keyboard'
// ]

require(vendors, function($, ko) {
  window.ko = ko; // it's used on every page...
  require(commons, function() {
    require(services, function(WS, sbt) {
      WS.connect();
 
      // require(core, function(view, router) {
      //   view.render();
      //   router.load(window.location.hash)
      // })
    })
  })
})
