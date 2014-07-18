define(["ace/lib/dom"], function(dom) {

  addStylesheet('widgets/editor/themes/activator-light')

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
