define(function() {

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

})
