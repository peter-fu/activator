define([
  "services/fs",
  "text!./item.html",
  "text!./browser.html",
  "widgets/buttons/contextmenu",
  "css!./browser",
  "css!widgets/menu/menu"
], function(fs, item, tpl){

  function FileNode(node, parent) {
    this.name          = node.name;
    this.location      = node.location;
    this.humanLocation = node.humanLocation;
    this.isOpened      = false;
    this.isDirectory   = false;
    this.isHidden      = (node.name[0] == ".");
    this.parent        = parent;

    this.contextmenu = {
      'Reveal in system': this.show.bind(this),
      'Delete file': this.delete.bind(this),
      'Rename...': this.rename.bind(this)
    }
  }
  FileNode.prototype.toggleOpen = function(data, event) {
    event.stopPropagation();
  }
  FileNode.prototype.show = function() {
    fs.show(this.location);
  }
  FileNode.prototype.delete = function() {
    if(confirm("You are about to delete "+this.name)) fs.delete(this.location).success(this.parent.load.bind(this.parent));
  }
  FileNode.prototype.rename = function() {
    var name = prompt("File's new name?");
    if (!name) return;
    fs.newName(this.location, name).success(this.parent.load.bind(this.parent));
  }
  FileNode.prototype.openFile = function() {
    window.location.hash = "#code/"+fs.relative(this.location);
  }

  function TreeNode(node, parent) {
    this.name          = node.name;
    this.location      = node.location;
    this.humanLocation = node.humanLocation;
    this.isRoot        = node.isRoot;
    this.isDirectory   = node.isDirectory;
    this.children      = ko.observableArray([]);
    this.isOpened      = ko.observable(false);
    this.isHidden      = (node.name == "target" || node.name == "project" || node.name[0] == "." );
    this.parent        = parent;

    this.contextmenu = {
      'New file...': this.createFile.bind(this),
      'New folder...': this.createDir.bind(this),
      'Reveal in system': this.show.bind(this),
      'Delete folder': this.delete.bind(this),
      'Rename...': this.rename.bind(this)
    }
  }

  function makeChildren(path, parent) {
    var container = parent.children;
    // this function may be called when the list is already populated
    // so we keep track of it, for later use
    var defaultList = container().map(function(n) { return n.location; });
    // get a fresh version of the node from the server
    return fs.browse(path).success(function(data) {
      data.children.forEach(function(node) {
        var index = defaultList.indexOf(node.location);
        // if the current node already exists in container
        // we do not create a duplicate object
        if (index >= 0){
          defaultList.splice(index, 1);
          return;
        }
        if (node.isDirectory) {
          container.push(new TreeNode(node, parent));
        } else {
          container.push(new FileNode(node, parent));
        }
      });
      // Remove the element that are left (they are not present in the new list)
      if (defaultList.length){
        container.remove(function(node) { return defaultList.indexOf(node.location) >= 0; })
      }
      // Finally, clean everything with a sort.
      container.sort(function(left, right) {
        if (right.isDirectory == left.isDirectory) return right.name.toLowerCase() < left.name.toLowerCase();
        else return right.isDirectory;
      });
    });
  }

  TreeNode.prototype.load = function() {
    return makeChildren(this.location, this);
  }

  TreeNode.prototype.toggleOpen = function(data, event) {
    event && event.stopPropagation();
    if (!this.isOpened()) {
      this.isOpened(true);
      if (!this.children().length) {
        this.load();
      }
    } else {
      this.isOpened(false);
    }
  }

  TreeNode.prototype.createDir = function() {
    var name = prompt("New folder's name?");
    if (!name) return;
    this.isOpened(true);
    fs.create(this.location+window.separator+name,true).success(this.load.bind(this));
  }
  TreeNode.prototype.createFile = function() {
    var name = prompt("New file's name?");
    if (!name) return;
    this.isOpened(true);
    fs.create(this.location+window.separator+name,false).success(this.load.bind(this));
  }
  TreeNode.prototype.show = function() {
    fs.show(this.location);
  }
  TreeNode.prototype.delete = function() {
    if(confirm("You are about to delete "+this.name)) fs.delete(this.location).success(this.parent.load.bind(this.parent));
  }
  TreeNode.prototype.rename = function() {
    var name = prompt("Folder's new name?");
    if (!name) return;
    fs.newName(this.location, name).success(this.load.bind(this));
  }

  // MAIN TreeNode INSTANCE IS PROJECT ROOT
  var tree = new TreeNode({
    name:           window.serverAppModel.id,
    location:       window.serverAppModel.location,
    humanLocation:  window.serverAppModel.location,
    isRoot:         false,
    isDirectory:    true
  });
  tree.load();

  // a list of TreeNode instances, to refresh them all when asked
  function refreshProject() {

    function refreshNode(node) {
      node.load().complete(function() {
        node.children().forEach(function(child) {
          if (child.children().length != 0){
            refreshNode(child);
          }
        });
      });
    }
    refreshNode(tree);
  }

  function revealInSideBar(path){
    function revealNode(node) {
      node.children().forEach(function(child) {
        if (path.indexOf(child.location) == 0){
          child.isOpened(true);
          if (!child.children().length) {
            child.load().complete(function() {
              revealNode(child);
            });
          } else {
            revealNode(child);
          }
        }
      });
    }
    revealNode(tree);
  }

  function revealProject() {
    tree.show();
  }
  function newDirAtRoot() {
    tree.createDir();
  }
  function newFileAtRoot() {
    tree.createFile();
  }

  State = {
    tree: tree,
    revealProject: revealProject,
    newDirAtRoot: newDirAtRoot,
    newFileAtRoot: newFileAtRoot,
    refreshProject: refreshProject
  }

  return {
    tree: tree,
    reveal: revealInSideBar,
    render: function(){
      return bindhtml(tpl, State);
    }
  }

});
