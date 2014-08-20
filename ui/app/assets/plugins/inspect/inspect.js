/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(['commons/streams', 'services/build', './console/console', 'services/connection', 'services/appdynamics', 'text!./inspect.html', 'css!./inspect.css'],
  function(streams, build, Console, Connection, appDynamics, template){

    var InspectState = {
      inspectEnabled: ko.computed(function() {
        return build.run.instrumentation() == "inspect";
      }),
      instrumentation: build.run.instrumentation,
      appDynamicsHostName: ko.computed(function() {
        return ("https://"+appDynamics.hostName()+"/");
      }),
      consoleWidget: new Console()
    };

    // Make connection a subscriber to events sent to the streams WS
    streams.subscribe(Connection);

    // Reset data previously collected
    Connection.reset();

    return {
        render: function() {
            var $inspect = $(template)[0];
            ko.applyBindings(InspectState, $inspect);
            return $inspect;
        },
        route: function(url, breadcrumb) {
            if (url.parameters == undefined || url.parameters.length == 0) {
              if (build.app.hasPlay()) {
                url.parameters = ["requests"];
              } else if (build.app.hasAkka()) {
                url.parameters = ["actors"];
              } else {
                url.parameters = ["deviations"];
              }
            }
            InspectState.consoleWidget.route(url.parameters);
        }
    }
});
