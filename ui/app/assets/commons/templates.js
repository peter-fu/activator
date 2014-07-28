/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(function() {

  var urlChange = ko.observable(window.location.hash);
  window.addEventListener("hashchange", function(e) {
    setTimeout(function() {
      urlChange(window.location.hash);
    },10);
  });


  $.fn.scrollReveal = function(){
    $("<a href='#'>&nbsp;</a>").insertAfter(this).focus().remove();
  }

  $.fn.clickOut = function(callback, context){
    return this.each(function(){
      context = context || this;
      var _this = this;
      // SetTimeout to prevent evt propagation conflicts
      setTimeout(function(){
        $(document).click(function(e){
          if (!$(_this).has(e.target).length){
            $(document).unbind("click", arguments.callee);
            callback.call(context, e);
          }
        });
      }, 10);
    });
  }

  $(document.body).on("click", ".dropdown:not(.dropdownNoEvent)",function(e){
    $(this).toggleClass("opened");
  });


  // -------------
  // Main difference between INCLUDE and INSERT:
  // include uses its own applybinding, while insert need an "upper" state in argument
  // -------------

  ko.bindingHandlers.include = {
    init: function(elem, valueAccessor) {
    },
    update: function(elem, valueAccessor) {
      var placeholder = ko.virtualElements.firstChild(elem);
      if (!placeholder){
        placeholder = document.createComment("placeholder");
        elem.parentNode.insertBefore(placeholder, elem.nextSibling);
      }
      var inc = ko.utils.unwrapObservable(valueAccessor());
      setTimeout(function(){
        $(placeholder).replaceWith(inc);
      },0);
    }
  }
  ko.virtualElements.allowedBindings.include = true;

  ko.bindingHandlers.insert = {
    init: function(elem, valueAccessor) {
    },
    update: function(elem, valueAccessor) {
      ko.virtualElements.emptyNode(elem);
      if (typeof valueAccessor() == 'string'){
        elem.parentNode.innerHtml = valueAccessor();
      } else {
        elem.parentNode.insertBefore(valueAccessor(), elem.nextSibling);
      }
    }
  }
  ko.virtualElements.allowedBindings.include = true;
  // -------------

  // toggle Booleans from binding
  ko.bindingHandlers.toggle = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var val = valueAccessor();
      ko.applyBindingsToNode(element, { click: function() {
        val(!val());
      } });
    },
    update: function() {}
  };

  ko.bindingHandlers.switchButton = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var val = valueAccessor();
      ko.applyBindingsToNode(element, { css: { 'active': val }, toggle: val });
    },
    update: function() {}
  };

  // add active class on link if in url
  ko.bindingHandlers.isActiveUrl = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var url = valueAccessor();
      var isActive = ko.computed(function() {
        return (urlChange()+"/").indexOf(url+"/") == 0;
      });
      ko.applyBindingsToNode(element, { css: {'active': isActive} });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
  }

  // Just pass a function in the template, to call it
  ko.bindingHandlers['exec'] = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      valueAccessor()(element, allBindings, viewModel, bindingContext);
    }
  };
  // Log
  ko.bindingHandlers['log'] = {
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
          debug && console.log("LOG FROM HTML:",valueAccessor());
      }
  };

  ko.bindingHandlers.href = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var url = valueAccessor();
      ko.applyBindingsToNode(element, { attr: {'href': url} });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
  }

  ko.bindingHandlers.memorizeLinks = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var url = valueAccessor();
      var link = ko.observable(url);
      ko.applyBindingsToNode(element, { attr: {'href': link} });
      urlChange.subscribe(function(cu) {
        if (cu.indexOf(url) === 0) {
          link(cu);
        }
      });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
  }

  ko.bindingHandlers.memoScroll = (function(){
    var memos = {}
    return {
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var memo = valueAccessor();
        if (!memo()) {
          memo([0,0]);
        }
        setTimeout(function() {
          element.scrollLeft = memo()[0];
          element.scrollTop  = memo()[1];
        }, 1);// Wait for everything to be displayed
        element.addEventListener('scroll', function(e) {
          memo([element.scrollLeft,element.scrollTop]);
        });
      }
    }
  }());

  function throttle(f){
    var timer;
    return function(){
      if (timer) clearTimeout(timer);
      timer = setTimeout(f, 1);
    }
  }
  ko.bindingHandlers.logScroll = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var memo = valueAccessor();
      if (!memo()) {
        memo('stick');
      }
      setTimeout(function() {
        if (memo() == 'stick'){
          element.scrollTop = 9e9;
        } else {
          element.scrollTop = memo();
        }
      }, 100);

      // When an element is added to the node, we reactualise the scroll.
      // This is more efficient than anything else since this callback is
      // removed when the element is gone.
      element.addEventListener("DOMNodeInserted", function() {
        if (memo() == 'stick'){
          element.scrollTop = 9e9;
        }
      }, true);

      element.addEventListener('scroll', function(e) {
        if ((element.scrollTop + element.offsetHeight) > (element.scrollHeight - 20)) { // 20 is the error margin
          memo('stick');
        } else {
          memo(element.scrollTop);
        }
      },true);
    }
  }

  // This allows to style SVG in css (including css transition and animations)
  ko.bindingHandlers.svg = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      $.get(valueAccessor(), function(data) {
        var img = document.adoptNode(data.querySelector('svg'));
        $(element).replaceWith(img);
      }, 'xml');
    }
  }

  // it's more convenient if we put those inthe whole scope
  window.domRemoved = function(target, callback) {
    return setTimeout(function() {
      return target.addEventListener("DOMNodeRemovedFromDocument", function(e) {
        return callback(e);
      });
    }, 0);
  }

  window.doOnChange = function(ob, fn) {
    fn(ob());
    return ob.subscribe(fn);
  }

  window.doOnChangeAndWatchDom = function(target, ob, fn) {
    var subscription = doOnChange(ob, fn);
    domRemoved(target, function() {
      subscription.dispose();
    })
  }

  window.bindhtml = function(html, model) {
    var dom = $(html)[0];
    ko.applyBindings(model, dom);
    return dom;
  }

});
