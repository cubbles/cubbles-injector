(function() {
  'use strict';
  var cubblesSidepanel;
  var backgroundPageConnection;
  var firstTimeCubblesSidebar = true;
  var cubblesSidebarIsVisible = false;

  /**
   * Post a message to the background script
   * @param {string} name - Name which identifies the message
   * @param {*} content - Message to be sent
   */
  function postMessageToBackgroundScript(name, content) {
    backgroundPageConnection.postMessage({
      name: name,
      content: content,
      tabId: chrome.devtools.inspectedWindow.tabId,
    });
  }

  /**
   * Post a message to request the execution of the contentScript
   */
  function postExecuteContentScript() {
    // Relay the tab ID to the background page
    backgroundPageConnection.postMessage({
      name: 'execute-content-script',
      tabId: chrome.devtools.inspectedWindow.tabId,
      scriptToExecute: 'lib/content_script.js',
    });
  }

  /**
   * Initialise a connection to eh background script
   */
  function initBackgroundConnection() {
    backgroundPageConnection = chrome.runtime.connect({
      name: 'cubbles-injector-devtools-connection',
    });
    backgroundPageConnection.onMessage.addListener(function(message) {
      if (message && message.hasOwnProperty('name')) {
        switch (message.name) {
          case 'tab-updated':
            postExecuteContentScript();
            setTimeout(function() {
              cubblesSidepanel.window.performInjection();
            }, 1000);
            break;
        }
      }
    });
  }

  /**
   * Create the cubbles web inspector tab, and the Cubbles sidebar within the elements tab
   */
  function createSabebarPage() {
    chrome.devtools.panels.elements.createSidebarPane('Cubbles Injector', function(sidebar) {
      cubblesSidepanel = sidebar;
      sidebar.setPage('cubx_injector_sidebar.html');

      sidebar.onShown.addListener(function(window) {
        if (firstTimeCubblesSidebar) {
          cubblesSidepanel.window = window;
          window.postMessageToBackgroundScript = function(name, content) {
            postMessageToBackgroundScript(name, content);
          };
          firstTimeCubblesSidebar = false;
        }
        cubblesSidebarIsVisible = true;
      });

      sidebar.onHidden.addListener(function() {
        cubblesSidebarIsVisible = false;
      });
    });
  }

  createSabebarPage();
  initBackgroundConnection();
  postExecuteContentScript();
})();
