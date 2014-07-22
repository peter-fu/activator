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

  return {
    app:            app,
    dependencies:   dependencies,
    logs:           logs,
    tasks:          tasks,
    tests:          tests
  };

});
