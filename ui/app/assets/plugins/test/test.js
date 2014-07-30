define([
  'main/plugins',
  'services/sbt',
  'text!./test.html',
  "widgets/layout/layout",
  'css!./test',
  "css!widgets/buttons/switch",
  "css!widgets/menu/menu",
  "css!widgets/buttons/select",
  "css!widgets/modules/modules"
], function(
  plugins,
  sbt,
  tpl,
  layout
){

  var TestClasses = ko.observable();

  function compileTest(){
    sbt.tasks.requestExecution("test:compile");
  }

  compileTest();



  var State = {
    TestClasses: TestClasses,
    runTest: function(testClass) {
      sbt.tasks.requestExecution("testOnly "+ testClass);
    },
    showTests: function(){
      sbt.tasks.possibleAutocompletions("testOnly ").then(function(data) {
        console.log(data)
        TestClasses(data.choices.map(function(t) { return t.display; }).filter(function(t){ return t != "--"}));
      })
    },
    sbtExecCommand: function(cmd){
      sbt.tasks.requestExecution(cmd);
    }
  }

  return {
    render: function(url){
      layout.renderPlugin(bindhtml(tpl, State))
    },

    route: function(url, breadcrumb){
      var all = [
        ['test/', "Test"]
      ];
      if(url.parameters[0]){
        breadcrumb(all);
      } else {
        breadcrumb(all);
      }
    }
  }
});
