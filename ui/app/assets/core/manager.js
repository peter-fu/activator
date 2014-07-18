require.config({
  baseUrl: "/assets",
  paths: {
    'jquery': 'vendors/jquery',
    'noir': 'vendors/noir',
    'svg': 'vendors/svg-injector.min'
  }
})

require([
  'jquery',
  'noir',
  'svg',
  'core/plugins'
], function(
  $,
  noir,
  router,
  plugins
){

  // Start the UI !
  require([
    'plugins/home/home'
  ], function(home) {
    document.body.appendChild(home.render());
  });

});
