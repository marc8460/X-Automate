
export interface ExtensionAction {
  type: 'aura-extension-action';
  action: string;
  payload: any;
}

export interface ExtensionResult {
  type: 'aura-extension-result';
  action: string;
  payload: any;
}

/**
 * Checks if the Aura extension is connected by looking for the marker element
 * injected by the content script.
 */
export function isExtensionConnected(): boolean {
  if (typeof document === 'undefined') return false;
  const marker = document.getElementById('aura-extension-status');
  return !!marker && marker.getAttribute('data-aura-connected') === 'true';
}

/**
 * Sends an action to the extension via window.postMessage and returns a Promise
 * that resolves when the extension sends back a result.
 */
export function sendToExtension(action: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const message: ExtensionAction = {
      type: 'aura-extension-action',
      action,
      payload: { action, ...payload }
    };

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      const data = event.data as ExtensionResult;
      if (data && data.type === 'aura-extension-result' && data.action === action) {
        window.removeEventListener('message', handler);
        resolve(data.payload);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage(message, '*');

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error(`Extension request timed out: ${action}`));
    }, 30000);
  });
}

/**
 * High-level helper to post a tweet via the extension.
 */
export async function PostViaExtension(text: string, imageUrl?: string, platform?: string) {
  if (!isExtensionConnected()) {
    throw new Error('Aura extension not connected');
  }
  return sendToExtension('aura:post', { text, imageUrl, platform });
}

/**
 * High-level helper to reply to a tweet via the extension.
 */
export async function ReplyViaExtension(text: string, tweetUrl: string, imageUrl?: string) {
  if (!isExtensionConnected()) {
    throw new Error('Aura extension not connected');
  }
  return sendToExtension('aura:reply', { text, tweetUrl, imageUrl });
}
