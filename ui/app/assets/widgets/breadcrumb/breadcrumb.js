/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
define([
  "main/router",
  "text!./breadcrumb.html",
  "css!./breadcrumb"
], function(
  router,
  tpl
){

  return ko.bindhtml(tpl, router);

});
