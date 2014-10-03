/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  './inspect/actors',
  './inspect/deviations'
],function(
  actors,
  deviations
) {

  return {
    actors:         actors,
    deviations:     deviations
  };

});
