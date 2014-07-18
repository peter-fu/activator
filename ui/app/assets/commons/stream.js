define(function() {

  function noop() {}
  var methods = ['push','fail','clone','fork','async','each','map','filter','eachVal','mapVal','filterVal'];

  function EventStream() {
    this.callbacks = [];
    for (i in methods) {
      this[methods[i]] = this[methods[i]].bind(this);
    }
  }

  // EventStream execution makes the actual runtime way faster
  function EventStreamExecution(callbacks) {
    return function(value) {
      if (callbacks.length > 1) {
        callbacks[0].call(this, value, EventStreamExecution(callbacks.slice(1)));
      } else {
        callbacks[0].call(this, value, noop);
      }
    }
  }

  EventStream.prototype.push = function(value) {
    // try {
      EventStreamExecution(this.callbacks)(value);
    // } catch (e){
    //   if (this.onFail) this.onFail(e);
    //   else throw("Strem Error:"+e)
    // }
    return this;
  }

  EventStream.prototype.fail = function(callback) {
    this.onFail = callback;
  }

  EventStream.prototype.clone = function(value) {
    return new EventStream(this.callbacks.slice(0));
  }

  EventStream.prototype.fork = function() {
    var forked = new EventStream();
    var _call = function(value, next) {
      forked.push(value);
      next(value);
    }
    this.callbacks.push(_call);
    return forked;
  }

  EventStream.prototype.log = function(callback) {
    return this.each(function(e) {
      console.log(e);
    });
  }

  // ----------------------------
  // Manage the FLOW of functions
  // ----------------------------
  EventStream.prototype.async = function(a) {
    var _call = a instanceof Array ? a : [].slice.call(arguments);
    this.callbacks.push(_call);
    return this;
  }

  // -------------------------
  // Manage the FLOW of values
  // -------------------------
  EventStream.prototype.each = function(process) {
    var _call = function(value, next) {
      process(value);
      next(value);
    }
    this.callbacks.push(_call);
    return this;
  }

  EventStream.prototype.map = function(process) {
    var _call = function(value, next) {
      next(process(value));
    }
    this.callbacks.push(_call);
    return this;
  }

  EventStream.prototype.filter = function(process) {
    var _call = function(value, next) {
      if (process(value)) next(value);
    }
    this.callbacks.push(_call);
    return this;
  }

  EventStream.prototype.filterNot = function(process) {
    var _call = function(value, next) {
      if (!process(value)) next(value);
    }
    this.callbacks.push(_call);
    return this;
  }

  EventStream.prototype.eachVal = function(process) {
    var _call = function(value, next) {
      value.forEach(process);
      next(value);
    }
    this.callbacks.push(_call);
    return this;
  }

  EventStream.prototype.mapVal = function(process) {
    var _call = function(value, next) {
      next(value.map(process));
    }
    this.callbacks.push(_call);
    return this;
  }

  EventStream.prototype.filterVal = function(process) {
    var _call = function(value, next) {
      next(value.filter(process));
    }
    this.callbacks.push(_call);
    return this;
  }

  return function() {
    return new EventStream()
  }

});
