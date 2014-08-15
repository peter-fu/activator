/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(["ace/lib/dom", "css!./activator-light"], function(dom) {

  isDark = false;
  cssClass = "activator-light";

  var dom = dom;
  dom.importCssString("", cssClass);

  return {
    isDark: isDark,
    cssClass: cssClass,
    cssText: ""
  }

});
