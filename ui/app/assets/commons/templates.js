/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(function() {
  var templates = {};
  // Register a template (by text) with the template engine.

  function registerTemplate(id, text) {
    templates[id] = text;
    return id;
  }
  //define a template source that simply treats the template name as its content
  ko.templateSources.stringTemplate = function(template, templates) {
    this.templateName = template;
    this.templates = templates;
  }
  // Add the API the templates use.
  ko.utils.extend(ko.templateSources.stringTemplate.prototype, {
    data: function(key, value) {
      debug && console.log("data", key, value, this.templateName);
      this.templates._data = this.templates._data || {};
      this.templates._data[this.templateName] = this.templates._data[this.templateName] || {};
      if(arguments.length === 1) {
        return this.templates._data[this.templateName][key];
      }
      this.templates._data[this.templateName][key] = value;
    },
    text: function(value) {
      if(arguments.length === 0) {
        return this.templates[this.templateName];
      }
      this.templates[this.templateName] = value;
    }
  });


  // We add a custom binding that allows us to delegate to a view for binding things :)
  // Kinda lazy, but it can help.
  ko.bindingHandlers.customBind = {
      init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    // This will be called when the binding is first applied to an element
    var wrappedHandler = valueAccessor();
    var handler = ko.utils.unwrapObservable(wrappedHandler);
    if(handler.init) {
      handler.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    }
      },
      update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // This will be called when the binding is first applied to an element
    var wrappedHandler = valueAccessor();
    var handler = ko.utils.unwrapObservable(wrappedHandler);
    if(handler.update) {
      handler.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    }
      }
  }

  function createStringTemplateEngine(templateEngine, templates) {
    templateEngine.makeTemplateSource = function(template) {
      return new ko.templateSources.stringTemplate(template, templates);
    }
    return templateEngine;
  }

  // toggle Booleans from binding
  ko.bindingHandlers.toggle = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var val = valueAccessor();
      element.addEventListener("click",function(){
        val(!val());
      });
    },
    update: function() {}
  };

  // add active class on link if in url
  ko.bindingHandlers.isActiveUrl = (function(){
    var urlChange = ko.observable(window.location.hash);
    window.addEventListener("hashchange", function(e) {
      setTimeout(function() {
        urlChange(window.location.hash);
      },10);
    });
    return {
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
  }());


  // Register us immediately.
  ko.setTemplateEngine(createStringTemplateEngine(new ko.nativeTemplateEngine(), templates));

  // Just pass a function in the template, to call it
  ko.bindingHandlers['call'] = {
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

  ko.bindingHandlers.memoScroll = (function(){
    var memos = {}
    return {
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      },
      update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var label = valueAccessor();
        if (!memos[label]) {
          memos[label] = [0,0];
        }
        setTimeout(function() {
          element.scrollLeft = memos[label][0];
          element.scrollTop  = memos[label][1];
        }, 100);
        $(element).off('scroll').on('scroll', function(e) {
          memos[label][0] = element.scrollLeft;
          memos[label][1] = element.scrollTop;
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
  ko.bindingHandlers.logScroll = (function(){
    var memos = {}
    return {
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (!allBindings().scrollTrigger) throw("logScroll must have a scrollTrigger, wich is the observable array.")
      },
      update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var label = valueAccessor();
        if (!memos[label]) {
          memos[label] = "stick";
        }
        setTimeout(function() {
          if (memos[label] == 'stick'){
            element.scrollTop = 9e9;
          } else {
            element.scrollTop = memos[label];
          }
        }, 100);

        // Create a clone
        var trigger = ko.computed(function() {
          return allBindings().scrollTrigger();
        });

        // When an element is added to the node, we reactualise the scroll.
        // This is more efficient than anything else since this callback is
        // removed when the element is gone.
        element.addEventListener("DOMNodeInserted", throttle(function() {
          if (memos[label] == 'stick'){
            element.scrollTop = element.scrollHeight;
          }
        }), false);

        $(element).off('scroll').on('scroll', function(e) {
          if ((element.scrollTop + element.offsetHeight) > (element.scrollHeight - 20)) { // 20 is the error margin
            memos[label] = 'stick';
          } else {
            memos[label] = element.scrollTop;
          }
        });
      }
    }
  }());

  ko.bindingHandlers.scrollToBottom = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      setTimeout(function() {
        element.scrollTop = 9e9;
      }, 100);
      element.addEventListener("DOMNodeInserted", function() {
        element.scrollTop = 9e9;
      }, true);
    }
  }

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

  window.bindhtml = function(html, model) {
    var dom = $(html)[0];
    ko.applyBindings(model, dom);
    return dom;
  }

  return {
    registerTemplate: registerTemplate,
    templates: templates
  };
});
