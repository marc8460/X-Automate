// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'aura:post') {
    handlePost(message.text, message.imageUrl);
  } else if (message.action === 'aura:reply') {
    handleReply(message.text, message.tweetUrl, message.imageUrl);
  } else if (message.action === 'aura:image') {
    fetchImageBlob(message.imageUrl).then(blobData => {
      sendResponse({ blob: blobData });
    });
    return true; // Keep message channel open
  } else if (message.action === 'aura:generate-replies') {
    proxyGenerateReplies(message.data).then(result => {
      sendResponse(result);
    });
    return true; // Keep message channel open
  }
});

async function handlePost(text, imageUrl) {
  const tab = await chrome.tabs.create({ url: 'https://x.com/compose/tweet' });
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      // Wait a bit for the page scripts to initialize
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
      // Wait a bit for the page scripts to initialize
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
    // Convert to base64 to send across message channel
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

async function proxyGenerateReplies(data) {
  try {
    // Get the base URL from the sender's tab if it's from Aura
    const response = await fetch(data.baseUrl + '/api/extension/generate-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error proxying generate replies:', error);
    return { error: error.message };
  }
}
