/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(function() {

window.domRemoved = function(target, callback) {
  return setTimeout(function() {
    return target.addEventListener("DOMNodeRemovedFromDocument", function(e) {
      return callback(e);
    });
  }, 0);
  // the setTimeout here is needed because browsers call this event
  // when we append nodes from a document fragment (build in knockout).
  // Since most nodes are in a fragment when we bind them therefore,
  // we call the "remove" event right after binding if we don't delay
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
