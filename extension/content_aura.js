/**
 * Aura Content Script (Aura Dashboard Bridge)
 * This script runs on the Aura dashboard domain and acts as a bridge between
 * the web application and the extension's background script.
 */

(function() {
  console.log('Aura Extension: Content script (Aura dashboard) loaded.');

  chrome.storage.local.set({ auraBaseUrl: window.location.origin }, () => {
    console.log('Aura Extension: Saved dashboard URL:', window.location.origin);
  });

  function injectConnectionIndicator() {
    if (document.getElementById('aura-extension-status')) return;

    const indicator = document.createElement('div');
    indicator.id = 'aura-extension-status';
    indicator.setAttribute('data-aura-connected', 'true');
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10px';
    indicator.style.right = '10px';
    indicator.style.zIndex = '9999';
    indicator.style.padding = '4px 8px';
    indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    indicator.style.borderRadius = '20px';
    indicator.style.display = 'flex';
    indicator.style.alignItems = 'center';
    indicator.style.color = '#fff';
    indicator.style.fontSize = '12px';
    indicator.style.fontFamily = 'sans-serif';
    indicator.style.pointerEvents = 'none';
    indicator.style.border = '1px solid rgba(147, 51, 234, 0.5)'; // Purple border

    const dot = document.createElement('span');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.backgroundColor = '#22c55e'; // Green dot
    dot.style.borderRadius = '50%';
    dot.style.marginRight = '6px';
    dot.style.boxShadow = '0 0 5px #22c55e';

    const text = document.createElement('span');
    text.textContent = 'Aura Extension Connected';

    indicator.appendChild(dot);
    indicator.appendChild(text);
    document.body.appendChild(indicator);
  }

  // 2. Listen for messages from the Aura web app
  window.addEventListener('message', function(event) {
    // We only accept messages from ourselves
    if (event.source !== window) return;

    const data = event.data;

    if (data && data.type === 'aura-extension-action') {
      console.log('Aura Extension: Forwarding action to background script', data.action);

      // Forward to background script
      chrome.runtime.sendMessage(data.payload, function(response) {
        // Send result back to the page
        window.postMessage({
          type: 'aura-extension-result',
          action: data.action,
          payload: response
        }, '*');
      });
    }
  });

  // Run on load and periodically in case of SPA navigation
  injectConnectionIndicator();
  setInterval(injectConnectionIndicator, 2000);
})();
