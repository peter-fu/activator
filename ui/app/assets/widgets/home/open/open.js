define([
  'commons/websocket',
  'widgets/fileselection/fileselection',
  'text!./open.html'
], function(
  websocket,
  FileSelection,
  tpl
) {

  var State = function(){
    var self = this;

    self.fs = new FileSelection({
      selectText: 'Open this Project',
      initialDir: window.baseFolder,
      onCancel: function() {
        toggleAppBrowser();
      },
      onSelect: function(file) {
        // TODO - Grey out the app while we wait for response.
        websocket.send({
          request: 'OpenExistingApplication',
          location: file
        });
        $('#working, #open, #new').toggle();
      }
    });

    self.toggleAppBrowser = function() {
      $('#openAppForm, #openAppLocationBrowser').toggle();
    };
    self.clickOpenButton = function() {
      $('#openButton').toggleClass("opened");
      self.toggleAppBrowser();
    }

  }

  return {
    render: function() {
      return bindhtml(tpl, new State());
    }
  }

})
