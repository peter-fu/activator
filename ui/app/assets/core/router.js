define(['./plugins'], function(plugins) {

  var current    = ko.observable({});
  var breadcrumb = ko.observable([]);
  var currentUrl = ko.observable(window.location.hash);

  window.addEventListener("hashchange", function(e) {
    load(window.location.hash);
  },true);

  // // Template helpers
  // noir.bindings.attributes["isActive"] = function(element, url) {
  //   if (typeof url != "string") throw "goto is meant to be used with a string";
  //   doOnChangeAndWatchDom(element, currentUrl, function(cu){
  //     // Add an extra slash to differenciate #p/1 from #p/10
  //     if ((cu+"/").indexOf(url+"/") == 0) element.classList.add("active");
  //     else element.classList.remove("active");
  //   });
  // }

  // noir.bindings.attributes["hrefActive"] = function(element, url) {
  //   noir.bindings.attributes["href"](element, url);
  //   noir.bindings.attributes["isActive"](element, url);
  // }

  // Route

  var load = function(url) {
    var plugin = parseUrl(url);
    require([plugin.pluginUrl], function(p) {
      if (current().plugin !== plugin.plugin) {
        p.render(plugin);
      }
      plugin.api = p;
      current(plugin);
      currentUrl(window.location.hash);
      !!p.route && p.route(plugin, breadcrumb);
    }, function() {
      // alert("404")
    });
  }

  var parseUrl = function(url) {
    if (!url) {
      url = "tutorial";
    }
    if (url[0] === "#") {
      url = url.slice(1);
    }
    var plugin = url.split("/")[0];
    return {
      path: url,
      plugin: plugin,
      pluginUrl: "plugins/" + plugin + "/" + plugin,
      parameters: url.split(/\/+/).slice(1)
    }
  }

  var isMe = function(url) {
    return ko.computed(function() {
      return current().plugin === url;
    });
  }

  var redirect = function(hash) {
    if (history.replaceState != null) {
      return history.replaceState(null, null, '#' + hash);
    }
  }

  return {
    current:     current,
    currentUrl:  currentUrl,
    load:        load,
    isMe:        isMe,
    breadcrumb:  breadcrumb,
    redirect:    redirect
  }
});
