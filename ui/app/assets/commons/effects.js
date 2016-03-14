/*
 Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
$("body").on("click", "dl.dropdown:not(.dropdownNoEvent)",function(e){
  $(this).toggleClass("active");
});
