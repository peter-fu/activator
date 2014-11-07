/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */

define([
  "services/ajax",
  "services/sbt",
  "main/plugins",
  "./eclipseGenerator",
  "./ideaGenerator",
  "text!./code.html",
  "widgets/layout/layout",
  "widgets/browser/browser",
  "./document",
  "./bin-file",
  "widgets/editor/editor",
  "commons/settings",
  "css!./code",
  "css!widgets/buttons/button",
  "css!widgets/help/help"
], function(
  fs,
  sbt,
  plugins,
  eclipse,
  idea,
  tpl,
  layout,
  browser,
  documentState,
  fileState,
  editor,
  settings
){

  var openedDocuments = ko.observableArray([]);
  var selectedDocument = ko.observable();
  selectedDocument.extend({ notify: 'always' });
  var visible = ko.computed(function(){
    return !!openedDocuments().length;
  });
  editor.setDocument(selectedDocument);

  var openFile = function(e) {
    var foundDocIndex, doc;
    // Is it loaded already?
    for (var index in openedDocuments()){
      doc = openedDocuments()[index];
      if (doc.location == e.data.scope.location){
        foundDocIndex = parseInt(index);
        if(e.data.scope.lineNumber) doc.lineNumber = e.data.scope.lineNumber;
        break;
      }
    }
    if (foundDocIndex === undefined){
      fs.browse(e.data.scope.location).success(function(data) {
        switch(data.type){
          case 'code':
            doc = new documentState(e.data.scope);
            openedDocuments.push(doc);
            makeActive(doc);
            break;
          case 'directory':
            browser.reveal(data.location);
            break;
          default:
            doc = new fileState(e.data.scope,data.type);
            openedDocuments.push(doc);
            makeActive(doc);
            break;
        }
      });
    } else {
      makeActive(doc);
    }
  }

  var closeFile = function(doc, event) {
    if (event){
      event.preventDefault();
      event.stopPropagation();
    }
    if (doc && doc.edited() && !confirm("This file has unsaved changes, do you confirm closing without saving?")) return;
    var docIndex = openedDocuments.indexOf(doc);
    if (docIndex >= 0){
      var sel = selectedDocument();
      if (doc.location == sel.location){
        if (openedDocuments().length > 1){
          makeActive(openedDocuments()[
            // Activate the closest document
            docIndex == openedDocuments().length -1 ? docIndex-1 : docIndex+1
          ]);
        } else {
          // It was the only document, nothing to activate
          makeActive(null);
        }
      }
      openedDocuments.splice(docIndex, 1);
    }
  }

  var makeActive = function(doc) { // doc might be null
    var sel = selectedDocument();
    if (sel) sel.active(false);
    if (doc){
      doc.active(true);
      window.location.hash = "code"+fs.relative(doc.location);
    } else {
      window.location.hash = "code/";
    }
    selectedDocument(doc);
  }

  window.onbeforeunload = function() {
    if (openedDocuments().filter(function(doc) { return doc.edited(); }).length)
      return "You have unsaved files, do you confirm leaving?";
  }

  function saveAll() {
    openedDocuments().forEach(function(doc) {
      if (doc.edited()){
        doc.save();
      }
    })
  }

  function closeAll() {
    selectedDocument(null);
    openedDocuments([]);
  }

  function generateEclipseFiles() {
    eclipse.generate(true); // boolean flag decides whether or not to override any existing project files
  }

  function generateIdeaFiles() {
    idea.generate(true); // boolean flag decides whether or not to override any existing project files
  }

  var autoSave = settings.observable("code.autoSave", false);
  document.addEventListener("visibilitychange", function() {
    if (autoSave() && document.hidden){
      saveAll();
    }
  });

  // Annotations
  sbt.tasks.compilationErrors.subscribe(function(_) {
    openedDocuments().forEach(function(doc) {
      doc.showAnnotations(_);
    });
  });

  var State = {
    browser: browser,
    editor: editor,
    openedDocuments: openedDocuments,
    openFile: openFile,
    closeFile: closeFile,
    selectedDocument: selectedDocument,
    makeActive: makeActive,
    visible: visible,
    closeAll: closeAll,
    saveAll: saveAll,
    autoSave: autoSave,
    generateEclipseFiles: generateEclipseFiles,
    generateIdeaFiles: generateIdeaFiles
  }

  return {
    render: function(url) {
      layout.renderPlugin(ko.bindhtml(tpl, State))
    },

    route: function(url, breadcrumb) {
      var all = [['code/', "Code"]];
      // Search for line number

      breadcrumb(all.concat([["code/"+url.parameters.join("/"),url.parameters.join("/")]]));
      if (url.parameters[0]){
        var lastParameter = url.parameters[url.parameters.length-1];
        var filenameAndLine = lastParameter.split(":");
        url.parameters[url.parameters.length-1] = filenameAndLine[0];
        lastParameter = url.parameters[url.parameters.length-1];
        openFile({data:{scope:{
          title: lastParameter,
          location: fs.absolute("/"+url.parameters.join("/")),
          lineNumber: filenameAndLine[1]
        }}});
      } else if (!selectedDocument()){
        breadcrumb(all);
        window.location.hash = "code/";
      }
    },

    keyboard: function(key, meta, e) {
      var all, index;
      var focus = $("#wrapper .browser span.focus");
      if (meta){
        if (key == "S"){
          selectedDocument().save();
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      } else if (key == "W"){
        closeFile(selectedDocument());
          e.preventDefault();
          e.stopPropagation();
          return false;
      } else if (key == "BOTTOM"){
        all = $("#wrapper .browser span:visible");
        index = all.index(focus);
        focus.removeClass("focus");
        all.eq( index<all.length?index+1:0 ).addClass("focus");
      } else if (key == "TOP"){
        all = $("#wrapper .browser span:visible");
        index = all.index(focus);
        focus.removeClass("focus");
        all.eq( index>0?index-1:all.length ).addClass("focus");
      } else if (key == "RIGHT"){
        if (!focus.parent().hasClass("open"))
          focus.trigger("click");
      } else if (key == "LEFT"){
        if(focus.parent().is(".directory.open")) focus.trigger("click");
        else {
          if (focus.parents(".directory.open:first").find("span:first").addClass("focus").length)
            focus.removeClass("focus");
        }
      }
    }
  }
});
