// Copyright & License details are available under JXCORE_LICENSE file

var path = require("path");

// load jxm only on subthread to make main thread not occupied by it
exports.server = process.threadId === -1 ? null : require('jxm');
exports.appDir = path.join(__dirname, "..");
exports.templateID = 1;

exports.threadStarted = false;
exports.jxmOnThreadStarted = false;
exports.showWelcomeScreenOnFirstLaunch = false;
exports.isAndroid = process.platform === 'android' && process.isEmbedded;

// is it running under cordova or through desktop's console?
// works under main thread.
// under the subthread it is overwritten externally (app.js)
exports.isCordova = typeof Mobile !== "undefined";

var onlyForSubThread = function (name) {
  var mainThread = process.threadId === -1;
  if (mainThread)
    exports.logDebug("The method", name, "can be called only from subthread.");
  return mainThread;
};

exports.logDebug = function () {
  return;
  jxcore.utils.console.log.apply(null, arguments);

  if (exports.isCordova) {
    var str = "";
    for (var o = 0, len = arguments.length; o < len; o++) {
      str += JSON.stringify(arguments[o]) + " ";
    }

    process.sendToMain({
      cmd: "logDebug",
      str: "Server: " + str
    });
  }
};

exports.checkParam = function (env, param, members) {
  if (typeof members === "string")
    members = [members];

  for (var o = 0, len = members.length; o < len; o++) {
    var val = param[members[o]];
    if (val === null || val === undefined)
      return exports.sendCallBackWithError("Backend empty " + members[o]
      + " member.");
  }
  return true;
};

exports.sendCallBackWithError = function (env, err) {
  exports.sendCallBack(env, {
    err: err
  });
};

exports.sendCallBack = function (env, obj) {
  if (env.isCordovaCall) {
    env.cb(env, obj);
  } else {
    if (exports.server)
      exports.server.sendCallBack(env, obj);
    else
      exports
        .logDebug("Cannot send callback with error: server instance not found.");
  }
};

exports.getIPfromRequest = function (req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress
    || req.socket.remoteAddress || req.connection.socket.remoteAddress;
};

exports.getLocalIPs = function (justNumbers) {
  if (onlyForSubThread("getLocalIPs"))
    return;

  var os = require('os');
  var net = os.networkInterfaces();

  var arr = [];

  for (var ifc in net) {
    var addrs = net[ifc];
    for (var a in addrs) {
      if (addrs[a].family == "IPv4" && !addrs[a].internal) {
        var addr = addrs[a].address;
        if (addr.indexOf("192.168.") == 0 || addr.indexOf("10.0.") == 0) {
          arr.push(addr);
        }
      }
    }
  }

  if (arr.length == 0) {
    if (net.hasOwnProperty('en0') || net.hasOwnProperty('en1')) {
      var addrs = net['en0'] || net['en1'];
      for (var a in addrs) {
        if (addrs[a].family == "IPv4" && !addrs[a].internal) {
          var addr = addrs[a].address;
          arr.push(addr);
        }
      }
    }

    if (arr.length == 0) {
      for (var ifc in net) {
        var addrs = net[ifc];
        for (var a in addrs) {
          if (addrs[a].family == "IPv4" && !addrs[a].internal) {
            var addr = addrs[a].address;
            arr.push(addr);
          }
        }
      }
    }
  }

  var arrs = [];
  for (var i = 0; i < arr.length; i++) {
    if (justNumbers)
      arrs.push(arr[i])
    else
      arrs.push("http://" + arr[i] + ":"
      + exports.server.getConfig("httpServerPort"));
  }

  return arrs;
};

exports.getJXMUrl = function () {

  if (onlyForSubThread("getJXMUrl"))
    return;

  var ips = exports.getLocalIPs();
  if (!ips.length)
    ips.push("http://" + exports.server.getConfig("IPAddress") + ":"
    + exports.server.getConfig("httpServerPort"));
  return ips[0];
};

exports.addJSMethods = function (methods) {

  if (!exports.server)
    return;

  for (var o in methods) {
    if (methods.hasOwnProperty(o))
      exports.server.addJSMethod(o, methods[o]);
  }
};

exports.getClientId = function (env) {
  return env.ClientId.replace("@", "_");
};