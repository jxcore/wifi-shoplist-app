// Copyright & License details are available under JXCORE_LICENSE file

var common = require("./common.js");
var templates = require("./templates.js");
var db = require("./db.js");

var methods = {};

methods.srvShowTable = function (env, params) {
  // common.logDebug("srvShowTable 1");
  db.getData(function (err, data) {
    if (err) {
      common.logDebug("srvShowTable err", err);
      common.sendCallBack(env, {
        err: err
      });
    } else {
      var list_str = templates.getTable(data);
      common.sendCallBack(env, {
        data: data,
        html: list_str
      });
    }
  });
};

methods.srvAskForConnectionStatus = function (env, params) {
  process.sendToMain({
    cmd: "clientAsksForConnectionStatus"
  });
};

methods.srvShowListDetails = function (env, params) {
  if (common.checkParam(env, params, ["listID"]) === false)
    return;

  db.getSingleList(params.listID, function (err, dbList) {
    if (err) {
      common.sendCallBackWithError(env, err);
    } else {
      common.sendCallBack(env, {
        html: templates.getListDetails(dbList),
        dbList: dbList
      });
    }
  });
};

methods.srvAddNewList = function (env, params) {
  if (common.checkParam(env, params, ["caption"]) === false)
    return;

  db.addSingleList(env, params.caption, function (err, dbList) {
    if (err) {
      common.sendCallBack(env, {
        err: err
      });
    } else {
      common.sendCallBack(env, {
        html: templates.getListOnTable(dbList),
        dbList: dbList
      });
    }
  });
};

methods.srvRemoveFromDB = function (env, params) {
  if (common.checkParam(env, params, ["listID", "itemID"]) === false)
    return;

  if (!params.itemID) {
    db.removeSingleList(env, params.listID, function (err, cnt) {
      if (cnt === 0)
        common.sendCallBack(env, {
          no_records: templates.getTemplates().no_list_on_table
        });
      else
        common.sendCallBackWithError(env, err);
    });
  } else {
    db.removeSingleItem(env, params.listID, params.itemID, function (err, cnt) {
      if (cnt === 0) {
        common.sendCallBack(env, {
          no_records: templates.getTemplates().no_items_on_list
        });
      } else {
        common.sendCallBackWithError(env, err);
      }
    });
  }
};

methods.srvChangeListCaption = function (env, params) {
  if (!params.caption) {
    common.sendCallBack(env, {
      err: "Server received an empty caption value."
    });
    return;
  }

  db.getSingleList(params.itemID, function (err, item) {
    if (err) {
      common.sendCallBack(env, {
        err: err
      });
    } else {
      item.caption = params.caption;
      db.updateDB(env);
      common.sendCallBack(env, {});
    }
  });
};

common.addJSMethods(methods);

exports.methods = methods;