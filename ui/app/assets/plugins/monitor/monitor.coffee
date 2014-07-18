define [
  "core/plugins",
  # "services/sbt",
  "widgets/layout/layout",
  "widgets/intro/intro",
  "widgets/menu/menu",
  "css!widgets/buttons/button"
], (
  plugins,
  # sbtService,
  $layout,
  $intro,
  $menu,
  $button
)->

  addStylesheet('plugins/versioning/versioning')

  #TODO
  versioning =
    commits: 
      title: "Commits"
    branches: 
      title: "Branches"
    tags: 
      title: "Tags"
    releases:
      title: "Releases"

  page = ko.observable()

  $inspect = noir.Template (page)->

    @nav '.menu',->
      @header ->
        @h1 -> "Versioning"
      @a ".button.doCommit", href: "#versioning/commit", -> "Commit"
      @ul ".list.links", forEach:versioning, (doc, id)->
        @li "."+id, ->
          @a href: "#versioning/"+id, -> doc.title

    @unless page, ->
      @include $intro, ->
        @div ".description", ->
          @h1 -> "Keep eveything toghether"
          @p -> "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vitae lorem at neque mollis viverra eu eu tortor. Vivamus at viverra risus. Quisque scelerisque felis purus, a tempor elit vulputate tempor. Sed pharetra condimentum elementum. Aliquam lobortis, metus ut luctus commodo, neque justo cursus diam, eu semper augue dui a erat. Praesent eget augue dignissim, aliquet erat lobortis, feugiat dui."

    @only page, (p)->
      @article ".page", ->
        @header ->
          @h1 -> "versioning page"
        @section ".typo", ->
          @p -> "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vitae lorem at neque mollis viverra eu eu tortor. Vivamus at viverra risus. Quisque scelerisque felis purus, a tempor elit vulputate tempor. Sed pharetra condimentum elementum. Aliquam lobortis, metus ut luctus commodo, neque justo cursus diam, eu semper augue dui a erat. Praesent eget augue dignissim, aliquet erat lobortis, feugiat dui."

  self = plugins.make
    layout: (url)->
      $layout.renderPlugin "versioning", ->
        @include $inspect page

    route: (url, breadcrumb)->
      all = [
        ['versioning/', "Versioning"]
      ]
      switch url.parameters[0]
        when ""
          breadcrumb(all)
        else
          breadcrumb(all)
