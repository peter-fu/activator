define([
  "core/plugins",
  "text!./requests.html",
  "css!widgets/modules/modules",
  "css!./requests"
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
