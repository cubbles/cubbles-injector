(function() {
  "use srtrict";

  const MESSAGES_IDS = {
    injectScripts: "inject-scripts"
  };

  function injectScript(src) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = src;
    document.head.appendChild(script);
  }

  function injectScripts(scriptsUrls) {
    scriptsUrls.forEach(function(url) {
      injectScript(url);
    });
  }

  window.addEventListener('message', handleMessages);

  function handleMessages (event) {
    // Only accept messages from the same frame
    if (event.source !== window) {
      return;
    }

    var message = event.data;

    // Only accept messages that we know are ours
    if (typeof message !== 'object' || message === null ||
      message.source !== 'cubbles-webinspector') {
      return;
    }
    sendMessageToBackgroundScript(message);
  }


  /**
   * Send a message to the background script
   * @param {{name: , content: }} message - Message to be sent
   */
  function sendMessageToBackgroundScript(message) {
    try {
      chrome.runtime.sendMessage(message);
    } catch (e) {
      console.warn("Connection to background script could not be established");
    }
  }

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message && message.hasOwnProperty("name")) {
      switch (message.name) {
        case MESSAGES_IDS.injectScripts:
          injectScripts(message.content);
          break;
      }
    }
    //sendResponse({name: 'processing'});
  });
})();
