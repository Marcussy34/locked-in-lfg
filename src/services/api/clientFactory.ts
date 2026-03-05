import { hasRemoteLessonApi } from './config';
import type { ContentProvider } from './adapters/contentProvider';
import { HttpContentProvider } from './adapters/httpContentProvider';
import { MockContentProvider } from './adapters/mockContentProvider';

let singleton: ContentProvider | null = null;

export function getContentProvider(): ContentProvider {
  if (!singleton) {
    singleton = hasRemoteLessonApi()
      ? new HttpContentProvider()
      : new MockContentProvider();
  }

  return singleton;
}
