define [
  "widgets/layout/layout",
  "widgets/intro/intro",
  "widgets/menu/menu",
  "widgets/modules/modules"
], (
  $layout,
  $intro,
  $menu,
  $modules
)->

  addStylesheet('plugins/documentation/documentation')

  (sections, page, openDir)->
    $layout.renderPlugin "documentation", noir.Template ->

      @include $menu.render 
        title: "Documentation"
        nav: ->
          @dl dropdown: false, ->
            @dt -> "APIs"
            @dd ->
              @a -> "Scala"
              @a -> "Akka (scala)"
              @a -> "Akka (java)"
              @a -> "Play (scala)"
              @a -> "Play (java)"
        body: ->
          @ul ".list.links", forEach: sections, (doc, id)->
            if doc.isSection
              @li ".section."+id, ->
                @a click: openDir(doc,id), -> doc.title
            else
              @li ->
                if doc.isDir
                  @a click: openDir(doc,id), -> doc.title
                else
                  @a href: "#documentation/"+id, -> doc.title

      @unless page, ->
        @include $intro, ->
          @div ".description", ->
            @h1 -> "Welcome to the documentation"
            @p -> "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vitae lorem at neque mollis viverra eu eu tortor. Vivamus at viverra risus. Quisque scelerisque felis purus, a tempor elit vulputate tempor. Sed pharetra condimentum elementum. Aliquam lobortis, metus ut luctus commodo, neque justo cursus diam, eu semper augue dui a erat. Praesent eget augue dignissim, aliquet erat lobortis, feugiat dui."

      @only page, (p)->
        @include $modules.pluginMain
          title: p.title
          body: ->
            @div ".typo.page", html: p.page
