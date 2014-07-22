define([
  'commons/websocket',
  './app'
], function(
  websocket,
  app
) {

  var logs = ko.observableArray([]);
  var stdout = ko.observableArray([]);

  // TODO we should move both the ANSI stripping and the heuristic
  // parseLogLevel to the server side. We could also use
  // Djline.terminal=jline.UnsupportedTerminal when we launch
  // sbt on the server to avoid stripping ansi codes.
  var ansiCodeString = "\\033\\[[0-9;]+m";
  // if we wanted to be cute we'd convert these to HTML tags perhaps
  var ansiCodeRegex = new RegExp(ansiCodeString, "g");
  function stripAnsiCodes(s) {
    return s.replace(ansiCodeRegex, "");
  }

  var logLevelWithCodesRegex = new RegExp("^" + ansiCodeString + "\[" +
      ansiCodeString + "(debug|info|warn|error|success)" +
      ansiCodeString + "\] (.*)");
  var logLevelRegex = new RegExp("^\[(debug|info|warn|error|success)\] (.*)");
  function parseLogLevel(level, message) {
    if (level == 'stdout' || level == 'stderr') {
      var m = logLevelWithCodesRegex.exec(message);
      if (m !== null) {
        return { level: m[1], message: m[2] };
      }
      m = logLevelRegex.exec(message);
      if (m !== null) {
        return { level: m[1], message: m[2] };
      }
    }
    return { level: level, message: message };
  };

  // escapeHtml and entityMap from mustache.js MIT License
  // Copyright (c) 2010 Jan Lehnardt
  var entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': '&quot;',
      "'": '&#39;',
      "/": '&#x2F;'
  };
  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }
  function unix(filename) {
    return filename.replace(/[\\]/g, '/');
  }
  function stripTrailing(filename) {
    if (filename.length > 0 && filename[filename.length - 1] == '/')
      return filename.substring(0, filename.length - 1);
    else
      return filename;
  }
  function startsWith(prefix, s) {
    return (prefix.length <= s.length &&
        s.substring(0, prefix.length) == prefix);
  }
  function relativizeFile(file) {
    file = unix(file);
    if ('serverAppModel' in window && 'location' in window.serverAppModel) {
      var root = stripTrailing(unix(window.serverAppModel.location));
      if (startsWith(root, file))
        return file.substring(root.length);
      else
        return file;
    } else {
      return file;
    }
  }

  // Websocket Handlers
  websocket
    .subscribe({ type: 'sbt', subType: 'LogEvent' })
    // Filter debug on demand
    .filter(function(m) {
      return !((m.event.entry.level == "debug" || m.event.entry.type == "stdout") && !(app.settings.showLogDebug() || debug))
    })
    .each(function(message){
      logs.push(message);
      if(logs().length > (app.settings.showLogDebug()?1000:250)) {
        logs.splice(0,100);
      }
    });

  websocket
    .subscribe({ type: 'sbt', subType: 'LogEvent', event: { entry: { message: String, type: "stdout" } } })
    .each(function(message){
      stdout.push(message);
      if(stdout().length > 500) {
        stdout.splice(0,100);
      }
    });

  return {
    logs: logs,
    stdout: stdout
  }

});
