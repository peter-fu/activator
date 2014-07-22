/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt',
  'text!./appStatus.html',
  'css!./appStatus'
], function(
  sbt,
  tpl
) {

  var fakeToggle = function(e) {
    e.data["class"].working(true);
    return setTimeout(function() {
      e.data["class"].active(!e.data["class"].active);
      return e.data["class"].working(false);
    }, 1500);
  }

  var onoff = {
    active: ko.observable(true),
    working: ko.observable(false),
    disabled: ko.observable(false),
    click: fakeToggle
  };
  onoff.text = ko.computed(function() {
    if (onoff.active()) {
      return "Turn off";
    } else {
      return "Turn on";
    }
  });

  var compile = {
    active: ko.observable(false),
    working: ko.observable(false),
    disabled: ko.observable(false),
    click: sbt.tasks.actions.compile
  };
  compile.text = ko.computed(function() {
    if (!compile.working()) {
      return "Compile";
    } else {
      return "Compiling";
    }
  });

  var run = {
    active: ko.observable(false),
    working: ko.observable(false),
    disabled: ko.observable(true),
    click: sbt.tasks.actions.run
  };
  run.text = ko.computed(function() {
    if (!run.working()) {
      return "Run";
    } else {
      return "Runing";
    }
  });

  var testing = {
    active: ko.observable(false),
    working: ko.observable(false),
    disabled: ko.observable(false),
    click: sbt.tasks.actions.test
  };
  testing.text = ko.computed(function() {
    if (!testing.working()) {
      return "Test";
    } else {
      return "Testing";
    }
  });

  var State = {
    onoff: onoff,
    compile: compile,
    run: run,
    testing: testing
  }

  return bindhtml(tpl, State);

});
