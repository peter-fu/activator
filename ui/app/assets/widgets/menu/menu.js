/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
define([
  'text!./menu.html',
  'widgets/lists/list',
  'css!widgets/buttons/button',
  'css!./menu'
], function(tpl) {

  return function(elements,state) {
    state.__elements = elements;
    return ko.bindhtml(tpl, state);
  }

});
