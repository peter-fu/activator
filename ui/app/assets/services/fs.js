define(function() {

  function buildItems(item) {
    item.callback = function() {
      window.location.hash = item.url;
    }
    return item;
  }

  function showError(err){
    return function() {
      modals.show({
        title: "Oops. Something went wrong",
        text: err,
        cancel: "hide"
      })
    }
  }

  return {
    search: function(keywords){
      var url = '/app/' + window.serverAppModel.id + '/search/' + keywords;
      return $.ajax({
       url: url,
       dataType: 'json'
      }).error(showError("We could not search for:" + keywords)).pipe(function(data) {
        return data.map(buildItems) || [];
      });
    },

    relative: function(path) {
      return path.replace(window.serverAppModel.location,"");
    },
    absolute: function(path) {
      return window.serverAppModel.location + path;
    },

    browse: function(path) {
      return $.ajax({
        url: '/api/local/browse',
        type: 'GET',
        data: {
          location: path
        }
      }).error(showError("We could not retrieve:" + location));
    },

    // Reveal in system's file browser (eg. finder)
    show: function(location) {
      return $.ajax({
        url: '/api/local/open', // Not reflecting the REST API
        type: 'GET',
        data: {
          location: location
        }
      }).error(showError("We could not retrieve:" + location));
    },

    // Get file's content
    open: function(location) {
      return $.ajax({
        url: '/api/local/show', // Not reflecting the REST API
        type: 'GET',
        data: {
          location: location
        }
      }).error(showError("We could not retrieve:" + location));
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
      }).error(showError("We could not create:" + location));
    },

    rename: function(location, newName) {
      return $.ajax({
        url: '/api/local/rename',
        type: 'PUT',
        dataType: 'text',
        data: {
          location: location,
          newName: newName
        }
      }).error(showError("We could not rename:" + location));
    },

    delete: function(location, isDirectory) {
      return $.ajax({
        url: '/api/local/delete',
        type: 'PUT',
        dataType: 'text',
        data: {
          location: location
        }
      }).error(showError("We could not delete:" + location));
    },

    save: function(location, content) {
      return $.ajax({
        url: '/api/local/save',
        type: 'PUT',
        dataType: 'text',
        data: {
          location: location,
          content: content
        }
      }).error(showError("We could not save:" + location));
    }

  }
});
