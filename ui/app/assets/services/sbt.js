define([
  './sbt/app',
  './sbt/dependencies',
  './sbt/logs',
  './sbt/tasks',
  './sbt/tests'
],function(
  app,
  dependencies,
  logs,
  tasks,
  tests
) {

  window.sbt = {
    app:            app,
    dependencies:   dependencies,
    logs:           logs,
    tasks:          tasks,
    tests:          tests
  }

  return sbt;

});
