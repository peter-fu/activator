/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'services/sbt',
  'text!./appStatus.html',
  'css!./appStatus',
  'css!widgets/stickers/stickers'
], function(
  sbt,
  tpl
) {

  var onoff = {
    active: ko.observable(true),
    working: ko.observable(false),
    disabled: ko.observable(false)
  };
  onoff.click = function(e) {
    onoff.active(!onoff.active());
    // TODO: KILL ALL THE THINGS (on off)!
  };
  onoff.text = ko.computed(function() {
    if (onoff.active()) {
      return "Turn off";
    } else {
      return "Turn on";
    }
  });

  var off = ko.computed(function() {
    return !onoff.active();
  })

  var compile = {
    active: ko.observable(false),
    working: sbt.tasks.workingTasks.compile,
    disabled: off,
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
    working: sbt.tasks.workingTasks.run,
    disabled: ko.computed(function() {
      return !sbt.app.currentMainClass() || off();
    }),
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
    working: sbt.tasks.workingTasks.test,
    disabled: off,
    click: sbt.tasks.actions.test
  };
  testing.text = ko.computed(function() {
    if (!testing.working()) {
      return "Test";
    } else {
      return "Testing";
    }
  });

  document.body.addEventListener("TaskSuccess", function(e){
    var command;
    switch(e.detail.command){
      case "compile":
      case "clean":
      case "reload":
      case "compile":
        command = "refresh";
        break;
      case "start":
      case "run":
        command = "console";
        break;
      case "test":
      case "testOnly":
        command = "testing";
        break;
      default:
        command = "running";
        break;
    }
    var el = $("#appStatus ."+command+" .success").removeClass('animate');
    setTimeout(function(){
      el.addClass('animate');
    },50);

  });

  var State = {
    onoff: onoff,
    compile: compile,
    run: run,
    testing: testing
  }

  return bindhtml(tpl, State);

});
