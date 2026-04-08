'use client';

import { SerwistProvider as BaseSerwistProvider } from '@serwist/turbopack/react';
import { type ComponentProps, useEffect } from 'react';

/**
 * Wraps SerwistProvider to fix a DataCloneError in Next.js Turbopack.
 *
 * Turbopack may pass URL objects to history.pushState/replaceState.
 * Serwist captures these and forwards them via postMessage to the SW,
 * but URL objects aren't structured-cloneable → DataCloneError.
 *
 * Fix: re-patch history methods after Serwist's monkey-patch to
 * stringify URL objects before they reach postMessage.
 */
export function SerwistProvider(props: ComponentProps<typeof BaseSerwistProvider>) {
  useEffect(() => {
    const { pushState, replaceState } = history;
    history.pushState = function (state, title, url) {
      return pushState.call(this, state, title, url instanceof URL ? url.href : url);
    };
    history.replaceState = function (state, title, url) {
      return replaceState.call(this, state, title, url instanceof URL ? url.href : url);
    };
  }, []);

  return <BaseSerwistProvider {...props} />;
}
