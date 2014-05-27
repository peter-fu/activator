/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
    'commons/streams',
    'services/build',
    './console/console',
    'services/connection',
    'text!./inspect.html',
    'css!./inspect.css',
    "widgets/navigation/menu"
], function(
    streams,
    build,
    Console,
    Connection,
    template
){

    var list;

    return {
        render: function() {
            var $inspect = $(template)[0];
            ko.applyBindings({}, $inspect);
            list = $("#inspect-wrapper > article",$inspect).hide();
            return $inspect;
        },
        route: function(url, breadcrumb) {
            var p = (!url.parameters || url.parameters.length == 0 || !url.parameters[0]) ? "overview" : url.parameters[0];
            list.hide().filter('.' + p).show();
        }
    }
});
