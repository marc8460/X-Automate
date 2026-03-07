chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'aura:post') {
    handlePost(message.text, message.imageUrl);
  } else if (message.action === 'aura:reply') {
    handleReply(message.text, message.tweetUrl, message.imageUrl);
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
  const tab = await chrome.tabs.create({ url: 'https://x.com/compose/tweet' });
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "insert", text, imageUrl });
        updateStats();
      }, 1000);
    }
  });
}

async function handleReply(text, tweetUrl, imageUrl) {
  const tab = await chrome.tabs.create({ url: tweetUrl });
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "insert", text, imageUrl, replyToUrl: tweetUrl });
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

async function handleFetchMediaVault() {
  try {
    const auraTab = await findAuraTab();
    if (!auraTab) {
      return { error: 'Please open your Aura dashboard first.' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ error: 'Request timed out.' });
      }, 15000);

      chrome.tabs.sendMessage(auraTab.id, {
        action: 'aura:api-proxy',
        endpoint: '/api/extension/media-vault',
        method: 'GET',
        body: null
      }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          resolve({ error: 'Could not reach Aura dashboard tab.' });
          return;
        }
        resolve(response || { error: 'No response from Aura dashboard.' });
      });
    });
  } catch (error) {
    return { error: error.message };
  }
}

async function handleGenerateReplies(data) {
  try {
    const auraTab = await findAuraTab();
    if (!auraTab) {
      return { error: 'Please open your Aura dashboard in another tab first, then try again.' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ error: 'Request timed out. Please refresh your Aura dashboard tab and try again.' });
      }, 30000);

      chrome.tabs.sendMessage(auraTab.id, {
        action: 'aura:api-proxy',
        endpoint: '/api/extension/generate-replies',
        method: 'POST',
        body: data.payload
      }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          resolve({ error: 'Could not reach Aura dashboard tab. Please refresh your dashboard and try again.' });
          return;
        }
        resolve(response || { error: 'No response from Aura dashboard.' });
      });
    });
  } catch (error) {
    console.error('Error in handleGenerateReplies:', error);
    return { error: error.message };
  }
}
