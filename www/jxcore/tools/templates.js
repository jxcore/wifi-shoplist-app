// Copyright & License details are available under JXCORE_LICENSE file

var fs = require('fs');
var path = require('path');
var common = require("./common.js");
var db = require("./db.js");
var item = require("./item.js");
var useCache = true;

var cache = {};

var getTemplateDir = function (templateID) {
  return path.join(common.appDir, "html/templates", templateID + "");
};

// verifies if all {{...}} tags has been replaced
var checkTags = function (str, sid) {
  var leftovers = [];
  var left = str.match(/\{\{.+\}\}/g);
  for (var a in left) {
    if (leftovers.indexOf(left[a]) === -1) {
      str = str.replace(new RegExp(left[a], "g"), "");
      leftovers.push(left[a]);
    }
  }
  if (leftovers.length)
    common.logDebug("Unsolved tags for", sid, leftovers);

  return str;
};

exports.getTemplates = function (templateID) {
  if (!templateID)
    templateID = 1;

  if (useCache && cache[templateID])
    return cache[templateID];

  var ret = {};

  var parts = {
    table: true,
    list_on_table: true,
    list_details: true,
    item_on_list: true,
    item_details: true,
    no_list_on_table: true,
    no_items_on_list: true
  };

  var dir = getTemplateDir(templateID);

  for (var a in parts) {
    if (!parts.hasOwnProperty(a))
      continue;
    var fname = path.join(dir, a + ".html");
    if (fs.existsSync(fname))
      ret[a] = fs.readFileSync(fname).toString();
  }

  if (useCache)
    cache[templateID] = ret;

  return ret;
};

// based on dbLists returns a complete table of list's template together with
// list_on_table per each list
exports.getTable = function (dbLists, templateID) {
  // common.logDebug("getTable, dbLists", JSON.stringify(dbLists, null, 4));
  var tmpl = exports.getTemplates(templateID);

  var html = "";
  for (var o in dbLists) {
    if (dbLists.hasOwnProperty(o)) {
      html += exports.getListOnTable(dbLists[o], templateID);
    }
  }
  // common.logDebug(html, "red");
  html = checkTags(html, "getTable(" + templateID + ")");
  if (!html)
    html = tmpl.no_list_on_table;

  return tmpl.table.replace("{{lists}}", html);
};

exports.getListOnTable = function (dbItem, templateID) {
  var tmpl = exports.getTemplates(templateID);

  var s = tmpl.list_on_table;
  s = s.replace(/\{\{listID\}\}/g, dbItem.id);

  var cnt = 0;
  for (var a in dbItem) {
    if (!dbItem.hasOwnProperty(a))
      continue;

    s = s.replace(new RegExp("{{list-" + a + "}}", "g"), dbItem[a]);
    cnt++;
  }

  return checkTags(s, "getListOnTable()");
};

// based on dbItem returns a complete list_details template together with
// entries_on_list
exports.getListDetails = function (dbList, templateID) {
  var tmpl = exports.getTemplates(templateID);
  var entries_html = "";

  for (var a in dbList.items) {
    if (!dbList.items.hasOwnProperty(a))
      continue;

    var dbItem = dbList.items[a];
    var s = tmpl.item_on_list;
    s = s.replace(/\{\{itemID\}\}/g, dbItem.id);
    s = s.replace(/\{\{item-state-html\}\}/g, item.getItemStateHTML(dbItem));

    for (var o in dbItem) {
      if (!dbItem.hasOwnProperty(o))
        continue;

      s = s.replace(new RegExp("{{item-" + o + "}}", "g"), dbItem[o]);
    }

    entries_html += s;
  }

  if (!dbList.items.length)
    entries_html = tmpl.no_items_on_list;

  var list = tmpl.list_details.replace("{{items}}", entries_html).replace(
    /\{\{listID\}\}/g, dbList.id);

  return checkTags(list, "getListDetails(" + templateID + ")");
  ;
};

exports.getItemDetails = function (dbList, dbItem, templateID) {

  var tmpl = exports.getTemplates(templateID);
  var item_html = tmpl.item_details;

  item_html = item_html.replace(/\{\{itemID\}\}/g, dbItem.id);

  var newdbItem = db.createNewItem("tmp");
  for (var o in newdbItem) {
    if (!newdbItem.hasOwnProperty(o))
      continue;

    // common.logDebug("getItemDetails", o);
    item_html = item_html.replace(new RegExp("{{item-" + o + "}}", "g"),
      dbItem[o] === undefined ? "" : dbItem[o]);
  }

  item_html = item_html.replace("{{item-options}}", item
    .getItemAmountTypeHTML(dbItem));
  return checkTags(item_html, "getItemDetails(" + templateID + ")");
};