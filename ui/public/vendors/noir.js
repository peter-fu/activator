(function() {
  var Collection, CollectionClass, Computed, Element, EventClass, Fragment, List, ListClass, Model, ModelClass, Observable, ObservableClass, Tag, Template, Watcher, attributeBindings, bodyBindings, interceptObservableCalls, name, noir, tagNames, _, _fn, _fn1, _i, _j, _len, _len1, _ref, _ref1,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = (function() {
    return {
      extend: function() {
        var i, k, objects, source, v, _i, _len;
        source = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          i = objects[_i];
          for (k in i) {
            v = i[k];
            source[k] = v;
          }
        }
        return source;
      },
      deepExtend: function() {
        var i, k, objects, source, v, _i, _len;
        source = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          i = objects[_i];
          for (k in i) {
            v = i[k];
            if (source[k] && _.isObject(v)) {
              source[k] = _.deepExtend(source[k], v);
            } else if (_.isArray(source[k]) && _.isArray(v)) {
              source[k] = source[k].concat(v);
            } else {
              source[k] = v;
            }
          }
        }
        return source;
      },
      extendClass: function(parent, child) {
        var Class, method, property, _ref;
        Class = function() {
          return parent.apply(this, arguments);
        };
        _ref = parent.prototype;
        for (property in _ref) {
          method = _ref[property];
          Class.prototype[property] = method;
        }
        for (property in child) {
          method = child[property];
          Class.prototype[property] = method;
        }
        Class.__super__ = parent.prototype;
        Class.prototype.constructor = Class;
        return Class;
      },
      each: function(object, func) {
        var k, v;
        for (k in object) {
          v = object[k];
          func(k, v);
        }
        return object;
      },
      bind: function(context, func) {
        return function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return func.apply(context, args);
        };
      },
      bindAll: function(object) {
        each(object, function(k, v) {
          if (v.bind != null) {
            return o[k] = v.bind(object);
          } else if (typeof v === "function") {
            return o[k] = bind(object, v);
          }
        });
        return object;
      },
      removeFromArray: function(array, element) {
        var _results;
        _results = [];
        while (index = array.indexOf(element), index != -1) {
          _results.push(array.splice(index, 1));
        }
        return _results;
      },
      unique: function(a) {
        return a.filter(function(value, index, self) {
          return self.indexOf(value) === index;
        });
      },
      isFunction: function(object) {
        return typeof object === "function";
      },
      isObject: function(object) {
        return typeof object === "object";
      },
      isArray: function(array) {
        return {}.toString.call(array) === '[object Array]';
      },
      isString: function(array) {
        return typeof object === "string";
      },
      isNumber: function(array) {
        return typeof object === "number";
      },
      clone: function(object) {
        if (isObject(object)) {
          extend(object);
        }
        if (isArray(object)) {
          return object.slice();
        } else {
          return object;
        }
      },
      removeBetweenDom: function(start, stop) {
        var parent, _results;
        if (start.parentNode !== stop.parentNode) {
          throw "Parents must be the same when removing between nodes";
        }
        parent = start.parentNode;
        _results = [];
        while ((start.nextSibling != null) && start.nextSibling !== stop) {
          _results.push(parent.removeChild(start.nextSibling));
        }
        return _results;
      },
      domRemoved: function(target, callback) {
        return setTimeout(function() {
          return target.addEventListener("DOMNodeRemovedFromDocument", function(e) {
            return callback(e);
          });
        }, 0);
      }
    };
  })();

  attributeBindings = (function() {
    var addAttribute, clean, handleEvent, handleObservable, handleObservableList;
    clean = function(dom, events) {
      return _.domRemoved(dom, function() {});
    };
    addAttribute = function(element, attribute, value) {
      if (value === false) {
        return element.removeAttribute(attribute);
      } else {
        return element.setAttribute(attribute, value);
      }
    };
    handleObservable = function(action) {
      return function(element, value) {
        var computed;
        if (value.isObservable) {
          return value.doOnChangeAndWatchDom(element, function() {
            return action(element, value());
          });
        } else if (typeof value === "function") {
          computed = Computed(value);
          return computed.doOnChangeAndWatchDom(element, function(v) {
            return action(element, v);
          });
        } else {
          return action(element, value);
        }
      };
    };
    handleObservableList = function(action) {
      return function(element, props) {
        var key, value, _results;
        _results = [];
        for (key in props) {
          value = props[key];
          _results.push((function(element, key, value) {
            if (value.isObservable) {
              return value.doOnChangeAndWatchDom(element, function(v) {
                return action(element, key, value());
              });
            } else if (typeof value === "function") {
              computed = Computed(value);
              return computed.doOnChangeAndWatchDom(element, function(v) {
                return action(element, key, value());
              });
            } else {
              return action(element, key, value);
            }
          })(element, key, value));
        }
        return _results;
      };
    };
    handleEvent = function(element, type, callback, attrs, prevent) {
      var custom;
      if (attrs == null) {
        attrs = {};
      }
      if (prevent == null) {
        prevent = false;
      }
      if (typeof callback === "string") {
        custom = callback;
        callback = function(e) {
          var evt;
          evt = document.createEvent('CustomEvent');
          evt.initCustomEvent(custom, true, true, {});
          return e.target.dispatchEvent(evt);
        };
      }
      return element.addEventListener(type, function(e) {
        if (prevent) {
          e.preventDefault();
        }
        e.data = attrs;
        return callback(e);
      });
    };
    return {
      attr: handleObservableList(function(element, key, value) {
        return addAttribute(element, key, value);
      }),
      href: handleObservable(function(element, value) {
        return addAttribute(element, "href", value);
      }),
      id: handleObservable(function(element, value) {
        return addAttribute(element, "id", value);
      }),
      name: handleObservable(function(element, value) {
        return addAttribute(element, "name", value);
      }),
      data: handleObservableList(function(element, key, value) {
        return addAttribute(element, "data-" + key, value);
      }),
      value: function(element, value) {
        var activate;
        if (element.tagName === "INPUT" && (element.type !== "checkbox" || element.type !== "radio")) {
          if (value.isObservable) {
            value.doOnChangeAndWatchDom(element, function(v) {
              return element.value = value();
            });
            return element.onchange = function() {
              return value(element.value);
            };
          } else {
            return element.value = value;
          }
        } else if (element.tagName === "SELECT") {
          activate = function(v) {
            return setTimeout(function() {
              var option;
              option = element.querySelector('option[value="' + v + '"]');
              if (option) {
                return option.setAttribute("selected", true);
              }
            }, 0);
          };
          if (value.isObservable) {
            value.doOnChangeAndWatchDom(element, function(v) {
              return activate(value());
            });
            return element.onchange = function() {
              return value(element.value);
            };
          } else {
            return activate(value);
          }
        } else {
          return console.error("Can't bind value on this element (checkox or radio), use checked instead");
        }
      },
      checked: function(element, value) {
        if (element.tagName === "INPUT" && (element.type === "checkbox" || element.type === "radio")) {
          if (value.isObservable) {
            value.doOnChangeAndWatchDom(element, function(v) {
              return addAttribute(element, "checked", value());
            });
            return element.onchange = function() {
              return value(element.checked);
            };
          } else {
            return addAttribute(element, "checked", value);
          }
        } else {
          return console.error("Can't bind checked on non checkbox or radio elements");
        }
      },
      visible: handleObservable(function(element, value) {
        return element.style.display = value ? "block" : "none";
      }),
      css: handleObservableList(function(element, key, value) {
        return element.style[key] = value;
      }),
      "class": handleObservableList(function(element, key, value) {
        if (value) {
          return element.classList.add(key);
        } else {
          return element.classList.remove(key);
        }
      }),
      event: function(element, values, attrs) {
        var callback, type, _results;
        _results = [];
        for (type in values) {
          callback = values[type];
          _results.push(handleEvent(element, type, callback, attrs));
        }
        return _results;
      },
      click: function(element, callback, attrs) {
        return handleEvent(element, "click", callback, attrs);
      },
      $event: function(element, values, attrs) {
        var key, value, _ref, _results;
        if (attrs == null) {
          attrs = {};
        }
        if ((_ref = attrs.scope) == null) {
          attrs.scope = {};
        }
        _results = [];
        for (key in values) {
          value = values[key];
          _results.push($(element).on(key, function(e) {
            return value(e, attrs.scope, attrs);
          }));
        }
        return _results;
      },
      change: function(element, callback, attrs) {
        return handleEvent(element, "change", callback, attrs);
      },
      submit: function(element, callback, attrs) {
        return handleEvent(element, "submit", callback, attrs, true);
      },
      text: function(element, value) {
        var computed, node;
        if (value != null ? value.isObservable : void 0) {
          node = document.createTextNode(value.get());
          value.on("change", function(v) {
            return node.nodeValue = v;
          });
        } else if (typeof value === "function") {
          computed = Computed(value);
          node = document.createTextNode(computed());
          computed.on("change", function(v) {
            return node.nodeValue = v;
          });
        } else {
          node = document.createTextNode(typeof value === "function" ? value() : value);
        }
        return element.appendChild(node);
      },
      html: handleObservable(function(element, value) {
        return element.innerHTML = value;
      }),
      include: handleObservable(function(element, value) {
        while (element.firstChild) {
          element.removeChild(element.firstChild);
        }
        if (value && value.nodeName) {
          return element.appendChild(value);
        } else if (typeof value === "function") {
          return element.appendChild(value());
        }
      }),
      exec: function(element, func, attrs) {
        return setTimeout(function() {
          return func(element, attrs);
        }, 0);
      },
      scope: function() {}
    };
  })();

  bodyBindings = {
    "if": function(parent, body, value) {
      if (value && value.isObservable) {
        value.doOnChangeAndWatchDom(parent, function(bool) {
          if (value()) {
            return parent.appendChild(body(value()));
          }
        });
      } else {
        if (value) {
          parent.appendChild(body(value));
        }
      }
      return parent;
    },
    ifnot: function(parent, body, value) {
      if (value && value.isObservable) {
        value.doOnChangeAndWatchDom(parent, function(bool) {
          if (!value()) {
            return parent.appendChild(body(value()));
          }
        });
      } else {
        if (!value) {
          parent.appendChild(body(value));
        }
      }
      return parent;
    },
    forEach: function(parent, body, value) {
      var fill, item, key;
      if (value && value.isCollection) {
        fill = function(list) {
          if (parent != null) {
            parent.innerHTML = "";
          }
          return list.forEach(function(item, key) {
            return parent.appendChild(body(item, key));
          });
        };
        value.onAndWatchDom(parent, "reset reverse sort", fill);
        fill(value.all());
        value.on("push unshift", function(list, e) {
          return list.forEach(function(item, key) {
            if (e === "unshift") {
              return parent.insertBefore(body(item, key), parent.firstChild);
            } else {
              return parent.appendChild(body(item, key));
            }
          });
        });
        value.onAndWatchDom(parent, "splice", function(a, b, index) {
          var i, _i, _ref, _results;
          _results = [];
          for (i = _i = 0, _ref = index[1]; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            _results.push(parent.removeChild(parent.childNodes[index[0] + i]));
          }
          return _results;
        });
      } else if (value.isObservable) {
        value.doOnChangeAndWatchDom(parent, function(list) {
          var item, key, _ref, _results;
          if (parent != null) {
            parent.innerHTML = "";
          }
          _ref = value();
          _results = [];
          for (key in _ref) {
            item = _ref[key];
            _results.push(parent.appendChild(body(item, key)));
          }
          return _results;
        });
      } else {
        for (key in value) {
          item = value[key];
          parent.appendChild(body(item, key));
        }
      }
      return parent;
    },
    watch: function(parent, body, watchers) {
      return Watch(watchers).doOnChangeAndWatchDom(parent, function() {
        parent.innerHTML = "";
        return parent.appendChild(body(watchers()));
      });
    }
  };

  bodyBindings.only = bodyBindings["if"];

  bodyBindings.unless = bodyBindings.ifnot;

  bodyBindings.map = bodyBindings.forEach;

  EventClass = (function() {

    EventClass.prototype.isEvent = true;

    EventClass.prototype.isObservable = true;

    function EventClass() {
      this.callbacks = {};
    }

    EventClass.prototype.bindAll = function() {
      var self;
      self = this;
      return _.each(this, function(i, f) {
        if (_.isFunction(f) && !f.isObservable) {
          return self[i] = _.bind(self, f);
        }
      });
    };

    EventClass.prototype.on = function(type, callback) {
      var self;
      self = this;
      return _.each(type.split(" "), function(i, t) {
        var _base, _ref;
        if ((_ref = (_base = self.callbacks)[t]) == null) {
          _base[t] = [];
        }
        return self.callbacks[t].push(callback);
      });
    };

    EventClass.prototype.off = function(type, callback) {
      var _this = this;
      if (type) {
        return _.each(type.split(" "), function(n, t) {
          if (_this.callbacks[t] && callback) {
            return _.removeFromArray(_this.callbacks[t], callback);
          } else {
            return _this.callbacks[t] = [];
          }
        });
      } else {
        return this.callbacks = {};
      }
    };

    EventClass.prototype.trigger = function(type, value, extras) {
      if (this.callbacks[type] != null) {
        _.each(this.callbacks[type], function(n, c) {
          return typeof c === "function" ? c(value, type, extras) : void 0;
        });
      }
      if (this.callbacks["all"] != null) {
        return _.each(this.callbacks["all"], function(n, c) {
          return typeof c === "function" ? c(value, type, extras) : void 0;
        });
      }
    };

    EventClass.prototype.onAndWatchDom = function(target, type, callback) {
      var self;
      self = this;
      self.on(type, callback);
      return _.domRemoved(target, function() {
        return self.off(type, callback);
      });
    };

    EventClass.prototype.doOnChange = function(value, callback) {
      this.on("change", callback);
      return this.trigger("change", value);
    };

    EventClass.prototype.doOnChangeAndWatchDom = function(target, value, callback) {
      this.onAndWatchDom(target, "change", callback);
      return this.trigger("change", value);
    };

    EventClass.prototype.remove = function() {
      this.trigger("remove");
      return delete this.callbacks;
    };

    return EventClass;

  })();

  ObservableClass = (function(_super) {

    __extends(ObservableClass, _super);

    function ObservableClass(value) {
      var _this = this;
      this.value = value;
      ObservableClass.__super__.constructor.call(this);
      this.on("destroy", function() {
        return delete _this.value;
      });
    }

    ObservableClass.prototype.set = function(newValue, force) {
      if (force == null) {
        force = false;
      }
      if (force || newValue !== this.value) {
        this.value = newValue;
        return this.trigger("change", this.value);
      }
    };

    ObservableClass.prototype.get = function() {
      interceptObservableCalls.push(this);
      return this.value;
    };

    ObservableClass.prototype.doOnChange = function(callback) {
      this.on("change", callback);
      return callback(this.value);
    };

    ObservableClass.prototype.doOnChangeAndWatchDom = function(element, callback) {
      this.onAndWatchDom(element, "change", callback);
      return callback(this.value);
    };

    return ObservableClass;

  })(EventClass);

  Observable = function(value) {
    var func, instance;
    instance = new ObservableClass(value);
    func = function(newValue) {
      if (newValue !== void 0) {
        return instance.set(newValue);
      } else {
        return instance.get();
      }
    };
    return _.extend(func, instance);
  };

  interceptObservableCalls = (function() {
    var func, list;
    list = null;
    func = function(f) {
      var ret;
      list = [];
      f();
      ret = list.slice(0);
      list = null;
      return ret;
    };
    func.push = function(i) {
      return list != null ? list.push(i) : void 0;
    };
    return func;
  })();

  Watcher = function(list) {
    var instance, notifier,
      _this = this;
    instance = new EventClass();
    notifier = function(value, type, i) {
      return instance.trigger(type);
    };
    _.each(list, function(n, i) {
      if ((i != null ? i.isObservable : void 0) != null) {
        return i.on("all", function(value, type) {
          return notifier(value, type, i);
        });
      }
    });
    return instance;
  };

  Computed = function(computer, bindTo) {
    var func, instance, ret, toWatch, value, watch;
    if (!computer) {
      computer = toWatch;
      toWatch = [];
    }
    value = null;
    watch = Watcher(_.unique(interceptObservableCalls(function() {
      return value = computer.apply(bindTo);
    })));
    instance = Observable(value);
    func = function() {
      return ret.get();
    };
    ret = _.extend(func, instance);
    watch.on("all", function() {
      return ret.set(computer());
    });
    ret.off = function(a, b, c) {
      watch.off(a, b, c);
      return instance.off(a, b, c);
    };
    return ret;
  };

  ModelClass = (function(_super) {

    __extends(ModelClass, _super);

    function ModelClass(values) {
      var self;
      self = this;
      this.bindAll();
      ModelClass.__super__.constructor.call(this);
      if (!(this.init != null)) {
        throw "Model must have an init method";
      }
      this.init.apply(this, values);
      _.each(this, function(key, value) {
        var _ref;
        if ((_ref = self[key]) != null ? _ref.isObservable : void 0) {
          return self[key].on("change error remove", function(v, t) {
            return self.trigger(t, v);
          });
        }
      });
    }

    ModelClass.prototype.remove = function() {
      var i, v, _results;
      this.trigger("remove", this);
      _results = [];
      for (i in this) {
        v = this[i];
        if (v.callbacks) {
          v.callbacks = {
            all: []
          };
          _results.push(v = null);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    return ModelClass;

  })(EventClass);

  Model = function(props) {
    var submodel;
    submodel = _.extendClass(ModelClass, props);
    return function() {
      var values;
      values = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return new submodel(values);
    };
  };

  ListClass = (function(_super) {

    __extends(ListClass, _super);

    function ListClass(list) {
      var self;
      this.isCollection = true;
      self = this;
      ListClass.__super__.constructor.call(this);
      this.reset(list);
      this.length = Observable(this.list.length);
      this.on("all", function() {
        return self.length(self.list.length);
      });
      if (typeof this.init === "function") {
        this.init(this.list);
      }
    }

    ListClass.prototype.all = function() {
      interceptObservableCalls.push(this);
      return this.list.slice(0);
    };

    ListClass.prototype.at = function(index) {
      return this.list[index];
    };

    ListClass.prototype.remove = function(arg) {
      var i, index, _i, _len, _results;
      if (_.isArray(arg)) {
        _results = [];
        for (_i = 0, _len = arg.length; _i < _len; _i++) {
          i = arg[_i];
          _results.push(this.remove(i));
        }
        return _results;
      } else if (_.isFunction(arg) && !arg.isObservable) {
        return this.remove(this.filter(arg));
      } else if (arg != null) {
        index = this.indexOf(arg);
        if (index > -1) {
          return this.splice(index, 1);
        }
      }
    };

    ListClass.prototype.removeAt = function(index) {
      if (index > -1) {
        return this.splice(parseInt(index), 1);
      }
    };

    ListClass.prototype.reset = function(list) {
      var self;
      self = this;
      this.list = list;
      this.list.forEach(function(item) {
        if (item.isObservable) {
          return item.on("all", function(value, type) {
            return self.trigger(type, item);
          });
        }
      });
      return this.trigger("reset", this.list);
    };

    return ListClass;

  })(EventClass);

  "reverse sort push pop shift unshift splice".split(" ").forEach(function(type) {
    return ListClass.prototype[type] = function() {
      var args, extras, results, self;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      interceptObservableCalls.push(this);
      results = [][type].apply(this.list, args);
      self = this;
      switch (type) {
        case "push":
        case "unshift":
          results = args;
          results.forEach(function(item) {
            if (item.isObservable) {
              return item.on("all", function(value, type) {
                return self.trigger(type, item);
              });
            }
          });
          break;
        case "pop":
          if (typeof results.remove === "function") {
            results.remove();
          }
          this.trigger("splice", results, [this.length(), 1]);
          break;
        case "shift":
          if (typeof results.remove === "function") {
            results.remove();
          }
          this.trigger("splice", results, [0, 1]);
          break;
        case "splice":
          extras = args;
          results.forEach(function(item) {
            return typeof item.remove === "function" ? item.remove() : void 0;
          });
      }
      this.trigger(type, results, extras);
      return this;
    };
  });

  "join concat slice indexOf lastIndexOf forEach map reduce reduceRight filter some every".split(" ").forEach(function(type) {
    return ListClass.prototype[type] = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      interceptObservableCalls.push(this);
      return [][type].apply(this.list, args);
    };
  });

  List = function(list) {
    return new ListClass(list);
  };

  CollectionClass = (function(_super) {

    __extends(CollectionClass, _super);

    function CollectionClass(list) {
      var self;
      self = this;
      CollectionClass.__super__.constructor.call(this, list);
      this.bindAll();
      if (this.init) {
        this.init(list);
      }
      this.on("remove", function(item) {
        return self.remove(item);
      });
    }

    CollectionClass.prototype.create = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this.model != null) {
        return this.push(this.model.apply(this, args));
      } else {
        throw "Collection::create -> No model for this collection";
      }
    };

    CollectionClass.prototype.rcreate = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this.model != null) {
        return this.unshift(this.model.apply(this, args));
      } else {
        throw "Collection::rcreate -> No model for this collection";
      }
    };

    CollectionClass.prototype.destroy = function() {
      this.reset([]);
      return this.off();
    };

    return CollectionClass;

  })(ListClass);

  Collection = function(props) {
    var submodel;
    submodel = _.extendClass(CollectionClass, props);
    return function(list) {
      return new submodel(list);
    };
  };

  Element = (function() {

    Element.prototype.isTemplate = true;

    function Element(element, body, args) {
      var result;
      this.element = element;
      if (body && _.isFunction(body)) {
        result = body.apply(this, args);
        switch (typeof result) {
          case "function":
            result.apply(this);
            break;
          case "string":
            this.text(result);
            break;
          case "number":
            this.text(result + "");
            break;
          default:
            void 0;
        }
      }
    }

    Element.prototype.tag = function(name, options) {
      return this.element.appendChild((new Tag(name, options)).element);
    };

    Element.prototype.include = function() {
      var args, body;
      body = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (body.nodeName != null) {
        return this.element.appendChild(body);
      } else {
        return this.element.appendChild((new Fragment(body, args)).element);
      }
    };

    Element.prototype.text = function() {
      var node, value, values, _i, _len, _results;
      values = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _results = [];
      for (_i = 0, _len = values.length; _i < _len; _i++) {
        value = values[_i];
        if (value != null ? value.isObservable : void 0) {
          node = document.createTextNode(value.get());
          value.on("change", function(v) {
            return node.nodeValue = v;
          });
        } else {
          node = document.createTextNode(typeof value === "function" ? value() : value);
        }
        _results.push(this.element.appendChild(node));
      }
      return _results;
    };

    return Element;

  })();

  tagNames = 'a abbr address article aside audio b bdi bdo blockquote body button canvas caption cite code colgroup datalist dd del details dfn div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup html i iframe ins kbd label legend li main map mark menu meter nav noscript object ol optgroup option output p pre progress q rp rt ruby s samp script section select small span strong style sub summary sup table tbody td textarea tfoot th thead time title tr u ul video area base br col command embed hr img input keygen link meta param source track wbr';

  _ref = tagNames.split(" ");
  _fn = function(name) {
    return Element.prototype[name] = function() {
      var options;
      options = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.tag(name, options);
    };
  };
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    name = _ref[_i];
    _fn(name);
  }

  _ref1 = ['if', 'ifnot'];
  _fn1 = function(name, binding) {
    return Element.prototype[name] = function(value, body) {
      var callback, start, stop;
      if (value != null ? value.isObservable : void 0) {
        start = this.element.appendChild(document.createComment(name));
        stop = this.element.appendChild(document.createComment('/' + name));
        callback = function() {
          var fragment;
          _.removeBetweenDom(start, stop);
          fragment = new Fragment();
          return stop.parentNode.insertBefore(binding(fragment.element, body.bind(fragment), value()), stop);
        };
        value.on("change", callback);
        _.domRemoved(stop, function() {
          return value.off("change", callback);
        });
        return callback(value());
      } else {
        return binding(this.element, body.bind(this), value);
      }
    };
  };
  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    name = _ref1[_j];
    _fn1(name, bodyBindings[name]);
  }

  Element.prototype['only'] = Element.prototype['if'];

  Element.prototype['unless'] = Element.prototype['ifnot'];

  Element.prototype['map'] = Element.prototype['forEach'];

  Fragment = (function(_super) {

    __extends(Fragment, _super);

    function Fragment(body, args) {
      Fragment.__super__.constructor.call(this, document.createDocumentFragment(), body, args);
    }

    return Fragment;

  })(Element);

  Tag = (function(_super) {
    var makeAttributesFromString, makeBody, parseOptions;

    __extends(Tag, _super);

    parseOptions = function(options) {
      var attributes, body, i, _k, _len2;
      attributes = {};
      for (_k = 0, _len2 = options.length; _k < _len2; _k++) {
        i = options[_k];
        switch (typeof i) {
          case 'string':
            attributes = _.deepExtend(attributes, makeAttributesFromString(i));
            break;
          case 'object':
            attributes = _.deepExtend(attributes, i);
            break;
          case 'function':
            body = i;
        }
      }
      return [body, attributes];
    };

    makeAttributesFromString = function(str) {
      var attr, attributes, attrs, bool, cls, id, stt, _id, _ref2, _ref3, _ref4;
      stt = str + "";
      attrs = /\[([^\[]+)\]?/ig;
      attr = /\[([a-z]+)=([^\[]+)?\]/ig;
      bool = /:([a-z0-9\-]+)?/ig;
      id = /\#([a-z0-9\-]+)?/ig;
      cls = /\.([a-z0-9\-]+)?/ig;
      attributes = {
        attr: {},
        "class": {}
      };
      if ((_ref2 = str.match(attrs)) != null) {
        _ref2.map(function(m) {
          var r;
          r = m.split(attr);
          if (r[1] && r[2]) {
            return attributes.attr[r[1]] = r[2];
          }
        });
      }
      str = str.replace(attr, '');
      _id = str.match(id);
      if (_id) {
        attributes.attr.id = _id[0].substring(1);
      }
      if ((_ref3 = str.match(cls)) != null) {
        _ref3.map(function(m) {
          return attributes["class"][m.substring(1)] = true;
        });
      }
      if ((_ref4 = str.match(bool)) != null) {
        _ref4.map(function(m) {
          return attributes.attr[m.substring(1)] = m.substring(1);
        });
      }
      return attributes;
    };

    makeBody = function(body) {
      return function(value, i) {
        var o;
        o = new Fragment(body, [value, i]);
        return o.element;
      };
    };

    function Tag(tag, options) {
      var attributes, body, element, key, value, _ref2;
      element = document.createElement(tag);
      _ref2 = parseOptions(options), body = _ref2[0], attributes = _ref2[1];
      for (key in attributes) {
        value = attributes[key];
        if (bodyBindings[key]) {
          body = bodyBindings[key](element, makeBody(body), value);
        } else if (attributeBindings[key]) {
          attributeBindings[key](element, value, attributes);
        } else {
          console.warn("Unknown '" + key + "' listening (with value: '" + value + "'). Html attributes must be inside a {attr: {}} object.");
        }
      }
      Tag.__super__.constructor.call(this, element, body);
    }

    return Tag;

  })(Element);

  Template = function(template) {
    return function() {
      var args, o;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this.isTemplate != null) {
        o = new Element(this.element, template, args);
      } else {
        o = new Fragment(template, args);
      }
      return o.element;
    };
  };

  noir = {
    utils: _,
    bindings: {
      attributes: attributeBindings,
      body: bodyBindings
    },
    Event: EventClass,
    Observable: Observable,
    Watcher: Watcher,
    Computed: Computed,
    List: List,
    Model: Model,
    Collection: Collection,
    Template: Template
  };

  this.noir = noir;

  if (typeof define === 'function' && define.amd) {
    define('noir', [], function() {
      return noir;
    });
  }

}).call(this);
