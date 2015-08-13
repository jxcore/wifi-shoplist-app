// Copyright & License details are available under JXCORE_LICENSE file

var path = require("path");
var common = require("./common.js");
var sqlite = require("./sqlite.js");
var list = require("./table.js");
var item = require("./item.js");
var db = require("./db.js");
var http = require("http");

// this is an object send from subthread in server.on("start")
exports.globalParams = null;
exports.dbFileName = null;

if (!common.isCordova) {
  exports.dbFileName = path.join(common.appDir, "dbfile.db");
}

var fnc = function () {
  process.keepAlive();
};

exports.startJXMOnThread = function () {
  if (!fnc.kicked) {
    fnc.kicked = true;
    jxcore.tasks.runOnce(fnc);
  }

  jxcore.tasks.addTask(function (params) {
    require("./tools/common.js").isCordova = params.isCordova;
    require("./tools/main.js");
    process.sendToMain({
      cmd: "threadStarted"
    });
  }, {
    // thread cannot access "Mobile" function for now,
    // so we pass an info if it is accessible
    isCordova: common.isCordova
  });

};

var lastConnectionStatus = false;
var getConnectionStatusInterval = null;

var getConnectionStatus = function (forceSend) {
  // common.logDebug("main_cordova.js: getConnectionStatus 1", forceSend);
  Mobile.GetConnectionStatus(function (err, status) {
    if (!err) {
      // common.logDebug("main_cordova.js: getConnectionStatus 2", status,
      // forceSend);
      var str = JSON.stringify(status);
      if (lastConnectionStatus !== str || forceSend) {
        // common.logDebug("main_cordova.js: getConnectionStatus 3", status,
        // forceSend);
        var obj = {
          cmd: "connectionStatusChanged",
          status: status,
          ips: []
        };

        if (common.jxmOnThreadStarted) {
          obj.ips = exports.globalParams.ips;
        } else {
          obj.ips = ["Press the button to unlock."];
        }

        if (common.showWelcomeScreenOnFirstLaunch) {
          obj.showWelcomeScreenOnFirstLaunch = true
          common.showWelcomeScreenOnFirstLaunch = false;
        }

        Mobile("fromCordovaServer").call("connectionStatusChanged", obj);
        process.sendToThreads(obj);
        // common.logDebug("main_cordova.js: getConnectionStatus", status);
        lastConnectionStatus = str;
      }
    } else {
      common.logDebug("err getConnectionStatus", err);
    }
  });
};

exports.refreshConnectionStatus = function (forceSend) {
  getConnectionStatus(true);
  if (!getConnectionStatusInterval)
    getConnectionStatusInterval = setInterval(getConnectionStatus, 1000);
};

if (!common.isCordova)
  return;
// ***********************************

var start_getDocumentsPath = new Date();

var getDocumentsPath = function () {
  if (new Date() - start_getDocumentsPath > 10000)
    return;

  Mobile.GetDocumentsPath(function (err, location) {
    if (err) {
      setTimeout(getDocumentsPath, 100);
    } else {
      exports.dbFileName = path.join(location, "dbfile.db");
      sqlite.SetFileName(exports.dbFileName);
      if (common.threadStarted) {
        process.sendToThreads({
          dbFileName: exports.dbFileName
        });
      }

      db.getConfig(function (err, cfg) {
        if (!err) {
          if (!cfg.firstLaunchInfoDisplayed) {
            common.showWelcomeScreenOnFirstLaunch = true;
            cfg.firstLaunchInfoDisplayed = true;
            db.updateDB({
              ClientId: "cordova_client"
            });
            exports.refreshConnectionStatus(true);
          }
        }
      });
    }
  });
};

process.nextTick(getDocumentsPath);

Mobile('fromCordovaClient').registerAsync(function (methodName, params, cb) {
  if (methodName === "srvAskForConnectionStatus") {
    // common.logDebug("main_cordova.js srvAskForConnectionStatus", params);
    exports.refreshConnectionStatus(true);
    return;
  }

  if (methodName === "srvRemoteAccessToggle") {
    var enable = params === true;
    // common.logDebug("main_cordova.js srvRemoteAccessToggle", params);
    if (enable) {
      exports.startJXMOnThread();
    } else {
      unloadThread();
    }

    exports.refreshConnectionStatus(true);
    return;
  }

  var method = list.methods[methodName] || item.methods[methodName] || null;
  if (!method) {
    var str = "Method not found: " + methodName;
    // common.logDebug("fromCordovaClient:: " + str);
    if (cb)
      cb(null, str);
    return;
  }

  var _cb = function (env, params) {
    if (cb) {
      if (params.err)
        cb(null, params.err)
      else
        cb(params, params.err);
    }
  };

  var env = {
    isCordovaCall: true,
    methodName: methodName,
    cb: _cb,
    ClientId: "cordova_client"
  };
  method(env, params);
});

var unloadThread = function () {
  if (common.jxmOnThreadStarted) {
    process.sendToThreads({cmd: 'restart'});
    common.jxmOnThreadStarted = false;
    common.threadStarted = false;
    exports.globalParams = null;
    common.logDebug("Thread unloaded.");
    exports.refreshConnectionStatus(true);
  }
};

process.on('pause', function () {
  unloadThread();
});

process.on('resume', function () {
  if (process.platform != 'android')
    exports.refreshConnectionStatus(true);
});

exports.reloadDB = function (env) {
  db.getData(function (err) {
    Mobile("fromCordovaServer").call("srvDBUpdate", {
      clid: common.getClientId(env)
    });
  }, true);
};

exports.sendDBError = function (err, env) {
  Mobile("fromCordovaServer").call("srvError", {
    err: err,
    clid: common.getClientId(env)
  });
};

db.on("error", function (err, env) {
  if (common.threadStarted) {
    process.sendToThreads({
      cmd: "dbError",
      err: err,
      env: env
    });
  }
  exports.sendDBError(err, env);
});

db.on("update", function (env) {
  if (common.threadStarted) {
    process.sendToThreads({
      cmd: "dbUpdated",
      env: env
    });
  }
});
