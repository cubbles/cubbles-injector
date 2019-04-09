(function() {
  const MESSAGES_ID = {
    executeContentScript: 'execute-content-script',
    performInjection: 'perform-injection',
  };
  var connections = {};
  chrome.runtime.onConnect.addListener(function(devToolsConnection) {
    var devToolsListener = function(message, sender, sendResponse) {
      if (message.tabId) {
        if (message.name === MESSAGES_ID.executeContentScript) {
          connections[message.tabId] = devToolsConnection;
          chrome.tabs.executeScript(message.tabId, {
            file: message.scriptToExecute,
          });
        } else {
          chrome.tabs.sendMessage(message.tabId, message, function(response) {
            devToolsConnection.postMessage(response);
          });
        }
      }
    };
    devToolsConnection.onMessage.addListener(devToolsListener);

    devToolsConnection.onDisconnect.addListener(function() {
      devToolsConnection.onMessage.removeListener(devToolsListener);
      chrome.tabs.sendMessage(message.tabId, { name: MESSAGES_ID.performInjection });
    });

    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
      if (changeInfo.status === 'complete') {
        devToolsConnection.postMessage({ name: 'tab-updated' });
      }
    });
  });
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Messages from content scripts should have sender.tab set
    if (sender.tab) {
      var tabId = sender.tab.id;
      if (tabId in connections) {
        connections[tabId].postMessage(request);
      } else {
        console.error('Tab not found in connection list.');
      }
    } else {
      console.error('sender.tab not defined.');
    }
    return true;
  });
})();