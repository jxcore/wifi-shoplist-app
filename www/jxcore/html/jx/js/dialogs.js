var jx = jx || {};

jx.utils = {};
jx.dialogs = {};

jx.dialogs.askValue = function (title, question, value, cb, password) {

  if (!cb)
    return;

  $.SmartMessageBox({
    title: title,
    content: question || "",
    buttons: "[Accept][Cancel]",
    input: password ? "password" : "text",
    placeholder: "",
    inputValue: value || "",
    preventDefault: true,
    sound: 0
  }, function (ButtonPress, Value) {
    var ok = ButtonPress === "Accept";
    cb(ok, Value);
  });
};

jx.dialogs.bubble = function (type, title, content, ms) {

  var colors = {
    success: "#8ac38b",
    danger: "#c26565",
    warning: "#ff9900",
    info: "#d6dde7",
    blue: "#296191"
  };
  var m_icons = {
    success: "fa-check",
    danger: "fa-exclamation",
    warning: "fa-exclamation",
    info: "fa-info"
  };
  var messages = {
    success: "All right!",
    danger: "Oops!",
    warning: "Be careful!",
    info: "Info"
  };
  colors.error = colors.danger;
  m_icons.error = m_icons.danger;
  messages.error = messages.danger;

  m_icons.blue = m_icons.info;
  messages.blue = messages.info;

  var color = colors[type] || colors.info;
  var timeout = ms || 2000;
  var id = $.smallBox({
    title: title || ('<strong>' + messages[type] + '</strong>'),
    content: "<i class='fa fa-clock-o'></i> <i>" + (content || "") + "</i>",
    color: color, // "#659265",
    iconSmall: "fa " + m_icons[type] + " fa-2x fadeInRight animated",
    timeout: timeout,
    sound: 0
  });

  // sometimes smallboxes are not hiding as they should - fixing it
  setTimeout(function () {
    $("#smallbox" + id).remove();
  }, timeout + 200);
};

jx.dialogs.confirm = function (title, question, cb, buttons) {

  if (!cb)
    return;

  $.SmartMessageBox({
    title: title,
    content: question,
    buttons: buttons || '[{{label.No}}][{{label.Yes}}]',
    sound: 0
  }, function (ButtonPressed) {
    // debugger;
    cb(ButtonPressed);
  });
};

jx.dialogs.areYouSure = function (what, cb) {
  jx.dialogs
    .confirm(
    '<span class="glyphicon glyphicon-exclamation-sign jx-txt-color-orangeDark"></span> Are you sure?',
    what, function (btn) {
      cb(btn === "Yes")
    }, "[Yes][No]");
};

jx.dialogs.alertError = function (str) {
  jx.dialogs.bubble("error", null, str);
};

jx.dialogs.logDebug = function (obj) {

  return;
  var txt = document.getElementById('txtDebug');
  if (txt) {
    txt.innerHTML += "<BR/>" + obj;
    txt.scrollTop = txt.scrollHeight;
    $(txt).show();
  }

  if (console)
    console.log(obj);
};

jx.dialogs.addCriticalError = function (err) {

  if (!jx.dialogs.criticalErrors)
    jx.dialogs.criticalErrors = [];

  jx.dialogs.criticalErrors.push(err);

  $("#error-badge").html(jx.dialogs.criticalErrors.length);
  jx.dialogs.alertError(err);
};

jx.dialogs.info = function () {
  var str = "<span style='font-size:120%'><strong>WiFi Shoplist</strong> <br/>"
    + "This application makes your shopping list available over WiFi. "
    + "So, others can contribute to your shopping list from the devices "
    + "with browser support.<br/><br/>"
    + "See the <strong>Remote Access</strong> URL on the bottom and "
    + "enter it on a browser address bar."
    + "<br/><br/>"
    + "Remote view is only accessible when the application is on the foreground."
    + "<br/><br/>" + "This open source application is hosted on<br/>"
    + "https://github.com/jxcore/wifi-shoplist-app/" + "<br/><br/>"
    + "Powered by <strong>JXcore</strong><br/>"
    + "Contact us from <strong>support@nubisa.com</strong></span>";

  if (jx.dialogs.criticalErrors) {
    var html = '<div class="alert alert-danger fade in">' + '{{err}}</div>';

    var tag1 = '<i class="fa fa-exclamation txt-color-white"></i> <span class="txt-color-red">';
    var tag2 = '</span>';
    str += '<br><br>' + tag1 + jx.dialogs.criticalErrors.join(tag2 + tag1)
    + tag2;
  }
  jx.dialogs.confirm(
    '<span class="fa fa-info jx-txt-color-orangeDark"></span> Info', str,
    function () {
    }, "[OK]");
};

jx.dialogs.lostConnection = {};

jx.dialogs.lostTimer = 0;

jx.dialogs.lostConnection.show = function (withoutError) {
  if (window.jxUsesCordova)
    return;

  var spin = "Please reload the page to continue.<br>Make sure, that remote access is enabled on app's screen.";

  if (withoutError) {
    var title = "";
    var str = spin;
  } else {
    var title = '<span class="fa fa-exclamation jx-txt-color-orangeDark"></span> Error';
    var str = 'Lost connection to Local Server. <br><br>' + spin;
  }

  if (jx.dialogs.lostConnection.visible)
    return;

  jx.dialogs.lostTimer = 1;
  setTimeout(function () {
    if (typeof jxcore != 'undefined' && jx.dialogs.lostTimer) {
      jx.dialogs.lostTimer = 0;
      jxcore('unloadThreads').call();
    }
  }, 3);
  jx.dialogs.lostConnection.visible = $.SmartMessageBox({
    title: title,
    content: str,
    sound: 0,
    buttons: null
  });
};

jx.dialogs.lostConnection.hide = function () {

  if (window.jxUsesCordova)
    return;

  jx.dialogs.lostTimer = 0;
  if (jx.dialogs.lostConnection.visible) {
    var msgbox = jx.dialogs.lostConnection.visible;
    msgbox.obj.hide("Msg" + msgbox.id);
    jx.dialogs.lostConnection.visible = null;
  }
};