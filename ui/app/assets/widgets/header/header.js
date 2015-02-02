/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
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

  return ko.bindhtml(tpl, State)

});
