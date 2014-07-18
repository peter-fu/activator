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
