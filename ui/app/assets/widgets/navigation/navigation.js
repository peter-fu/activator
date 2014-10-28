/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'main/router',
  'services/sbt',
  'services/ajax',
  'widgets/typesafe/typesafe',
  'widgets/appManager/appManager',
  'widgets/appStatus/appStatus',
  'text!./navigation.html',
  'css!widgets/buttons/dropdown',
  'css!./navigation'
], function(
  router,
  sbt,
  fs,
  typesafe,
  appManager,
  appStatus,
  tpl
) {

  var State = {
    appManager: appManager,
    appStatus: appStatus,
    typesafe: typesafe,
    counters: sbt.events.errorCounters,
    workingTasks: sbt.tasks.workingTasks,
    showFirstCompileError: function(c, e) {
      e.preventDefault();
      var ers = sbt.tasks.compilationErrors();
      if(ers.length){
        window.location.hash = "#code"+ fs.relative(ers[0].position.sourcePath)+":"+ers[0].position.line;
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
