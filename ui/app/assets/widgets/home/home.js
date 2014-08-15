/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  './open/open',
  './templates/templates',
  './working/working',
  // 'css!./home'
],function(
  open,
  templates,
  working
) {

  var SharedState = {
    working: ko.observable(false)
  }

  var State = {
    open: open.render(SharedState),
    templates: templates.render(SharedState),
    working: working.render(SharedState)
  }

  return {
    render: function() {
      ko.applyBindings(State);
    }
  }
})
