require.config({
  baseUrl:  '/assets',
  paths: {
    jquery: 'lib/jquery//jquery',
    ko: 'lib/knockout/knockout'
  }
});

window.addStylesheet = function(url) {
  var cssId = "stylesheet"+url.replace(/[^a-z]+/ig, "");
  if (!document.getElementById(cssId)) {
      var head  = document.getElementsByTagName('head')[0];
      var link  = document.createElement('link');
      link.id   = cssId;
      link.rel  = 'stylesheet';
      link.type = 'text/css';
      link.href = '/assets/'+url+'.css';
      link.media = 'all';
      head.appendChild(link);
  }
}

addStylesheet('core/main')

require([
  'commons/browser',
  'lib/jquery/jquery',
  'lib/knockout/knockout',
  'commons/helpers',
  'css',
  'text',
  'core/plugins'
], function(
  browser,
  $,
  ko
){

  window.ko = ko; // it's used on every page...

  // Start the UI !
  require([
    'widgets/layout/layout',
    'core/router',
    'commons/websocket',
    'core/keyboard'
  ], function(layout, router, websocket) {
    layout.render();
    router.load(window.location.hash);
    setTimeout(function() {
      websocket.connect();
    }, 100);
  });

});
