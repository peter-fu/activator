define([
  "services/documentation",
  "core/plugins",
  "text!./documentation.html",
  "widgets/layout/layout",
  "css!./documentation",
  "css!widgets/menu/menu",
  "css!widgets/modules/modules",
  "css!widgets/intro/intro"
], function(
  documentationService,
  plugins,
  tpl,
  layout
){

  var page = ko.observable(0);
  var sections = ko.observable(documentationService.getSections());

  function openDir(doc, id) {
    return function() {
      sections(documentationService.getSections(id));
    }
  }

  return {

    render: function(url) {
      layout.renderPlugin(bindhtml(tpl, {}))
    },

    route: function(url, breadcrumb) {
      breadcrumb([['documentation/', "Documentation"]]);
      if (url.parameters[0] === void 0 || url.parameters[0] === "") {
        sections(documentationService.getSections());
        page(0);
      } else {
        page(documentationService.getPage(url.parameters[0]));
      }
    }

  }
});
