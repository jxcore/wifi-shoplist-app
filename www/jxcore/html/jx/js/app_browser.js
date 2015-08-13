// Copyright & License details are available under JXCORE_LICENSE file

var ShoppingList = function () {

  var _this = this;
  var container = $("#content");

  var screenTypes = {
    table: "list",
    listDetails: "listDetails",
    itemDetails: "itemDetails"
  };
  var currentScreen = {};

  var setCurrentScreen = function (type, groupID, dbList, dbItem) {
    currentScreen.type = type;
    currentScreen.groupID = groupID;
    if (dbList !== true)
      currentScreen.dbList = dbList;
    if (dbItem !== true)
      currentScreen.dbItem = dbItem;

    var header_str = '';
    if (type === screenTypes.table) {
      $("#nav-back").addClass("hidden");
      header_str = 'WiFi Shoplist';
    } else {
      $("#nav-back").removeClass("hidden");
      header_str = currentScreen.dbList.caption;
    }

    $("#header-caption").html(
      ' <span class="txt-color-white">' + header_str + '</span>');

    if (type === screenTypes.itemDetails) {
      $("#add-new").addClass("hidden");
      $("#search-mobile").addClass("hidden");
      $("#item-save").removeClass("hidden");
      $("#item-save").removeClass("hidden");
    } else {
      $("#add-new").removeClass("hidden");
      $("#search-mobile").removeClass("hidden");
      $("#item-save").addClass("hidden");
    }
  };

  setCurrentScreen(screenTypes.table);

  this.showTable = function () {
    jx.utils.sendToServer("srvShowTable", null, function (param) {
      container.html(param.html);
      setCurrentScreen(screenTypes.table);
    });
  };

  this.askForConnectionStatus = function () {
    jx.utils.sendToServer("srvAskForConnectionStatus", null, function (params) {
      window.connectionStatusChanged(params);
    });
  };

  this.showListDetails = function (listID) {
    jx.utils.sendToServer("srvShowListDetails", {
      listID: listID
    }, function (param) {
      if (jx.utils.checkParam(param, ["html", "dbList"])) {
        container.html(param.html);
        setCurrentScreen(screenTypes.listDetails, null, param.dbList);
      }
    });
  };

  this.showItemDetails = function (listID, itemID) {
    jx.utils.sendToServer("srvShowItemDetails", {
      listID: listID,
      itemID: itemID
    }, function (param) {
      if (jx.utils.checkParam(param, ["html", "dbItem"])) {
        container.html(param.html);
        setCurrentScreen(screenTypes.itemDetails, null, true, param.dbItem);
        postAppend();
      }
    });
  };

  this.changeListCaption = function (id) {
    var caption = jx.utils.$findOne(id + "-caption");
    if (!caption)
      return;
    var caption_str = caption.text().trim();
    var title = '<i class="fa fa-pencil jx-txt-color-orangeDark"></i> Rename the list';
    jx.dialogs.askValue(title, null, caption_str, function (ok, value) {
      if (ok) {
        jx.utils.sendToServer("srvChangeListCaption", {
          itemID: id,
          caption: value
        }, function (param) {
          caption.text(value);
        });
      }
    });
  };

  this.addNew = function () {

    if (currentScreen.type === screenTypes.table) {
      var list_parent = jx.utils.$findOne("table-parent");
      if (!list_parent)
        return;
      var title = '<i class="fa fa-plus jx-txt-color-orangeDark"></i> New list';

      jx.dialogs.askValue(title, "Please provide a name:", "", function (ok,
                                                                         value) {
        if (ok) {
          jx.utils.sendToServer("srvAddNewList", {
            caption: value
          }, function (param) {
            if (jx.utils.checkParam(param, "html")) {
              $("#no_lists_on_table").remove();
              $("#no_items_on_list").remove();
              list_parent.append(param.html);
            }
          });
        }
      });
      return;
    }

    if (currentScreen.type === screenTypes.listDetails) {
      // new Item
      _this.showItemDetails(currentScreen.dbList.id, -1);
      return;
    }

    jx.dialogs.alertError("The screen " + currentScreen.type
    + " is not implemented.");
  };

  this.removeListFromTable = function (id) {
    var item = jx.utils.$findOne(id);
    if (!item)
      return;

    var caption = jx.utils.$findOne(id + "-caption");
    if (!caption)
      return;

    var caption_str = caption.text().trim();

    var cap_color = '<span class="jx-txt-color-orangeDark">' + caption_str
      + '</span>';
    jx.dialogs.areYouSure("The " + cap_color + " will be deleted!", function (yes) {
      if (yes) {
        jx.utils.sendToServer("srvRemoveFromDB", {
          listID: id,
          itemID: ""
        }, function (param) {
          if (param.no_records)
            $("#table-parent").html(param.no_records);
          else
            item.remove();

          // jx.dialogs.bubble("success", null, "The item '" + caption_str + "'
          // has been deleted.");
        });
      }
    });
  };

  this.removeItemFromList = function (listID, id) {
    var item = jx.utils.$findOne(id);
    if (!item)
      return;

    var caption = jx.utils.$findOne(id + "-caption");
    if (!caption)
      return;

    var caption_str = caption.text().trim();

    var cap_color = '<span class="jx-txt-color-orangeDark">' + caption_str
      + '</span>';
    jx.dialogs.areYouSure("The " + cap_color + " will be deleted!", function (yes) {
      if (yes) {
        jx.utils.sendToServer("srvRemoveFromDB", {
          listID: currentScreen.dbList.id,
          itemID: id
        }, function (param) {
          if (param.no_records)
            $("#table-parent").html(param.no_records);
          else
            item.remove();
          // jx.dialogs.bubble("success", null, "The item '" + caption_str + "'
          // has been deleted.");
        });
      }
    });
  };

  this.goBack = function () {
    if (currentScreen.type === screenTypes.listDetails) {
      jx.dialogs.logDebug("go back show table");
      _this.showTable();
    } else if (currentScreen.type === screenTypes.itemDetails) {
      jx.dialogs.logDebug("go back showListDetails " + currentScreen.dbList.id);
      _this.showListDetails(currentScreen.dbList.id);
    }
  };

  this.reload = function () {
    var type = currentScreen.type;

    if (type === screenTypes.table) {
      _this.showTable();
    } else if (type === screenTypes.listDetails) {
      _this.showListDetails(currentScreen.dbList.id + "");
    } else if (type === screenTypes.itemDetails) {
      _this.showItemDetails(currentScreen.dbList.id + "",
        currentScreen.dbItem.id + "");
    }
    jx.dialogs.bubble("success", null,
      "Database was updated from other device and screen was reloaded!");
  };

  this.toggleItemState = function (listID, itemID) {
    jx.utils.sendToServer("srvToggleItemState", {
      listID: listID,
      itemID: itemID
    }, function (param) {
      if (jx.utils.checkParam(param, ["html", "state"])) {
        $("#" + itemID + "-btn").html(param.html);
        currentScreen.dbList.items[itemID] = param.state;
      }
    });
  };

  var backKeyDownCount = 0;

  var onBackKeyDown = function (e) {
    if (currentScreen.type !== screenTypes.table) {
      e.preventDefault();
      _this.goBack();
    } else {
      e.preventDefault();
      // if back btn pressed twice during one sec
      backKeyDownCount++;
      setTimeout(function () {
        backKeyDownCount = 0;
      }, 1000);
      if (backKeyDownCount < 2) {
        jx.dialogs.bubble("blue", null, "Press twice to exit.");
      } else {
        navigator.app.exitApp();
      }
    }
  };

  document.addEventListener("backbutton", onBackKeyDown, false);

  var onResume = function (e) {
    if (window.jxUsesCordova) {
      jxcore("isAndroid").call(function (res) {
        if (res) return;
        jx.utils.networkEnabled = false;
        if (window.jxUsesCordova)
          $("#networkToggle").html(jx.utils.getRemoteAccessLockStatus().icon);
      });
    }
  };

  document.addEventListener("resume", onResume, false);

  var restrictNumbers = function (e) {
    var special = [46, 8, 9, 27, 13, 110, 190, 35, 36, 37, 38, 39];
    if (special.indexOf(e.keyCode) !== -1)
      return true;

    if (isNaN(this.value + "" + String.fromCharCode(e.charCode)))
      return false;
  };

  var postAppend = function () {
    $('.restrict-numbers').keypress(restrictNumbers).on("cut copy paste",
      restrictNumbers);

    if (jx.utils.isAndroid) {
      var details = $("#item-details");
      details.height(details.height() + 300);

      $('#item-notes').find("textarea").focus(function () {
        var off = $("#item-notes-label").offset();
        $("html, body").scrollTop(off.top - 70);
      });
    }
    pageSetUp();
  };

  this.items = {};
  this.items.inc = function (itemID) {

    var ctrl = document.getElementById(itemID + "-amount");
    if (ctrl) {
      var isFloat = ctrl.value.indexOf(".") !== -1;
      var val = isFloat ? parseFloat(ctrl.value) : parseInt(ctrl.value);
      if (isNaN(val))
        val = 0;
      ctrl.value = val + 1;
    }
    void (0);
  };

  this.items.dec = function (itemID) {
    var ctrl = document.getElementById(itemID + "-amount");
    if (ctrl) {
      var isFloat = ctrl.value.indexOf(".") !== -1;
      var val = isFloat ? parseFloat(ctrl.value) : parseInt(ctrl.value);
      if (isNaN(val))
        val = 0;
      if (val > 0)
        ctrl.value = val - 1;
    }
    void (0);
  };

  this.items.save = function () {
    if (currentScreen.type !== screenTypes.itemDetails)
      return;

    var itemID = currentScreen.dbItem.id;
    var item = {
      caption: $('#' + itemID + '-caption').val(),
      amount: $('#' + itemID + '-amount').val(),
      amount_type: $('#' + itemID + '-amount_type').find(":selected").text(),
      notes: $('#' + itemID + '-notes').val(),
      id: currentScreen.dbItem.id,
      isNew: currentScreen.dbItem.isNew
    };

    if (!item.caption || !item.caption.trim()) {
      jx.dialogs.alertError("Item Name cannot be empty.");
      return;
    }

    jx.utils.sendToServer("srvSaveItem", {
      listID: currentScreen.dbList.id,
      item: item
    }, function (param) {
      // jx.dialogs.bubble("success", null, "Saved!");
      _this.goBack();
    });
  };

  postAppend();
};