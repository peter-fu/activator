define([
  'widgets/omnisearch/omnisearch',
  'widgets/breadcrumb/breadcrumb',
  'widgets/layout/layoutManager',
  'widgets/notifications/notifications',
  'widgets/help/help',
  'text!./header.html',
  'css!./header'
], function(
  omnisearch,
  breadcrumb,
  layoutManager,
  notifications,
  help,
  tpl
){

  var State = {
    omnisearch: omnisearch,
    breadcrumb: breadcrumb,
    layoutManager: layoutManager,
    notifications: notifications,
    help: help
  }

  return bindhtml(tpl, State)

});
