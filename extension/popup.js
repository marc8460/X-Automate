document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('dashboard-status');
  const postsCountEl = document.getElementById('posts-count');
  const openDashboardBtn = document.getElementById('open-dashboard');

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
});
