/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(function() {

  return {

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
      });
    },

    // Reveal in system's file browser (eg. finder)
    show: function(location) {
      return $.ajax({
        url: '/api/local/open', // Not reflecting the REST API
        type: 'GET',
        data: {
          location: location
        }
      });
    },

    // Get file's content
    open: function(location) {
      return $.ajax({
        url: '/api/local/show', // Not reflecting the REST API
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

    rename: function(location, newName) {
      return $.ajax({
        url: '/api/local/rename',
        type: 'PUT',
        dataType: 'text',
        data: {
          location: location,
          newName: newName
        }
      });
    },

    delete: function(location, isDirectory) {
      return $.ajax({
        url: '/api/local/delete',
        type: 'PUT',
        dataType: 'text',
        data: {
          location: location
        }
      });
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
      });
    }

  }
});
