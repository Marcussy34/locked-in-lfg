/**
 * WebView <-> React Native message bridge.
 *
 * RN sends messages via `injectJavaScript('window.dispatchBridgeMessage(...)')`.
 * We send messages back via `window.ReactNativeWebView.postMessage(...)`.
 */

export interface BridgeMessage {
  type: string;
  payload: Record<string, any>;
}

type BridgeHandler = (msg: BridgeMessage) => void;

let handler: BridgeHandler | null = null;

/** Register the single handler for incoming RN messages. */
export function onBridgeMessage(fn: BridgeHandler) {
  handler = fn;
}

/** Called from RN via injectJavaScript. Exposed on window. */
export function dispatchBridgeMessage(raw: string) {
  try {
    const msg: BridgeMessage = JSON.parse(raw);
    handler?.(msg);
  } catch {
    // ignore malformed
  }
}

/** Send a message from WebView → RN. */
export function sendToRN(msg: BridgeMessage) {
  const json = JSON.stringify(msg);

  // React Native WebView bridge (iOS / Android)
  if ((window as any).ReactNativeWebView?.postMessage) {
    (window as any).ReactNativeWebView.postMessage(json);
    return;
  }

  // Web (iframe) fallback — react-native-webview on web uses window.parent.postMessage
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(json, '*');
    return;
  }

  // Standalone web fallback — handle overlays directly
  if (msg.type === 'objectTapped') {
    handleWebOverlay(msg.payload.objectId as string);
  }

  console.log('[bridge → RN]', msg);
}

/** Show/hide HTML overlays when running standalone in browser (no RN). */
function handleWebOverlay(objectId: string) {
  if (objectId === 'book' || objectId === 'bookshelf') {
    const overlay = document.getElementById('bookOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }
}

// Close overlay when clicking backdrop or start button
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('bookOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  }
  const startBtn = document.getElementById('startLessonBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const overlay = document.getElementById('bookOverlay');
      if (overlay) overlay.style.display = 'none';
      console.log('[web] Start lesson clicked — navigate to Lesson screen in RN app');
    });
  }
});

// Expose on window so RN can call it
(window as any).dispatchBridgeMessage = dispatchBridgeMessage;
