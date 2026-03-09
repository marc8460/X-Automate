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

// ─── Utilities ───

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

async function handleInsertReply(tweetData, replyText, autoPost, imageUrl) {
  try {
    const replyButton = tweetData.el.querySelector('svg[aria-label*="Reply"], svg[aria-label*="reply"], svg[aria-label*="Comment"], svg[aria-label*="comment"], svg[aria-label*="Svar"], svg[aria-label*="Kommentar"]');
    const replyClickTarget = replyButton ? replyButton.closest('div[role="button"]') || replyButton.closest('[role="button"]') || replyButton.parentElement : null;
    if (replyClickTarget) {
      replyClickTarget.click();
    }

    await new Promise(r => setTimeout(r, 500));
    const composer = await waitForComposer();

    if (imageUrl) {
      showToast('Attaching image...');
      const blobDataUrl = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'aura:image', imageUrl }, (res) => {
          resolve(res?.blob || null);
        });
      });
      if (blobDataUrl) {
        try {
          const response = await fetch(blobDataUrl);
          const blob = await response.blob();
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) {
            const file = new File([blob], 'aura_reply_image.jpg', { type: blob.type });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(r => setTimeout(r, 1500));
          }
        } catch (e) {
          console.error('[Aura] Image attach failed:', e);
        }
      }
    }

    const composerEl = findComposer() || composer;
    await insertText(composerEl, replyText);

    if (autoPost) {
      await new Promise(r => setTimeout(r, 500));
      const allBtns = document.querySelectorAll('div[role="button"]');
      let submitBtn = null;
      for (const btn of allBtns) {
        const text = btn.textContent?.trim().toLowerCase();
        if (text === 'post' || text === 'reply' || text === 'slå op' || text === 'svar') {
          submitBtn = btn;
          break;
        }
      }
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
        showToast('Reply posted by Aura ⚡' + (imageUrl ? ' (with photo)' : ''));
        chrome.runtime.sendMessage({ action: 'aura:log-activity', platform: 'threads', activityAction: 'reply_posted' });
      } else {
        showToast('Reply inserted — click Post to send');
      }
    } else {
      showToast('Reply inserted with typing delay — click Post to send');
    }
  } catch (err) {
    console.error('[Aura] Insert reply error:', err);
    showToast('Could not insert reply. Copied to clipboard instead.');
    navigator.clipboard.writeText(replyText);
  }
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
    pointer-events: none;
    transition: opacity 0.2s, background 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .aura-threads-post:hover .aura-analyze-btn {
    opacity: 1;
    pointer-events: auto;
  }
  .aura-analyze-btn:hover { background: #6d28d9; }

  .aura-badge {
    display: block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    margin-top: 2px;
    width: fit-content;
  }
  .aura-badge-high { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
  .aura-badge-med { background: rgba(234, 179, 8, 0.15); color: #eab308; }
  .aura-badge-low { background: rgba(107, 114, 128, 0.15); color: #9ca3af; }

  .aura-early-badge {
    display: block;
    padding: 6px 12px;
    background: rgba(16, 185, 129, 0.08);
    border-left: 3px solid #10b981;
    color: #10b981;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
    pointer-events: none;
  }

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
    max-height: 360px;
    object-fit: contain;
    border-radius: 12px;
    margin-top: 10px;
    border: 1px solid #333;
    background: #0a0a0a;
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
    background: #1a1a1a;
    border: 1px solid #333;
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

      const profileMatch = window.location.pathname.match(/^\/@([A-Za-z0-9_.]+)\/?$/);
      const profileUsername = profileMatch ? profileMatch[1] : null;

      const buildWidget = (trackingState) => {
        let trackCreatorRow = '';
        if (profileUsername) {
          const isTracking = trackingState && trackingState.includes(profileUsername.toLowerCase());
          trackCreatorRow = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;">
              <button id="aura-track-creator-btn" style="
                width: 100%;
                padding: 8px 12px;
                background: ${isTracking ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'};
                border: 1px solid ${isTracking ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'};
                color: ${isTracking ? '#ef4444' : '#10b981'};
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              ">${isTracking ? `Untrack @${profileUsername}` : `Track @${profileUsername}`}</button>
            </div>
          `;
        }

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
              <span class="aura-widget-label">Viral Scores</span>
              <span class="aura-widget-value">
                <label class="aura-toggle">
                  <input type="checkbox" id="aura-badge-toggle" ${badgesEnabled ? 'checked' : ''}>
                  <span class="aura-toggle-slider"></span>
                </label>
              </span>
            </div>
            ${s.connected && s.baseUrl ? `<a class="aura-widget-btn" href="${s.baseUrl}" target="_blank">Open Aura Dashboard</a>` : `<div style="color: #999; font-size: 12px; margin-top: 12px; text-align: center;">Open your Aura dashboard once to connect</div>`}
            ${trackCreatorRow}
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

        const trackBtn = widgetEl.querySelector('#aura-track-creator-btn');
        if (trackBtn && profileUsername) {
          trackBtn.addEventListener('click', () => {
            const isTracking = trackingState && trackingState.includes(profileUsername.toLowerCase());
            const action = isTracking ? 'aura:remove-creator' : 'aura:add-creator';
            trackBtn.textContent = 'Working...';
            trackBtn.disabled = true;
            chrome.runtime.sendMessage({ action, username: profileUsername, platform: 'threads' }, (resp) => {
              if (resp && resp.threads) {
                buildWidget(resp.threads);
              }
            });
          });
        }
      };

      if (profileUsername) {
        chrome.runtime.sendMessage({ action: 'aura:get-watchlist' }, (resp) => {
          buildWidget(resp && resp.threads ? resp.threads : []);
        });
      } else {
        buildWidget(null);
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
  let cleaned = text.trim();

  const localizedMatch = cleaned.match(/^([\d.,]+)\s*(tusind[e]?|mio\.?|mia\.?|thousand|million|billion|mil|tys|k|m|b)$/i);
  if (localizedMatch) {
    let numStr = localizedMatch[1].replace(/\./g, '').replace(',', '.');
    let val = parseFloat(numStr);
    if (isNaN(val)) return 0;
    const unit = localizedMatch[2].toLowerCase().replace('.', '');
    if (unit === 'k' || unit === 'tusind' || unit === 'tusinde' || unit === 'thousand' || unit === 'tys') val *= 1000;
    else if (unit === 'm' || unit === 'mio' || unit === 'million' || unit === 'mil') val *= 1000000;
    else if (unit === 'b' || unit === 'mia' || unit === 'billion') val *= 1000000000;
    return Math.round(val);
  }

  let numOnly = cleaned.replace(/\./g, '').replace(',', '.');
  const simpleMatch = numOnly.match(/^([\d.]+)\s*([KMB])?$/i);
  if (simpleMatch) {
    let val = parseFloat(simpleMatch[1]);
    if (isNaN(val)) return 0;
    const suffix = (simpleMatch[2] || '').toUpperCase();
    if (suffix === 'K') val *= 1000;
    else if (suffix === 'M') val *= 1000000;
    else if (suffix === 'B') val *= 1000000000;
    return Math.round(val);
  }

  const anyNum = cleaned.replace(/[^\d]/g, '');
  return anyNum ? parseInt(anyNum, 10) : 0;
}

function calculateThreadsViralScore(metrics) {
  const likes = metrics.likes || 0;
  const comments = metrics.comments || metrics.replies || 0;
  const reposts = metrics.reposts || 0;
  const views = metrics.views || null;
  const hoursSincePost = Math.max(metrics.hoursSincePost || 0.5, 0.1);

  let engagementScore, velocityScore, conversationScore, mode;

  const conversationRatio = comments / Math.max(likes, 1);
  conversationScore = Math.min(conversationRatio * 40, 100);

  if (views && views > 0) {
    mode = 'views';
    const engagementRate = (likes + comments * 2 + reposts * 3) / views;
    engagementScore = Math.min(engagementRate * 200, 100);

    const velocity = views / hoursSincePost;
    velocityScore = Math.min((velocity / 2000) * 100, 100);

    const viralScore = Math.round(0.5 * engagementScore + 0.3 * velocityScore + 0.2 * conversationScore);

    return {
      total: Math.min(Math.max(viralScore, 0), 100),
      engagement: Math.round(engagementScore),
      velocity: Math.round(velocityScore),
      conversation: Math.round(conversationScore),
      mode
    };
  } else {
    mode = 'fallback';
    const engagement = likes + comments * 2 + reposts * 3;

    engagementScore = Math.min((engagement / 2000) * 100, 100);

    const velocity = engagement / hoursSincePost;
    velocityScore = Math.min((velocity / 300) * 100, 100);

    const viralScore = Math.round(0.4 * engagementScore + 0.4 * velocityScore + 0.2 * conversationScore);

    return {
      total: Math.min(Math.max(viralScore, 0), 100),
      engagement: Math.round(engagementScore),
      velocity: Math.round(velocityScore),
      conversation: Math.round(conversationScore),
      mode
    };
  }
}

function isValidActionBar(div) {
  for (const child of div.children) {
    if (child.querySelector('img')) return false;
  }
  let svgChildCount = 0;
  for (const child of div.children) {
    if (child.querySelector('svg') || child.tagName === 'SVG') svgChildCount++;
  }
  return svgChildCount >= 3 && svgChildCount <= 6 && div.children.length <= 8;
}

function findActionBar(container) {
  const allDivs = container.querySelectorAll('div');
  let lastMatch = null;
  for (const div of allDivs) {
    if (div.closest('.aura-fab, .aura-widget, .aura-panel, .aura-badge, .aura-analyze-btn')) continue;
    if (isValidActionBar(div)) lastMatch = div;
  }
  return lastMatch;
}

function extractMetricsFromActionBar(actionBar) {
  let likes = 0, replies = 0, reposts = 0, views = 0;
  if (!actionBar) return { likes, replies, reposts, views };

  const metricPattern = /([\d.,]+\s*(?:tusind[e]?|mio\.?|mia\.?|thousand|million|billion|mil|tys|[KMBkmb])?)/i;

  const buttons = Array.from(actionBar.children);
  const nums = [];
  for (const btn of buttons) {
    if (btn.closest('.aura-badge, .aura-analyze-btn')) { nums.push(0); continue; }
    const textNodes = [];
    const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement && node.parentElement.closest('.aura-badge, .aura-analyze-btn')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t) textNodes.push(t);
    }
    const combined = textNodes.join(' ').trim();
    const match = combined.match(metricPattern);
    nums.push(match ? parseMetric(match[1]) : 0);
  }

  const nonZero = nums.filter(n => n > 0);
  if (nums.length >= 3) {
    likes = nums[0]; replies = nums[1]; reposts = nums[2];
  } else if (nums.length >= 2) {
    likes = nums[0]; replies = nums[1];
  }

  if (likes === 0 && replies === 0 && nonZero.length === 0) {
    const fullText = actionBar.innerText;
    const allNums = [];
    const globalPattern = /([\d.,]+\s*(?:tusind[e]?|mio\.?|mia\.?|thousand|million|billion|mil|tys|[KMBkmb])?)/gi;
    let m;
    while ((m = globalPattern.exec(fullText)) !== null) {
      const val = parseMetric(m[1]);
      if (val > 0) allNums.push(val);
    }
    if (allNums.length >= 3) { likes = allNums[0]; replies = allNums[1]; reposts = allNums[2]; }
    else if (allNums.length >= 2) { likes = allNums[0]; replies = allNums[1]; }
    else if (allNums.length === 1) { likes = allNums[0]; }
  }

  return { likes, replies, reposts, views };
}

function extractMetricsFromPostText(postEl) {
  const lines = postEl.innerText.split('\n').filter(l => l.trim());
  const metricLinePattern = /([\d.,]+\s*(?:tusind[e]?|mio\.?|mia\.?|[KMBkmb])?)/gi;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const matches = [];
    let m;
    while ((m = metricLinePattern.exec(line)) !== null) {
      matches.push(parseMetric(m[1]));
    }
    metricLinePattern.lastIndex = 0;
    if (matches.length >= 2 && matches.length <= 4) {
      return { likes: matches[0], replies: matches[1], reposts: matches[2] || 0, views: 0 };
    }
  }
  return null;
}

function extractViewsFromPage(postEl) {
  const fullText = postEl.innerText;
  const viewPatterns = [
    /([\d.,]+\s*(?:tusind[e]?|mio\.?|mia\.?))\s*(?:visninger|views)/i,
    /([\d.,]+[KMB]?)\s*(?:visninger|views)/i
  ];
  for (const pattern of viewPatterns) {
    const match = fullText.match(pattern);
    if (match) return parseMetric(match[1]);
  }
  return 0;
}

function parseTimeSincePost(postEl) {
  const timeTexts = postEl.querySelectorAll('time, span, a');
  for (const el of timeTexts) {
    if (el.closest('.aura-badge, .aura-analyze-btn')) continue;
    const t = el.textContent.trim();
    const minMatch = t.match(/^(\d+)\s*(?:min\.?|m)$/i);
    if (minMatch) return parseInt(minMatch[1]) / 60;
    const hourMatch = t.match(/^(\d+)\s*(?:t\.?|h|timer?|hours?)$/i);
    if (hourMatch) return parseInt(hourMatch[1]);
    const dayMatch = t.match(/^(\d+)\s*(?:d\.?|dage?|days?)$/i);
    if (dayMatch) return parseInt(dayMatch[1]) * 24;
    const weekMatch = t.match(/^(\d+)\s*(?:u\.?|uger?|weeks?|w)$/i);
    if (weekMatch) return parseInt(weekMatch[1]) * 168;
  }
  return 0.5;
}

function findAuthor(postEl) {
  const links = postEl.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('/@') || (href.startsWith('/') && href.split('/').length === 2 && !href.includes('.'))) {
      const text = link.textContent.trim();
      if (text && text.length > 0 && text.length < 50 && !text.includes(' ')) {
        return text;
      }
    }
  }
  const anyLink = postEl.querySelector('a[href^="/@"]');
  if (anyLink) return anyLink.textContent.trim();
  return '';
}

function findPostText(postEl, actionBar) {
  const skipWords = new Set(['oversæt', 'translate', 'see translation', 'vis oversættelse', 'første tråd', 'first thread', 'relevante', 'vis aktivitet', 'synes godt om', 'svar', 'del', 'mere', 'more', 'reply', 'share', 'like', 'repost', 'spoiler', 'følg', 'follow', 'following', 'følger']);
  const authorName = findAuthor(postEl);
  const elements = postEl.querySelectorAll('span[dir="auto"], span[dir="ltr"], div[dir="auto"]');
  const textParts = [];
  const seen = new Set();

  for (const el of elements) {
    if (actionBar && actionBar.contains(el)) continue;
    if (el.closest('.aura-badge, .aura-analyze-btn, .aura-fab, .aura-widget')) continue;
    const text = el.innerText.trim();
    if (!text) continue;
    if (skipWords.has(text.toLowerCase())) continue;
    if (/^\d+$/.test(text)) continue;
    if (/^\d+\s*(min|t|h|d|u|w|tusind|mio)\.?$/i.test(text)) continue;
    if (text === authorName) continue;
    if (seen.has(text)) continue;

    let isChild = false;
    for (const other of elements) {
      if (other !== el && other.contains(el) && other.innerText.trim().includes(text)) {
        isChild = true;
        break;
      }
    }
    if (isChild) continue;

    seen.add(text);
    textParts.push(text);
  }

  return textParts.join('\n');
}

function findPostImages(postEl, actionBar) {
  const urls = [];
  const imgs = postEl.querySelectorAll('img');
  for (const img of imgs) {
    if (actionBar && actionBar.contains(img)) continue;
    if (img.closest('.aura-badge, .aura-analyze-btn, .aura-fab, .aura-widget, .aura-panel')) continue;
    const src = img.src || '';
    if (!src || src.startsWith('data:') || src.includes('emoji') || src.includes('/static/')) continue;
    if (src.includes('profile_images') || src.includes('profile_pic')) continue;

    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w > 0 && h > 0 && w < 40 && h < 40) continue;

    const style = window.getComputedStyle(img);
    const br = style.borderRadius;
    const isCircular = br === '50%' || br === '9999px' || parseInt(br) >= 40;
    const parentW = img.parentElement ? img.parentElement.offsetWidth : 0;
    const parentH = img.parentElement ? img.parentElement.offsetHeight : 0;
    const isSmallContainer = parentW > 0 && parentW <= 80 && parentH > 0 && parentH <= 80;
    if (isCircular && isSmallContainer) continue;
    if (isCircular && w > 0 && w <= 80 && h > 0 && h <= 80) continue;

    const clean = src.replace(/\/s\d+x\d+\//, '/').replace(/\/w\d+\//, '/').replace(/\/p\d+x\d+\//, '/');
    if (!urls.includes(clean)) urls.push(clean);
  }
  return urls;
}

function getThreadsPostData(postEl) {
  const actionBar = postEl._auraActionBar || findActionBar(postEl);
  let metrics = extractMetricsFromActionBar(actionBar);

  if (metrics.likes === 0 && metrics.replies === 0) {
    const fallback = extractMetricsFromPostText(postEl);
    if (fallback) metrics = fallback;
  }

  const authorName = findAuthor(postEl);
  const text = findPostText(postEl, actionBar);
  const hoursSincePost = parseTimeSincePost(postEl);
  const pageViews = extractViewsFromPage(postEl);
  if (pageViews > 0) metrics.views = pageViews;

  const data = {
    text: text || `[Image post by @${authorName}]`,
    authorName,
    authorHandle: authorName,
    imageUrls: findPostImages(postEl, actionBar),
    metrics: {
      likes: metrics.likes,
      comments: metrics.replies,
      reposts: metrics.reposts,
      views: metrics.views || null,
      hoursSincePost
    },
    hoursSincePost,
    url: window.location.href,
    el: postEl,
    scoreBreakdown: null,
    opportunityScore: null
  };

  const scoreResult = calculateThreadsViralScore(data.metrics);
  data.opportunityScore = scoreResult.total;
  data.scoreBreakdown = scoreResult;

  return data;
}

// ─── Badge & Button Injection ───

function injectBadges(postEl) {
  if (postEl.classList.contains('aura-processed')) return;
  if (postEl.innerText.length < 10) return;

  if (postEl.closest('nav')) return;

  postEl.classList.add('aura-processed');
  postEl.classList.add('aura-threads-post');

  const data = getThreadsPostData(postEl);

  if (badgesEnabled && !postEl.querySelector('.aura-badge')) {
    if (data.opportunityScore !== null && data.opportunityScore > 0) {
      const badge = document.createElement('div');
      const colorClass = data.opportunityScore >= 75 ? 'aura-badge-high' : data.opportunityScore >= 50 ? 'aura-badge-med' : 'aura-badge-low';
      badge.className = `aura-badge ${colorClass}`;
      badge.textContent = `🔥 ${data.opportunityScore}`;

      const authorLink = postEl.querySelector('a[href^="/@"]');
      if (authorLink) {
        const nameSpan = authorLink.closest('span') || authorLink.parentElement;
        nameSpan.style.display = 'block';
        nameSpan.appendChild(badge);
      }
    }
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

  if (!postEl.style.position || postEl.style.position === 'static') {
    postEl.style.position = 'relative';
  }
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

  const sb = tweetData.scoreBreakdown || {};
  const scoreEmoji = tweetData.opportunityScore >= 75 ? '🔥' : tweetData.opportunityScore >= 50 ? '⚡' : tweetData.opportunityScore >= 25 ? '💡' : '💤';
  const modeLabel = sb.mode === 'views' ? '📊 Views mode' : '📈 Engagement mode';
  const formatNum = (n) => n >= 1000000 ? (n/1000000).toFixed(1) + 'M' : n >= 1000 ? (n/1000).toFixed(1) + 'K' : String(n || 0);
  const m = tweetData.metrics;

  panel.innerHTML = `
    <div class="aura-panel-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">✨</span>
        <span style="font-weight: bold; font-size: 16px;">Threads Viral Analysis</span>
        <span style="background: ${getScoreColor(tweetData.opportunityScore)}22; color: ${getScoreColor(tweetData.opportunityScore)}; padding: 2px 8px; border-radius: 9999px; font-size: 13px; font-weight: 700;">${scoreEmoji} ${tweetData.opportunityScore}</span>
      </div>
      <button id="aura-close-panel" style="background: none; border: none; color: #999; cursor: pointer; font-size: 20px;">&times;</button>
    </div>
    <div class="aura-panel-content">
      <div class="aura-tweet-preview">
        <div style="font-weight: bold; margin-bottom: 4px; color: #7c3aed;">@${escapeHtml(tweetData.authorName)}</div>
        <div style="white-space: pre-wrap;">${escapeHtml(tweetData.text)}</div>
        ${tweetData.imageUrls.length > 0 ? tweetData.imageUrls.map(url => `<img src="${url}" class="aura-tweet-image">`).join('') : ''}
        ${tweetData.imageUrls.length > 0 ? `<div style="font-size: 11px; color: #a78bfa; margin-top: 6px;">🔄 AI Vision will analyze this image</div>` : ''}
      </div>

      <div class="aura-metrics-grid">
        <div class="aura-metric-item">
          <div class="aura-metric-value">${formatNum(m.likes)}</div>
          <div class="aura-metric-label">Likes</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${formatNum(m.comments)}</div>
          <div class="aura-metric-label">Comments</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${formatNum(m.reposts)}</div>
          <div class="aura-metric-label">Reposts</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value" style="color: ${getScoreColor(tweetData.opportunityScore)}">${tweetData.opportunityScore}</div>
          <div class="aura-metric-label">Score</div>
        </div>
      </div>

      <div class="aura-score-breakdown">
        <div class="aura-score-item">
          <div style="font-size: 10px; color: #999;">ENGAGEMENT</div>
          <div style="font-weight: bold; color: ${getScoreColor(sb.engagement || 0)}">${sb.engagement || 0}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${sb.engagement || 0}%; background: ${getScoreColor(sb.engagement || 0)}"></div></div>
        </div>
        <div class="aura-score-item">
          <div style="font-size: 10px; color: #999;">VELOCITY</div>
          <div style="font-weight: bold; color: ${getScoreColor(sb.velocity || 0)}">${sb.velocity || 0}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${sb.velocity || 0}%; background: ${getScoreColor(sb.velocity || 0)}"></div></div>
        </div>
        <div class="aura-score-item">
          <div style="font-size: 10px; color: #999;">CONVERSATION</div>
          <div style="font-weight: bold; color: ${getScoreColor(sb.conversation || 0)}">${sb.conversation || 0}</div>
          <div class="aura-score-bar"><div class="aura-score-fill" style="width: ${sb.conversation || 0}%; background: ${getScoreColor(sb.conversation || 0)}"></div></div>
        </div>
      </div>
      <div style="text-align: center; font-size: 10px; color: #666; margin-bottom: 12px;">${modeLabel}</div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; font-weight: bold; color: #999; margin-bottom: 6px;">CUSTOM INSTRUCTIONS (OPTIONAL)</label>
        <textarea id="aura-custom-instructions" class="aura-input" placeholder="e.g. Be funny, disagree slightly, or mention AI..." rows="2"></textarea>
      </div>

      <button id="aura-generate-btn" class="aura-btn aura-btn-primary" style="width: 100%; padding: 10px; margin-bottom: 16px;">
        Generate Viral Replies
      </button>

      <div id="aura-vision-result" style="display: none; margin-bottom: 12px;"></div>
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
  const visionResultEl = panel.querySelector('#aura-vision-result');

  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="aura-loading-spinner"></span> Analyzing' + (tweetData.imageUrls.length > 0 ? ' image + text...' : '...');
    repliesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">✨ Generating viral replies...</div>';
    visionResultEl.style.display = 'none';

    const payload = {
      tweetText: tweetData.text,
      authorHandle: tweetData.authorName,
      metrics: tweetData.metrics,
      customInstructions: customInstructionsInput.value,
      platform: 'threads',
      imageUrl: tweetData.imageUrls.length > 0 ? tweetData.imageUrls[0] : null
    };

    chrome.runtime.sendMessage({ action: 'aura:generate-replies', data: { payload } }, (response) => {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Regenerate Replies';

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
            grid.innerHTML = '<div style="text-align: center; padding: 12px; color: #999; font-size: 12px;">Loading media vault...</div>';
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
                grid.innerHTML = `<div style="text-align: center; padding: 12px; color: #999; font-size: 12px;">${res?.error || 'No images in your media vault.'}</div>`;
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
        const errMsg = response?.error || response?.message || 'Failed to generate replies. Please try again.';
        repliesContainer.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 20px;">${escapeHtml(errMsg)}</div>`;
      }
    });
  });
}

// ─── Post Detection via Action Bar Discovery ───

function scanForPosts() {
  const processedBars = new Set();
  const allDivs = document.querySelectorAll('div:not(.aura-processed):not(.aura-fab):not(.aura-widget):not(.aura-panel)');

  for (const div of allDivs) {
    if (div.closest('.aura-fab, .aura-widget, .aura-panel, .aura-overlay')) continue;
    if (processedBars.has(div)) continue;

    if (!isValidActionBar(div)) continue;

    processedBars.add(div);

    let postEl = div;
    let bestContainer = null;
    for (let i = 0; i < 6; i++) {
      const parent = postEl.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) break;

      if (parent.offsetWidth > 800) break;

      const otherActionBars = parent.querySelectorAll('div');
      let actionBarCount = 0;
      for (const d of otherActionBars) {
        if (d === div) continue;
        let sc = 0;
        for (const c of d.children) {
          if (c.querySelector('svg') || c.tagName === 'SVG') sc++;
        }
        if (sc >= 3 && sc <= 6 && d.children.length <= 8) actionBarCount++;
      }
      if (actionBarCount > 2) break;

      postEl = parent;

      const hasAuthorLink = postEl.querySelector('a[href^="/@"]');
      if (hasAuthorLink) {
        bestContainer = postEl;
      }

      const cs = window.getComputedStyle(postEl);
      const hasBorder = cs.borderBottomWidth !== '0px' && cs.borderBottomStyle !== 'none';
      if (bestContainer && hasBorder) break;
    }

    const container = bestContainer || postEl;
    if (!container.classList.contains('aura-processed')) {
      container._auraActionBar = div;
      injectBadges(container);
    }
  }
}

// ─── For You Feed Scanner (Early Post Detection) ───

const seenEarlyPosts = new Set();

function getPostFingerprint(postEl) {
  const author = findAuthor(postEl);
  const text = (postEl.innerText || '').substring(0, 100);
  return `${author}::${text}`;
}

function scanForEarlyPosts() {
  const posts = document.querySelectorAll('.aura-threads-post');
  for (const postEl of posts) {
    if (postEl.querySelector('.aura-early-badge')) continue;

    const fingerprint = getPostFingerprint(postEl);
    if (seenEarlyPosts.has(fingerprint)) continue;

    const hoursSince = parseTimeSincePost(postEl);
    const minutesSince = hoursSince * 60;

    if (minutesSince > 0 && minutesSince < 5) {
      seenEarlyPosts.add(fingerprint);

      const badge = document.createElement('div');
      badge.className = 'aura-early-badge';
      const ageText = minutesSince < 1 ? '<1m' : `${Math.round(minutesSince)}m`;
      badge.textContent = `⚡ Early Post · ${ageText} ago · Reply now for max reach`;
      postEl.prepend(badge);
    }
  }
}

let earlyPostInterval = null;
let scrollDebounce = null;

function startEarlyPostScanner() {
  scanForEarlyPosts();
  earlyPostInterval = setInterval(scanForEarlyPosts, 10000);
  window.addEventListener('scroll', () => {
    if (scrollDebounce) clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(scanForEarlyPosts, 500);
  }, { passive: true });
}

// ─── Following Page Import ───

function isFollowingPage() {
  return /^\/@[A-Za-z0-9_.]+\/follow(ing|ers)\/?$/.test(window.location.pathname);
}

function findFollowingModal() {
  const dialogs = document.querySelectorAll('[role="dialog"], div[style*="position: fixed"], div[style*="position:fixed"]');
  for (const dialog of dialogs) {
    const links = dialog.querySelectorAll('a[href^="/@"]');
    if (links.length >= 3) return dialog;
  }

  const overlays = document.querySelectorAll('div');
  for (const div of overlays) {
    const cs = window.getComputedStyle(div);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    if (parseInt(cs.zIndex) < 100) continue;
    const links = div.querySelectorAll('a[href^="/@"]');
    if (links.length >= 3) return div;
  }

  return null;
}

function findScrollableContainer(modal) {
  const candidates = modal.querySelectorAll('div');
  for (const div of candidates) {
    const cs = window.getComputedStyle(div);
    if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
      if (div.scrollHeight > div.clientHeight) return div;
    }
  }
  return modal;
}

let importBtnActive = false;

function checkForFollowingList() {
  if (document.getElementById('aura-import-following-btn')) return;

  const isDirectPage = isFollowingPage();
  const modal = findFollowingModal();

  if (!isDirectPage && !modal) return;

  const targetContainer = modal || null;

  const btn = document.createElement('button');
  btn.id = 'aura-import-following-btn';
  btn.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 20px;
    z-index: 2147483647;
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
    if (importBtnActive) return;
    importBtnActive = true;
    btn.disabled = true;
    btn.style.opacity = '0.8';
    btn.style.cursor = 'wait';

    const creatorsMap = new Map();
    let noNewCount = 0;
    const maxScrollAttempts = 100;

    const scrollTarget = targetContainer ? findScrollableContainer(targetContainer) : null;
    const searchRoot = targetContainer || document;

    for (let i = 0; i < maxScrollAttempts; i++) {
      const links = searchRoot.querySelectorAll('a[href^="/@"]');
      let foundNew = false;
      for (const link of links) {
        if (link.closest('#aura-import-following-btn')) continue;
        const href = link.getAttribute('href') || '';
        const match = href.match(/^\/@([A-Za-z0-9_.]+)\/?$/);
        if (match && match[1]) {
          const uname = match[1].toLowerCase();
          if (!creatorsMap.has(uname)) {
            let avatarUrl = null;
            const container = link.closest('div[class]');
            if (container) {
              const img = container.querySelector('img[src*="scontent"], img[src*="cdninstagram"], img[src*="fbcdn"]');
              if (img) avatarUrl = img.src;
            }
            if (!avatarUrl) {
              const parent = link.parentElement;
              if (parent) {
                const sibImg = parent.parentElement?.querySelector('img');
                if (sibImg && sibImg.src && !sibImg.src.includes('emoji')) avatarUrl = sibImg.src;
              }
            }
            creatorsMap.set(uname, avatarUrl);
            foundNew = true;
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

      if (scrollTarget) {
        scrollTarget.scrollTop += 400;
      } else {
        window.scrollBy(0, 600);
      }
      await new Promise(r => setTimeout(r, 800));
    }

    const allCreators = Array.from(creatorsMap.entries()).map(([username, avatarUrl]) => ({ username, avatarUrl }));
    btn.innerHTML = `📥 Importing ${allCreators.length} creators...`;

    chrome.runtime.sendMessage({
      action: 'aura:bulk-import-creators',
      creators: allCreators,
      platform: 'threads'
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
      importBtnActive = false;
      setTimeout(() => {
        btn.innerHTML = '📥 Import Following List';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      }, 5000);
    });
  });

  document.body.appendChild(btn);

  if (targetContainer) {
    const modalCloseObserver = new MutationObserver(() => {
      if (!document.body.contains(targetContainer)) {
        const existingBtn = document.getElementById('aura-import-following-btn');
        if (existingBtn) existingBtn.remove();
        modalCloseObserver.disconnect();
      }
    });
    modalCloseObserver.observe(document.body, { childList: true, subtree: true });
  }
}

// ─── Main Observer ───

let scanTimeout = null;
const observer = new MutationObserver(() => {
  if (scanTimeout) clearTimeout(scanTimeout);
  scanTimeout = setTimeout(scanForPosts, 300);
});

function init() {
  console.log('[Aura Threads] Content script loaded on', window.location.hostname);
  createFloatingWidget();
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(scanForPosts, 1000);
  setTimeout(scanForPosts, 3000);
  setTimeout(startEarlyPostScanner, 2000);
  checkForFollowingList();
  setInterval(checkForFollowingList, 2000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
