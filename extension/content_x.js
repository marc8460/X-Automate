// Aura Content Script for X.com
// Persistent floating widget + in-feed tweet analysis + vision + direct posting

let auraBaseUrl = null;
let badgesEnabled = true;
let activePanel = null;

chrome.storage.local.get(['auraBaseUrl', 'aura_badges_enabled'], (result) => {
  auraBaseUrl = result.auraBaseUrl || null;
  badgesEnabled = result.aura_badges_enabled !== false;
  console.log('Aura: Loaded config — baseUrl:', auraBaseUrl, 'badges:', badgesEnabled);
});

// ─── Text Insertion ───

function findComposer() {
  const selectors = [
    '[data-testid="tweetTextarea_0"]',
    '[data-testid="tweetTextarea_0RichTextInputContainer"]',
    '[role="textbox"][data-testid]',
    '[role="textbox"]',
    'div[contenteditable="true"]',
    '.public-DraftEditor-content'
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

async function insertText(element, text) {
  element.focus();
  for (const char of text) {
    const delay = Math.floor(Math.random() * 21) + 10;
    await new Promise(resolve => setTimeout(resolve, delay));
    document.execCommand('insertText', false, char);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function attachImage(blob, filename) {
  const fileInput = document.querySelector('input[data-testid="fileInput"]');
  if (!fileInput) return;
  const file = new File([blob], filename, { type: blob.type });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
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
    background: #15202b;
    border: 1px solid #38444d;
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
    border-bottom: 1px solid rgba(56, 68, 77, 0.5);
    font-size: 13px;
  }
  .aura-widget-row:last-child { border-bottom: none; }
  .aura-widget-label { color: #8899a6; }
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
    background: #38444d; border-radius: 22px; transition: background 0.2s;
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
  article[data-testid="tweet"]:hover .aura-analyze-btn,
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
    background: #15202b;
    border: 1px solid #38444d;
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
    border-bottom: 1px solid #38444d;
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
    background: #192734;
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
    border: 1px solid #38444d;
  }
  .aura-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .aura-metric-item {
    background: #192734;
    padding: 8px 4px;
    border-radius: 8px;
    text-align: center;
  }
  .aura-metric-value { font-weight: bold; font-size: 14px; }
  .aura-metric-label { font-size: 9px; color: #8899a6; text-transform: uppercase; margin-top: 2px; }

  .aura-score-breakdown {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 16px;
  }
  .aura-score-item {
    background: #192734;
    padding: 8px;
    border-radius: 8px;
    text-align: center;
  }
  .aura-score-bar {
    height: 4px;
    background: #38444d;
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
    background: #192734;
    border: 1px solid #38444d;
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
    background: #192734;
    border: 1px solid #38444d;
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
  .aura-btn-secondary { background: transparent; border: 1px solid #38444d; color: white; }
  .aura-btn-post { background: #22c55e; color: white; }
  .aura-btn-post:hover { background: #16a34a; }
  .aura-btn-attach { background: transparent; border: 1px solid #7c3aed; color: #a78bfa; font-size: 12px; padding: 4px 12px; }
  .aura-btn-attach:hover { background: rgba(124, 58, 237, 0.15); }

  .aura-attach-section {
    margin-top: 8px;
    margin-bottom: 4px;
  }
  .aura-attach-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    padding: 6px;
    background: rgba(124, 58, 237, 0.1);
    border: 1px solid rgba(124, 58, 237, 0.3);
    border-radius: 8px;
  }
  .aura-media-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 6px;
    max-height: 200px;
    overflow-y: auto;
    padding: 6px;
    background: #15202b;
    border: 1px solid #38444d;
    border-radius: 8px;
  }
  .aura-media-thumb {
    cursor: pointer;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid transparent;
    transition: border-color 0.2s;
    position: relative;
  }
  .aura-media-thumb:hover {
    border-color: #7c3aed;
  }
  .aura-media-thumb img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
  }
  .aura-media-mood {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: #a78bfa;
    font-size: 9px;
    padding: 2px 4px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .aura-vision-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(124, 58, 237, 0.15);
    color: #a78bfa;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 11px;
    margin-top: 8px;
  }

  .aura-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2147483646;
  }

  .aura-loading-spinner {
    width: 20px; height: 20px;
    border: 2px solid #38444d;
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
          <span>Aura</span>
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
          ${s.connected && s.baseUrl ? `<a class="aura-widget-btn" href="${s.baseUrl}" target="_blank">Open Aura Dashboard</a>` : `<div style="color: #8899a6; font-size: 12px; margin-top: 12px; text-align: center;">Open your Aura dashboard once to connect</div>`}
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

// ─── Tweet Analysis ───

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
  const { likes, replies, retweets, views } = metrics;

  if (views < 100 && likes < 5) return null;

  const engagement = likes + replies + retweets;

  let engagementScore = 0;
  if (views > 0) {
    const engagementRate = engagement / views;
    engagementScore = Math.min(Math.pow(engagementRate / 0.10, 0.6), 1) * 100;
  } else {
    engagementScore = Math.min(engagement / 50, 1) * 100;
  }

  let velocityScore = 50;
  if (minutesSincePost > 0) {
    const velocity = engagement / minutesSincePost;
    velocityScore = Math.min(Math.pow(velocity / 3, 0.7), 1) * 100;
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

function extractMetricValue(el) {
  if (!el) return 0;
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    const match = ariaLabel.match(/(\d[\d,.]*\s*[KMB]?)/i);
    if (match) return parseMetric(match[1]);
  }
  const textContent = el.innerText || el.textContent || '';
  return parseMetric(textContent);
}

function getTweetData(tweetEl) {
  const textEl = tweetEl.querySelector('[data-testid="tweetText"]');
  const userEl = tweetEl.querySelector('[data-testid="User-Name"]');

  const replyEl = tweetEl.querySelector('[data-testid="reply"]');
  const retweetEl = tweetEl.querySelector('[data-testid="retweet"]');
  const likeEl = tweetEl.querySelector('[data-testid="like"]') || tweetEl.querySelector('[data-testid="unlike"]');
  const viewsEl = tweetEl.querySelector('a[href*="/analytics"]');

  const data = {
    text: textEl ? textEl.innerText : '',
    authorName: '',
    authorHandle: '',
    imageUrls: [],
    metrics: {
      replies: extractMetricValue(replyEl),
      retweets: extractMetricValue(retweetEl),
      likes: extractMetricValue(likeEl),
      views: extractMetricValue(viewsEl)
    },
    minutesSincePost: 0,
    url: '',
    el: tweetEl,
    scoreBreakdown: null,
    opportunityScore: null
  };

  if (userEl) {
    const parts = userEl.innerText.split('\n').filter(Boolean);
    data.authorName = parts[0] || '';
    data.authorHandle = parts.find(p => p.startsWith('@')) || parts[1] || '';
  }

  const timeEl = tweetEl.querySelector('time');
  if (timeEl) {
    const link = timeEl.closest('a');
    data.url = link ? link.href : window.location.href;

    const datetime = timeEl.getAttribute('datetime');
    if (datetime) {
      const postDate = new Date(datetime);
      const now = new Date();
      data.minutesSincePost = Math.max(1, Math.round((now - postDate) / 60000));
    }
  }

  const photoContainers = tweetEl.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="tweetPhoto"] video');
  photoContainers.forEach(media => {
    if (media.tagName === 'IMG' && media.src && !media.src.includes('emoji') && !media.src.includes('profile_images')) {
      data.imageUrls.push(media.src);
    }
    if (media.tagName === 'VIDEO' && media.poster) {
      data.imageUrls.push(media.poster);
    }
  });

  if (data.imageUrls.length === 0) {
    const cardImg = tweetEl.querySelector('[data-testid="card.layoutLarge.media"] img, [data-testid="card.layoutSmall.media"] img');
    if (cardImg && cardImg.src) {
      data.imageUrls.push(cardImg.src);
    }
  }

  const scoreResult = calculateViralScore(data.metrics, data.minutesSincePost);
  if (scoreResult) {
    data.opportunityScore = scoreResult.total;
    data.scoreBreakdown = scoreResult;
  }

  return data;
}

// ─── Badge & Button Injection ───

function injectBadges(tweetEl) {
  if (tweetEl.classList.contains('aura-processed')) return;
  tweetEl.classList.add('aura-processed');

  const data = getTweetData(tweetEl);
  if (data.opportunityScore === null) return;

  if (!badgesEnabled) return;

  if (data.opportunityScore < 40) return;

  if (tweetEl.querySelector('.aura-badge')) return;

  const badge = document.createElement('span');
  const colorClass = data.opportunityScore >= 80 ? 'aura-badge-high' : data.opportunityScore >= 60 ? 'aura-badge-med' : 'aura-badge-low';
  badge.className = `aura-badge ${colorClass}`;
  badge.textContent = `🔥 ${data.opportunityScore}`;

  const userNameEl = tweetEl.querySelector('[data-testid="User-Name"]');
  if (userNameEl) {
    userNameEl.insertAdjacentElement('afterend', badge);
  }

  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'aura-analyze-btn';
  analyzeBtn.innerHTML = `<span>✨ Analyze</span>`;
  analyzeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const freshData = getTweetData(tweetEl);
    openAnalysisPanel(freshData);
  });

  tweetEl.style.position = 'relative';
  tweetEl.appendChild(analyzeBtn);
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

  const sb = tweetData.scoreBreakdown || { engagement: 0, velocity: 0, competition: 0 };
  const imageHtml = tweetData.imageUrls.length > 0
    ? `<img class="aura-tweet-image" src="${tweetData.imageUrls[0]}" alt="Tweet image" />${tweetData.imageUrls.length > 1 ? `<div style="color: #8899a6; font-size: 11px; margin-top: 4px;">+${tweetData.imageUrls.length - 1} more image${tweetData.imageUrls.length > 2 ? 's' : ''}</div>` : ''}`
    : '';

  const panel = document.createElement('div');
  panel.className = 'aura-panel';
  panel.innerHTML = `
    <div class="aura-panel-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: bold; color: #7c3aed;">✨ Aura Analyze</span>
        ${tweetData.opportunityScore !== null ? `<span class="aura-badge ${tweetData.opportunityScore >= 80 ? 'aura-badge-high' : tweetData.opportunityScore >= 60 ? 'aura-badge-med' : 'aura-badge-low'}" style="margin: 0;">🔥 ${tweetData.opportunityScore}</span>` : ''}
      </div>
      <button class="aura-btn aura-btn-secondary" id="aura-close-panel" style="padding: 4px 8px;">✕</button>
    </div>
    <div class="aura-panel-content">
      <div class="aura-tweet-preview">
        <div style="font-weight: bold; margin-bottom: 4px;">${escapeHtml(tweetData.authorName)}</div>
        <div style="color: #8899a6; font-size: 12px; margin-bottom: 8px;">${escapeHtml(tweetData.authorHandle)}</div>
        <div>${escapeHtml(tweetData.text.substring(0, 300))}${tweetData.text.length > 300 ? '...' : ''}</div>
        ${imageHtml}
        ${tweetData.imageUrls.length > 0 ? '<div class="aura-vision-tag">👁 AI Vision will analyze this image</div>' : ''}
      </div>

      <div class="aura-metrics-grid">
        <div class="aura-metric-item">
          <div class="aura-metric-value">${formatNumber(tweetData.metrics.views)}</div>
          <div class="aura-metric-label">Views</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${formatNumber(tweetData.metrics.likes)}</div>
          <div class="aura-metric-label">Likes</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${formatNumber(tweetData.metrics.retweets)}</div>
          <div class="aura-metric-label">Reposts</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${formatNumber(tweetData.metrics.replies)}</div>
          <div class="aura-metric-label">Replies</div>
        </div>
      </div>

      <div class="aura-score-breakdown">
        <div class="aura-score-item">
          <div style="font-size: 11px; color: #8899a6;">Engagement</div>
          <div style="font-weight: bold; color: ${getScoreColor(sb.engagement)}">${sb.engagement}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${sb.engagement}%; background: ${getScoreColor(sb.engagement)};"></div></div>
        </div>
        <div class="aura-score-item">
          <div style="font-size: 11px; color: #8899a6;">Velocity</div>
          <div style="font-weight: bold; color: ${getScoreColor(sb.velocity)}">${sb.velocity}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${sb.velocity}%; background: ${getScoreColor(sb.velocity)};"></div></div>
        </div>
        <div class="aura-score-item">
          <div style="font-size: 11px; color: #8899a6;">Competition</div>
          <div style="font-weight: bold; color: ${getScoreColor(sb.competition)}">${sb.competition}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${sb.competition}%; background: ${getScoreColor(sb.competition)};"></div></div>
        </div>
      </div>

      <div style="margin-bottom: 8px; font-weight: bold; font-size: 14px;">Custom Instructions</div>
      <textarea class="aura-input" id="aura-custom-instructions" rows="2" placeholder="e.g. 'gen z slang', 'flirty and witty', 'professional tone'"></textarea>

      <button class="aura-btn aura-btn-primary" id="aura-generate-btn" style="width: 100%; margin-bottom: 16px; padding: 10px;">Generate Viral Replies</button>

      <div id="aura-vision-result" style="display: none; margin-bottom: 12px;"></div>
      <div id="aura-replies-container" class="aura-replies-list"></div>
    </div>
  `;

  overlay.addEventListener('click', () => {
    panel.remove();
    overlay.remove();
    activePanel = null;
  });

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  activePanel = panel;

  panel.querySelector('#aura-close-panel').addEventListener('click', () => {
    panel.remove();
    overlay.remove();
    activePanel = null;
  });

  const generateBtn = panel.querySelector('#aura-generate-btn');
  const repliesContainer = panel.querySelector('#aura-replies-container');
  const instructionsInput = panel.querySelector('#aura-custom-instructions');
  const visionResultEl = panel.querySelector('#aura-vision-result');

  generateBtn.addEventListener('click', async () => {
    if (!auraBaseUrl) {
      const stored = await new Promise(r => chrome.storage.local.get(['auraBaseUrl'], r));
      auraBaseUrl = stored.auraBaseUrl;
    }

    if (!auraBaseUrl) {
      repliesContainer.innerHTML = '<div style="color: #ff4444; text-align: center; padding: 12px;">Please open your Aura dashboard first to connect the extension.</div>';
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="aura-loading-spinner"></span> Analyzing' + (tweetData.imageUrls.length > 0 ? ' image + text...' : '...');
    repliesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #8899a6;">✨ Generating viral replies...</div>';

    const payload = {
      tweetText: tweetData.text,
      authorName: tweetData.authorName,
      authorUsername: tweetData.authorHandle,
      metrics: {
        likes: tweetData.metrics.likes,
        replies: tweetData.metrics.replies,
        retweets: tweetData.metrics.retweets,
        views: tweetData.metrics.views,
        minutesSincePost: tweetData.minutesSincePost
      },
      customInstruction: instructionsInput.value,
      imageUrl: tweetData.imageUrls.length > 0 ? tweetData.imageUrls[0] : null
    };

    chrome.runtime.sendMessage({
      action: 'aura:generate-replies',
      data: { baseUrl: auraBaseUrl, payload }
    }, (response) => {
      generateBtn.disabled = false;
      generateBtn.innerText = 'Regenerate Replies';

      if (response && response.imageDescription) {
        visionResultEl.style.display = 'block';
        visionResultEl.innerHTML = `
          <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 10px; padding: 10px;">
            <div style="font-size: 12px; font-weight: bold; color: #a78bfa; margin-bottom: 4px;">👁 AI Vision Analysis</div>
            <div style="font-size: 13px; color: #d1d5db; line-height: 1.4;">${escapeHtml(response.imageDescription)}</div>
          </div>
        `;
      }

      if (response && response.replies && response.replies.length > 0) {
        repliesContainer.innerHTML = '';
        response.replies.forEach((replyObj, idx) => {
          const replyText = typeof replyObj === 'string' ? replyObj : (replyObj.text || '');
          const replyLabel = typeof replyObj === 'string' ? '' : (replyObj.label || '');
          const card = document.createElement('div');
          card.className = 'aura-reply-card';
          card.innerHTML = `
            ${replyLabel ? `<div style="font-size: 11px; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${escapeHtml(replyLabel)}</div>` : ''}
            <div style="font-size: 14px; line-height: 1.4;">${escapeHtml(replyText)}</div>
            <div class="aura-attach-section" id="aura-attach-${idx}">
              <button class="aura-btn aura-btn-attach aura-attach-btn" data-idx="${idx}">📷 Attach Photo</button>
              <div class="aura-attach-preview" id="aura-attach-preview-${idx}" style="display: none;"></div>
              <div class="aura-media-grid" id="aura-media-grid-${idx}" style="display: none;"></div>
            </div>
            <div class="aura-reply-actions">
              <button class="aura-btn aura-btn-secondary aura-copy-btn">📋 Copy</button>
              <button class="aura-btn aura-btn-primary aura-insert-btn">✏️ Insert</button>
              <button class="aura-btn aura-btn-post aura-post-btn">⚡ Post Reply</button>
            </div>
          `;

          let selectedImageUrl = null;

          card.querySelector('.aura-attach-btn').addEventListener('click', () => {
            const grid = card.querySelector(`#aura-media-grid-${idx}`);
            if (grid.style.display !== 'none') {
              grid.style.display = 'none';
              return;
            }
            grid.innerHTML = '<div style="text-align: center; padding: 12px; color: #8899a6; font-size: 12px;">Loading media vault...</div>';
            grid.style.display = 'grid';

            chrome.runtime.sendMessage({ action: 'aura:fetch-media-vault' }, (res) => {
              if (res && res.items && res.items.length > 0) {
                grid.innerHTML = '';
                res.items.forEach(item => {
                  const thumb = document.createElement('div');
                  thumb.className = 'aura-media-thumb';
                  thumb.innerHTML = `<img src="${item.url}" alt="${item.mood || ''}" /><div class="aura-media-mood">${escapeHtml(item.mood || '')}</div>`;
                  thumb.addEventListener('click', () => {
                    selectedImageUrl = item.url;
                    grid.style.display = 'none';
                    const preview = card.querySelector(`#aura-attach-preview-${idx}`);
                    preview.style.display = 'flex';
                    preview.innerHTML = `
                      <img src="${item.url}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #7c3aed;" />
                      <span style="font-size: 12px; color: #a78bfa;">${escapeHtml(item.mood || 'Photo')} attached</span>
                      <button class="aura-btn aura-btn-secondary aura-remove-img" style="padding: 2px 6px; font-size: 11px; margin-left: auto;">✕</button>
                    `;
                    preview.querySelector('.aura-remove-img').addEventListener('click', () => {
                      selectedImageUrl = null;
                      preview.style.display = 'none';
                      preview.innerHTML = '';
                    });
                  });
                  grid.appendChild(thumb);
                });
              } else {
                grid.innerHTML = `<div style="text-align: center; padding: 12px; color: #8899a6; font-size: 12px;">${res?.error || 'No images in your media vault.'}</div>`;
              }
            });
          });

          card.querySelector('.aura-copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(replyText);
            showToast('Copied to clipboard');
          });

          card.querySelector('.aura-insert-btn').addEventListener('click', () => {
            handleInsertReply(tweetData, replyText, false, selectedImageUrl);
            panel.remove();
            overlay.remove();
            activePanel = null;
          });

          card.querySelector('.aura-post-btn').addEventListener('click', () => {
            handleInsertReply(tweetData, replyText, true, selectedImageUrl);
            panel.remove();
            overlay.remove();
            activePanel = null;
          });

          repliesContainer.appendChild(card);
        });
      } else {
        const errMsg = response?.error || response?.message || 'Error generating replies. Please try again.';
        repliesContainer.innerHTML = `<div style="color: #ff4444; text-align: center; padding: 12px;">${escapeHtml(errMsg)}</div>`;
      }
    });
  });
}

async function handleInsertReply(tweetData, replyText, autoPost, imageUrl) {
  try {
    const replyBtn = tweetData.el.querySelector('[data-testid="reply"]');
    if (replyBtn) {
      replyBtn.click();
    }

    await new Promise(r => setTimeout(r, 500));

    const composer = await waitForComposer();

    if (imageUrl) {
      showToast("Attaching image...");
      const blobDataUrl = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'aura:image', imageUrl }, (res) => {
          resolve(res?.blob || null);
        });
      });

      if (blobDataUrl) {
        const response = await fetch(blobDataUrl);
        const blob = await response.blob();
        await attachImage(blob, 'aura_reply_image.jpg');
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const composerEl = findComposer() || composer;
    await insertText(composerEl, replyText);

    if (autoPost) {
      await new Promise(r => setTimeout(r, 500));
      const postBtn = document.querySelector('[data-testid="tweetButton"]') || document.querySelector('[data-testid="tweetButtonInline"]');
      if (postBtn && !postBtn.disabled) {
        postBtn.click();
        showToast("Reply posted by Aura ⚡" + (imageUrl ? " (with photo)" : ""));
        chrome.runtime.sendMessage({ action: 'aura:log-activity', platform: 'x', activityAction: 'reply_posted' });
      } else {
        showToast("Reply inserted — Post button not ready, click it manually");
        chrome.runtime.sendMessage({ action: 'aura:log-activity', platform: 'x', activityAction: 'reply_posted' });
      }
    } else {
      showToast("Reply inserted" + (imageUrl ? " with photo" : "") + " — click Post when ready");
      chrome.runtime.sendMessage({ action: 'aura:log-activity', platform: 'x', activityAction: 'reply_posted' });
    }
  } catch (err) {
    showToast("Error: " + err.message);
  }
}

// ─── Helpers ───

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ─── Tweet Scanner ───

function scanTweets() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]:not(.aura-processed), article[role="article"]:not(.aura-processed)');
  let processed = 0;
  tweets.forEach(tweet => {
    injectBadges(tweet);
    processed++;
  });
  if (processed > 0) {
    console.log(`Aura: Processed ${processed} new tweets`);
  }
}

const observer = new MutationObserver(() => {
  scanTweets();
});

observer.observe(document.body, { childList: true, subtree: true });

setTimeout(scanTweets, 2000);
setTimeout(scanTweets, 5000);
setInterval(scanTweets, 4000);

// ─── Message Handler ───

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "insert") {
    handleInsertAction(request).then(() => {
      sendResponse({ status: "success" });
    }).catch(err => {
      console.error('Aura Extension Error:', err);
      sendResponse({ status: "error", message: err.message });
    });
    return true;
  }
});

async function handleInsertAction(data) {
  const { text, imageBlob, filename } = data;
  try {
    const composer = await waitForComposer();

    if (imageBlob) {
      const response = await fetch(imageBlob);
      const blob = await response.blob();
      await attachImage(blob, filename || 'aura_image.jpg');
      await new Promise(r => setTimeout(r, 1000));
    }

    if (text) {
      const composerAfterImage = findComposer();
      await insertText(composerAfterImage || composer, text);
    }

    showToast("Text inserted by Aura — click Post when ready");
  } catch (err) {
    showToast("Error: " + err.message);
    throw err;
  }
}

// ─── Following Page Import ───

let importButtonInjected = false;

function isFollowingPage() {
  return /^\/[A-Za-z0-9_]+\/following\/?$/.test(window.location.pathname);
}

function injectImportButton() {
  if (importButtonInjected || document.getElementById('aura-import-following-btn')) return;
  if (!isFollowingPage()) return;

  importButtonInjected = true;

  const btn = document.createElement('button');
  btn.id = 'aura-import-following-btn';
  btn.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 20px;
    z-index: 2147483646;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.2s, box-shadow 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  btn.innerHTML = '📥 Import Following List';
  btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.style.opacity = '0.8';
    btn.style.cursor = 'wait';

    const creatorsMap = new Map();
    let noNewCount = 0;
    const maxScrollAttempts = 100;

    for (let i = 0; i < maxScrollAttempts; i++) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;
      for (const cell of cells) {
        const links = cell.querySelectorAll('a[href^="/"][role="link"]');
        for (const link of links) {
          const linkText = link.textContent.trim();
          if (!linkText.startsWith('@')) continue;
          const href = link.getAttribute('href') || '';
          const match = href.match(/^\/([A-Za-z0-9_]+)\/?$/);
          if (match && match[1]) {
            const uname = match[1].toLowerCase();
            if (!creatorsMap.has(uname)) {
              let avatarUrl = null;
              const cellImg = cell.querySelector('img[src*="twimg.com/profile_images"], img[src*="pbs.twimg.com"]');
              if (cellImg) avatarUrl = cellImg.src;
              if (!avatarUrl) {
                const anyImg = cell.querySelector('img[src*="twimg.com"]');
                if (anyImg && !anyImg.src.includes('/media/') && !anyImg.src.includes('emoji')) avatarUrl = anyImg.src;
              }
              creatorsMap.set(uname, avatarUrl);
              foundNew = true;
            }
          }
        }
      }

      if (cells.length === 0) {
        const allLinks = document.querySelectorAll('a[role="link"]');
        for (const link of allLinks) {
          const linkText = link.textContent.trim();
          if (!linkText.startsWith('@')) continue;
          const href = link.getAttribute('href') || '';
          const match = href.match(/^\/([A-Za-z0-9_]+)\/?$/);
          if (match && match[1]) {
            const uname = match[1].toLowerCase();
            const reserved = new Set(['home', 'explore', 'notifications', 'messages', 'settings', 'compose', 'i', 'search', 'lists', 'bookmarks', 'communities', 'premium', 'verified']);
            if (!reserved.has(uname) && !creatorsMap.has(uname)) {
              creatorsMap.set(uname, null);
              foundNew = true;
            }
          }
        }
      }

      btn.innerHTML = `📥 Scanning... (${creatorsMap.size} found)`;

      if (foundNew) {
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      if (noNewCount >= 3) break;

      window.scrollBy(0, 600);
      await new Promise(r => setTimeout(r, 800));
    }

    const allCreators = Array.from(creatorsMap.entries()).map(([username, avatarUrl]) => ({ username, avatarUrl }));
    btn.innerHTML = `📥 Importing ${allCreators.length} creators...`;

    chrome.runtime.sendMessage({
      action: 'aura:bulk-import-creators',
      creators: allCreators,
      platform: 'x'
    }, (resp) => {
      if (resp) {
        const msg = `Imported ${resp.added} creators (${resp.skipped} already tracked${resp.capped ? `, ${resp.capped} over limit` : ''})`;
        btn.innerHTML = `✅ ${msg}`;
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        showToast(msg);
      } else {
        btn.innerHTML = '❌ Import failed';
      }
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      setTimeout(() => {
        btn.innerHTML = '📥 Import Following List';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      }, 5000);
    });
  });

  document.body.appendChild(btn);
}

// ─── Notification Scanner for Creator Alerts ───

const seenNotifPostIds = new Set();
let notifScannerActive = false;

function extractPostIdFromUrl(url) {
  const m = url.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

function scanXNotifications() {
  if (notifScannerActive) return;
  notifScannerActive = true;

  const articles = document.querySelectorAll('[data-testid="cellInnerDiv"] article, [data-testid="notification"] article, div[data-testid="cellInnerDiv"]');
  if (!articles.length) {
    notifScannerActive = false;
    return;
  }

  chrome.storage.local.get(['aura_watchlist_x'], (store) => {
    const watchlist = (store.aura_watchlist_x || []).map(u => u.toLowerCase().replace('@', ''));
    if (!watchlist.length) {
      notifScannerActive = false;
      return;
    }

    articles.forEach(cell => {
      const links = cell.querySelectorAll('a[href*="/status/"]');
      if (!links.length) return;

      const text = cell.innerText || '';
      const isNewPost = /posted|tweeted|poste/i.test(text);
      if (!isNewPost) return;

      const handleLinks = cell.querySelectorAll('a[href^="/"]');
      let creatorUsername = null;
      for (const hl of handleLinks) {
        const href = hl.getAttribute('href');
        if (href && /^\/[A-Za-z0-9_]+$/.test(href)) {
          const candidate = href.slice(1).toLowerCase();
          if (watchlist.includes(candidate)) {
            creatorUsername = candidate;
            break;
          }
        }
      }
      if (!creatorUsername) return;

      for (const link of links) {
        const href = link.getAttribute('href');
        const postId = extractPostIdFromUrl(href);
        if (!postId) continue;
        const key = `${creatorUsername}:${postId}`;
        if (seenNotifPostIds.has(key)) continue;
        seenNotifPostIds.add(key);

        const postUrl = `https://x.com${href}`;
        console.log(`[Aura] Notification detected: @${creatorUsername} posted ${postUrl}`);
        chrome.runtime.sendMessage({
          action: 'aura:creator-alert',
          creatorUsername,
          postId,
          postUrl,
        });
      }
    });

    notifScannerActive = false;
  });
}

function startNotificationScanner() {
  if (!location.pathname.startsWith('/notifications')) return;
  console.log('[Aura] Notification scanner active on /notifications');

  scanXNotifications();

  const observer = new MutationObserver(() => {
    scanXNotifications();
  });
  const target = document.querySelector('main') || document.body;
  observer.observe(target, { childList: true, subtree: true });

  setInterval(scanXNotifications, 3000);
}

if (location.pathname.startsWith('/notifications')) {
  startNotificationScanner();
}

let lastPath = location.pathname;
const pathObserver = new MutationObserver(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    if (location.pathname.startsWith('/notifications')) {
      startNotificationScanner();
    }
  }
});
pathObserver.observe(document.body, { childList: true, subtree: true });

// ─── Init ───

createFloatingWidget();
injectImportButton();
console.log('Aura Content Script loaded on X.com');
