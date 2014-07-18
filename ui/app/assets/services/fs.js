define(function() {

  var tree = [
    { title: "app", location: "/app", isDirectory: true, children: [
      { title: "controllers", location: "/app/controllers", isDirectory: true, children: [
        { title: "application.scala", location: "/app/controllers/application.scala" }
      ]},
      { title: "models", location: "/app/models", isDirectory: true, children: [
        { title: "model.scala", location: "/app/controllers/model.scala" }
      ]},
      { title: "views", location: "/app/views", isDirectory: true, children: [
        { title: "index.scala.html", location: "/app/controllers/index.scala.html" }
      ]}
    ]},
    { title: "conf", location: "/conf", isDirectory: true, children: [
      { title: "application.conf", location: "/app/controllers/application.conf" },
      { title: "routes", location: "/app/controllers/routes" }
    ]},
    { title: "project", location: "/project", isDirectory: true, children: [
      { title: "build.properties", location: "/app/controllers/build.properties" }
    ]},
    { title: "public", location: "/public", isDirectory: true, children: [
      { title: "javascripts", location: "/app/javascripts", isDirectory: true, children: []},
      { title: "images", location: "/app/images", isDirectory: true, children: []},
      { title: "stylesheets", location: "/app/stylesheets", isDirectory: true, children: []}
    ]},
    { title: "README", location: "/app/controllers/README" }
  ];


  return {
    open: function(location) {
      return $.ajax({
        url: '/api/local/open',
        type: 'GET',
        data: {
          location: location
        }
      });
    },

    create: function(location, isDirectory) {
      return $.ajax({
        url: '/api/local/create',
        type: 'PUT',
        dataType: 'text',
        data: {
          location: location,
          isDirectory: isDirectory
        }
      });
    },

    directory: function(path) {
      var deffered;
      deffered = $.Deferred();
      setTimeout(function() {
        var i, isDirectory, o, v;
        o = "Lorem ipsum dolor sit amet consectetur adipiscing elit Aenean viverra massa eget massa ullamcorper id vehicula est porttitor Donec rhoncus cursus nisl vitae sodales".split(" ");
        for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);;
        for (i in o) {
          v = o[i];
          isDirectory = !!Math.floor(Math.random() * 2);
          var parent = path=="/"?"":path;
          var p = !isDirectory?v+".ext":v;
          o[i] = {
            name: p,
            isDirectory: isDirectory,
            path: parent + "/" + p
          };
        }
        return deffered.resolve(o.slice(0, new Date() % o.length + 3));
      }, 100);
      return deffered.promise();
    },

    newFile: function(path, name) {},

    moveFile: function(path, newPath) {},

    newFolder: function(path, name) {},

    saveFile: function() {},

    // current project tree
    tree: function() { return tree }

  }
});
