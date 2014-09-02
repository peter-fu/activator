define([
  './app',
  './tasks',
  'commons/websocket'
],function(
  app,
  tasks,
  websocket
) {

  websocket.subscribe({ type:'sbt', subType:'ProjectFilesChanged' })
    .each(function() {
      if (app.settings.recompileOnChange()){
        debug && console.log("app.rerunOnBuild is on: Requesting 'compile' task")
        tasks.requestExecution("compile");
      }
    });

  tasks.SbtEvents.successfulBuild
    .each(function() {
      if (app.settings.rerunOnBuild()){
        debug && console.log("app.rerunOnBuild is on: Requesting 'run' task")
        tasks.requestExecution("run");
      }
      if (app.settings.retestOnSuccessfulBuild()){
        debug && console.log("app.retestOnSuccessfulBuild is on: Requesting 'test' task")
        tasks.requestExecution("test");
      }
    });

})
