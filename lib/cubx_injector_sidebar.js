/* globals hljs, chrome */
(function() {
  const ELEMENTS_IDS = {
    addScriptBtn: 'addScriptBtn',
    finishBtn: 'finishBtn',
    scriptsTable: 'scriptsTable',
    componentsTable: 'componentsTable',
    addComponentBtn: 'addComponentBtn',
    editorId: 'htmlComponentCode',
    editorAddButton: 'editorAddButton',
    mainContainer: 'mainContainer',
    codeEditorDiv: 'codeEditorDiv',
    componentsFields: 'componentsFields',
    containerSelectorInput: 'containerSelectorInput'
  };
  const ELEMENTS_CLASSES = {
    urlInput: 'url-input',
    actionBtn: 'action-btn',
    hidden: 'hidden',
  };
  const ACTIONS_LABELS = {
    remove: 'Remove',
  };
  const MESSAGES_IDS = {
    injectScripts: 'inject-scripts',
    injectComponents: 'inject-components',
  };
  const defaultScripts = [
    {
      type: 'script',
      verbose:
        'https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/custom-elements-es5-adapter.js',
      code:
        '<script type="text/javascript" src="https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/custom-elements-es5-adapter.js"></script>',
    },
    {
      type: 'script',
      verbose:
        'https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/webcomponents-lite.js',
      code:
        '<script type="text/javascript" src="https://cubbles.world/shared/cubx.core.rte@3.0.0/webcomponents/webcomponents-lite.js"></script>',
    },
    {
      type: 'script',
      verbose: 'https://cubbles.world/shared/cubx.core.rte@3.0.0/crc-loader/js/main.js',
      code:
        '<script type="text/javascript" src="https://cubbles.world/shared/cubx.core.rte@3.0.0/crc-loader/js/main.js" data-crcinit-loadcif="true"></script>',
    },
  ];
  const DATA_ATTRIBUTE_NAMES = {
    script: 'data-script-code',
    component: 'data-component-code',
    containerSelector: 'data-container-selector'
  };
  const ACTIONS = {
    addSrcipt: 'addSrcipt',
    addComponent: 'addComponent',
    editSrcipt: 'editSrcipt',
    editComponent: 'editComponent',
  };
  let currentAction = '';
  let editor;

  function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById(ELEMENTS_IDS.editorId), {
      lineNumbers: true,
    });
  }

  function addDefaultScripts() {
    defaultScripts.forEach(function(scriptInfo) {
      appendInfoRow(ELEMENTS_IDS.scriptsTable, scriptInfo);
    });
  }

  function injectScripts() {
    let scriptsToInject = extractElementsToInject('script');
    window.postMessageToBackgroundScript(MESSAGES_IDS.injectScripts, scriptsToInject);
  }

  function injectComponents() {
    let componentsToInject = extractElementsToInject('component');
    window.postMessageToBackgroundScript(MESSAGES_IDS.injectComponents, componentsToInject);
    let rootDependencies = componentsToInject.map(function (componentCode) {
      return extractArtifactInfoFromHtml(componentCode);
    });
    let rootDependenciesScript = generateScriptCodeForRootDependencies(rootDependencies);
    window.postMessageToBackgroundScript(MESSAGES_IDS.injectScripts, [ rootDependenciesScript ]);
  }

  function generateScriptCodeForRootDependencies(rootDependencies) {
    return `<script type="text/javascript">window.cubx = { CRCInit: { rootDependencies: [ ${JSON.stringify(rootDependencies)} ] } };</script>`;
  }

  function extractElementsToInject(type) {
    let elementsToInject = [];
    document.querySelectorAll(`[${DATA_ATTRIBUTE_NAMES[type]}]`).forEach(function(element) {
      if (type === 'script') {
        elementsToInject.push(element.getAttribute(DATA_ATTRIBUTE_NAMES[type]));

      } else {
        elementsToInject.push({
          html: element.getAttribute(DATA_ATTRIBUTE_NAMES[type]),
          containerSelector: element.getAttribute(DATA_ATTRIBUTE_NAMES.containerSelector)
        });
      }
    });
    return elementsToInject;
  }

  function clearTable(table) {
    for (var i = 1, length = table.rows.length; i < length; i++) {
      table.deleteRow(1);
    }
  }

  function appendInfoRow(tableId, info) {
    var tbody = document.getElementById(tableId).querySelector('tbody');
    var row = tbody.insertRow(tbody.rows.length);
    fillInfoRow(row, info);
  }

  function fillInfoRow(row, info) {
    let spanElement = createSpanInfoElement(info);
    row.insertCell(0).appendChild(spanElement);
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

  function createSpanInfoElement(info) {
    let span = document.createElement('span');
    span.innerHTML = info.verbose;
    span.setAttribute(DATA_ATTRIBUTE_NAMES[info.type], info.code);
    if (info.hasOwnProperty('containerSelector')) {
      span.setAttribute(DATA_ATTRIBUTE_NAMES.containerSelector, info.containerSelector);
    }
    return span;
  }

  function createActionButton(text, listener, className) {
    let inputBtn = createInputElement([
      { name: 'value', value: text },
      { name: 'type', value: 'button' },
      { name: 'class', value: className },
    ]);
    inputBtn.addEventListener('click', listener);
    return inputBtn;
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
    console.log(scriptElement);
    return scriptElement.getAttribute('src');
  }

  function extractArtifactInfoFromHtml(html) {
    const webpackageIdAttribute = 'cubx-webpackage-id';
    let componentElement = htmlToElement(html);
    if (!componentElement.hasAttribute(webpackageIdAttribute)) {
      componentElement = componentElement.querySelector(`[${webpackageIdAttribute}]`);
    }
    return {
      artifactId: componentElement.tagName.toLowerCase(),
      webpackageId: componentElement.getAttribute(webpackageIdAttribute)
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

  function addListeners() {
    document.getElementById(ELEMENTS_IDS.addScriptBtn).addEventListener('click', function() {
      hideMainContainer();
      showEditor();
      currentAction = ACTIONS.addSrcipt;
    });

    document.getElementById(ELEMENTS_IDS.addComponentBtn).addEventListener('click', function() {
      hideMainContainer();
      showEditor();
      showElement(document.getElementById(ELEMENTS_IDS.componentsFields));
      currentAction = ACTIONS.addComponent;
    });

    document.getElementById(ELEMENTS_IDS.editorAddButton).addEventListener('click', function() {
      let tableId = '';
      let info = {
        code: editor.doc.getValue(),
      };
      if (currentAction === ACTIONS.addSrcipt || currentAction === ACTIONS.editSrcipt) {
        tableId = ELEMENTS_IDS.scriptsTable;
        info.verbose = extractSrcFromHtml(info.code);
        info.type = 'script';
      } else {
        let artifactInfo = extractArtifactInfoFromHtml(info.code);
        info.verbose = `${artifactInfo.webpackageId}\\${artifactInfo.artifactId}`;
        tableId = ELEMENTS_IDS.componentsTable;
        info.type = 'component';
        info.containerSelector = document.getElementById(ELEMENTS_IDS.containerSelectorInput).value;
        hideElement(document.getElementById(ELEMENTS_IDS.componentsFields));
      }
      appendInfoRow(tableId, info);
      showMainContainer();
      hideEditor();
      currentAction = '';
    });

    document.getElementById(ELEMENTS_IDS.finishBtn).addEventListener('click', function() {
      injectComponents();
      injectScripts();
    });
  }

  initEditor();
  addListeners();
  addDefaultScripts();
})();
