define([
  'core/plugins',
  'services/sbt',
  'text!./test.html',
  "widgets/layout/layout",
  'css!./test',
  "css!widgets/buttons/switch",
  "css!widgets/menu/menu",
  "css!widgets/buttons/select",
  "css!widgets/modules/modules"
], function(
  plugins,
  sbt,
  tpl,
  layout
){

  var suite = [
    { title: "First test first", status: ko.observable("waiting"), disabled: ko.observable(false) },
    { title: "Second test second", status: ko.observable("pending"), disabled: ko.observable(false) },
    { title: "Third test third", status: ko.observable("failed"), disabled: ko.observable(false) },
    { title: "Fourth test fourth", status: ko.observable("passed"), disabled: ko.observable(false) },
    { title: "Fifth test fifth", status: ko.observable(""), disabled: ko.observable(true) }
  ]

  var enabled = function(e){
    var o = ko.observable(!e());
    e.on("change", function(v){ return o(!v) });
    o.on("change", function(v){ return e(!v) });
    return o;
  }

  return {
    render: function(url){
      layout.renderPlugin(bindhtml(tpl, {}))
    },

    route: function(url, breadcrumb){
      var all = [
        ['test/', "Test"]
      ];
      if(url.parameters[0]){
        breadcrumb(all);
      } else {
        breadcrumb(all);
      }
    }
  }
});
