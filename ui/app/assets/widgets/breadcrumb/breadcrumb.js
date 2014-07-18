define([
  "core/router",
  "text!./breadcrumb.html",
  "css!./breadcrumb"
], function(
  router,
  tpl
){

  return bindhtml(tpl, router)

 });
