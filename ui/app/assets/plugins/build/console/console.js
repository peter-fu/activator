define([
  "main/plugins",
  "text!./console.html",
  "css!./console",
  "css!widgets/modules/modules"
], function(
  plugins,
  tpl
) {

  var State = {}

  return {
    render: function(){
      return bindhtml(tpl, State)
    }
  }

});
