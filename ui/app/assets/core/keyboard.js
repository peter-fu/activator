define(['./router'], function(router) {

  var isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
  var activeKeyboard = true;
  var currentFocus;

  var keyCodes = {
    13:  'ENTER',
    27:  'ESC',
    37:  'LEFT',
    39:  'RIGHT',
    38:  'TOP',
    40:  'BOTTOM',
    82:  'R',
    83:  'S',
    84:  'T',
    86:  'V',
    87:  'W',
    219: '[',
    221: ']',
    191: '/',
    49:  '1',
    50:  '2',
    51:  '3',
    52:  '4',
    53:  '5',
    54:  '6',
    55:  '7'
  }

  function modifierKey(e){
    return ((isMac && e.metaKey) || e.ctrlKey)
  }

  function notEditing(e){
    // if we're editing something we cancel
    return !(!activeKeyboard || e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA');
  }

  // Careful, order matters here
  $(document)
    .keydown(function(e){
      // ESCAPE blurs
      if(e.keyCode == 27) {
        if (e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA') {
          e.target.blur();
          $(document.body).scrollReveal();
          return false;
        }
      }
    }).keydown(function(e){
      // Check if key is registered in current plugin, or in main view
      if (notEditing(e) && router.current().api.keyboard)
        return router.current().api.keyboard(keyCodes[e.keyCode], modifierKey(e), e)
    }).keydown(function(e){
      // ALL shortcuts
      var key = keyCodes[e.keyCode];
      if (notEditing(e)){
        if (key == "T"){
          e.preventDefault();
          e.stopPropagation();
          $("#omnisearch input").focus();
        }
      }
    });

});
