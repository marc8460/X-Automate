document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('dashboard-status');
  const postsCountEl = document.getElementById('posts-count');
  const openDashboardBtn = document.getElementById('open-dashboard');
  const watchlistInput = document.getElementById('watchlist-input');
  const watchlistAddBtn = document.getElementById('watchlist-add-btn');
  const xListEl = document.getElementById('watchlist-list-x');
  const threadsListEl = document.getElementById('watchlist-list-threads');
  const xCountEl = document.getElementById('x-count');
  const threadsCountEl = document.getElementById('threads-count');
  const platformXBtn = document.getElementById('platform-x');
  const platformThreadsBtn = document.getElementById('platform-threads');

  let selectedPlatform = 'x';

  platformXBtn.addEventListener('click', () => {
    selectedPlatform = 'x';
    platformXBtn.style.background = 'var(--primary)';
    platformXBtn.style.color = 'white';
    platformThreadsBtn.style.background = 'var(--card)';
    platformThreadsBtn.style.color = 'var(--muted)';
  });

  platformThreadsBtn.addEventListener('click', () => {
    selectedPlatform = 'threads';
    platformThreadsBtn.style.background = 'var(--primary)';
    platformThreadsBtn.style.color = 'white';
    platformXBtn.style.background = 'var(--card)';
    platformXBtn.style.color = 'var(--muted)';
  });

  const checkConnection = async () => {
    try {
      const storage = await chrome.storage.local.get(['auraBaseUrl']);
      const baseUrl = storage.auraBaseUrl;

      if (baseUrl) {
        const tabs = await chrome.tabs.query({ url: baseUrl + '/*' });
        if (tabs.length > 0) {
          statusEl.innerHTML = '<span class="dot connected"></span> Connected';
        } else {
          statusEl.innerHTML = '<span class="dot disconnected"></span> Dashboard closed';
        }
      } else {
        statusEl.innerHTML = '<span class="dot disconnected"></span> Not configured';
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await chrome.storage.local.get(['posts_today', 'last_post_date']);

      if (result.last_post_date === today) {
        postsCountEl.textContent = result.posts_today || 0;
      } else {
        postsCountEl.textContent = 0;
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  function renderPlatformList(listEl, creators, platform) {
    if (creators.length === 0) {
      listEl.innerHTML = '<div class="watchlist-empty">No creators tracked</div>';
      return;
    }
    listEl.innerHTML = creators.map(u => `
      <div class="watchlist-item">
        <span class="username">@${u}</span>
        <button class="watchlist-remove" data-username="${u}" data-platform="${platform}" title="Remove">&times;</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.watchlist-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.dataset.username;
        const plat = btn.dataset.platform;
        btn.textContent = '...';
        chrome.runtime.sendMessage({ action: 'aura:remove-creator', username, platform: plat }, (resp) => {
          if (resp) renderWatchlists(resp);
        });
      });
    });
  }

  function renderWatchlists(data) {
    const xList = data.x || [];
    const threadsList = data.threads || [];
    xCountEl.textContent = xList.length;
    threadsCountEl.textContent = threadsList.length;
    renderPlatformList(xListEl, xList, 'x');
    renderPlatformList(threadsListEl, threadsList, 'threads');
  }

  function loadWatchlist() {
    chrome.runtime.sendMessage({ action: 'aura:get-watchlist' }, (resp) => {
      if (resp) renderWatchlists(resp);
    });
  }

  function addCreator() {
    const username = watchlistInput.value.trim();
    if (!username) return;
    watchlistAddBtn.textContent = '...';
    watchlistAddBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'aura:add-creator', username, platform: selectedPlatform }, (resp) => {
      watchlistAddBtn.textContent = 'Track';
      watchlistAddBtn.disabled = false;
      watchlistInput.value = '';
      if (resp) renderWatchlists(resp);
    });
  }

  watchlistAddBtn.addEventListener('click', addCreator);
  watchlistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCreator();
  });

  openDashboardBtn.addEventListener('click', async () => {
    const storage = await chrome.storage.local.get(['auraBaseUrl']);
    if (storage.auraBaseUrl) {
      chrome.tabs.create({ url: storage.auraBaseUrl });
    } else {
      openDashboardBtn.textContent = 'Open dashboard from Replit first';
      openDashboardBtn.style.opacity = '0.6';
      setTimeout(() => {
        openDashboardBtn.textContent = 'Open Aura Dashboard';
        openDashboardBtn.style.opacity = '1';
      }, 3000);
    }
  });

  checkConnection();
  loadStats();
  loadWatchlist();
});
