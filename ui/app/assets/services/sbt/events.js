define([
  './app',
  './tasks',
  'main/router',
  'commons/websocket'
],function(
  app,
  tasks,
  router,
  websocket
) {

  /**
  Error counters
  */
  var errorCounters = {
    build: ko.observable(0),
    code:  ko.observable(0),
    run:   ko.observable(0),
    test:  ko.observable(0)
  }

  /**
  Notification list
  */
  var notifications = ko.observableArray([]);

  /**
  Notification object constructor
  */
  function Notification(text, link, type) {
    this.text = text;
    this.link = link;
    this.type = type;
    this.read = ko.observable(false);
    notifications.unshift(this);
  }

  tasks.ProcessedExecutionsStream.each(function(execution) {

    if (execution.testResults){
      errorCounters.test(execution.testResults.filter(function(t) {
        return t.outcome == "failed";
      }).length);
    }

    // Update counters
    errorCounters.code(execution.compilationErrors.filter(function(m) {
      return m.severity == "Error";
    }).length);

    // Failed tasks
    if (!execution.succeeded){
      if ((execution.commandId == "run") && router.current().id != "run"){
        errorCounters.run(errorCounters.run()+1);
        new Notification("Runtime error", "#run/", "run");
      } else if (execution.commandId == "test"){
        // Only show notification if we don't see the result
        if (router.current().id != "test") {
          new Notification("Test failed", "#test/results", "test");
        }
      } else if (router.current().id != "build"){

        if (app.settings.rerunOnBuild() && tasks.applicationReady()){
          debug && console.log("app.rerunOnBuild is on: Requesting 'run' task");
          tasks.actions.kill();
          tasks.actions.run();
        }
        if (app.settings.retestOnSuccessfulBuild()){
          debug && console.log("app.retestOnSuccessfulBuild is on: Requesting 'test' task")
          tasks.actions.test();
        }

        errorCounters.build(errorCounters.build()+1);
        new Notification("Build error", "#build/tasks/"+execution.executionId, "build");
      }
    }
  });

  websocket.subscribe({ type:'sbt', subType:'ProjectFilesChanged' })
    .each(function() {
      if (app.settings.recompileOnChange()){
        debug && console.log("app.rerunOnBuild is on: Requesting 'compile' task")
        tasks.actions.compile();
      }
    });

  return {
    errorCounters:  errorCounters,
    notifications:  notifications
  }

})
