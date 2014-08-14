define([
  "services/tutorial",
  "text!./tutorial-panel.html",
  "css!./tutorial",
], function(
  TutorialState,
  tpl
){

  return {
    render: function(){
      return bindhtml(tpl, TutorialState);
    }
  }

});
