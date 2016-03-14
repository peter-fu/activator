/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
define([
  'text!./typesafe.html',
  'css!./typesafe'
],function(
  tpl
){

  return ko.bindhtml(tpl,{});

});
