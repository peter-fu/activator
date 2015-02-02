/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  "commons/websocket",
  './open/open',
  './templates/templates',
  './working/working',
  // 'commons/ajax',
  'widgets/modals/modals'
  // 'css!./home'
],function(
  websocket,
  open,
  templates,
  working,
  // fs,
  modals
) {

  var stream = websocket.subscribe('subType', 'BuildFailedToLoad');
  stream.map(function (e) {
    var warning = $("<article/>").html("<p>If you are creating Typesafe Reactive Platform project you must add a '<code>typesafe.properties</code>' file in the '<code>&lt;template&gt;/project</code>' folder.</p><p>The file must contain your subscription id in the following format '<code>typesafe.subscription=&lt;YOUR ID&gt;</code>'<br/>For more information see: <a href='http://typesafe.com/subscription'>http://typesafe.com/subscription</a><p>")[0];
    modals.show({
      shape: "large",
      title: "Could not load project",
      body: warning,
      cancel: "Return",
      onCancel: function() {
        $('#working, #open, #new').toggle();
      }
    });
  });

  var SharedState = {
    working: ko.observable(false)
  };

  var State = {
    open: open.render(SharedState),
    templates: templates.render(SharedState),
    working: working.render(SharedState),
    modals: modals.render()
  };

  return {
    render: function() {
      ko.applyBindings(State);
    }
  }
});
