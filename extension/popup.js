// extension/popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('dashboard-status');
  const postsCountEl = document.getElementById('posts-count');
  const openDashboardBtn = document.getElementById('open-dashboard');

  // 1. Check if Aura Dashboard is open in any tab
  const checkConnection = async () => {
    try {
      const tabs = await chrome.tabs.query({
        url: [
          "https://*.repl.co/*",
          "https://*.replit.app/*"
        ]
      });

      if (tabs.length > 0) {
        statusEl.innerHTML = '<span class="dot connected"></span> Connected';
      } else {
        statusEl.innerHTML = '<span class="dot disconnected"></span> Disconnected';
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  };

  // 2. Load stats from storage
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

  // 3. Open dashboard button
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://aura.replit.app' }); // Fallback or dynamic URL
  });

  // Initial checks
  checkConnection();
  loadStats();
});
