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
