/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(function() {

  var cache = {};
  function route(plugin, url, breadcrumb) {
    var p;
    if (plugin.route && url.parameters[1]){
      p = {
        path: url,
        plugin: url.parameters[0],
        pluginUrl: "plugins/" + url.parameters[0] + "/" + url.parameters[0],
        parameters: url.parameters.slice(1)
      }
      plugin.route(p, breadcrumb);
    } else if (plugin.route){
      p = {
        path: url,
        plugin: url.parameters[0],
        pluginUrl: "plugins/" + url.parameters[0] + "/" + url.parameters[0]
      }
      plugin.route(p, breadcrumb);
    }
  }

  return {
    route: function(root, callback, def) {
      return function(url, breadcrumb) {
        if (def && !url.parameters[0]) {
          // Redirect to the default page
          window.location.hash = def;
          return;
        }
        require(['plugins/'+root+'/'+url.parameters[0]+'/'+url.parameters[0]], function(plugin) {
          callback(url, breadcrumb, plugin)
          if (plugin.route && url.parameters[1]){
            var p = {
              path: url,
              plugin: url.parameters[0],
              pluginUrl: "plugins/" + url.parameters[0] + "/" + url.parameters[0],
              parameters: url.parameters.slice(1)
            }
            plugin.route(p, breadcrumb);
          } else if (plugin.route){
            var p = {
              path: url,
              plugin: url.parameters[0],
              pluginUrl: "plugins/" + url.parameters[0] + "/" + url.parameters[0]
            }
            plugin.route(p, breadcrumb);
          }
        }, function(e) {
          console.log("404 TODO: ", e); // TODO
        });
      }
    }
  }

});
