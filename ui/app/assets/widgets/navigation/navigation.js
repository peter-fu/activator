/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'main/router',
  'services/sbt',
  'widgets/typesafe/typesafe',
  'widgets/appManager/appManager',
  'widgets/appStatus/appStatus',
  'text!./navigation.html',
  'css!widgets/buttons/dropdown',
  'css!./navigation'
], function(
  router,
  sbt,
  typesafe,
  appManager,
  appStatus,
  tpl
) {

  var State = {
    appManager: appManager,
    appStatus: appStatus,
    typesafe: typesafe,
    counters: sbt.tasks.errorCounters,

    links: {
      'Learn': {
        'tutorial': "Tutorial",
        'documentation': "Documentation"
      },
      'Develop': {
        'build': "Build",
        'code': "Code",
        'run': "Run",
        'test': "Test"
      },
      'Deliver': {
        'versioning': "Versioning",
        'issues': "Issues",
        'integration': "Continuous Integration",
        'deploy': "Deploy",
        'monitor': "Monitor"
      }
    }
  }

  var activate = function(scope) {
    var $scope = $(scope);
    var navigationSneakTimer = 0;
    $("#header .toggleNavigation").mouseover(function() {
      $("body").not(".navigation-opened").addClass("navigation-sneak");
    });
    $scope.mouseleave(function() {
      navigationSneakTimer = setTimeout(function() {
        $("body").removeClass("navigation-sneak");
      }, 200);
    }).mouseenter(function() {
      clearTimeout(navigationSneakTimer);
    });
  }

  return {
    render: function(){
      var dom = ko.bindhtml(tpl, State);
      activate(dom);
      return dom;
    }
  }

})
