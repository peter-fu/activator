define(function() {

  function buildItems(item) {
    item.callback = function() {
      window.location.hash = item.url;
    }
    return item;
  }

  var search = function(keywords){
    var url = '/app/' + window.serverAppModel.id + '/search/' + keywords;
    return $.ajax({
     url: url,
     dataType: 'json'
    }).pipe(function(data) {
      return data.map(buildItems) || [];
    });
  }


  return {
    search: search
  }

})
