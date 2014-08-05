/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'widgets/debug/debug',
  'css!main/main'
], function(
  layout
) {

  return {
    render: function() {
      layout.render();
    }
  }

});
