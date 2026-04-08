/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  precacheOptions: {
    navigateFallbackDenylist: [/privy_oauth_state/, /privy_oauth_code/],
  },
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

// Bypass service worker entirely for OAuth callback URLs.
// Without respondWith(), the browser handles the request as if no SW existed.
// stopImmediatePropagation() prevents Serwist's listener from intercepting it.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    url.searchParams.has('privy_oauth_state') ||
    url.searchParams.has('privy_oauth_code') ||
    url.hostname === 'auth.privy.io'
  ) {
    event.stopImmediatePropagation();
  }
});

serwist.addEventListeners();
