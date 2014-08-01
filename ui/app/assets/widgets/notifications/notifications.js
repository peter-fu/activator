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
  var dom;
  document.body.addEventListener("TaskSuccess",function(){
    dom.classList.remove("success");
    setTimeout(function(){
      dom.classList.add("success");
    },50);
  });

  return dom = bindhtml(tpl, State);

})
