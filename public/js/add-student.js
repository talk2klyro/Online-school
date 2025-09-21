// public/js/add-student.js
import { apiFetch, initAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();

  // wire button
  const btn = document.querySelector('#saveStudentBtn');
  const nameEl = document.querySelector('#name');
  const phoneEl = document.querySelector('#phone');
  const snEl = document.querySelector('#sn');
  const toast = document.querySelector('#toast');

  const showToast = (msg, time=3000) => {
    if (!toast) return alert(msg);
    toast.textContent = msg; toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), time);
  };

  if (btn) {
    btn.addEventListener('click', async () => {
      const name = nameEl.value.trim();
      const phone = phoneEl.value.trim();
      const sn = snEl.value.trim();
      if (!name || !phone) return showToast('⚠️ Fill name and phone');
      try {
        const res = await apiFetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, sn })
        });
        if (res.ok) {
          showToast('✅ Student added');
          nameEl.value=''; phoneEl.value=''; snEl.value='';
        } else {
          showToast('❌ Failed to add');
        }
      } catch (err) {
        console.error(err); showToast('⚠️ Network error');
      }
    });
  }
});
