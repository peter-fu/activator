define([
  'services/search',
  'text!./omnisearch.html',
  'css!./omnisearch'
],function(
  search,
  tpl
) {

  var defaultSuggestions = [],
      searchString = ko.observable("").extend({ throttle: 200 }),
      searchStringLast = "",
      busy = ko.observable(false),
      active = ko.observable(false),
      options = ko.observable([]),
      selected = ko.observable(0);

  searchString.subscribe(function(keywords) {
    // Don't search until at least two characters are entered and search string isn't the same as last
    if (keywords.length >= 2) {
      busy(true);
      search.search(keywords, options);
    } else {
      options([]);
      busy(false);
      active(false);
    }
  });

  var State = {

    options: options,
    busy: busy,
    selected: selected,
    searchString: searchString,

    keyDown: function(state,e) {
      // Up
      if (e.keyCode == 38) {
          e.preventDefault();
          if (selected() > 0) {
            selected(selected() - 1);
          } else {
            selected(options().length - 1);
          }
          scrollToSelected();
          return false;
      }
      // Down
      else if (e.keyCode == 40) {
          e.preventDefault();
          if (selected() < options().length - 1) {
            selected(selected() + 1);
          } else {
            selected(0);
          }
          scrollToSelected();
          return false;
      }
      // autocomplete on TAB
      else if (e.keyCode == 9) {
        e.target.value = options()[selected()].execute;
        return false;
      }
      else return true;
    },

    keyUp: function(state,e) {
      switch (e.keyCode) {
        // ignore these:
        case 38:
        case 40:
          return;
          break;
        // Escape
        case 27:
          e.target.blur();
          break;
        // Return
        case 13:
          var selectedItem = options()[selected()];
          if (selectedItem) {
            activate(selectedItem);
            e.target.blur();
          }
          break;
      }
    },

    focus: function() {},

    blur: function() {
      // Delay hiding of omnisearch list to catch mouse click on list before it disappears
      setTimeout(function(){
        active(false);
        selected(0);
        searchString("");
      }, 3500);
    },

    scrollToSelected: function() {
      var $omnisearch = $('#omnisearch ul');
      var $selected = $omnisearch.find('li.selected');
      if ($selected.position().top < 0) {
        $omnisearch.scrollTop($omnisearch.scrollTop() + $selected.position().top);
      } else if ($selected.position().top + $selected.outerHeight() >= $omnisearch.height()) {
        $omnisearch.scrollTop($omnisearch.scrollTop() + $selected.position().top + $selected.outerHeight() - $omnisearch.height());
      }
    },

    onOptionSelected: function(data){
      var self = this;
      if (data) {
        activate(data);
      }
    },

    exec: function(option) {
      return function() {
        option.callback(option);
        options([]);
      }
    }
  }

  return bindhtml(tpl, State);

});
