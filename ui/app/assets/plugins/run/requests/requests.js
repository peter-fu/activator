/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "main/plugins",
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
