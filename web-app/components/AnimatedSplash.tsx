'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T } from './theme';

/**
 * Animated splash screen — matches the RN AnimatedSplash exactly.
 * Shows the Locked-In logo, holds for 1.2s, then fades out with scale-up.
 * Only shows once per browser session (sessionStorage flag).
 */
export function AnimatedSplash({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);

  // Check once on mount whether to show splash
  useEffect(() => {
    if (!sessionStorage.getItem('splash-shown')) {
      setShowSplash(true);
      sessionStorage.setItem('splash-shown', '1');
    }
  }, []);

  // Dismiss timer — separate effect so strict mode re-runs don't lose the timer
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <>
      {children}

      {/* Splash overlay — renders above app content, pointer-events none during fade */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ backgroundColor: '#000', zIndex: 9999 }}
          >
            {/* Logo — 160x160 matching Android styles.logo */}
            <img
              src="/images/logo.png"
              alt="Locked In"
              width={160}
              height={160}
              className="object-contain"
            />
            {/* Title text below logo */}
            <p
              className="mt-4 text-4xl font-bold tracking-wide"
              style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
            >
              Locked In
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
