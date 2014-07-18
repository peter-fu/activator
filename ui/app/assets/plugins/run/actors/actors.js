define([
  "core/plugins",
  "text!./actors.html",
  "css!./actors",
  "css!widgets/modules/modules"
], function(
  plugins,
  tpl
) {

  return {
    render: function(){
      return bindhtml(tpl, {})
    }
  }

});
