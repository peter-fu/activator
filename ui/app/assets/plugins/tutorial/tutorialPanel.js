/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
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
      return ko.bindhtml(tpl, TutorialState);
    }
  }

});
