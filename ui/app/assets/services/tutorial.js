/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define(function() {

  var metaData =      ko.observable(),
      pages =         ko.observableArray([]),
      table =         ko.observableArray([]),
      hasTutorial =   ko.observable(false),
      page =          ko.observable(null),
      index =         ko.observable(null);

    // NOTE:
    // Enclosing the state in the service, to use it in both Plugin and Panel

    var gotoPage = function(id){
      window.location.hash = "#tutorial/"+id
    }
    var gotoPrevPage = function(){
      if(!noPrevPage()) gotoPage(index()-1);
    }
    var gotoNextPage = function(){
      if(!noNextPage()) gotoPage(index()!=null?index()+1:0);
    }
    var noPrevPage  = ko.computed(function(){
      return index() == 0;
    });
    var noNextPage  = ko.computed(function(){
      return index() == table().length-1;
    });

  // TODO = provide JSON route, for meta-datas
  $.get("tutorial/index.html", function(data){
    metaData({
      "metaData": {
        "name": "Tutorial Name",
        "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vitae lorem at neque mollis viverra eu eu tortor. Vivamus at viverra risus. Quisque scelerisque felis purus, a tempor elit vulputate tempor. Sed pharetra condimentum elementum. Aliquam lobortis, metus ut luctus commodo, neque justo cursus diam, eu semper augue dui a erat. Praesent eget augue dignissim, aliquet erat lobortis, feugiat dui.",
        "source": "http://github.com/johndoe/activator-akka-spray",
        "author": {
          "name": "John Does",
          "twitter": "johndoe"
        },
        "partner": {
          "url": "http://partner.com",
          "logo": "http://dommkopfq6m1m.cloudfront.net/assets/1387589794721/images/partners/svcs/chariot.png",
          "summary": "Maecenas lorem arcu, tristique ut accumsan ac, ultricies non nulla. Pellentesque adipiscing venenatis risus at faucibus. In vehicula fermentum enim et placerat."
        }
      }
    });
  });

  $.get("tutorial/index.html", function(data){
    hasTutorial(true);
    // parseHTML dumps the <html> <head> and <body> tags
    // so we'll get a list with <title> some <div> and some text nodes
    var htmlNodes = $.parseHTML(data),
        _pages = [],
        _table = [];
    $(htmlNodes).filter("div").each(function(i,el){
      $("a", el).each(function(j, link) {
        // Open external links in new window.
        if (link.getAttribute('href').indexOf("http://") == 0 && !link.target){
          link.target = "_blank";
        // Force shorcut class on links to code
        } else if (link.getAttribute('href').indexOf("#code/") == 0){
          $(link).addClass("shorcut");
        }
      });
      var title = $("h2", el).remove().html() || $(el).text().substring(0,40) + "...";
      _pages.push({ index: i, title: title, page: el.innerHTML });
      _table.push(title);
    });
    pages(_pages);
    table(_table);
  });

  return {
    hasTutorial:  hasTutorial,
    metaData:     metaData,
    table:        table,
    pages:        pages,
    page:         page,
    index:        index,
    gotoPrevPage: gotoPrevPage,
    gotoNextPage: gotoNextPage,
    noPrevPage:   noPrevPage,
    noNextPage:   noNextPage
  }

});
