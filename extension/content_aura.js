/**
 * Aura Content Script (Aura Dashboard Bridge)
 * Runs on the Aura dashboard domain. Acts as a bridge between
 * the extension (background/content_x) and the Aura API server.
 */

(function() {
  console.log('Aura Extension: Content script (Aura dashboard) loaded.');

  function isRealAuraDashboard() {
    if (document.querySelector('#root')) return true;
    if (document.title && document.title.toLowerCase().includes('aura')) return true;
    if (document.querySelector('[data-aura-app]')) return true;
    return false;
  }

  function trySaveBaseUrl() {
    if (isRealAuraDashboard()) {
      chrome.storage.local.set({ auraBaseUrl: window.location.origin }, () => {
        console.log('Aura Extension: Saved dashboard URL:', window.location.origin);
      });
    } else {
      console.log('Aura Extension: Page does not appear to be Aura dashboard, skipping URL save.');
    }
  }

  setTimeout(trySaveBaseUrl, 1000);

  function injectConnectionIndicator() {
    if (document.getElementById('aura-extension-status')) return;
    if (!isRealAuraDashboard()) return;

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
    indicator.style.border = '1px solid rgba(147, 51, 234, 0.5)';

    const dot = document.createElement('span');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.backgroundColor = '#22c55e';
    dot.style.borderRadius = '50%';
    dot.style.marginRight = '6px';
    dot.style.boxShadow = '0 0 5px #22c55e';

    const text = document.createElement('span');
    text.textContent = 'Aura Extension Connected';

    indicator.appendChild(dot);
    indicator.appendChild(text);
    document.body.appendChild(indicator);
  }

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    const data = event.data;

    if (data && data.type === 'aura-extension-action') {
      console.log('Aura Extension: Forwarding action to background script', data.action);
      chrome.runtime.sendMessage(data.payload, function(response) {
        window.postMessage({
          type: 'aura-extension-result',
          action: data.action,
          payload: response
        }, '*');
      });
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'aura:api-proxy') {
      const { endpoint, method, body } = request;
      console.log('Aura Extension: Proxying API call to', endpoint);

      const fetchOpts = {
        method: method || 'POST',
        credentials: 'same-origin',
      };
      if (body && method !== 'GET') {
        fetchOpts.headers = { 'Content-Type': 'application/json' };
        fetchOpts.body = JSON.stringify(body);
      }
      fetch(endpoint, fetchOpts)
        .then(async (response) => {
          const contentType = response.headers.get('content-type') || '';
          if (!response.ok) {
            if (contentType.includes('application/json')) {
              const errBody = await response.json();
              sendResponse({ error: errBody.message || `Server error: ${response.status}` });
            } else {
              const text = await response.text();
              sendResponse({ error: `Server error ${response.status}: ${text.substring(0, 100)}` });
            }
            return;
          }
          if (contentType.includes('application/json')) {
            const json = await response.json();
            sendResponse(json);
          } else {
            sendResponse({ error: 'Server returned non-JSON response' });
          }
        })
        .catch((err) => {
          console.error('Aura Extension: API proxy error:', err);
          sendResponse({ error: err.message || 'Network error' });
        });

      return true;
    }
  });

  injectConnectionIndicator();
  setInterval(injectConnectionIndicator, 2000);
})();
