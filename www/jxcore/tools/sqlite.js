// Copyright & License details are available under JXCORE_LICENSE file

var sqlite3 = require('sqlite3');

var fs = require("fs");
var common = require("./common.js");

var dbFileName = null;
var db_object = null;
var gettingDB = false;

/**
 * Opens db or creates one if it doesn't exist
 *
 * @param cb
 *          (err, db_object)
 */
var getDatabase_core = function (cb) {

  if (!cb) {
    throw "The callback is required";
    return;
  }

  if (gettingDB) {
    // try later
    setTimeout(function () {
      getDatabase_core(cb);
    }, 500);
    return;
  }

  gettingDB = true;

  var callback = function (err, obj) {
    gettingDB = false;
    cb(err, obj);
  };

  var exists = fs.existsSync(dbFileName);

  var db_object = null;

  try {
    var mode = exists ? sqlite3.OPEN_READWRITE : sqlite3.OPEN_READWRITE
    | sqlite3.OPEN_CREATE;
    db_object = new sqlite3.Database(dbFileName, mode);
  } catch (ex) {
    callback("Cannot create database file: " + ex, null);
    return;
  }

  if (exists) {
    callback(null, db_object);
    return;
  }

  if (!db_object) {
    callback("Cannot create database file.", null);
    return;
  }

  var errors = [];
  var _cb = function (err) {
    if (err)
      errors.push(err);
  };

  db_object
    .serialize(function () {
      db_object
        .run(
        "CREATE TABLE [table] ( id INT PRIMARY KEY NOT NULL UNIQUE, value TEXT );",
        _cb);
      db_object.run("INSERT INTO [table] (id, value) VALUES (1, null)", _cb);
    });

  db_object.wait(function () {
    callback(errors.length ? errors.join(" ") : null, db_object);
  });
};

var getDatabase = function (cb) {

  waitForDBFileName(function (err) {
    if (err) {
      cb(err);
      return;
    }
    getDatabase_core(cb);
  });
};

var readDB = function (cb) {

  db_object.all("SELECT * FROM [table]", function (err, rows) {
    if (err) {
      cb(err);
      return;
    }

    if (!rows || !rows.length) {
      cb("SQLITE: no results.");
      return;
    }

    var err = null;
    var str = null;
    try {
      var value = rows[0].value || "";
      str = new Buffer(value, "base64").toString();
      if (str.trim() === "")
        str = "{}";
    } catch (ex) {
      err = "SQLITE: cannot decode base64. " + ex;
    }

    cb(err, str);
  });
};

/**
 * Reads data from database.
 *
 * @param cb
 *          (err, dataString)
 */
exports.ReadDB = function (cb) {

  if (!cb) {
    throw "SQLITE: callback is required.";
  }

  if (db_object) {
    readDB(cb);
    return;
  }

  // db not opened yet
  getDatabase(function (err, db) {
    if (!err) {
      db_object = db;
      readDB(cb);
    } else {
      cb("SQLITE: " + err);
    }
  });
};

/**
 * Saves data to database.
 *
 * @param stringToSave
 * @param cb
 *          (err)
 */
exports.UpdateDB = function (stringToSave, cb) {

  var base64 = null;
  try {
    base64 = new Buffer(stringToSave).toString('base64');
  } catch (ex) {
    if (cb)
      cb("SQLITE: cannot encode base64. " + ex);
    return;
  }
  var sql = "UPDATE [table] SET value = '" + base64 + "' WHERE id = 1";

  if (db_object) {
    db_object.run(sql, cb);
    return;
  }

  // db not opened yet
  getDatabase(function (err, db) {
    if (!err) {
      db_object = db;
      db_object.run(sql, cb);
    } else {
      if (cb)
        cb("SQLITE: " + err);
    }
  });
};

// call this before calling ReadDB or UpdateDB
exports.SetFileName = function (fileName) {
  dbFileName = fileName;
};

var waiting = false;

// waiting max 10 secs, until SetFileName() will be called
var waitForDBFileName = function (cb) {
  if (dbFileName) {
    cb(false);
    return;
  }

  if (!waiting)
    waiting = new Date();
  else if (new Date() - waiting > 5000) {
    // if this error occurs, than exports.SetFileName() was not called
    cb("The database file name is unknown.");
    waiting = false;
    return;
  }

  common.logDebug("Waiting for db filename");
  setTimeout(function () {
    waitForDBFileName(cb);
  }, 500);
};