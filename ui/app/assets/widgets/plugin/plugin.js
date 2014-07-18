define([
  'text!./plugins.html',
  'css!plugins'
], function(
  tpl
) {

  return function(elements,state) {
    state.__elements = elements;
    return bindhtml(tpl, state);
  }

})
