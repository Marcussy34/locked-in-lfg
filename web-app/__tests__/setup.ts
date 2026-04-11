import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Buffer polyfill for @solana/web3.js
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer as unknown as typeof globalThis.Buffer;

// React Testing Library cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
