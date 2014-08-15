/*
Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
*/

require.config({
  baseUrl:  '/public'
});

require([
  // Vendors
  'lib/jquery/jquery',
  'lib/knockout/knockout',
  'css',
  'text'
],function($, ko) {
  window.ko = ko;
  require([
    'widgets/home/home',
    'commons/websocket',
    'css!home/home',
    'commons/templates'
  ], function(home, websocket, TemplateList) {
    home.render();
    websocket.connect();
  })
});

var seeds = templates.filter(function(t){
  return t.tags.indexOf('seed') >= 0;
});
templates = templates.filter(function(t){
  return t.tags.indexOf('seed') < 0;
});
