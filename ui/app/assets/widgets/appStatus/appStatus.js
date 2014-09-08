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
    if (onoff.active()){
      console.log("KILL ALL");
    }
    sbt.tasks.actions.kill();
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
    disabled: off
  };
  compile.click = function() {
    if (!compile.working()){
      sbt.tasks.actions.compile();
    } else {
      console.log("KILL COMPILE");
      sbt.tasks.actions.kill("compile");
    }
  }
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
    disabled: off
  };
  run.click = function() {
    if (!run.working()){
      sbt.tasks.actions.run();
    } else {
      console.log("KILL RUN");
      sbt.tasks.actions.kill("run");
    }
  }
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
    disabled: off
  };
  testing.click = function() {
    if (!testing.working()){
      sbt.tasks.actions.test();
    } else {
      console.log("KILL TEST");
      sbt.tasks.actions.kill("test");
    }
  }
  testing.text = ko.computed(function() {
    if (!testing.working()) {
      return "Test";
    } else {
      return "Testing";
    }
  });

  sbt.tasks.taskCompleteEvent.subscribe(function(e) {
    var command;
    switch(e.command){
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
    $("#appStatus ."+command+" .animate").removeClass('animate');
    var el = $("#appStatus ."+command+" ."+(e.succeded?"success":"error"));
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

  return ko.bindhtml(tpl, State);

});
