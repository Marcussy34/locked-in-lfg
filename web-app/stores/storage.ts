import type { StateStorage } from 'zustand/middleware';

export const webStorageAdapter: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.warn('[storage] getItem failed:', e);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn('[storage] setItem failed:', e);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.warn('[storage] removeItem failed:', e);
    }
  },
};
