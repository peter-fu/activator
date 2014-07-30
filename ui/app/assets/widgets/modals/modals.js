define([
  'text!./modal.html',
  'css!widgets/buttons/button',
  'css!./modals'
], function(tpl){

  var modal = $('<div id="modal"></div>').hide();

  function show(){
    modal.fadeIn("fast");
  }

  function hide(){
    modal.fadeOut("fast", function(){
      modal.html("");
    });
  }

  return {
    render: function(){
      return modal[0];
    },


    // MODAL API:
    // {
    //   title:   String,
    //   text:    String,
    //   body:    DOM Element,
    //   ok:      String (default = "OK"),
    //   cancel:  String (default = "Cancel"),
    //   okEnabled:      ko.observable (default = true),
    //   cancelEnabled:  ko.observable (default = true),
    //   callback: Function, <- returns true
    //   onCancel: Function, <- returns false
    // }

    // To show a button, provide either a callback or a label, eg:
    // bodies.ok = "Text" or bodies.callback = f()
    // bodies.cancel = "Text" or bodies.onCancel = f()
    show: function(bodies) {
      // Default values
      bodies.text = bodies.text || false;
      bodies.ok =  bodies.callback ? bodies.ok || "OK": bodies.ok || false;
      bodies.cancel = bodies.onCancel ? bodies.cancel || "Cancel" : bodies.cancel || false;
      bodies.okEnabled = bodies.okEnabled || true;
      bodies.cancelEnabled = bodies.cancelEnabled || true;

      bodies.clickOk = function() {
        hide();
        if (bodies.callback) callback(true);
      }
      bodies.clickCancel = function() {
        hide();
        if (bodies.onCancel) onCancel(false);
      }

      modal.html("").append(bindhtml(tpl, bodies));
      show();
    },

    alert: function(bodies) {
      modal.html("").append(bindhtml(tpl, bodies));
      show();
    },

    confirm: function(bodies) {
      modal.html("").append(bindhtml(tpl, bodies));
      show();
    }

  }

})
