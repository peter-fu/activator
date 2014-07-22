/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'text!./notifications.html',
  'css!widgets/buttons/dropdown',
  'css!./notifications'
], function(
  tpl
){

  var State = {}

  return bindhtml(tpl, State);

})
