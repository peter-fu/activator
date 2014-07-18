define(function() {

  return {

    set: function(label, value) {
      return window.localStorage.setItem(label, JSON.stringify(value));
    },

    get: function(label, def) {
      if (window.localStorage.getItem(label)) {
        return JSON.parse(window.localStorage.getItem(label));
      } else {
        return def;
      }
    },

    reset: function(label) {
      window.localStorage.removeItem(label);
    },

    observable: (function() {
      var all = {};
      return function(label, def) {
        // If you have en ERROR here, might be your localstorage that are compromised;
        var value = JSON.parse(window.localStorage.getItem(label)) || def;
        if (!all[label]) {
          all[label] = ko.observable(value);
          all[label].subscribe(function(newValue) {
            window.localStorage[label] = JSON.stringify(newValue);
          });
        }
        return all[label];
      }
    }())
  }

});
