/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
define([
  'widgets/layout/layout',
  'css!./main'
], function(
  layout
) {

  return {
    render: function() {
      layout.render();
    }
  }

});
