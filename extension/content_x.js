// extension/content_x.js
// Runs on x.com/twitter.com pages

/**
 * Finds the tweet composer element using multiple fallback selectors.
 * @returns {HTMLElement|null}
 */
function findComposer() {
  const selectors = [
    '[data-testid="tweetTextarea_0"]',
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

/**
 * Types text character-by-character with small random delays.
 * @param {HTMLElement} element 
 * @param {string} text 
 */
async function insertText(element, text) {
  element.focus();
  
  // Clear existing text if any (optional, but usually better for replacement)
  // document.execCommand('selectAll', false, null);
  // document.execCommand('delete', false, null);

  for (const char of text) {
    const delay = Math.floor(Math.random() * 21) + 10; // 10-30ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Using execCommand for better compatibility with Draft.js/React editors
    document.execCommand('insertText', false, char);
    
    // Dispatch input events to trigger React state updates
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Attaches an image to the tweet composer.
 * @param {Blob} blob 
 * @param {string} filename 
 */
async function attachImage(blob, filename) {
  const fileInput = document.querySelector('input[data-testid="fileInput"]');
  if (!fileInput) {
    console.error('Aura: File input not found');
    return;
  }

  const file = new File([blob], filename, { type: blob.type });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Polls for the composer element with exponential backoff.
 * @param {number} timeout 
 * @returns {Promise<HTMLElement>}
 */
async function waitForComposer(timeout = 10000) {
  const startTime = Date.now();
  let delay = 100;

  while (Date.now() - startTime < timeout) {
    const el = findComposer();
    if (el) return el;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 1000);
  }
  throw new Error('Aura: Timeout waiting for composer');
}

/**
 * Shows a floating toast message.
 * @param {string} message 
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'aura-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1d9bf0;
    color: white;
    padding: 12px 24px;
    border-radius: 9999px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-weight: bold;
    z-index: 100000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: aura-fade-in 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Global Styles for Aura UI
const auraStyles = document.createElement('style');
auraStyles.textContent = `
  @keyframes aura-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
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
  article[data-testid="tweet"]:hover .aura-analyze-btn {
    opacity: 1;
  }
  .aura-analyze-btn:hover {
    background: #6d28d9;
  }
  .aura-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
    margin-right: 8px;
    margin-top: 4px;
  }
  .aura-badge-high { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
  .aura-badge-med { background: rgba(234, 179, 8, 0.2); color: #eab308; }
  .aura-badge-low { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
  
  .aura-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 450px;
    max-height: 80vh;
    background: #15202b;
    border: 1px solid #38444d;
    border-radius: 16px;
    z-index: 100001;
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
  .aura-panel-footer {
    padding: 16px;
    border-top: 1px solid #38444d;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .aura-tweet-preview {
    background: #192734;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .aura-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .aura-metric-item {
    background: #192734;
    padding: 8px;
    border-radius: 8px;
    text-align: center;
  }
  .aura-metric-value { font-weight: bold; font-size: 16px; }
  .aura-metric-label { font-size: 10px; color: #8899a6; text-transform: uppercase; }
  
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
`;
document.head.appendChild(auraStyles);

// Analysis Utility Functions
function parseMetric(text) {
  if (!text) return 0;
  const match = text.replace(/,/g, '').match(/(\d+(\.\d+)?[KMB]?)/i);
  if (!match) return 0;
  let val = match[1].toUpperCase();
  let multiplier = 1;
  if (val.endsWith('K')) { multiplier = 1000; val = val.slice(0, -1); }
  else if (val.endsWith('M')) { multiplier = 1000000; val = val.slice(0, -1); }
  else if (val.endsWith('B')) { multiplier = 1000000000; val = val.slice(0, -1); }
  return parseFloat(val) * multiplier;
}

function calculateOpportunityScore(metrics) {
  const { likes, replies, views } = metrics;
  if (views < 100 && likes < 5) return null;
  
  // High score if low replies relative to likes/views (low competition)
  // Higher score if views/likes ratio is high (high engagement)
  const replyToLikeRatio = (replies + 1) / (likes + 1);
  const viewsToLikeRatio = (views + 1) / (likes + 1);
  
  let score = 50;
  if (replyToLikeRatio < 0.05) score += 20; // Very few replies
  if (viewsToLikeRatio > 100) score += 15; // High view count relative to likes
  if (likes > 1000) score += 10; // High social proof
  
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function getTweetData(tweetEl) {
  const textEl = tweetEl.querySelector('[data-testid="tweetText"]');
  const userEl = tweetEl.querySelector('[data-testid="User-Name"]');
  const metricsEls = {
    replies: tweetEl.querySelector('[data-testid="reply"]'),
    retweets: tweetEl.querySelector('[data-testid="retweet"]'),
    likes: tweetEl.querySelector('[data-testid="like"]'),
    views: tweetEl.querySelector('a[href*="/analytics"]') || tweetEl.querySelector('[data-testid="app-text-transition-container"]')
  };

  const data = {
    text: textEl ? textEl.innerText : '',
    authorName: userEl ? userEl.innerText.split('\n')[0] : '',
    authorHandle: userEl ? userEl.innerText.split('\n')[1] : '',
    metrics: {
      replies: parseMetric(metricsEls.replies?.innerText),
      retweets: parseMetric(metricsEls.retweets?.innerText),
      likes: parseMetric(metricsEls.likes?.innerText),
      views: parseMetric(metricsEls.views?.innerText || metricsEls.views?.parentElement?.innerText)
    },
    url: tweetEl.querySelector('time')?.parentElement?.href || window.location.href,
    el: tweetEl
  };

  data.opportunityScore = calculateOpportunityScore(data.metrics);
  return data;
}

// UI Injection
function injectBadges(tweetEl) {
  if (tweetEl.querySelector('.aura-badge')) return;
  const data = getTweetData(tweetEl);
  if (data.opportunityScore === null) return;

  const badge = document.createElement('div');
  const colorClass = data.opportunityScore >= 70 ? 'aura-badge-high' : data.opportunityScore >= 40 ? 'aura-badge-med' : 'aura-badge-low';
  badge.className = `aura-badge ${colorClass}`;
  badge.innerHTML = `🔥 ${data.opportunityScore}`;
  
  // Find a place to inject. Usually near the user name or bottom actions
  const target = tweetEl.querySelector('[data-testid="User-Name"]');
  if (target) {
    target.parentElement.appendChild(badge);
  }

  // Add Analyze Button
  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'aura-analyze-btn';
  analyzeBtn.innerHTML = `<span>✨ Analyze</span>`;
  analyzeBtn.onclick = (e) => {
    e.stopPropagation();
    openAnalysisPanel(data);
  };
  tweetEl.style.position = 'relative';
  tweetEl.appendChild(analyzeBtn);
}

let activePanel = null;

function openAnalysisPanel(tweetData) {
  if (activePanel) activePanel.remove();

  const panel = document.createElement('div');
  panel.className = 'aura-panel';
  panel.innerHTML = `
    <div class="aura-panel-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: bold; color: #7c3aed;">Aura Analyze</span>
        ${tweetData.opportunityScore ? `<span class="aura-badge aura-badge-high" style="margin: 0;">🔥 ${tweetData.opportunityScore}</span>` : ''}
      </div>
      <button class="aura-btn aura-btn-secondary" id="aura-close-panel" style="padding: 4px 8px;">✕</button>
    </div>
    <div class="aura-panel-content">
      <div class="aura-tweet-preview">
        <div style="font-weight: bold; margin-bottom: 4px;">${tweetData.authorName}</div>
        <div style="color: #8899a6; font-size: 12px; margin-bottom: 8px;">${tweetData.authorHandle}</div>
        <div>${tweetData.text.substring(0, 150)}${tweetData.text.length > 150 ? '...' : ''}</div>
      </div>
      
      <div class="aura-metrics-grid">
        <div class="aura-metric-item">
          <div class="aura-metric-value">${tweetData.metrics.views.toLocaleString()}</div>
          <div class="aura-metric-label">Views</div>
        </div>
        <div class="aura-metric-item">
          <div class="aura-metric-value">${tweetData.metrics.likes.toLocaleString()}</div>
          <div class="aura-metric-label">Likes</div>
        </div>
      </div>

      <div style="margin-bottom: 8px; font-weight: bold; font-size: 14px;">Custom Instructions</div>
      <textarea class="aura-input" id="aura-custom-instructions" placeholder="e.g. 'gen z slang', 'professional', 'funny'"></textarea>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-weight: bold; font-size: 14px; margin-bottom: 8px;">Screenshot Analysis (Optional)</label>
        <input type="file" id="aura-screenshot-upload" accept="image/*" style="font-size: 12px; color: #8899a6;">
      </div>

      <button class="aura-btn aura-btn-primary" id="aura-generate-btn" style="width: 100%; margin-bottom: 16px;">Generate Viral Replies</button>
      
      <div id="aura-replies-container" class="aura-replies-list"></div>
    </div>
  `;

  document.body.appendChild(panel);
  activePanel = panel;

  panel.querySelector('#aura-close-panel').onclick = () => {
    panel.remove();
    activePanel = null;
  };

  const generateBtn = panel.querySelector('#aura-generate-btn');
  const repliesContainer = panel.querySelector('#aura-replies-container');
  const instructionsInput = panel.querySelector('#aura-custom-instructions');
  const fileInput = panel.querySelector('#aura-screenshot-upload');

  generateBtn.onclick = async () => {
    generateBtn.disabled = true;
    generateBtn.innerText = 'Analyzing...';
    repliesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #8899a6;">Generating magical replies...</div>';

    let screenshotBase64 = null;
    if (fileInput.files[0]) {
      const reader = new FileReader();
      screenshotBase64 = await new Promise(resolve => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
      });
    }

    const payload = {
      tweetText: tweetData.text,
      authorName: tweetData.authorName,
      metrics: tweetData.metrics,
      customInstruction: instructionsInput.value,
      screenshotBase64
    };

    chrome.runtime.sendMessage({
      action: 'aura:generate-replies',
      data: {
        baseUrl: window.location.origin.includes('repl.co') || window.location.origin.includes('replit.app') 
                 ? window.location.origin 
                 : 'https://' + window.location.hostname, // This might need adjustment based on actual deployment
        payload
      }
    }, (response) => {
      generateBtn.disabled = false;
      generateBtn.innerText = 'Regenerate Replies';
      
      if (response && response.replies) {
        repliesContainer.innerHTML = '';
        response.replies.forEach(reply => {
          const card = document.createElement('div');
          card.className = 'aura-reply-card';
          card.innerHTML = `
            <div>${reply}</div>
            <div class="aura-reply-actions">
              <button class="aura-btn aura-btn-secondary aura-copy-btn">Copy</button>
              <button class="aura-btn aura-btn-primary aura-insert-btn">Insert Reply</button>
            </div>
          `;
          
          card.querySelector('.aura-copy-btn').onclick = () => {
            navigator.clipboard.writeText(reply);
            showToast('Copied to clipboard');
          };
          
          card.querySelector('.aura-insert-btn').onclick = () => {
            handleInsertReply(tweetData, reply);
            panel.remove();
            activePanel = null;
          };
          
          repliesContainer.appendChild(card);
        });
      } else {
        repliesContainer.innerHTML = '<div style="color: #ff4444; text-align: center;">Error generating replies. Please try again.</div>';
      }
    });
  };
}

async function handleInsertReply(tweetData, replyText) {
  try {
    // 1. Find the reply button on the tweet element and click it
    const replyBtn = tweetData.el.querySelector('[data-testid="reply"]');
    if (replyBtn) {
      replyBtn.click();
    } else {
      // Fallback: Navigate to tweet URL and wait for composer
      window.location.href = tweetData.url;
    }

    const composer = await waitForComposer();
    await insertText(composer, replyText);
    showToast("Reply inserted by Aura — click Post when ready");
  } catch (err) {
    showToast("Error inserting reply: " + err.message);
  }
}

// Observer for new tweets
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tweets = node.querySelectorAll ? node.querySelectorAll('article[data-testid="tweet"]') : [];
        tweets.forEach(injectBadges);
        if (node.matches && node.matches('article[data-testid="tweet"]')) {
          injectBadges(node);
        }
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial run
document.querySelectorAll('article[data-testid="tweet"]').forEach(injectBadges);

/**
 * Handles the "insert" message from the background script.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "insert") {
    handleInsertAction(request).then(() => {
      sendResponse({ status: "success" });
    }).catch(err => {
      console.error('Aura Extension Error:', err);
      sendResponse({ status: "error", message: err.message });
    });
    return true; // Keep channel open for async response
  }
});

async function handleInsertAction(data) {
  const { text, imageBlob, filename } = data;
  
  try {
    const composer = await waitForComposer();
    
    // If there's an image, handle it
    if (imageBlob) {
      // Background script sends data URL which we convert back to blob
      const response = await fetch(imageBlob);
      const blob = await response.blob();
      await attachImage(blob, filename || 'aura_image.jpg');
      // Brief wait for image processing
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

console.log('Aura Content Script Loaded on X.com');
