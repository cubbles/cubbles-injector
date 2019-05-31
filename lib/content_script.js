(function() {
  'use srtrict';

  const MESSAGES_IDS = {
    injectScripts: 'inject-scripts',
    injectSnippets: 'inject-snippets',
    dispatchStartEvent: 'dispatch-start-event',
  };
  const DEFAULT_CONTAINER_SELECTOR = 'body';

  function injectSimmerScript() {
    const injectedScriptId = 'cubx-injector-simmer-script';
    let injectedScript = document.querySelector('#' + injectedScriptId);
    if (!injectedScript) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = chrome.extension.getURL('vendor/simmer/simmer.js');
      script.setAttribute('id', injectedScriptId);
      document.body.appendChild(script);
    }
  }

  /**
   * @param {String} HTML representing a single element
   * @return {Element}
   * See: https://stackoverflow.com/a/35385518/8082984
   */
  function htmlToElements(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.children;
  }

  function injectScript(html) {
    let foreignScripts = htmlToElements(html);
    for (let i = 0; i < foreignScripts.length; i++) {
      let foreignScript = foreignScripts[i];
      if (foreignScript.tagName.toLowerCase() !== 'script') {
        console.error(
          `The element to be injected is not a script, instead it is: ${script.tagName}`
        );
      } else {
        document.head.appendChild(cloneElement(foreignScript));
      }
    }
  }

  function cloneElement(element) {
    let clonedElement = document.createElement(element.tagName);
    if (element.hasAttributes()) {
      let attrs = element.attributes;
      for (let i = attrs.length - 1; i >= 0; i--) {
        clonedElement.setAttribute(attrs[i].name, attrs[i].value);
      }
    }
    clonedElement.innerHTML = element.innerHTML || '';
    return clonedElement;
  }

  function injectSnippet(html, containerSelector, position) {
    if (!containerSelector) {
      containerSelector = DEFAULT_CONTAINER_SELECTOR;
    }
    let container = document.querySelector(containerSelector);
    if (!container) {
      console.error(
        `The container for the injection was not found. Selector: ${containerSelector}.
        The default container will be used: ${DEFAULT_CONTAINER_SELECTOR}`
      );
      container = document.querySelector(DEFAULT_CONTAINER_SELECTOR); 
    }
    let snippets = htmlToElements(html);
    for (let i = 0; i < snippets.length; i++) {
      switch (position) {
        case 'beginning':
          container.insertBefore(cloneElement(snippets[snippets.length - (i + 1)]), container.firstChild)
        break;
        case 'beforeSelected':
          container.before(cloneElement(snippets[i]));
        break;        
        case 'afterSelected':
          container.after(cloneElement(snippets[snippets.length - (i + 1)]));
        break;
        default:
          container.appendChild(cloneElement(snippets[i]));
        break;
      } 
    }
  }

  function injectScripts(scriptsCode) {
    scriptsCode.forEach(function(scriptCode) {
      injectScript(scriptCode);
    });
  }

  function injectSnippets(snippets) {
    snippets.forEach(function(snippetInfo) {
      injectSnippet(snippetInfo.html, snippetInfo.containerSelector, snippetInfo.position);
    });
  }

  window.addEventListener('message', handleMessages);

  function handleMessages(event) {
    // Only accept messages from the same frame
    if (event.source !== window) {
      return;
    }

    var message = event.data;

    // Only accept messages that we know are ours
    if (typeof message !== 'object' || message === null || message.source !== 'cubbles-injector') {
      return;
    }
    sendMessageToBackgroundScript(message);
  }

  function dispatchEvent(eventName) {
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
      console.warn('Connection to background script could not be established');
    }
  }

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message && message.hasOwnProperty('name')) {
      switch (message.name) {
        case MESSAGES_IDS.injectScripts:
          injectScripts(message.content);
          break;
        case MESSAGES_IDS.injectSnippets:
          injectSnippets(message.content);
          break;
        case MESSAGES_IDS.dispatchStartEvent:
          dispatchEvent(message.content);
          break;
      }
    }
  });

  injectSimmerScript();
})();
