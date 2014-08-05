/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'text!./debug.html',
  'widgets/modals/modals',
  'widgets/omnisearch/omnisearch',
  './ajax/ajax',
  'css!widgets/header/header',
  'css!widgets/layout/layout',
  'css!widgets/modules/modules',
  'css!widgets/menu/menu',
  'css!./debug'
], function(
  tpl,
  modals,
  omnisearch,
  ajax,
  layoutManager
){

  subplugin = ko.observable(ajax.render());

  var State = {
    subplugin: subplugin
  }

  return {
    render: function() {
      document.body.appendChild(bindhtml(tpl, State));
      var header = document.body.appendChild(document.createElement("header"));
      header.id = "header";
      header.appendChild(omnisearch);
      document.body.appendChild(modals.render());
    }
  }
})
