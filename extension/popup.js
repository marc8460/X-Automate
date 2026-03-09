document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('dashboard-status');
  const postsCountEl = document.getElementById('posts-count');
  const openDashboardBtn = document.getElementById('open-dashboard');
  const watchlistInput = document.getElementById('watchlist-input');
  const watchlistAddBtn = document.getElementById('watchlist-add-btn');
  const watchlistListEl = document.getElementById('watchlist-list');
  const watchlistCountEl = document.getElementById('watchlist-count');

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

  function renderWatchlist(watchlist) {
    watchlistCountEl.textContent = `${watchlist.length} tracked`;
    if (watchlist.length === 0) {
      watchlistListEl.innerHTML = '<div class="watchlist-empty">No creators tracked yet</div>';
      return;
    }
    watchlistListEl.innerHTML = watchlist.map(u => `
      <div class="watchlist-item">
        <span class="username">@${u}</span>
        <button class="watchlist-remove" data-username="${u}" title="Remove">&times;</button>
      </div>
    `).join('');

    watchlistListEl.querySelectorAll('.watchlist-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.dataset.username;
        btn.textContent = '...';
        chrome.runtime.sendMessage({ action: 'aura:remove-creator', username }, (resp) => {
          if (resp && resp.watchlist) renderWatchlist(resp.watchlist);
        });
      });
    });
  }

  function loadWatchlist() {
    chrome.runtime.sendMessage({ action: 'aura:get-watchlist' }, (resp) => {
      renderWatchlist(resp && resp.watchlist ? resp.watchlist : []);
    });
  }

  function addCreator() {
    const username = watchlistInput.value.trim();
    if (!username) return;
    watchlistAddBtn.textContent = '...';
    watchlistAddBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'aura:add-creator', username }, (resp) => {
      watchlistAddBtn.textContent = 'Track';
      watchlistAddBtn.disabled = false;
      watchlistInput.value = '';
      if (resp && resp.watchlist) renderWatchlist(resp.watchlist);
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
