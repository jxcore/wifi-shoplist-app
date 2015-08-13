// Copyright & License details are available under JXCORE_LICENSE file

var common = require("./common.js");
var sqlite = require("./sqlite.js");
var events = require("events");
var eventEmitter = new events.EventEmitter();

exports.on = function (event, cb) {
  eventEmitter.on(event, cb);
};

var DB = null;

// returns index of DB arr
var findListIndex = function (listID) {

  if (!DB)
    return {
      err: "DB.findListIndex: DB not loaded"
    };
  if (!DB.lists)
    return {
      err: "DB.findListIndex: DB.lists not loaded"
    };
  for (var o = 0, len = DB.lists.length; o < len; o++) {
    if (DB.lists[o].id === listID)
      return o;
  }
  return {
    err: "findListIndex: listID not found (" + listID + ")"
  };
};

var findItemIndex = function (dbList, itemID) {
  if (!dbList)
    return {
      err: "findItemIndex : dbList is empty"
    };
  if (!dbList.items)
    return {
      err: "findItemIndex : dbList.items is empty"
    };
  for (var o = 0, len = dbList.items.length; o < len; o++) {
    if (dbList.items[o].id === itemID)
      return o;
  }
  return {
    err: "findItemIndex: itemID not found (" + itemID + ")"
  };
};

exports.findItemIndex = findItemIndex;

var getNextID = function (cb) {

  exports.getData(function (err, data) {
    if (err) {
      cb(err);
      return;
    }

    if (!DB.config)
      DB.config = {};
    if (!DB.config.nextID)
      DB.config.nextID = 1;

    cb(false, DB.config.nextID);
    DB.config.nextID++;
  });
};

exports.createNewList = function (caption, cb) {

  // common.logDebug("createNewList 1", caption);
  getNextID(function (err, id) {

    if (err) {
      cb(err);
      return;
    }

    var dbList = {
      caption: caption || ("New List " + id),
      dateCreated: new Date(),
      dateModified: new Date(),
      nextItemID: 1,
      state: null,
      items: [],
      id: "list" + id
    };

    cb(false, dbList);
  });

  // fake data
  // var item = exports.createNewItem("Watermelon");
  // item.state = null;
  // item.id = "item" + dbList.nextItemID++;
  // delete item.isNew;
  // dbList.items.push(item);

  // var item = exports.createNewItem("Garlic");
  // item.state = 0;
  // item.id = "item" + dbList.nextItemID++;
  // delete item.isNew;
  // dbList.items.push(item);

  // var item = exports.createNewItem("Onion");
  // item.state = 1;
  // item.id = "item" + dbList.nextItemID++;
  // delete item.isNew;
  // dbList.items.push(item);
};

exports.createNewItem = function (caption) {

  // common.logDebug("createNewItem 1", caption);
  var item = {
    caption: caption || "",
    dateCreated: new Date(),
    dateModified: new Date(),
    state: null,
    amount: 1,
    amount_type: "pieces",
    notes: "",
    id: -1,
    isNew: true
  };
  return item;
};

exports.addNewItem = function (env, dbList, newDbItem) {

  newDbItem.id = "item" + dbList.nextItemID++;
  delete newDbItem.isNew;
  dbList.items.push(newDbItem);

  updateDB(env);
};

exports.updateItem = function (env, dbList, newDbItem) {

  var index = findItemIndex(dbList, newDbItem.id);
  if (index.err)
    return index;

  var dbItem = dbList.items[index];

  // just few fields can be updated from the form
  dbItem.caption = newDbItem.caption;
  dbItem.amount = newDbItem.amount;
  dbItem.amount_type = newDbItem.amount_type;
  dbItem.notes = newDbItem.notes;

  dbItem.dateModified = new Date();

  updateDB(env);
  return true;
};

exports.getData = function (cb, force) {

  if (DB && !force) {
    // common.logDebug("Cached DB", JSON.stringify(DB, null, 4));
    cb(false, DB.lists);
    return;
  }

  // fake data
  // var i = exports.createNewList("Tools to buy");
  // DB.lists.push(i);

  // var i = exports.createNewList("For Tom");
  // DB.lists.push(i);

  // var i = exports.createNewList("Suzan's birthday");
  // DB.lists.push(i);

  // cb(false, DB);
  sqlite.ReadDB(function (err, str) {
    if (!err) {
      DB = JSON.parse(str);

      if (!DB.lists)
        DB.lists = [];
      // common.logDebug("Read DB", JSON.stringify(DB, null, 4));
      cb(false, DB.lists);
    } else {
      cb(err);
    }
  });
};

// reads from DB an item with provided iD
exports.getSingleList = function (listID, cb) {
  if (!listID) {
    cb("DB: Invalid listID: " + listID);
    return;
  }

  exports.getData(function (err, data) {
    if (err) {
      cb(err);
      return;
    }

    var index = findListIndex(listID);
    if (index.err) {
      cb("Cannot fetch single list. " + index.err);
      return;
    }

    cb(false, data[index], index);
  });
};

exports.addSingleList = function (env, caption, cb) {
  exports.getData(function (err, data) {
    if (err) {
      cb(err);
      return;
    }

    exports.createNewList(caption, function (err, item) {
      if (err) {
        cb(err);
        return;
      }

      data.push(item);
      updateDB(env);
      cb(false, item);
    });
  });
};

exports.removeSingleList = function (env, listID, cb) {

  exports.getSingleList(listID, function (err, dbList, index) {
    if (err) {
      cb(err);
      return;
    }

    DB.lists.splice(index, 1);
    updateDB(env);
    cb(false, DB.lists.length);
  });
};

exports.removeSingleItem = function (env, listID, itemID, cb) {

  exports.getSingleList(listID, function (err, dbList) {
    if (err) {
      cb(err);
      return;
    }

    var index = findItemIndex(dbList, itemID);
    if (index.err) {
      cb("Cannot remove the item. " + index.err);
      return;
    }

    dbList.items.splice(index, 1);
    updateDB(env);
    cb(false, dbList.items.length);
  });
};

var updateDB = function (env) {
  sqlite.UpdateDB(JSON.stringify(DB), function (err) {
    if (env) {
      if (err)
        eventEmitter.emit("error", "Database could not be saved! " + err, env);
      else
        eventEmitter.emit("update", env);
    }
  });
};

exports.updateDB = updateDB;


exports.getConfig = function (cb) {

  exports.getData(function (err, data) {
    if (err) {
      cb(err);
      return;
    }

    if (!DB.config)
      DB.config = {};

    cb(false, DB.config);
  });
};
