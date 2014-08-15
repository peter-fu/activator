/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
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
