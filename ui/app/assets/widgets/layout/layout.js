define([
  'commons/tpl-helpers',
  'widgets/header/header',
  'widgets/navigation/navigation',
  'widgets/pannels/pannels',
  'widgets/modals/modals',
  './layoutManager',
  'css!./layout'
], function(
  helpers,
  header,
  navigation,
  pannels,
  modals,
  layoutManager
){

  var wrapper = $('<main id="wrapper">');
  var State = {
    navigation: navigation,
    pannels: pannels,
    layoutManager: layoutManager
  }

  return {
    render: function() {
      $(document.body).attr('data-bind',"css: {'navigation-opened': layoutManager.navigationOpened, 'navigation-sneak': navigation.sneak, 'pannel-opened': layoutManager.pannelOpened}, attr: { 'data-shape': layoutManager.pannelShape }");
      ko.applyBindings(State);

      document.body.appendChild(header);
      document.body.appendChild(navigation.render());
      document.body.appendChild(wrapper[0]);
      document.body.appendChild(pannels);
      document.body.appendChild(modals.render());
    },

    renderPlugin: function(body){
      $('#wrapper').replaceWith(body);
    }
  }
})
