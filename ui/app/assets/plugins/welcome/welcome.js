/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
  'text!./welcome.html',
  'widgets/layout/layout',
  'widgets/layout/layoutManager',
  'css!./welcome.css'
], function(
  tpl,
  layout,
  layoutManager
){


  var WelcomeState = (function(){
    var self = {};

    self.appVersion = window.serverAppVersion
    self.newsHtml = ko.observable('<div></div>');

    self.loadNews = function() {
      var areq = {
          url: "http://downloads.typesafe.com/typesafe-activator/" + window.serverAppVersion + "/news.js",
          type: 'GET',
          // this is hardcoded for now since our server is just static files
          // so can't respect a ?callback= query param.
          jsonpCallback: 'setNewsJson',
          dataType: 'jsonp' // return type
        };
        debug && console.log("sending ajax news request ", areq)
        return $.ajax(areq);
    }
    self.setNewsJson = function(json) {
      debug && console.log("setting news json to ", json);
      if ('html' in json) {
        this.newsHtml(json.html);
      } else {
        console.error("json does not have an html field");
      }
    }

    self.presentationMode = function(a,e) {
      var on = e.target.checked;
      document.body.style.zoom = on?"75%":"1";
      document.body.classList.toggle("presentation-mode");
      layoutManager.panelOpened(false);
      layoutManager.navigationOpened(!on);
    }

    self.loadNews();
    return self;
  }());

  return {
    render: function() {
      layout.renderPlugin(bindhtml(tpl, WelcomeState));
    }
  }

});
