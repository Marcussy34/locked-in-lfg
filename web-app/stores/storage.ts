import type { StateStorage } from 'zustand/middleware';

const isBrowser = typeof window !== 'undefined';

export const webStorageAdapter: StateStorage = {
  getItem: (name) => {
    if (!isBrowser) return null;
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.warn('[storage] getItem failed:', e);
      return null;
    }
  },
  setItem: (name, value) => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn('[storage] setItem failed:', e);
    }
  },
  removeItem: (name) => {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.warn('[storage] removeItem failed:', e);
    }
  },
};
