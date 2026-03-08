// Aura Content Script for Threads.net
// Persistent floating widget + in-feed post analysis + viral reply generator

let auraBaseUrl = null;
let badgesEnabled = true;
let activePanel = null;

chrome.storage.local.get(['auraBaseUrl', 'aura_badges_enabled'], (result) => {
  auraBaseUrl = result.auraBaseUrl || null;
  badgesEnabled = result.aura_badges_enabled !== false;
  console.log('Aura Threads: Loaded config — baseUrl:', auraBaseUrl, 'badges:', badgesEnabled);
});

// ─── Text Insertion ───

function findComposer() {
  // Threads composer is typically a div with contenteditable="true" or a role="textbox"
  const selectors = [
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
    '[role="textbox"]'
  ];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      // Avoid finding the search bar or other non-composer textboxes
      if (el.closest('[role="dialog"]') || el.closest('form')) {
         return el;
      }
    }
  }
  return document.querySelector('div[contenteditable="true"]');
}

async function insertText(element, text) {
  element.focus();
  // Clear existing text if any (optional, but usually desired for a fresh reply)
  // document.execCommand('selectAll', false, null);
  // document.execCommand('delete', false, null);
  
  for (const char of text) {
    const delay = Math.floor(Math.random() * 21) + 10;
    await new Promise(resolve => setTimeout(resolve, delay));
    document.execCommand('insertText', false, char);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function waitForComposer(timeout = 10000) {
  const startTime = Date.now();
  let delay = 100;
  while (Date.now() - startTime < timeout) {
    const el = findComposer();
    if (el) return el;
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 1000);
  }
  throw new Error('Timeout waiting for composer');
}

// ─── Toast ───

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 80px; right: 20px;
    background: #7c3aed; color: white;
    padding: 12px 24px; border-radius: 9999px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-weight: bold; z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: aura-fade-in 0.3s ease-out;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// ─── Styles ───

const auraStyles = document.createElement('style');
auraStyles.textContent = `
  @keyframes aura-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes aura-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(124, 58, 237, 0); }
  }
  @keyframes aura-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .aura-fab {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    border: none;
    cursor: pointer;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    animation: aura-pulse 2s infinite;
  }
  .aura-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 24px rgba(124, 58, 237, 0.6);
  }
  .aura-fab svg {
    width: 26px;
    height: 26px;
    fill: white;
  }

  .aura-widget {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 280px;
    background: #101010;
    border: 1px solid #333;
    border-radius: 16px;
    z-index: 2147483646;
    color: white;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
    animation: aura-fade-in 0.2s ease-out;
  }
  .aura-widget-header {
    padding: 14px 16px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: bold;
    font-size: 15px;
  }
  .aura-widget-body {
    padding: 16px;
  }
  .aura-widget-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(51, 51, 51, 0.5);
    font-size: 13px;
  }
  .aura-widget-row:last-child { border-bottom: none; }
  .aura-widget-label { color: #999; }
  .aura-widget-value { font-weight: bold; }
  .aura-status-dot {
    width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px;
  }
  .aura-status-dot.connected { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
  .aura-status-dot.disconnected { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
  .aura-widget-btn {
    display: block;
    width: 100%;
    padding: 10px;
    margin-top: 12px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    color: white;
    border: none;
    border-radius: 9999px;
    font-weight: bold;
    font-size: 13px;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  .aura-widget-btn:hover { opacity: 0.9; }

  .aura-toggle {
    position: relative; width: 40px; height: 22px; cursor: pointer;
  }
  .aura-toggle input { opacity: 0; width: 0; height: 0; }
  .aura-toggle-slider {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: #333; border-radius: 22px; transition: background 0.2s;
  }
  .aura-toggle-slider::before {
    content: ''; position: absolute; height: 16px; width: 16px;
    left: 3px; bottom: 3px; background: white; border-radius: 50%;
    transition: transform 0.2s;
  }
  .aura-toggle input:checked + .aura-toggle-slider { background: #7c3aed; }
  .aura-toggle input:checked + .aura-toggle-slider::before { transform: translateX(18px); }

  .aura-analyze-btn {
    position: absolute;
    right: 12px;
    top: 12px;
    background: #7c3aed;
    color: white;
    border: none;
    border-radius: 9999px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s, background 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  /* Threads post container selector */
  div[style*="max-width: 100%"]:hover .aura-analyze-btn,
  article:hover .aura-analyze-btn {
    opacity: 1;
  }
  .aura-analyze-btn:hover { background: #6d28d9; }

  .aura-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
    margin-left: 8px;
    vertical-align: middle;
  }
  .aura-badge-high { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
  .aura-badge-med { background: rgba(234, 179, 8, 0.2); color: #eab308; }
  .aura-badge-low { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }

  .aura-panel {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-height: 85vh;
    background: #101010;
    border: 1px solid #333;
    border-radius: 16px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    color: white;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  }
  .aura-panel-header {
    padding: 16px;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .aura-panel-content {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }
  .aura-tweet-preview {
    background: #1a1a1a;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .aura-tweet-image {
    width: 100%;
    max-height: 280px;
    object-fit: cover;
    border-radius: 12px;
    margin-top: 10px;
    border: 1px solid #333;
  }
  .aura-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .aura-metric-item {
    background: #1a1a1a;
    padding: 8px 4px;
    border-radius: 8px;
    text-align: center;
  }
  .aura-metric-value { font-weight: bold; font-size: 14px; }
  .aura-metric-label { font-size: 9px; color: #999; text-transform: uppercase; margin-top: 2px; }

  .aura-score-breakdown {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 16px;
  }
  .aura-score-item {
    background: #1a1a1a;
    padding: 8px;
    border-radius: 8px;
    text-align: center;
  }
  .aura-score-bar {
    height: 4px;
    background: #333;
    border-radius: 2px;
    margin-top: 4px;
    overflow: hidden;
  }
  .aura-score-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .aura-input {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    color: white;
    padding: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    resize: vertical;
    box-sizing: border-box;
  }
  .aura-replies-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .aura-reply-card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 12px;
  }
  .aura-reply-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
  .aura-btn {
    padding: 6px 16px;
    border-radius: 9999px;
    font-weight: bold;
    cursor: pointer;
    border: none;
    font-size: 13px;
    transition: opacity 0.2s;
  }
  .aura-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .aura-btn-primary { background: #7c3aed; color: white; }
  .aura-btn-secondary { background: transparent; border: 1px solid #333; color: white; }
  .aura-btn-post { background: #22c55e; color: white; }
  .aura-btn-post:hover { background: #16a34a; }

  .aura-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2147483646;
  }

  .aura-loading-spinner {
    width: 20px; height: 20px;
    border: 2px solid #333;
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: aura-spin 0.8s linear infinite;
    display: inline-block;
    vertical-align: middle;
    margin-right: 8px;
  }
`;
document.head.appendChild(auraStyles);

// ─── Floating Widget (FAB) ───

function createFloatingWidget() {
  if (document.getElementById('aura-fab')) return;

  const fab = document.createElement('button');
  fab.id = 'aura-fab';
  fab.className = 'aura-fab';
  fab.title = 'Aura Social Assistant';
  fab.innerHTML = `<svg viewBox="0 0 24 24"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="16" font-weight="bold" fill="white" font-family="sans-serif">A</text></svg>`;

  let widgetOpen = false;
  let widgetEl = null;

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    if (widgetOpen && widgetEl) {
      widgetEl.remove();
      widgetEl = null;
      widgetOpen = false;
    } else {
      openWidget();
    }
  });

  function openWidget() {
    if (widgetEl) widgetEl.remove();

    widgetEl = document.createElement('div');
    widgetEl.className = 'aura-widget';
    widgetEl.addEventListener('click', (e) => e.stopPropagation());

    chrome.runtime.sendMessage({ action: 'aura:get-status' }, (status) => {
      const s = status || { connected: false, postsToday: 0, baseUrl: null };

      widgetEl.innerHTML = `
        <div class="aura-widget-header">
          <span style="font-size: 18px;">✨</span>
          <span>Aura (Threads)</span>
        </div>
        <div class="aura-widget-body">
          <div class="aura-widget-row">
            <span class="aura-widget-label">Dashboard</span>
            <span class="aura-widget-value">
              <span class="aura-status-dot ${s.connected ? 'connected' : 'disconnected'}"></span>
              ${s.connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div class="aura-widget-row">
            <span class="aura-widget-label">Posts Today</span>
            <span class="aura-widget-value">${s.postsToday}</span>
          </div>
          <div class="aura-widget-row">
            <span class="aura-widget-label">Score Badges</span>
            <span class="aura-widget-value">
              <label class="aura-toggle">
                <input type="checkbox" id="aura-badge-toggle" ${badgesEnabled ? 'checked' : ''}>
                <span class="aura-toggle-slider"></span>
              </label>
            </span>
          </div>
          ${s.connected && s.baseUrl ? `<a class="aura-widget-btn" href="${s.baseUrl}" target="_blank">Open Aura Dashboard</a>` : `<div style="color: #999; font-size: 12px; margin-top: 12px; text-align: center;">Open your Aura dashboard once to connect</div>`}
        </div>
      `;

      const toggle = widgetEl.querySelector('#aura-badge-toggle');
      if (toggle) {
        toggle.addEventListener('change', () => {
          badgesEnabled = toggle.checked;
          chrome.storage.local.set({ aura_badges_enabled: badgesEnabled });
          document.querySelectorAll('.aura-badge, .aura-analyze-btn').forEach(el => {
            el.style.display = badgesEnabled ? '' : 'none';
          });
        });
      }
    });

    document.body.appendChild(widgetEl);
    widgetOpen = true;

    function closeOnOutsideClick(e) {
      if (widgetEl && !widgetEl.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
        widgetEl.remove();
        widgetEl = null;
        widgetOpen = false;
        document.removeEventListener('click', closeOnOutsideClick);
      }
    }
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);
  }

  document.body.appendChild(fab);
}

// ─── Post Analysis ───

function parseMetric(text) {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/(\d+(\.\d+)?)\s*([KMB])?/i);
  if (!match) return 0;
  let val = parseFloat(match[1]);
  const suffix = (match[3] || '').toUpperCase();
  if (suffix === 'K') val *= 1000;
  else if (suffix === 'M') val *= 1000000;
  else if (suffix === 'B') val *= 1000000000;
  return val;
}

function calculateViralScore(metrics, minutesSincePost) {
  const { likes, replies } = metrics;
  // Threads views are not always visible/available via DOM easily
  const views = metrics.views || (likes * 20); // Fallback estimate

  if (likes < 2) return null;

  const engagement = likes + replies;

  let engagementScore = 0;
  if (views > 0) {
    const engagementRate = engagement / views;
    engagementScore = Math.min(Math.pow(engagementRate / 0.10, 0.6), 1) * 100;
  } else {
    engagementScore = Math.min(engagement / 30, 1) * 100;
  }

  let velocityScore = 50;
  if (minutesSincePost > 0) {
    const velocity = engagement / minutesSincePost;
    velocityScore = Math.min(Math.pow(velocity / 2, 0.7), 1) * 100;
  }

  const replyRatio = likes > 0 ? replies / likes : 1;
  const competitionScore = (1 - Math.min(replyRatio, 1)) * 100;

  const viralScore = Math.round((engagementScore + velocityScore + competitionScore) / 3);

  return {
    total: Math.min(Math.max(viralScore, 0), 100),
    engagement: Math.round(engagementScore),
    velocity: Math.round(velocityScore),
    competition: Math.round(competitionScore)
  };
}

function getThreadsPostData(postEl) {
  // Threads DOM structure is heavy on nested divs with limited stable classes/IDs
  const textEl = postEl.querySelector('span[dir="auto"]');
  // Authors usually have links or specific bold text
  const authorEl = postEl.querySelector('a[role="link"] span');
  
  // Metrics are often in a row at the bottom
  // We look for text that looks like numbers near "likes" or "replies"
  const metricsText = postEl.innerText;
  const repliesMatch = metricsText.match(/(\d+)\s*replies/i);
  const likesMatch = metricsText.match(/(\d+)\s*likes/i);

  const data = {
    text: textEl ? textEl.innerText : '',
    authorName: authorEl ? authorEl.innerText : '',
    authorHandle: '',
    imageUrls: [],
    metrics: {
      replies: repliesMatch ? parseMetric(repliesMatch[1]) : 0,
      likes: likesMatch ? parseMetric(likesMatch[1]) : 0,
      views: 0
    },
    minutesSincePost: 30, // Default for Threads as time is harder to parse accurately
    url: window.location.href,
    el: postEl,
    scoreBreakdown: null,
    opportunityScore: null
  };

  // Try to find image
  const img = postEl.querySelector('img[src^="https://scontent"]');
  if (img) data.imageUrls.push(img.src);

  const scoreResult = calculateViralScore(data.metrics, data.minutesSincePost);
  if (scoreResult) {
    data.opportunityScore = scoreResult.total;
    data.scoreBreakdown = scoreResult;
  }

  return data;
}

// ─── Badge & Button Injection ───

function injectBadges(postEl) {
  if (postEl.classList.contains('aura-processed')) return;
  // Basic heuristic for post container in Threads
  if (postEl.innerText.length < 10) return;

  postEl.classList.add('aura-processed');

  const data = getThreadsPostData(postEl);
  if (data.opportunityScore === null || data.opportunityScore < 30) return;

  if (!badgesEnabled) return;

  if (postEl.querySelector('.aura-badge')) return;

  const badge = document.createElement('span');
  const colorClass = data.opportunityScore >= 75 ? 'aura-badge-high' : data.opportunityScore >= 50 ? 'aura-badge-med' : 'aura-badge-low';
  badge.className = `aura-badge ${colorClass}`;
  badge.textContent = `🔥 ${data.opportunityScore}`;

  // Find author area to inject badge
  const authorArea = postEl.querySelector('a[role="link"]');
  if (authorArea) {
    authorArea.parentElement.appendChild(badge);
  }

  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'aura-analyze-btn';
  analyzeBtn.innerHTML = `<span>✨ Analyze</span>`;
  analyzeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const freshData = getThreadsPostData(postEl);
    openAnalysisPanel(freshData);
  });

  postEl.style.position = 'relative';
  postEl.appendChild(analyzeBtn);
}

// ─── Analysis Panel ───

function getScoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#6b7280';
}

function openAnalysisPanel(tweetData) {
  if (activePanel) activePanel.remove();
  const existingOverlay = document.querySelector('.aura-overlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'aura-overlay';
  document.body.appendChild(overlay);

  const panel = document.createElement('div');
  panel.className = 'aura-panel';
  activePanel = panel;

  panel.innerHTML = `
    <div class="aura-panel-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">✨</span>
        <span style="font-weight: bold; font-size: 16px;">Threads Viral Analysis</span>
      </div>
      <button id="aura-close-panel" style="background: none; border: none; color: #999; cursor: pointer; font-size: 20px;">&times;</button>
    </div>
    <div class="aura-panel-content">
      <div class="aura-tweet-preview">
        <div style="font-weight: bold; margin-bottom: 4px; color: #7c3aed;">@${tweetData.authorName}</div>
        <div>${tweetData.text}</div>
        ${tweetData.imageUrls.length > 0 ? `<img src="${tweetData.imageUrls[0]}" class="aura-tweet-image">` : ''}
      </div>

      <div class="aura-metrics-grid">
        <div class="aura-metric-item">
          <div class="aura-metric-value">${tweetData.metrics.likes}</div>
          <div class="aura-metric-label">Likes</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${tweetData.metrics.replies}</div>
          <div class="aura-metric-label">Replies</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${tweetData.opportunityScore}</div>
          <div class="aura-metric-label">Score</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">~${tweetData.minutesSincePost}m</div>
          <div class="aura-metric-label">Age</div>
        </div>
      </div>

      <div class="aura-score-breakdown">
        <div class="aura-score-item">
          <div style="font-size: 10px; color: #999;">ENGAGEMENT</div>
          <div style="font-weight: bold; color: ${getScoreColor(tweetData.scoreBreakdown.engagement)}">${tweetData.scoreBreakdown.engagement}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${tweetData.scoreBreakdown.engagement}%; background: ${getScoreColor(tweetData.scoreBreakdown.engagement)}"></div></div>
        </div>
        <div class="aura-score-item">
          <div style="font-size: 10px; color: #999;">VELOCITY</div>
          <div style="font-weight: bold; color: ${getScoreColor(tweetData.scoreBreakdown.velocity)}">${tweetData.scoreBreakdown.velocity}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${tweetData.scoreBreakdown.velocity}%; background: ${getScoreColor(tweetData.scoreBreakdown.velocity)}"></div></div>
        </div>
        <div class="aura-score-item">
          <div style="font-size: 10px; color: #999;">OPPORTUNITY</div>
          <div style="font-weight: bold; color: ${getScoreColor(tweetData.scoreBreakdown.competition)}">${tweetData.scoreBreakdown.competition}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${tweetData.scoreBreakdown.competition}%; background: ${getScoreColor(tweetData.scoreBreakdown.competition)}"></div></div>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; font-weight: bold; color: #999; margin-bottom: 6px;">CUSTOM INSTRUCTIONS (OPTIONAL)</label>
        <textarea id="aura-custom-instructions" class="aura-input" placeholder="e.g. Be funny, disagree slightly, or mention AI..." rows="2"></textarea>
      </div>

      <button id="aura-generate-btn" class="aura-btn aura-btn-primary" style="width: 100%; padding: 10px; margin-bottom: 16px;">
        Generate Viral Replies
      </button>

      <div id="aura-replies-container" class="aura-replies-list"></div>
    </div>
  `;

  document.body.appendChild(panel);

  const closeBtn = panel.querySelector('#aura-close-panel');
  closeBtn.addEventListener('click', () => {
    panel.remove();
    overlay.remove();
    activePanel = null;
  });

  overlay.addEventListener('click', () => {
    panel.remove();
    overlay.remove();
    activePanel = null;
  });

  const generateBtn = panel.querySelector('#aura-generate-btn');
  const repliesContainer = panel.querySelector('#aura-replies-container');
  const customInstructionsInput = panel.querySelector('#aura-custom-instructions');

  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="aura-loading-spinner"></span> Generating...`;
    repliesContainer.innerHTML = '';

    const payload = {
      tweetText: tweetData.text,
      authorHandle: tweetData.authorName,
      metrics: tweetData.metrics,
      customInstructions: customInstructionsInput.value,
      platform: 'threads'
    };

    chrome.runtime.sendMessage({ action: 'aura:generate-replies', data: { payload } }, (response) => {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Regenerate Replies';

      if (response && response.replies) {
        response.replies.forEach(reply => {
          const card = document.createElement('div');
          card.className = 'aura-reply-card';
          card.innerHTML = `
            <div style="font-size: 14px; line-height: 1.5;">${reply}</div>
            <div class="aura-reply-actions">
              <button class="aura-btn aura-btn-secondary aura-copy-btn">Copy</button>
              <button class="aura-btn aura-btn-post aura-direct-post-btn">Auto-Post</button>
            </div>
          `;

          const copyBtn = card.querySelector('.aura-copy-btn');
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(reply);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 2000);
          });

          const postBtn = card.querySelector('.aura-direct-post-btn');
          postBtn.addEventListener('click', async () => {
             postBtn.disabled = true;
             postBtn.innerHTML = `<span class="aura-loading-spinner"></span> Posting...`;
             
             try {
               const replyButton = tweetData.el.querySelector('svg[aria-label*="Reply"], svg[aria-label*="reply"], svg[aria-label*="Comment"], svg[aria-label*="comment"]');
               const replyClickTarget = replyButton ? replyButton.closest('div[role="button"]') || replyButton.closest('[role="button"]') || replyButton.parentElement : null;
               if (replyClickTarget) {
                 replyClickTarget.click();
                 const composer = await waitForComposer();
                 await insertText(composer, reply);
                 
                 await new Promise(r => setTimeout(r, 500));
                 const postBtnEl = document.querySelector('div[role="button"][tabindex="0"]');
                 const allBtns = document.querySelectorAll('div[role="button"]');
                 let submitBtn = null;
                 for (const btn of allBtns) {
                   const text = btn.textContent?.trim().toLowerCase();
                   if (text === 'post' || text === 'reply') {
                     submitBtn = btn;
                     break;
                   }
                 }
                 if (submitBtn) {
                   submitBtn.click();
                   showToast('Reply posted by Aura ⚡');
                   chrome.runtime.sendMessage({ action: 'aura:log-activity', platform: 'threads', activityAction: 'reply_posted' });
                 } else {
                   showToast('Reply inserted! Click Post to send.');
                   chrome.runtime.sendMessage({ action: 'aura:log-activity', platform: 'threads', activityAction: 'reply_posted' });
                 }
                 panel.remove();
                 overlay.remove();
                 activePanel = null;
               } else {
                 throw new Error('Could not find reply button');
               }
             } catch (err) {
               console.error(err);
               showToast('Could not auto-post. Copied to clipboard instead.');
               navigator.clipboard.writeText(reply);
               postBtn.disabled = false;
               postBtn.textContent = 'Auto-Post';
             }
          });

          repliesContainer.appendChild(card);
        });
      } else {
        repliesContainer.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 20px;">${response?.error || 'Failed to generate replies. Please try again.'}</div>`;
      }
    });
  });
}

// ─── Main Observer ───

const observer = new MutationObserver((mutations) => {
  // Threads posts are usually inside articles or specific div structures
  const posts = document.querySelectorAll('article, div[style*="max-width: 100%"]');
  posts.forEach(post => {
    // Only process if it looks like a real post with text
    if (post.innerText.length > 20) {
      injectBadges(post);
    }
  });
});

function init() {
  createFloatingWidget();
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
