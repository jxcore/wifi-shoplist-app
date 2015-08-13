// Copyright & License details are available under JXCORE_LICENSE file

var server = require('jxm');
server.setApplication("ShoppingList", "/", "NUBISA-STANDARD-KEY-998876-1ER4");

var fs = require('fs');
var path = require("path");
var templates = require("./templates.js");
var list = require("./table.js");
var item = require("./item.js");
var db = require("./db.js");
var sqlite = require("./sqlite.js");
var common = require("./common.js")

// this block is used when the app is accessed from external browser with jxm
// url
server.on('request', function (req, res) {

  try {
    if (req.url === "/") {
      var _index = fs.readFileSync(path.join(__dirname, "..", "index.html"))
        .toString();
      _index = _index.replace(/html\//g, "");
      _index = _index.replace(/\{\{jxmUrl\}\}/g, common.getJXMUrl());

      // removing cordova part since will not be used by external browsers
      _index = _index.replace(
        /\/\* CORDOVA \*\/([\s\S]*?)\/\* END CORDOVA \*\//, "").replace(
        /\<!-- CORDOVA --\>([\s\S]*?)\<!-- END CORDOVA --\>/,
        "<!-- replaced -->");

      res.write(_index);
      res.end(0);
      return false;
    }

  } catch (ex) {
    common.logDebug("jxm request exception", ex);
    common.logDebug("jxm request exception stack", ex.stack || null);

    res.end(ex.toString());
    return false;
  }

  return true;
});

server.linkResourcesFromPath("/", path.join(common.appDir, "html"));

server.setConfig("clientNamespace", "jxm");
server.setConfig("clientExternal", true);

// for now just to omit port conflicts with desktop running app
if (jxcore.utils.OSInfo().isMobile)
  server.setConfig("httpServerPort", 8001);

server.on("start", function () {
  process.sendToMain({
    cmd: "jxmStarted",
    // cordova client connects always by localhost
    url: "http://127.0.0.1:" + server.getConfig("httpServerPort"),
    port: server.getConfig("httpServerPort"),
    ips: common.getLocalIPs()
  });
});

server.start();

// message from the main thread
jxcore.tasks.on("message", function (tid, params) {
  if (tid < 0) {
    // common.logDebug("thread 0 received params", params);

    if (params.dbFileName)
      sqlite.SetFileName(params.dbFileName);

    if (params.cmd === 'restart') {
      process.emit('RESET');
      throw "Expected: Forcing unload of server thread for " + process.platform;
    }
    if (params.cmd === "connectionStatusChanged") {
      server.sendToAll("connectionStatusChanged", params);
    } else if (params.cmd === "dbUpdated") {
      // reloading db in thread
      db.getData(function (err) {
        server.sendToAll("srvDBUpdate", {
          clid: common.getClientId(params.env)
        });
      }, true);
    } else if (params.cmd === "dbError") {
      // common.logDebug("main.js sendDBError 1", params.err, params.env);
      server.sendToAll("srvError", {
        err: params.err,
        clid: common.getClientId(params.env)
      });
    }
  }
});

db.on("error", function (err, env) {
  process.sendToMain({
    cmd: "dbError",
    err: err,
    env: env
  });
  server.sendToAll("srvError", {
    err: err,
    clid: common.getClientId(env)
  });
});

db.on("update", function (env) {
  // common.logDebug("on update main.js", env);
  process.sendToMain({
    cmd: "dbUpdated",
    env: env
  });
  server.sendToAll("srvDBUpdate", {
    clid: common.getClientId(env)
  });
});

server.addJSMethod("srvPing", function (env, params) {
  server.sendCallBack(env, true);
});