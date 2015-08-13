// Copyright & License details are available under JXCORE_LICENSE file

var SL = null; // global for all browser's scripts

var jx = jx || {};
jx.utils = {
  jxmloaded: false,
  isAndroid: navigator.userAgent.indexOf("Android") > 0
};

jx.utils.$findOne = function (sid) {
  var ret = $("#" + sid);
  var err = ret.length !== 1;
  if (!ret.length) {
    jx.dialogs.alertError("Cannot find object " + sid);
    return false;
  }
  if (ret.length > 1) {
    jx.dialogs.alertError("Multiple objects with the same ID: " + sid);
    return false;
  }
  return ret;
};

jx.utils.checkParam = function (param, members) {
  if (typeof members === "string")
    members = [members];

  for (var o = 0, len = members.length; o < len; o++) {
    var val = param[members[o]];
    if (val === null || val === undefined) {
      jx.dialogs.alertError("Frontend empty " + members[o] + " member.");
      return false;
    }
  }
  return true;
};

jx.utils.sendToServer = function (methodName, params, cbSuccess) {
  var _cb = function (param, err) {
    if (err) {
      jx.dialogs.addCriticalError("Error no " + err
      + " occurred on the server side.");
    } else if (param.err) {
      jx.dialogs.addCriticalError(param.err);
    } else {
      cbSuccess(param);
    }
  };

  if (window.jxUsesCordova) {
    jxcore("fromCordovaClient").call(methodName, params, function (param, err) {
      _cb(param, err)
    });
    return;
  }

  jxm.call(methodName, params, function (param, err) {
    _cb(param, err);
  });
};

jx.utils.loadjxm = function (params, cb) {
  if (jx.utils.jxmloaded) {
    window.jxm.ReConnect();
    if (cb)
      cb();
    return;
  }

  if (!params || !params.url || params.url.toString().slice(0, 2) === '{{') {
    jx.dialogs.addCriticalError("Unknown JXM URL: "
    + (params ? params.url : null));
    return;
  }

  var bdy = document.getElementsByTagName("body");
  if (!bdy[0]) {
    jx.dialogs.addCriticalError("Html BODY not found!");
    return;
  }

  if (bdy.length > 1) {
    jx.dialogs.addCriticalError("Multiple Html BODY found!");
    return;
  }

  jx.utils.registerClientMethods();

  document.onjxready = function () {
    jx.dialogs.logDebug("on jx ready");
    jxm.Start(function (status) {
      jx.dialogs.lostConnection.hide();
      jx.dialogs.logDebug("jxm started");

      jx.utils.initApp();

      if (!window.jxUsesCordova)
        jx.utils.startPinging();

      jx.utils.jxmloaded = true;
      if (cb)
        cb();
    });
  };

  var _script = document.createElement("script");
  _script.type = "text/javascript";
  _script.src = params.url + "/jx?ms=connect";
  jx.utils.jxmUrl = params.url;

  jx.dialogs.logDebug("_script.src: " + _script.src);
  bdy[0].appendChild(_script);
};

jx.utils.initApp = function () {
  if (!window.SL) {
    jx.dialogs.logDebug("initApp");
    window.SL = new ShoppingList();
    window.SL.showTable();
    window.SL.askForConnectionStatus();

    jx.utils.networkEnabled = false;
  }

  $("#content").removeClass("hidden");
};

jx.utils.registerClientMethods = function () {
  window.srvError = function (params) {
    var pclid = params.clid.toString().trim();
    var jclid = window.jxUsesCordova ? "cordova_client" : jxm.clid.toString()
      .trim().replace("@", "_");
    if (pclid === jclid) {
      jx.dialogs.addCriticalError("Server error: " + params.err);
    }
  };

  window.connectionStatusChanged = function (params) {
    if (!window.jxUsesCordova)
      return;

    jx.dialogs.logDebug("client connectionStatusChanged " + params);
    var strIPS = params.ips[0];
    if (params.ips.length >= 2) {
      params.ips = params.ips.slice(0, 2);
      strIPS = params.ips.join(" or ");
    }

    var s = "";

    if (!params.status.WiFi) {
      s += '<span class="txt-color-orange">Remote access requires WiFi is enabled.</span>';
    } else {
      s += jx.utils.getRemoteAccessLockStatus().div;
      s += '<span class="txt-color-yellow">Remote Access:<br/>' + strIPS
      + '</span>';
    }

    $("#footer-caption").html(
      s.replace(new RegExp("WiFi", "g"), "<strong>WiFi</strong>"));

    if (params.showWelcomeScreenOnFirstLaunch)
      jx.dialogs.info();
  };

  window.srvDBUpdate = function (params) {
    var pclid = params.clid.toString().trim();
    var jclid = window.jxUsesCordova ? "cordova_client" : jxm.clid.toString()
      .trim().replace("@", "_");
    if (pclid !== jclid) {
      window.SL.reload();
    }
  };
};

jx.utils.getRemoteAccessLockStatus = function () {
  var s = "";
  if (window.jxUsesCordova) {

    if (!jx.utils.networkEnabled) {
      var icon = '<i class="fa fa-lock fa-lg"></i>';
    } else {
      var icon = '<i class="fa fa-unlock fa-lg"></i>';
    }

    setTimeout(function () {
      document.getElementById('btn_c_toggle').style.display = "";
    }, jx.utils.networkEnabled ? 5000 : 1500);

    s = '<div id="btn_c_toggle" style="display:none;" class="btn-header pull-right margin-right-5">'
    + '  <span>'
    + '    <a style="font-size:10pt" id="networkToggle" title="Network" href="javascript:jx.utils.toggleNetwork()">'
    + '      ' + icon + '    </a>' + '  </span>' + '</div>';
  }
  return {
    div: s,
    icon: icon
  };
};

jx.utils.toggleNetwork = function () {
  var obj = document.getElementById('networkToggle');

  jx.utils.networkEnabled = !jx.utils.networkEnabled;
  $("#networkToggle").html(jx.utils.getRemoteAccessLockStatus().icon);

  jx.utils.sendToServer("srvRemoteAccessToggle", jx.utils.networkEnabled);
};

jx.utils.startPinging = function () {
  jx.utils.received = false;
  jx.utils.sendToServer("srvPing", null, function (param, err) {
    jx.utils.received = true;
  });

  jx.utils.check_interval = setTimeout(function () {
    if (!jx.utils.received) {
      jx.dialogs.lostConnection.show();
      jx.utils.needReload = true;
    } else {
      setTimeout(jx.utils.startPinging, 1000);
    }
  }, 3000);
};
