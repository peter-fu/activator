define([
  "services/fs",
  "./document",
  "main/plugins",
  "text!./code.html",
  "widgets/layout/layout",
  "widgets/browser/browser",
  "widgets/editor/editor",
  "css!./code",
  "css!widgets/intro/intro",
  "css!widgets/buttons/button"
], function(
  fs,
  documentState,
  plugins,
  tpl,
  layout,
  browser,
  editor
){

  var tree = fs.tree();
  var openedDocuments = ko.observableArray([]);
  var selectedDocument = ko.observable();
  var visible = ko.computed(function(){
    return !!openedDocuments.length;
  });

  var openFile = function(e) {
    var foundDocIndex, doc;
    // Is it loaded already?
    for (var index in openedDocuments.all()){
      doc = openedDocuments.at(index);
      if (doc.location == e.data.scope.location){
        foundDocIndex = parseInt(index);
        break;
      }
    }
    if (foundDocIndex === undefined){
      doc = new documentState(e.data.scope);
      openedDocuments.push(doc);
    }
    makeActive(doc);
  }

  var closeFile = function(e) {
    e.preventDefault();
    e.stopPropagation();
    var foundDocIndex, doc;
    for (var index in openedDocuments.all()){
      doc = openedDocuments.at(index);
      if (doc.location == e.data.scope.location){
        foundDocIndex = parseInt(index);
        break;
      }
    }
    if (foundDocIndex !== undefined ){
      var sel = selectedDocument();
      if (doc.location == sel.location){
        if (openedDocuments.all().length > 1){
          makeActive(openedDocuments.at(
            // Activate the closest document
            foundDocIndex == openedDocuments.all().length -1
              ? foundDocIndex-1
              : foundDocIndex+1
          ));
        } else {
          // It was the only document, nothing to activate
          makeActive(null);
        }
      }
      openedDocuments.splice(foundDocIndex, 1);
    }
  }

  var makeActive = function(doc) { // doc might be null
    var sel = selectedDocument();
    if (sel) sel.active(false);
    if (doc){
      doc.active(true);
      window.location.hash = "code"+doc.location;
    } else {
      window.location.hash = "code/";
    }
    selectedDocument(doc);
  }

  var State = {
    tree: tree,
    openedDocuments: openedDocuments,
    openFile: openFile,
    closeFile: closeFile,
    selectedDocument: selectedDocument,
    makeActive: makeActive,
    visible: visible
  }

  return {

    render: function(url) {
      console.log(">>>>>>>")
      layout.renderPlugin(bindhtml(tpl, State))
    },

    route: function(url, breadcrumb) {
      var all = [['code/', "Code"]];
      breadcrumb(all.concat([["code/"+url.parameters.join("/"),url.parameters.join("/")]]));
      if (url.parameters[0]){
        openFile({data:{scope:{
          title: url.parameters[url.parameters.length-1],
          location: "/"+url.parameters.join("/")
        }}});
      } else if (!selectedDocument()){
        breadcrumb(all);
        window.location.hash = "code/";
      }
    }

  }
});
