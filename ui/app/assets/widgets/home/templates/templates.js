/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/websocket',
  'widgets/fileselection/fileselection',
  'text!./templates.html'
], function(
  websocket,
  FileSelection,
  tpl
) {

  function formToJson(form) {
    var data = $(form).serializeArray();
    var o = {}
    $.each(data, function() {
      if (o[this.name] !== undefined) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]];
        }
        o[this.name].push(this.value || '');
      } else {
        o[this.name] = this.value || '';
      }
    });
    return o;
  };

  // App Model
  var State = function(){
    var self = this;

    self.filteredTemplates = ko.observableArray(window.templates);
    self.seeds = seeds;
    self.currentApp = ko.observable();
    self.currentAppId = ko.computed(function(){
      return !!self.currentApp()?self.currentApp().id:"";
    });
    self.browseAppLocation = ko.observable(false);
    self.filterValue = ko.observable("");
    self.tags = window.tags;

    // Toggling chosen template view
    self.chooseTemplate = function(app){
      self.currentApp(app)
    }
    self.chooseSeed = function(app){
      self.currentApp(app)
    }
    self.closeTemplate = function(){
      self.currentApp("")
    }

    // Filtering
    self.searchTag = function(m,e){
      self.filterValue(e.currentTarget.innerHTML);
      self.search();
    }
    self.clearSearch = function(){
      self.filterValue("");
      self.search();
      // filterInput.val("").trigger("search")[0].focus();
    }
    self.search = function(model,e){
      if (e){
        self.filterValue(e.currentTarget.value.toLowerCase());
      }
      value = self.filterValue().toLowerCase();
      self.filteredTemplates(templates.filter(function(o){
        return JSON.stringify(o).indexOf(value) >= 0
      }));
    }

    // Browsing FS
    self.closeNewBrowser = function() {
      $("#newAppLocationBrowser").hide();
    }
    self.openedTab = ko.observable('templates');
    self.showTemplates = function() {
      self.openedTab('templates');
    }
    self.showSeeds = function() {
      self.openedTab('seed');
    }

    self.fs = new FileSelection({
      title: "Select location for new application",
      initialDir: window.baseFolder,
      selectText: 'Select this Folder',
      onSelect: function(file) {
        // Update our store...
        $("#newAppLocationBrowser .close").trigger("click");
        $("#newappLocation").val(file + separator + $("#appName").val());
      },
      onCancel: function() {
        toggleDirectoryBrowser();
      }
    });

    self.newAppFormSubmit = function(state, event) {
      // use the placeholder values, unless one was manually specified
      var appLocationInput = $("#newappLocation");
      var appNameInput = $("#appName");
      if(!appLocationInput.val())
        appLocationInput.val(appLocationInput.attr('placeholder'));
      if (!appNameInput.val())
        appNameInput.val(appNameInput.attr('placeholder'));

      // Now we find our sneaky saved template id.
      // var template = appTemplateName.attr('data-template-id');
      var msg = formToJson("#newApp");
      msg.request = 'CreateNewApplication';
      websocket.send(msg);
      $('#working, #open, #new').toggle();

      return false;
    }

    self.toggleDirectoryBrowser = function() {
      $('#newAppForm, #newAppLocationBrowser').toggle();
    };
    self.toggleSelectTemplateBrowser = function() {
      $('#homePage, #templatePage').toggle();
    };

    // Register fancy radio button controls.
    self.clickTemplate = function(event) {
      var template = {
          name: $('input', this).attr('data-snap-name-ref'),
          id: $('input', this).attr('value')
      }
      // TODO - Remove this bit here
      $('input:radio', this).prop('checked',true);
    }

    self.clickBrowseAppLocation = function(event) {
      self.toggleDirectoryBrowser();
    }

  };


  // // TODO - Figure out what to do when selecting a new template is displayed
  // showTemplatesLink.on('click', function(event) {
  //   event.preventDefault();
  //   toggleSelectTemplateBrowser();
  // });

  return {
    render: function() {
      return ko.bindhtml(tpl, new State());
    }
  }

});
