define(["ace/lib/dom"], function(dom) {

  addStylesheet('widgets/editor/themes/activator-dark')

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
