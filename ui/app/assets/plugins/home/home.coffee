define [
  'commons/tpl-helpers',
  'services/sbt',
  'services/templates',
  # 'widgets/manager/open-app',
  # 'widgets/manager/new-app',
  # 'widgets/manager/logs'
], (
  helpers,
  sbtService,
  templatesService,
  # open,
  # newapp,
  # logging
)->

  addStylesheet('plugins/home/home')

  $home = noir.Template (logs, recentApps, templates)->

  logs = [1,2,3]

  render: noir.Template (scope)->
    @h1 -> "Activator"
    # @include open.render(recentApps)
    # @include newapp(templates)
    # @include logging.render(logs)
    # recentApps = templatesService.recentApps()

    # templates =
    #   list: templatesService.getAll()
    #   tags: templatesService.getTags()
