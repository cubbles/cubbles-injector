/* globals hljs, chrome */
(function() {
  const ELEMENTS_IDS = {
    addScriptBtn: "addScriptBtn",
    finishBtn: "finishBtn",
    scriptsTable: "scriptsTable"
  };
  const ELEMENTS_CLASSES = {
    urlInput: "url-input",
    actionBtn: "action-btn"
  };
  const ACTIONS_LABELS = {
    remove: "Remove"
  };
  const MESSAGES_IDS = {
    injectScripts: "inject-scripts"
  };
  const defaultScripts = [
    'https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/custom-elements-es5-adapter.js',
    'https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/webcomponents-lite.js',
    'https://cubbles.world/shared/cubx.core.rte@3.0.0/crc-loader/js/main.js'
  ];

  document
    .getElementById(ELEMENTS_IDS.addScriptBtn)
    .addEventListener("click", function() {
      appendAddUrlRow();
    });

  document
    .getElementById(ELEMENTS_IDS.finishBtn)
    .addEventListener("click", function() {
      injectScripts();
    });

  addDefaultScripts();

  function addDefaultScripts () {
    defaultScripts.forEach(function (url) { 
      appendAddUrlRow(url);
    });
  }
  
  function injectScripts() {
    let scriptsToInject = extractScriptsUrls();
    window.postMessageToBackgroundScript(
      MESSAGES_IDS.injectScripts,
      scriptsToInject
    );
  }

  function extractScriptsUrls() {
    let scriptsURls = [];
    document
      .querySelectorAll(`.${ELEMENTS_CLASSES.urlInput}`)
      .forEach(function(urlInput) {
        scriptsURls.push(urlInput.value);
      });
    return scriptsURls;
  }

  function clearTable(table) {
    for (var i = 1, length = table.rows.length; i < length; i++) {
      table.deleteRow(1);
    }
  }

  function appendAddUrlRow(url) {
    var tbody = document
      .getElementById(ELEMENTS_IDS.scriptsTable)
      .querySelector("tbody");
    var row = tbody.insertRow(tbody.rows.length);
    fillAddUrlRow(row, url);
  }

  function fillAddUrlRow(row, url) {
    let inputAttributes = [
      { name: "class", value: ELEMENTS_CLASSES.urlInput },
      { name: "value", value: url ? url : "" }
    ]
    let urlInput = createInputElement(inputAttributes);
    row.insertCell(0).appendChild(urlInput);
    let deleteAction = createActionButton(
      ACTIONS_LABELS.remove,
      function() {
        let row = this.parentNode.parentNode;
        row.parentNode.removeChild(row);
      },
      ELEMENTS_CLASSES.actionBtn
    );
    row.insertCell(1).appendChild(deleteAction);
  }

  function createActionButton(text, listener, className) {
    let inputBtn = createInputElement([
      { name: "value", value: text },
      { name: "type", value: "button" },
      { name: "class", value: className }
    ]);
    inputBtn.addEventListener("click", listener);
    return inputBtn;
  }

  function createInputElement(attributes) {
    let inputElement = document.createElement("input");
    if (attributes) {
      attributes.forEach(function(attribute) {
        inputElement.setAttribute(attribute.name, attribute.value);
      });
    }
    return inputElement;
  }

  /**
   * Log an error in the console of the inspected window
   * @param {string} ErrorMsg Error to be logged
   */
  function logErrorMsg(ErrorMsg) {
    chrome.devtools.inspectedWindow.eval('console.error("' + ErrorMsg + '")');
  }
})();
