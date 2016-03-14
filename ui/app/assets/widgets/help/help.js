/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
define([
  'text!./help.html',
  'css!./help'
], function(
  tpl
){

  return ko.bindhtml(tpl, {});

})
