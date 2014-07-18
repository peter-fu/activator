define([
  "text!./browser.html",
  "css!./browser",
  "css!widgets/menu/menu"
], function(){

  return {
    render: function(){
      return bindhtml(tpl, {});
    }
  }

});
