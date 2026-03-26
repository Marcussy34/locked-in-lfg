import type { ContentProvider } from './adapters/contentProvider';
import { HttpContentProvider } from './adapters/httpContentProvider';

// Web always uses the real HTTP API — no mock provider needed
let singleton: ContentProvider | null = null;

export function getContentProvider(): ContentProvider {
  if (!singleton) {
    singleton = new HttpContentProvider();
  }
  return singleton;
}
