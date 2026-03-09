// ─── Creator Monitor (Alarm-based polling) ───

const CREATOR_MONITOR_ALARM = 'aura-creator-monitor';
const POLL_INTERVAL_MINUTES = 0.75;
const MAX_TRACKED_CREATORS = 200;

chrome.alarms.create(CREATOR_MONITOR_ALARM, { periodInMinutes: POLL_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CREATOR_MONITOR_ALARM) {
    migrateOldWatchlist().then(() => pollCreatorWatchlist());
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('aura-creator-')) {
    const postUrl = notificationId.replace('aura-creator-', '');
    chrome.tabs.create({ url: postUrl });
    chrome.notifications.clear(notificationId);
  }
});

async function migrateOldWatchlist() {
  const storage = await chrome.storage.local.get(['aura_creator_watchlist', 'aura_creator_last_posts']);
  if (!storage.aura_creator_watchlist) return;

  const oldList = storage.aura_creator_watchlist;
  const oldPosts = storage.aura_creator_last_posts || {};

  const xStorage = await chrome.storage.local.get(['aura_watchlist_x']);
  const existingX = xStorage.aura_watchlist_x || [];

  const mergedX = [...new Set([...existingX, ...oldList])];

  await chrome.storage.local.set({
    aura_watchlist_x: mergedX,
    aura_lastposts_x: oldPosts
  });

  await chrome.storage.local.remove(['aura_creator_watchlist', 'aura_creator_last_posts']);
  console.log(`[Aura] Migrated ${oldList.length} creators from old format to X watchlist`);
}

async function pollCreatorWatchlist() {
  try {
    const storage = await chrome.storage.local.get(['aura_watchlist_threads', 'aura_lastposts_threads']);
    const watchlist = storage.aura_watchlist_threads || [];
    const lastPosts = storage.aura_lastposts_threads || {};

    if (watchlist.length === 0) return;

    for (const username of watchlist) {
      try {
        const latestPost = await fetchLatestPostForCreator(username);
        if (!latestPost) continue;

        const previousPostId = lastPosts[username];
        if (previousPostId && previousPostId === latestPost.postId) continue;

        if (previousPostId) {
          const postUrl = `https://www.threads.net/@${username}/post/${latestPost.postId}`;
          chrome.notifications.create(`aura-creator-${postUrl}`, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: `🔥 New post from @${username}`,
            message: 'Posted just now — Reply early for maximum reach',
            priority: 2
          });
        }

        lastPosts[username] = latestPost.postId;
      } catch (err) {
        console.error(`[Aura] Error polling @${username}:`, err);
      }
    }

    await chrome.storage.local.set({ aura_lastposts_threads: lastPosts });
  } catch (err) {
    console.error('[Aura] Creator monitor error:', err);
  }
}

async function fetchLatestPostForCreator(username) {
  try {
    const resp = await fetch(`https://www.threads.net/@${username}`, {
      headers: { 'Accept': 'text/html' }
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    const postPattern = new RegExp(`/@${username}/post/([A-Za-z0-9_-]+)`, 'g');
    const matches = [];
    let match;
    while ((match = postPattern.exec(html)) !== null) {
      if (!matches.includes(match[1])) matches.push(match[1]);
    }

    if (matches.length === 0) return null;
    return { postId: matches[0] };
  } catch (err) {
    console.error(`[Aura] Fetch error for @${username}:`, err);
    return null;
  }
}

function getStorageKeys(platform) {
  const p = platform === 'x' ? 'x' : 'threads';
  return { listKey: `aura_watchlist_${p}`, postsKey: `aura_lastposts_${p}` };
}

async function handleAddCreator(username, platform) {
  const clean = username.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return { error: 'Empty username' };

  const { listKey, postsKey } = getStorageKeys(platform);
  const storage = await chrome.storage.local.get([listKey, postsKey]);
  const watchlist = storage[listKey] || [];
  const lastPosts = storage[postsKey] || {};

  if (watchlist.includes(clean)) {
    const all = await getAllWatchlists();
    return { ...all, message: 'Already tracking' };
  }

  if (watchlist.length >= MAX_TRACKED_CREATORS) {
    const all = await getAllWatchlists();
    return { ...all, error: 'Creator limit reached (200)' };
  }

  watchlist.push(clean);

  if (platform === 'threads') {
    const latestPost = await fetchLatestPostForCreator(clean);
    if (latestPost) {
      lastPosts[clean] = latestPost.postId;
    }
  }

  await chrome.storage.local.set({ [listKey]: watchlist, [postsKey]: lastPosts });

  const all = await getAllWatchlists();
  return { ...all, message: `Now tracking @${clean}` };
}

async function handleRemoveCreator(username, platform) {
  const clean = username.replace(/^@/, '').trim().toLowerCase();
  const { listKey, postsKey } = getStorageKeys(platform);
  const storage = await chrome.storage.local.get([listKey, postsKey]);
  let watchlist = storage[listKey] || [];
  const lastPosts = storage[postsKey] || {};

  watchlist = watchlist.filter(u => u !== clean);
  delete lastPosts[clean];

  await chrome.storage.local.set({ [listKey]: watchlist, [postsKey]: lastPosts });

  const all = await getAllWatchlists();
  return { ...all, message: `Stopped tracking @${clean}` };
}

async function getAllWatchlists() {
  const storage = await chrome.storage.local.get(['aura_watchlist_x', 'aura_watchlist_threads']);
  return {
    x: storage.aura_watchlist_x || [],
    threads: storage.aura_watchlist_threads || []
  };
}

async function handleGetWatchlist() {
  await migrateOldWatchlist();
  return await getAllWatchlists();
}

async function handleBulkImportCreators(usernames, platform) {
  const { listKey, postsKey } = getStorageKeys(platform);
  const storage = await chrome.storage.local.get([listKey, postsKey]);
  const watchlist = storage[listKey] || [];
  const lastPosts = storage[postsKey] || {};

  let added = 0;
  let skipped = 0;
  let capped = 0;

  for (const raw of usernames) {
    const clean = raw.replace(/^@/, '').trim().toLowerCase();
    if (!clean || clean.length < 1) { skipped++; continue; }
    if (watchlist.includes(clean)) { skipped++; continue; }
    if (watchlist.length >= MAX_TRACKED_CREATORS) { capped++; continue; }
    watchlist.push(clean);
    added++;
  }

  await chrome.storage.local.set({ [listKey]: watchlist, [postsKey]: lastPosts });

  const all = await getAllWatchlists();
  return { ...all, added, skipped, capped };
}

// ─── Message Listener ───

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'aura:bulk-import-creators') {
    handleBulkImportCreators(message.usernames || [], message.platform || 'threads').then(r => sendResponse(r));
    return true;
  } else if (message.action === 'aura:add-creator') {
    handleAddCreator(message.username, message.platform || 'threads').then(r => sendResponse(r));
    return true;
  } else if (message.action === 'aura:remove-creator') {
    handleRemoveCreator(message.username, message.platform || 'threads').then(r => sendResponse(r));
    return true;
  } else if (message.action === 'aura:get-watchlist') {
    handleGetWatchlist().then(r => sendResponse(r));
    return true;
  } else if (message.action === 'aura:post') {
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
