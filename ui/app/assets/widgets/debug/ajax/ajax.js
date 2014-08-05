define([
  'text!./ajax.html'
],function(
  tpl
) {

  var method  = ko.observable("GET")
    , url     = ko.observable()
    , data    = ko.observable()
    , active  = ko.observable()
    , history = ko.observableArray()

  function Request(method, data, url) {
    this.url    = url
    this.method = method
    this.data   = data
    eval("var _d = "+data+";")
    if (_d) this.parsedData = JSON.parse(JSON.stringify(_d))
  }

  Request.prototype.toJson = function() {
    // We don't store the result in localStorage
    return {
      url    : this.url,
      method : this.method,
      data   : this.data,
      status : this.status
    }
  }

  Request.prototype.exec = function() {
    var self = this
    $.ajax({
      url: self.url
      , type        : self.method
      , contentType : (self.method=="POST"||self.method=="PUT")?"application/json":"application/x-www-form-urlencoded"
      , data        : self.parsedData
      , dataType    : "json"
      , success     : function(e, i, j){
          self.result       = JSON.stringify(e, null, "  ")
          self.isJsonResult = true
        }
      , error       : function(e){
          self.result = e.responseText.toString()
          self.isJsonResult = false
        }
      , complete    : function(e){
          self.status  = e.status
          self.headers = e.getAllResponseHeaders()
          history.unshift(self)
          active(self)
        }
    });
  }

  // Local Storage
  var historyManager = (function(){

    if(!window.localStorage['debug-ajax-history']) window.localStorage['debug-ajax-history'] = '[{"method":"GET","type":"application/x-www-form-urlencoded","url":"/api/local/browse","data":"{ location: \'/\' }","status":200}]'

    history(JSON.parse(window.localStorage['debug-ajax-history']))

    history.subscribe(function(){
      window.localStorage['debug-ajax-history'] = JSON.stringify(history.slice(0,500).map(function(o) {
        if (o.toJson)
          return o.toJson()
        else
          return o
      }));
    });

  })();

  // Bind form
  function doRequestOnSumbit(o,e){
    new Request(method(), data(), url()).exec()
  }

  function datasKeydown(o,e) {
    if(e.keyCode === 9 && !e.shiftKey) {
      var start = this.selectionStart
      var end = this.selectionEnd
      var $this = $(this)
      var value = $this.val()
      $this.val(value.substring(0, start)
            + "\t"
            + value.substring(end))
      this.selectionStart = this.selectionEnd = start + 1
      e.preventDefault()
    }
  }

  // Click on history item
  function fillFromHistory(o){
    data(o.data?o.data:"")
    method(o.method)
    url(o.url)
    $(".search input").focus()
  }

  // Click on delete item
  function removeFromHistory(o){
    history.remove(o)
  }

  var State = {
    history           : history
  , fillFromHistory   : fillFromHistory
  , doRequestOnSumbit : doRequestOnSumbit
  , datasKeydown      : datasKeydown
  , removeFromHistory : removeFromHistory
  , active            : active
  , method            : method
  , url               : url
  , data              : data
  }

  return {
    render: function() {
      return bindhtml(tpl, State);
    }
  }

})
