define([
  "core/plugins",
  "text!./dependencies.html",
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
