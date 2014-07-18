define([
  "core/plugins",
  "text!./system.html",
  "services/sbt",
  "css!./system",
  "css!widgets/modules/modules",
  "css!widgets/lists/logs"
], function(
  plugins,
  tpl,
  sbt
) {

  var State = {
    sbt: sbt,
    clear: function() {
      sbt.logs.stdout([]);
    }
  }

  return {
    render: function(){
      return bindhtml(tpl, State)
    }
  }

});
