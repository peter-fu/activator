/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(["ace/lib/dom", "css!./activator-dark"], function(dom) {
  isDark = true;
  cssClass = "activator-dark";

  var dom = dom;
  dom.importCssString("", cssClass);

  return {
    isDark: isDark,
    cssClass: cssClass,
    cssText: ""
  }

});
