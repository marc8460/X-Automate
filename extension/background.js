// ─── Creator Monitor (Server-Side) ───

const MAX_TRACKED_CREATORS = 200;

async function syncCreatorsToServer(platform) {
  try {
    const store = await chrome.storage.local.get(['auraBaseUrl']);
    const baseUrl = store.auraBaseUrl;
    if (!baseUrl) return;

    const { listKey } = getStorageKeys(platform);
    const avatarKey = `aura_avatars_${platform}`;
    const data = await chrome.storage.local.get([listKey, avatarKey]);
    const usernames = data[listKey] || [];
    const avatars = data[avatarKey] || {};

    const creators = usernames.map(u => ({ username: u, avatarUrl: avatars[u] || null }));

    const url = baseUrl.replace(/\/$/, '') + '/api/creators/sync';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creators, platform })
    });

    if (resp.ok) {
      console.log(`[Aura] Synced ${usernames.length} ${platform} creators to server`);
    }
  } catch (err) {
    console.error(`[Aura] Server sync error:`, err);
  }
}

async function migrateOldWatchlist() {
  const store = await chrome.storage.local.get(['aura_creator_watchlist', 'aura_creator_last_posts']);
  if (!store.aura_creator_watchlist) return;

  const oldList = store.aura_creator_watchlist;
  const xStore = await chrome.storage.local.get(['aura_watchlist_x']);
  const existingX = xStore.aura_watchlist_x || [];
  const mergedX = [...new Set([...existingX, ...oldList])];

  await chrome.storage.local.set({ aura_watchlist_x: mergedX });
  await chrome.storage.local.remove(['aura_creator_watchlist', 'aura_creator_last_posts']);
  console.log(`[Aura] Migrated ${oldList.length} creators from old format to X watchlist`);
  syncCreatorsToServer('x');
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

  await chrome.storage.local.set({ [listKey]: watchlist, [postsKey]: lastPosts });
  syncCreatorsToServer(platform);

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
  syncCreatorsToServer(platform);

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

async function handleBulkImportCreators(creatorsInput, platform) {
  const { listKey, postsKey } = getStorageKeys(platform);
  const avatarKey = `aura_avatars_${platform}`;
  const storageData = await chrome.storage.local.get([listKey, postsKey, avatarKey]);
  const watchlist = storageData[listKey] || [];
  const lastPosts = storageData[postsKey] || {};
  const avatars = storageData[avatarKey] || {};

  let added = 0;
  let skipped = 0;
  let capped = 0;

  const items = Array.isArray(creatorsInput)
    ? creatorsInput.map(c => typeof c === 'string' ? { username: c, avatarUrl: null } : c)
    : [];

  for (const item of items) {
    const clean = (item.username || '').replace(/^@/, '').trim().toLowerCase();
    if (!clean || clean.length < 1) { skipped++; continue; }
    if (watchlist.includes(clean)) {
      if (item.avatarUrl && !avatars[clean]) avatars[clean] = item.avatarUrl;
      skipped++;
      continue;
    }
    if (watchlist.length >= MAX_TRACKED_CREATORS) { capped++; continue; }
    watchlist.push(clean);
    if (item.avatarUrl) avatars[clean] = item.avatarUrl;
    added++;
  }

  await chrome.storage.local.set({ [listKey]: watchlist, [postsKey]: lastPosts, [avatarKey]: avatars });
  syncCreatorsToServer(platform);

  const all = await getAllWatchlists();
  return { ...all, added, skipped, capped };
}

migrateOldWatchlist().then(() => {
  syncCreatorsToServer('x');
  syncCreatorsToServer('threads');
});

// ─── Message Listener ───

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'aura:bulk-import-creators') {
    handleBulkImportCreators(message.creators || message.usernames || [], message.platform || 'threads').then(r => sendResponse(r));
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
  } else if (message.action === 'aura:flush-pending-activities') {
    flushPendingActivities().then(() => sendResponse({ ok: true }));
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
  const today = new Date().toLocaleDateString('en-CA');
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
        handleLogActivity('x', 'post_created');
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
        handleLogActivity('x', 'reply_posted');
      }, 1000);
    }
  });
}

async function updateStats() {
  const today = new Date().toLocaleDateString('en-CA');
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
  const today = new Date().toLocaleDateString('en-CA');
  const payload = { platform, action, localDate: today };

  try {
    const store = await chrome.storage.local.get(['auraBaseUrl']);
    const baseUrl = store.auraBaseUrl;
    if (!baseUrl) {
      await queuePendingActivity(payload);
      return { error: 'Aura dashboard URL not configured.' };
    }

    const url = baseUrl.replace(/\/$/, '') + '/api/extension/activity';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      console.log(`[Aura] Activity logged: ${platform}/${action}`);
      return await resp.json();
    }

    const text = await resp.text();
    console.warn(`[Aura] Activity log API error ${resp.status}:`, text);
    await queuePendingActivity(payload);
    return { error: `API error: ${resp.status}` };
  } catch (error) {
    console.warn('[Aura] Activity log failed, queued for retry:', error.message);
    await queuePendingActivity(payload);
    return { error: error.message };
  }
}

async function queuePendingActivity(payload) {
  try {
    const store = await chrome.storage.local.get(['aura_pending_activities']);
    const pending = store.aura_pending_activities || [];
    pending.push(payload);
    if (pending.length > 200) pending.splice(0, pending.length - 200);
    await chrome.storage.local.set({ aura_pending_activities: pending });
  } catch (e) {
    console.error('[Aura] Failed to queue activity:', e);
  }
}

async function flushPendingActivities() {
  try {
    const store = await chrome.storage.local.get(['auraBaseUrl', 'aura_pending_activities']);
    const baseUrl = store.auraBaseUrl;
    const pending = store.aura_pending_activities || [];
    if (!baseUrl || pending.length === 0) return;

    const url = baseUrl.replace(/\/$/, '') + '/api/extension/activity';
    const succeeded = [];

    for (let i = 0; i < pending.length; i++) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pending[i])
        });
        if (resp.ok) succeeded.push(i);
      } catch (e) {
        break;
      }
    }

    if (succeeded.length > 0) {
      const remaining = pending.filter((_, i) => !succeeded.includes(i));
      await chrome.storage.local.set({ aura_pending_activities: remaining });
      console.log(`[Aura] Flushed ${succeeded.length} pending activities`);
    }
  } catch (e) {
    console.error('[Aura] Flush pending activities error:', e);
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
