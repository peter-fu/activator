define([
  "main/plugins",
  "text!./deviations.html",
  "css!./deviations",
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
