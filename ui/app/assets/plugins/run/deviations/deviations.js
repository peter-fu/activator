/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
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
      return ko.bindhtml(tpl, {})
    }
  }

});
