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
