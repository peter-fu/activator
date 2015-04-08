/*
 Copyright (C) 2015 Typesafe, Inc <http://typesafe.com>
 */
define([
  'main/plugins',
  'text!./partners.html',
  "widgets/layout/layout",
  // replace this with proxy call
  'text!./technology-partners.html',
  'css!./partners',
  "css!widgets/menu/menu"
], function(
  plugins,
  tpl,
  layout,
  partnerHtml
){

  var State = {
    partnerHtml: ko.observable("<div class='hint'>Loading partner information...</div>")
  };

  var domNodes = $.parseHTML(partnerHtml, null /* current document */, true /* keepScripts */);
  var node = null;
  try {
    for (var i = 0; i < domNodes.length; ++i) {
      if (domNodes[i].id === 'partner-wrapper')
        node = $(domNodes[i]);
    }
  } catch (e) {
    console.log("failed to find partner-wrapper node ", e);
  }
  if (node === null)
    State.partnerHtml("<div class='hint'>Failed to load partner information from typesafe.com</div>");
  else
    State.partnerHtml(node.html());

  return {
    render: function(url){
      layout.renderPlugin(ko.bindhtml(tpl, State));
    },

    route: function(url, breadcrumb){
      var all = [
        ['partners/', "Partners"]
      ];
      if(url.parameters[0]){
        breadcrumb(all);
      } else {
        breadcrumb(all);
      }
    }
  };
});
