chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'aura:post') {
    handlePost(message.text, message.imageUrl);
  } else if (message.action === 'aura:reply') {
    handleReply(message.text, message.tweetUrl, message.imageUrl);
  } else if (message.action === 'aura:log-activity') {
    handleLogActivity(message.platform, message.activityAction).then(result => {
      sendResponse(result);
    });
    return true;
  } else if (message.action === 'aura:image') {
    fetchImageBlob(message.imageUrl).then(blobData => {
      sendResponse({ blob: blobData });
    });
    return true;
  } else if (message.action === 'aura:generate-replies') {
    handleGenerateReplies(message.data).then(result => {
      sendResponse(result);
    });
    return true;
  } else if (message.action === 'aura:fetch-media-vault') {
    handleFetchMediaVault().then(result => {
      sendResponse(result);
    });
    return true;
  } else if (message.action === 'aura:get-status') {
    getAuraStatus().then(status => {
      sendResponse(status);
    });
    return true;
  }
});

async function getAuraStatus() {
  const result = await chrome.storage.local.get(['auraBaseUrl', 'posts_today', 'last_post_date']);
  const today = new Date().toISOString().split('T')[0];
  return {
    connected: !!result.auraBaseUrl,
    baseUrl: result.auraBaseUrl || null,
    postsToday: result.last_post_date === today ? (result.posts_today || 0) : 0
  };
}

async function handlePost(text, imageUrl) {
  let imageBlob = null;
  if (imageUrl) {
    let fullUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      const storage = await chrome.storage.local.get(['auraBaseUrl']);
      const baseUrl = storage.auraBaseUrl;
      if (baseUrl) {
        fullUrl = baseUrl.replace(/\/$/, '') + imageUrl;
      }
    }
    imageBlob = await fetchImageBlob(fullUrl);
  }

  const tab = await chrome.tabs.create({ url: 'https://x.com/compose/tweet' });
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "insert", text, imageBlob, filename: 'aura_image.jpg' });
        updateStats();
      }, 1000);
    }
  });
}

async function handleReply(text, tweetUrl, imageUrl) {
  let imageBlob = null;
  if (imageUrl) {
    let fullUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      const storage = await chrome.storage.local.get(['auraBaseUrl']);
      const baseUrl = storage.auraBaseUrl;
      if (baseUrl) {
        fullUrl = baseUrl.replace(/\/$/, '') + imageUrl;
      }
    }
    imageBlob = await fetchImageBlob(fullUrl);
  }

  const tab = await chrome.tabs.create({ url: tweetUrl });
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "insert", text, imageBlob, filename: 'aura_image.jpg', replyToUrl: tweetUrl });
        updateStats();
      }, 1000);
    }
  });
}

async function updateStats() {
  const today = new Date().toISOString().split('T')[0];
  const result = await chrome.storage.local.get(['posts_today', 'last_post_date']);

  let count = 0;
  if (result.last_post_date === today) {
    count = (result.posts_today || 0) + 1;
  } else {
    count = 1;
  }

  await chrome.storage.local.set({
    posts_today: count,
    last_post_date: today
  });
}

async function fetchImageBlob(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

async function findAuraTab() {
  const storage = await chrome.storage.local.get(['auraBaseUrl']);
  const baseUrl = storage.auraBaseUrl;

  if (baseUrl) {
    try {
      const tabs = await chrome.tabs.query({ url: baseUrl + '/*' });
      if (tabs.length > 0) return tabs[0];
    } catch (e) {}
  }

  const patterns = [
    'https://*.replit.dev/*',
    'https://*.repl.co/*',
    'https://*.replit.app/*'
  ];
  for (const pattern of patterns) {
    try {
      const tabs = await chrome.tabs.query({ url: pattern });
      if (tabs.length > 0) return tabs[0];
    } catch (e) {}
  }
  return null;
}

async function handleLogActivity(platform, action) {
  try {
    const auraTab = await findAuraTab();
    if (!auraTab) {
      return { error: 'Aura dashboard not open.' };
    }

    const today = new Date().toISOString().split('T')[0];

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ error: 'Activity log timed out.' }), 10000);
      chrome.tabs.sendMessage(auraTab.id, {
        action: 'aura:api-proxy',
        endpoint: '/api/extension/activity',
        method: 'POST',
        body: { platform, action, localDate: today }
      }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          resolve({ error: 'Could not reach Aura dashboard.' });
          return;
        }
        resolve(response || { success: true });
      });
    });
  } catch (error) {
    return { error: error.message };
  }
}

async function handleFetchMediaVault() {
  try {
    const storage = await chrome.storage.local.get(['auraBaseUrl']);
    const baseUrl = storage.auraBaseUrl;
    if (!baseUrl) {
      return { error: 'Aura dashboard URL not configured. Open your dashboard once to connect.' };
    }

    const url = baseUrl.replace(/\/$/, '') + '/api/extension/media-vault';
    const resp = await fetch(url, { method: 'GET' });

    if (!resp.ok) {
      return { error: `API error: ${resp.status}` };
    }

    return await resp.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function handleGenerateReplies(data) {
  try {
    const storage = await chrome.storage.local.get(['auraBaseUrl']);
    const baseUrl = storage.auraBaseUrl;
    if (!baseUrl) {
      return { error: 'Aura dashboard URL not configured. Open your dashboard once to connect.' };
    }

    const url = baseUrl.replace(/\/$/, '') + '/api/extension/generate-replies';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { error: `API error ${resp.status}: ${text}` };
    }

    return await resp.json();
  } catch (error) {
    console.error('Error in handleGenerateReplies:', error);
    return { error: error.message };
  }
}
