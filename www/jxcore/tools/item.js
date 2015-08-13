// Copyright & License details are available under JXCORE_LICENSE file

var common = require("./common.js");
var templates = require("./templates.js");
var db = require("./db.js");

var item_states = [{
  name: "empty",
  color: null,
  icon: "",
  id: 0
}, {
  name: "ok",
  color: "txt-color-green",
  icon: "fa-check",
  id: 1
}, {
  name: "cancel",
  color: "txt-color-red",
  icon: "fa-minus",
  id: 2
}];

var amount_type_dict = [{
  short: "pcs",
  long: "pieces"
}, {
  short: "gr",
  long: "grams"
}, {
  short: "kg",
  long: "kilograms"
}, {
  short: "oz",
  long: "ounces"
}, {
  short: "lbs",
  long: "pounds"
}, {
  short: "lt",
  long: "liters"
}, {
  short: "mL",
  long: "milliliters"
}, {
  short: "cL",
  long: "centiliters"
}, {
  short: "pkg",
  long: "packages"
}];

var findState = function (id) {
  for (var o = 0, len = item_states.length; o < len; o++) {
    if (item_states[o].id === id) {
      item_states[o].id = o;
      return item_states[o];
    }
  }
  // empty
  return item_states[0];
};

var methods = {};

methods.srvShowItemDetails = function (env, params) {
  // common.logDebug("srvShowItemDetails 1", env, params);
  if (common.checkParam(env, params, ["listID", "itemID"]) === false)
    return;

  db.getSingleList(params.listID, function (err, dbList) {
    if (err) {
      common.sendCallBack(env, {
        err: err
      });
    } else {
      // common.logDebug("srvShowItemDetails 2", dbList);

      var dbItem = null;
      if (params.itemID === -1)
        dbItem = db.createNewItem("");
      else {
        var index = db.findItemIndex(dbList, params.itemID);
        // common.logDebug("srvShowItemDetails 2 index", index);
        if (index.err) {
          common.sendCallBack(env, {
            err: index.err
          });
          return;
        }
        dbItem = dbList.items[index];
      }

      var html = templates.getItemDetails(dbList, dbItem);
      common.sendCallBack(env, {
        err: err,
        dbItem: dbItem,
        html: html
      });
    }
  });
};

methods.srvToggleItemState = function (env, params) {
  db.getSingleList(params.listID, function (err, dbList) {
    if (err) {
      common.sendCallBack(env, {
        err: err
      });
    } else {

      // common.logDebug("srvShowItemDetails 2", dbList);

      var dbItem = null;
      for (var o = 0, len = dbList.items.length; o < len; o++) {
        if (dbList.items[o].id === params.itemID) {
          dbItem = dbList.items[o];
          break;
        }
      }

      if (!dbItem)
        return common.sendCallBack(env, {
          err: "Cannot find item with the following id: " + params.itemID
        });

      //common.logDebug("dbitem", dbItem);

      var stateObj = findState(dbItem.state);
      var nextID = stateObj.id + 1;
      if (nextID >= item_states.length)
        nextID = 1; // skip empty when toggling. go to 1 (not 0)
      stateObj = item_states[nextID];

      // common.logDebug("dbitem new state", stateObj.name, stateObj.id);

      dbItem.state = stateObj.id;
      db.updateDB(env);

      common.sendCallBack(env, {
        html: exports.getItemStateHTML(dbItem),
        state: stateObj.id
      });
    }
  });

};

exports.getItemStateHTML = function (dbItem) {
  var stateObj = findState(dbItem.state);
  var icon = stateObj.icon ? stateObj.icon + " " : "fa-minus ";
  var color = stateObj.color || "txt-color-red";

  return '<i class="fa ' + icon + 'fa-lg ' + color + '"></i>';
};

exports.getItemAmountTypeHTML = function (dbItem) {

  var arr = [];
  for (var a = 0, len = amount_type_dict.length; a < len; a++) {
    var pair = amount_type_dict[a];
    var selected = dbItem.amount_type === pair.short
      || dbItem.amount_type === pair.long;
    arr.push('<option value="' + pair.short + '"'
    + (selected ? "selected" : "") + '>' + pair.long + '</option>');
  }
  return arr.join("\n");
};

methods.srvSaveItem = function (env, params) {
  // common.logDebug("srvSaveItem 1", env, params);
  if (common.checkParam(env, params, ["listID", "item"]) === false)
    return;

  db.getSingleList(params.listID, function (err, dbList) {
    if (err) {
      common.sendCallBack(env, {
        err: err
      });
    } else {
      var dbItem = null
      if (params.item.isNew) {
        dbItem = db.createNewItem(params.item.caption);
        for (var o in dbItem) {
          if (dbItem.hasOwnProperty(o))
            dbItem[o] = params.item[o];
        }
        db.addNewItem(env, dbList, dbItem);
        common.sendCallBack(env, {});
      } else {
        var ret = db.updateItem(env, dbList, params.item);
        common.sendCallBack(env, {
          err: ret.err || null
        });
      }
    }
  });
};

common.addJSMethods(methods);
exports.methods = methods;