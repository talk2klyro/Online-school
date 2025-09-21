// public/js/auth.js
// Small auth helper using Magic (publishable key client-side).
// Usage: import { initAuth, apiFetch } from './auth.js';

const CONFIG = {
  MAGIC_PUBLISHABLE: window.APP_CONFIG?.MAGIC_PUBLISHABLE || (window.VITE_MAGIC_PUBLISHABLE || null)
};

let magic = null;
let didToken = null;

export async function initAuth() {
  if (typeof window.Magic === 'undefined' && CONFIG.MAGIC_PUBLISHABLE) {
    await import('https://cdn.jsdelivr.net/npm/magic-sdk/dist/magic.js');
  }
  if (!CONFIG.MAGIC_PUBLISHABLE) {
    console.warn('Magic publishable key not set in client config.');
    return;
  }
  magic = new window.Magic(CONFIG.MAGIC_PUBLISHABLE);
  try {
    const logged = await magic.user.isLoggedIn();
    if (logged) {
      const md = await magic.user.getMetadata();
      // request DID token for server authorization
      didToken = await magic.user.getIdToken();
      sessionStorage.setItem('didToken', didToken);
      return md;
    }
  } catch (err) {
    console.warn('Magic init error', err);
  }
  return null;
}

// wrapper for fetch that adds Authorization header if didToken exists
export async function apiFetch(path, opts = {}) {
  const token = didToken || sessionStorage.getItem('didToken') || null;
  const headers = opts.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  opts.headers = headers;
  return fetch(path, opts);
}
