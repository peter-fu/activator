/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(['widgets/modals/modals'], function(modals) {

  function browse(location) {
    return $.ajax({
      url: '/api/local/browse',
      type: 'GET',
      dataType: 'json',
      data: {
        location: location
      }
    });
  }

  // Fetch utility
  function show(location){
    return $.ajax({
      url: '/api/local/show',
      type: 'GET',
      dataType: 'text',
      data: { location: location }
    });
  }

  function save(location, code) {
    return $.ajax({
      url: '/api/local/save',
      type: 'PUT',
      dataType: 'text',
      data: {
        location: location,
        content: code
      }
    });
  }

  function rename(location, newName) {
    return $.ajax({
      url: '/api/local/rename',
      type: 'PUT',
      dataType: 'text',
      data: {
        location: location,
        newName: newName
      }
    });
  }

  function create(location, isDirectory) {
    return $.ajax({
      url: '/api/local/create',
      type: 'PUT',
      dataType: 'text',
      data: {
        location: location,
        isDirectory: isDirectory,
        content: ''
      }
    });
  }

  function createContent(location, content) {
    return $.ajax({
      url: '/api/local/create',
      type: 'PUT',
      dataType: 'text',
      data: {
        location: location,
        isDirectory: false,
        content: content
      }
    });

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
    function search(keywords) {
      var url = '/app/' + window.serverAppModel.id + '/search/' + keywords;
      return $.ajax({
        url: url,
        dataType: 'json'
      }).error(showError("We could not search for:" + keywords)).pipe(function (data) {
        return data.map(buildItems) || [];
      });
    }
  }

  // Path utilities
  function relative(path) {
    return path.replace(window.serverAppModel.location,"");
  }
  function absolute(path) {
    return window.serverAppModel.location + path;
  }

  return {
    browse: browse,
    show: show,
    save: save,
    rename: rename,
    create: create,
    createContent: createContent,
    relative: relative,
    absolute: absolute
  };

});
