define(function() {

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
        }, function() {
          console.log("404 TODO") // TODO
        });
      }
    }
  }

});
