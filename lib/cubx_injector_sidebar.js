/* globals hljs, chrome */
(function() {
  const ELEMENTS_IDS = {
    addScriptBtn: 'addScriptBtn',
    finishBtn: 'finishBtn',
    scriptsTable: 'scriptsTable',
    snippetsTable: 'snippetsTable',
    addSnippetBtn: 'addSnippetBtn',
    editorId: 'htmlSnippetCode',
    editorAddButton: 'editorAddButton',
    mainContainer: 'mainContainer',
    codeEditorDiv: 'codeEditorDiv',
    snippetsFields: 'snippetsFields',
    containerSelectorInput: 'containerSelectorInput',
    saveConfigBtn: 'saveConfigBtn',
    loadConfigBtn: 'loadConfigBtn',
    importConfigBtn: 'importConfigBtn',
    importConfigHiddenBtn: 'importConfigHiddenBtn',
    exportConfigBtn: 'exportConfigBtn',
    editorCancelButton: 'editorCancelButton',
    resetBtn: 'resetBtn',
    useInspectedElementBtn: 'useInspectedElementBtn',
    htmlSnippetName: 'htmlSnippetName',
    positionGroupName: 'whereToInsertRB'
  };
  const ELEMENTS_CLASSES = {
    urlInput: 'url-input',
    actionBtn: 'btn btn-sm btn-light',
    editBtn: 'fas fa-pen',
    removeBtn: 'fas fa-trash',
    moveUpBtn: 'fas fa-arrow-up',
    moveDownBtn: 'fas fa-arrow-down',
    hidden: 'hidden',
    actionsContainer: 'actions-container btn-group',
  };
  const ACTIONS_LABELS = {
    remove: 'Remove',
    edit: 'Edit',
    moveUp: 'Move up',
    moveDown: 'Move down'
  };
  const MESSAGES_IDS = {
    injectScripts: 'inject-scripts',
    injectSnippets: 'inject-snippets',
    dispatchStartEvent: 'dispatch-start-event',
    executeContentScript: 'execute-content-script',
    injectionPending: 'injection-pending'
  };
  const DATA_ATTRIBUTE_NAMES = {
    code: 'data-code',
    containerSelector: 'data-container-selector',
    type: 'data-type',
    name: 'data-name',
    position: 'data-position'
  };
  const ACTIONS = {
    addScript: 'addScript',
    addSnippet: 'addSnippet',
  };
  const RTE_START_EVENT = 'cubblesInjectionReady';
  const LOCAL_STORAGE_KEY = 'cubbles-injector-config';
  const TYPES = {
    script: 'script',
    snippet: 'snippet'
  }
  const DEFAULT_SCRIPTS = [
    {
      type: TYPES.script,
      name: 'RTE scripts',
      code:
        '<script type="text/javascript" src="https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/custom-elements-es5-adapter.js"></script>\n' +
        '<script type="text/javascript" src="https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/webcomponents-lite.js"></script>\n' +
        '<script type="text/javascript" data-cubx-startevent="cubblesInjectionReady" src="https://cubbles.world/shared/cubx.core.rte@3.0.0/crc-loader/js/main.js" data-crcinit-loadcif="true"></script>',
    },
  ];
  const DEFAULT_POSITION = 'end';

  let currentAction = '';
  let currentEditedRow;
  let editor;

  window.performInjection = function() {
    injectSnippets();
    injectScripts();
    setTimeout(function() {
      window.postMessageToBackgroundScript(MESSAGES_IDS.dispatchStartEvent, RTE_START_EVENT);
    }, 1000);
  };

  function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById(ELEMENTS_IDS.editorId), {
      lineNumbers: true,
    });
  }

  function resetCubblesInjector() {
    clearTableBody(document.getElementById(ELEMENTS_IDS.scriptsTable));
    clearTableBody(document.getElementById(ELEMENTS_IDS.snippetsTable));
    addDefaultScripts();
  }

  function addDefaultScripts() {
    DEFAULT_SCRIPTS.forEach(function(scriptInfo) {
      appendInfoRow(ELEMENTS_IDS.scriptsTable, scriptInfo);
    });
  }

  function injectScripts() {
    let scriptsToInject = extractElementsToInject(TYPES.script);
    window.postMessageToBackgroundScript(MESSAGES_IDS.injectScripts, scriptsToInject);
  }

  function injectSnippets() {
    let snippetsToInject = extractElementsToInject(TYPES.snippet);
    window.postMessageToBackgroundScript(MESSAGES_IDS.injectSnippets, snippetsToInject);
  }

  function extractElementsToInject(type) {
    let elementsToInject = [];
    document
      .querySelectorAll(`[${DATA_ATTRIBUTE_NAMES.code}][${DATA_ATTRIBUTE_NAMES.type}=${type}]`)
      .forEach(function(element) {
        if (type === TYPES.script) {
          elementsToInject.push(element.getAttribute(DATA_ATTRIBUTE_NAMES.code));
        } else {
          elementsToInject.push({
            html: element.getAttribute(DATA_ATTRIBUTE_NAMES.code),
            containerSelector: element.getAttribute(DATA_ATTRIBUTE_NAMES.containerSelector),
            position: element.getAttribute(DATA_ATTRIBUTE_NAMES.position)
          });
        }
      });
    return elementsToInject;
  }

  function extractCurrentConfig() {
    let types = [TYPES.script, TYPES.snippet];
    let config = {};
    types.forEach(function(type) {
      config[`${type}s`] = [];
      document
        .querySelectorAll(`[${DATA_ATTRIBUTE_NAMES.code}][${DATA_ATTRIBUTE_NAMES.type}="${type}"]`)
        .forEach(function(element) {
          let info = extractInfoFromElement(element);
          config[`${type}s`].push(info);
        });
    });
    return config;
  }

  function extractInfoFromElement(element, withType) {
    let info = {};
    info.name = element.getAttribute(DATA_ATTRIBUTE_NAMES.name);
    info.code = element.getAttribute(DATA_ATTRIBUTE_NAMES.code);
    if (withType) {
      info.type = element.getAttribute(DATA_ATTRIBUTE_NAMES.type);
    }
    if (element.hasAttribute(DATA_ATTRIBUTE_NAMES.containerSelector)) {
      info.containerSelector = element.getAttribute(DATA_ATTRIBUTE_NAMES.containerSelector);
    }
    if (element.hasAttribute(DATA_ATTRIBUTE_NAMES.position)) {
      info.position = element.getAttribute(DATA_ATTRIBUTE_NAMES.position);
    }
    return info;
  }

  function saveConfig() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(extractCurrentConfig()));
  }

  function saveConfigToFile() {
    let content = JSON.stringify(extractCurrentConfig(), null, ' ');
    let blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${LOCAL_STORAGE_KEY}.json`);
  }

  function importConfig(file) {
    readSingleFile(file)
      .then(function(config) {
        loadConfig(JSON.parse(config));
      })
      .catch(function(error) {
        console.error(error);
      });
  }

  function loadLocalStorageConfig() {
    loadConfig(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)));
  }

  function loadConfig(config) {
    clearTableBody(document.getElementById(ELEMENTS_IDS.scriptsTable));
    clearTableBody(document.getElementById(ELEMENTS_IDS.snippetsTable));
    let typesInfo = [
      { type: TYPES.script, tableId: ELEMENTS_IDS.scriptsTable },
      { type: TYPES.snippet, tableId: ELEMENTS_IDS.snippetsTable },
    ];
    typesInfo.forEach(function(key) {
      let propertyName = `${key.type}s`
      if (config.hasOwnProperty(propertyName)) {
        config[propertyName].forEach(function(info) {
          info.type = key.type;
          appendInfoRow(key.tableId, info);
        });
      }
    });
  }

  function readSingleFile(file) {
    return new Promise(function(resolve, reject) {
      if (!file) {
        reject(new Error('Invalid file'));
      }
      var reader = new FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.readAsText(file);
    });
  }

  function clearTableBody(table) {
    for (var i = 1, length = table.rows.length; i < length; i++) {
      table.deleteRow(1);
    }
  }

  function appendInfoRow(tableId, info) {
    let tbody = document.getElementById(tableId).querySelector('tbody');
    let index = tbody.rows.length;
    let row = tbody.insertRow(index);
    fillInfoRow(row, info);
  }

  function fillInfoRow(row, info) {
    let divElement = createDivInfoElement(info);
    row.insertCell(0).appendChild(divElement);

    let actionsDiv = createActions(row);
    row.insertCell(1).appendChild(actionsDiv);
  }

  function createActions(row) {
    let actionsDiv = document.createElement('div');
    actionsDiv.setAttribute('class', ELEMENTS_CLASSES.actionsContainer);
    let actionsInfo = [
      {
        label: ACTIONS_LABELS.remove, 
        listener: function() {
          let row = this.parentNode.parentNode.parentNode;
          row.parentNode.removeChild(row);
        },
        className: ELEMENTS_CLASSES.actionBtn,
        iconClassName: ELEMENTS_CLASSES.removeBtn
      },
      {
        label: ACTIONS_LABELS.edit,
        listener: function() {
          let element = row.querySelector(`[${DATA_ATTRIBUTE_NAMES.code}]`);
          let info = extractInfoFromElement(element, true);
          fillEditor(info);
          currentEditedRow = row;
        },
        className: ELEMENTS_CLASSES.actionBtn,
        iconClassName: ELEMENTS_CLASSES.editBtn
      },
      {
        label: ACTIONS_LABELS.moveUp,
        listener: function () {
          if (row.previousSibling !== null) {
            let tbody = row.parentNode;
            tbody.insertBefore(row, row.previousSibling);
          }
        },
        className: ELEMENTS_CLASSES.actionBtn,
        iconClassName: ELEMENTS_CLASSES.moveUpBtn
      },
      {
        label: ACTIONS_LABELS.moveDown,
        listener: function () {
          console.log('Moving down');
        },
        className: ELEMENTS_CLASSES.actionBtn,
        iconClassName: ELEMENTS_CLASSES.moveDownBtn
      }
    ];

    actionsInfo.forEach(function (actionInfo) {
      let actionBtn = createActionButton(
        actionInfo.label,
        actionInfo.listener,
        actionInfo.className,
        actionInfo.iconClassName
      )
      actionsDiv.appendChild(actionBtn);
    });
    return actionsDiv;
  }

  function fillEditor(info) {
    editor.doc.setValue(info.code);
    document.getElementById(ELEMENTS_IDS.htmlSnippetName).value = info.name;
    if (info.hasOwnProperty('containerSelector')) {
      document.getElementById(ELEMENTS_IDS.containerSelectorInput).value = info.containerSelector;
    }
    if (info.hasOwnProperty('position')) {
      document.querySelector(`[name=${ELEMENTS_IDS.positionGroupName}][value=${info.position}]`).checked = true;
    }
    if (info.type === TYPES.script) {
      addNewScript();
    } else {
      addNewSnippet();
    }
  }

  function updateInfoRow(row, info) {
    let infoContainer = row.querySelector(`[${DATA_ATTRIBUTE_NAMES.code}]`);
    updateInfoInContainer(infoContainer, info);
  }

  function createDivInfoElement(info) {
    let div = document.createElement('div');
    updateInfoInContainer(div, info);
    return div;
  }

  function updateInfoInContainer(container, info) {
    container.innerText = info.name;
    container.setAttribute(DATA_ATTRIBUTE_NAMES.code, info.code);
    container.setAttribute(DATA_ATTRIBUTE_NAMES.type, info.type);
    container.setAttribute(DATA_ATTRIBUTE_NAMES.name, info.name);
    if (info.hasOwnProperty('containerSelector')) {
      container.setAttribute(DATA_ATTRIBUTE_NAMES.containerSelector, info.containerSelector);
    }
    if (info.hasOwnProperty('position')) {
      container.setAttribute(DATA_ATTRIBUTE_NAMES.position, info.position);
    }
  }

  function createActionButton(text, listener, className, iconClass) {
    let actionBtn = document.createElement('button');
    actionBtn.setAttribute('class', className);
    let icon = document.createElement('i');
    icon.setAttribute('class', iconClass);
    actionBtn.setAttribute('title', text);
    actionBtn.appendChild(icon);
    actionBtn.addEventListener('click', listener);
    return actionBtn;
  }

  function createInputElement(attributes) {
    let inputElement = document.createElement('input');
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

  function showMainContainer() {
    showElement(document.getElementById(ELEMENTS_IDS.mainContainer));
  }

  function showEditor() {
    showElement(document.getElementById(ELEMENTS_IDS.codeEditorDiv));
  }

  function showElement(element) {
    element.classList.remove(ELEMENTS_CLASSES.hidden);
  }

  function hideMainContainer() {
    hideElement(document.getElementById(ELEMENTS_IDS.mainContainer));
  }

  function hideEditor() {
    hideElement(document.getElementById(ELEMENTS_IDS.codeEditorDiv));
  }

  function hideElement(element) {
    element.classList.add(ELEMENTS_CLASSES.hidden);
  }

  function extractSrcFromHtml(html) {
    let scriptElement = htmlToElement(html);
    return scriptElement.getAttribute('src');
  }

  function extractArtifactInfoFromHtml(html) {
    const webpackageIdAttribute = 'cubx-webpackage-id';
    let snippet = htmlToElement(html);
    if (!snippet.hasAttribute(webpackageIdAttribute)) {
      snippet = snippet.querySelector(`[${webpackageIdAttribute}]`);
    }
    return {
      artifactId: snippet.tagName.toLowerCase(),
      webpackageId: snippet.getAttribute(webpackageIdAttribute),
    };
  }

  /**
   * @param {String} HTML representing a single element
   * @return {Element}
   * See: https://stackoverflow.com/a/35385518/8082984
   */
  function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  }

  function addNewScript() {
    hideElement(document.getElementById(ELEMENTS_IDS.snippetsFields));
    hideMainContainer();
    showEditor();
    currentAction = ACTIONS.addScript;
  }

  function addNewSnippet() {
    hideMainContainer();
    showEditor();
    showElement(document.getElementById(ELEMENTS_IDS.snippetsFields));
    currentAction = ACTIONS.addSnippet;
  }

  function resetCodeEditor() {
    document.getElementById(ELEMENTS_IDS.containerSelectorInput).value = '';
    document.getElementById(ELEMENTS_IDS.htmlSnippetName).value = '';
    document.querySelector(`[name=${ELEMENTS_IDS.positionGroupName}][value=${DEFAULT_POSITION}]`).checked = true;
    editor.doc.setValue('');
  }

  function getNameOfCurrentEditedCode() {
    let name = document.getElementById(ELEMENTS_IDS.htmlSnippetName).value;
    if (!name) {
      name = generateNameForCurrentEditedCode();
    }
    return name;
  }

  function generateNameForCurrentEditedCode() {
    const nameMaxLength = 50;
    let name = editor.doc.getValue();
    if (name.length > nameMaxLength) {
      name = `${name.substring(0, nameMaxLength)}...`
    }
    return name;
  }

  function finishAdditionFromEditor() {
    let tableId = '';
    let info = {
      code: editor.doc.getValue(),
      name: getNameOfCurrentEditedCode(),
    };
    if (currentAction === ACTIONS.addScript) {
      tableId = ELEMENTS_IDS.scriptsTable;
      info.type = TYPES.script;
    } else {
      tableId = ELEMENTS_IDS.snippetsTable;
      info.type = TYPES.snippet;
      info.containerSelector = document.getElementById(ELEMENTS_IDS.containerSelectorInput).value;
      info.position = document.querySelector(`[name=${ELEMENTS_IDS.positionGroupName}]:checked`).value;
      hideElement(document.getElementById(ELEMENTS_IDS.snippetsFields));
    }
    if (currentEditedRow !== undefined) {
      updateInfoRow(currentEditedRow, info);
    } else {
      appendInfoRow(tableId, info);
    }
    closeCodeEditor();
  }

  function closeCodeEditor() {
    showMainContainer();
    hideEditor();
    currentAction = '';
    currentEditedRow = undefined;
    resetCodeEditor();
  }

  function useSelectorFromInspectedElement() {
    getCurrentElementSelector()
      .then(function(selector) {
        document.getElementById(ELEMENTS_IDS.containerSelectorInput).value = selector;
      })
      .catch(function(error) {
        console.error(error);
      });
  }

  function getCurrentElementSelector() {
    return new Promise(function(resolve, reject) {
      chrome.devtools.inspectedWindow.eval('Simmer($0);', function(result, isException) {
        if (isException) {
          reject('Error fetching current selected element');
        } else {
          resolve(result);
        }
      });
    });
  }

  function addListeners() {
    document.getElementById(ELEMENTS_IDS.addScriptBtn).addEventListener('click', addNewScript);

    document
      .getElementById(ELEMENTS_IDS.addSnippetBtn)
      .addEventListener('click', addNewSnippet);

    document
      .getElementById(ELEMENTS_IDS.editorAddButton)
      .addEventListener('click', finishAdditionFromEditor);

    document
      .getElementById(ELEMENTS_IDS.editorCancelButton)
      .addEventListener('click', closeCodeEditor);

    document.getElementById(ELEMENTS_IDS.finishBtn).addEventListener('click', function() {
      window.postMessageToBackgroundScript(MESSAGES_IDS.injectionPending);
      chrome.devtools.inspectedWindow.reload();
    });

    document.getElementById(ELEMENTS_IDS.saveConfigBtn).addEventListener('click', saveConfig);

    document.getElementById(ELEMENTS_IDS.resetBtn).addEventListener('click', resetCubblesInjector);

    document
      .getElementById(ELEMENTS_IDS.loadConfigBtn)
      .addEventListener('click', loadLocalStorageConfig);

    document
      .getElementById(ELEMENTS_IDS.exportConfigBtn)
      .addEventListener('click', saveConfigToFile);

    document
      .getElementById(ELEMENTS_IDS.useInspectedElementBtn)
      .addEventListener('click', useSelectorFromInspectedElement);

    document.getElementById(ELEMENTS_IDS.importConfigHiddenBtn).addEventListener('change', function(e) {
      importConfig(e.target.files[0]);
    });

    document.getElementById(ELEMENTS_IDS.importConfigBtn).addEventListener('click', function(e) {
      document.getElementById(ELEMENTS_IDS.importConfigHiddenBtn).click();
    });
  }

  initEditor();
  addListeners();
  addDefaultScripts();
})();
