(function() {
  "use srtrict";

  const MESSAGES_IDS = {
    injectScripts: "inject-scripts",
    injectComponents: "inject-components",
    dispatchStartEvent: 'dispatch-start-event'
  };
  const DEFAULT_CONTAINER_SELECTOR = 'body';

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

  function injectScript(html) {
    let foreignScript = htmlToElement(html);
    if (foreignScript.tagName.toLowerCase() !== 'script') {
      console.error(`The element to be injected is not a script, instead it is: ${script.tagName}`)
    } else {
      let script = document.createElement('script');
      if (foreignScript.hasAttributes()) {
        let attrs = foreignScript.attributes;
        for(let i = attrs.length - 1; i >= 0; i--) {
          script.setAttribute(attrs[i].name, attrs[i].value);
        }
      }
      script.innerHTML = htmlToElement(html).innerHTML;
      document.head.appendChild(script);
    }
  }

  function injectElement(html, containerSelector) {
    if (!containerSelector) {
      containerSelector = DEFAULT_CONTAINER_SELECTOR;
    }
    let element = htmlToElement(html);
    let container = document.querySelector(containerSelector);
    if (container) {
      container.appendChild(element);
    } else {
      console.error(`The container for the ${element.tagName} was not found. Provided selector: ${containerSelector}`);
    }
  }

  function injectScripts(scriptsCode) {
    scriptsCode.forEach(function(scriptCode) {
      injectScript(scriptCode);
    });
  }

  function injectElements(elements) {
    elements.forEach(function(elementInfo) {
      injectElement(elementInfo.html, elementInfo.containerSelector);
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
      message.source !== 'cubbles-injector') {
      return;
    }
    sendMessageToBackgroundScript(message);
  }

  function dispatchEvent (eventName) {
    let event = new Event(eventName);
    document.dispatchEvent(event);
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
        case MESSAGES_IDS.injectComponents:
          injectElements(message.content);
          break;
        case MESSAGES_IDS.dispatchStartEvent:
          dispatchEvent(message.content);
          break;
      }
    }
  });
})();
