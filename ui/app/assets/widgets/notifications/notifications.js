/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'text!./notifications.html',
  'css!widgets/buttons/dropdown',
  'css!./notifications',
  'css!widgets/stickers/stickers'
], function(
  tpl
){

  var State = {}

  document.body.addEventListener("TaskSuccess",function(){
    var el = $("#notifications .success").removeClass('animate');
    setTimeout(function(){
      el.addClass('animate');
    },50);
  });

  return dom = ko.bindhtml(tpl, State);

})
