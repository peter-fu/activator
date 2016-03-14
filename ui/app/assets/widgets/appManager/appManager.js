/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
define([
  'services/sbt',
  'text!./appManager.html',
  'css!./appManager'
],function(
  sbt,
  tpl
){

  return ko.bindhtml(tpl, {
    trp: sbt.tasks.reactivePlatform.platformRelease
  });

});
