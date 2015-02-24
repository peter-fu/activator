/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
  'text!./welcome.html',
  'commons/settings',
  'widgets/layout/layout',
  'widgets/layout/layoutManager',
  'css!./welcome.css'
], function(
  tpl,
  settings,
  layout,
  layoutManager
){

  var presentationModeStyle = (function() {
    var added = false;
    // Create the <style> tag
    var style = document.createElement("style");
    // WebKit hack :(
    style.appendChild(document.createTextNode(""));
    // Add the <style> element to the page
    document.head.appendChild(style);
    style.sheet.insertRule(".presentation-mode .tutorial .page, .presentation-mode .build .logs, .presentation-mode .run .pluginBlock, .presentation-mode .code .editor, .presentation-mode .monitoring .tabs-step { zoom: 141% !important; }");

    return function() {
      if (!added) {
        document.head.appendChild(style);
        added = true;
      }
    }
  }());

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

    self.presentationMode = settings.observable("presentationMode", false);

    ko.computed(function() {
      var on = self.presentationMode();
      if (on) {
        document.body.style.zoom = "75%";
        document.body.classList.add("presentation-mode");
        presentationModeStyle();
      } else {
        document.body.style.zoom = "1";
        document.body.classList.remove("presentation-mode");
      }
      layoutManager.panelOpenedSet(false);
      layoutManager.navigationOpened(!on);
      return;
    });

    self.loadNews();
    return self;
  }());

  return {
    render: function() {
      layout.renderPlugin(ko.bindhtml(tpl, WelcomeState));
    }
  }

});
