define([
  'text!./pannel.html',
  'css!./pannels'
],function(
  tpl
){

  var State = {
    onAppChange: function(){}
  }

  return bindhtml(tpl, State);

});
