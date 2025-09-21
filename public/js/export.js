// public/js/export.js
import { apiFetch, initAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  const btn = document.querySelector('#exportBtn') || document.querySelector('.btn[data-export]');
  const from = document.querySelector('#fromDate');
  const to = document.querySelector('#toDate');
  const format = document.querySelector('#format');

  if (!btn) return;
  btn.addEventListener('click', () => {
    const f = from.value; const t = to.value; const fmt = format.value || 'csv';
    if (!f || !t) return alert('Select date range');
    const url = `/api/export?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&format=${encodeURIComponent(fmt)}`;
    window.location = url;
  });
});
