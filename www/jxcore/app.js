// Copyright & License details are available under JXCORE_LICENSE file

var common = require("./tools/common.js");
var main_cordova = require("./tools/main_cordova.js");

jxcore.tasks.on("message", function(tid, params) {
  if (params.cmd === "threadStarted") {
    common.threadStarted = true;
    process.sendToThreads({dbFileName: main_cordova.dbFileName});
    return;
  } 

  if (params.cmd === "jxmStarted") {
    main_cordova.globalParams = params;
    common.jxmOnThreadStarted = true;
    if (common.isCordova) {
      Mobile("loadJXM").call({ url : params.url });
      main_cordova.refreshConnectionStatus(true);
    }
    return;
  }

  if (params.cmd === "clientAsksForConnectionStatus") {
    if (!common.isCordova)
      process.sendToThreads({status: {WiFi: 1}, ips: ["Reading IPS not available for non-cordova app."]});
    else
      main_cordova.refreshConnectionStatus(true);

    return;
  }

  if (params.cmd === "logDebug" && common.isCordova) {
    Mobile('log').call(params.str);
    return;
  }

  if (params.cmd === "dbUpdated" && common.isCordova) {
    main_cordova.reloadDB(params.env);
    return;
  }

  if (params.cmd === "dbError" && common.isCordova) {
    main_cordova.sendDBError(params.err, params.env);
    return;
  }
});

if (!common.isCordova)
  main_cordova.startJXMOnThread();
else {
  var isAndroid = process.platform === 'android';
  Mobile('isAndroid').registerSync(function(){
    return isAndroid;
  });
}