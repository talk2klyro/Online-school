// public/js/attendance.js
import { apiFetch, initAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();

  // fetch classes and populate select if needed
  const classSelect = document.querySelector('#select-class');
  async function loadClasses() {
    // replace with your /api/classes implementation when ready
    // for now we use a default class
    const classes = [{ id: 'class-1', name: 'Default Class' }];
    classSelect.innerHTML = '';
    classes.forEach(c => classSelect.appendChild(Object.assign(document.createElement('option'), { value:c.id, textContent:c.name })));
  }

  await loadClasses();

  // Fetch students for selected class
  async function loadAttendance(classId) {
    try {
      const res = await apiFetch(`/api/students?classId=${encodeURIComponent(classId)}`);
      const students = await res.json();
      const tbody = document.querySelector('#attTable tbody');
      tbody.innerHTML = '';
      students.forEach((s,i) => {
        const tr = document.createElement('tr'); tr.dataset.id = s.id;
        let cells = `<td>${s.sn||i+1}</td><td>${s.name}</td><td>${s.phone||''}</td>`;
        for (let w = 1; w <= 12; w++) {
          const checked = s[`week${w}`] ? 'checked' : '';
          cells += `<td><input type="checkbox" class="week-checkbox" data-week="week${w}" data-id="${s.id}" ${checked}></td>`;
        }
        tr.innerHTML = cells;
        tbody.appendChild(tr);
      });
    } catch (err) { console.error(err); }
  }

  // update attendance on checkbox change: put to /api/attendance
  document.addEventListener('change', async (ev) => {
    if (!ev.target.matches('.week-checkbox')) return;
    const studentId = ev.target.dataset.id;
    const week = ev.target.dataset.week;
    const present = ev.target.checked;
    const classId = document.querySelector('#select-class').value;
    // optimistic UI already changed by user; now persist
    try {
      await apiFetch('/api/attendance', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, week, present, classId }) });
    } catch (err) {
      console.error('Update failed', err);
      alert('Update failed, will queue locally (not implemented).');
    }
  });

  // initial load
  const firstClass = classSelect.value;
  if (firstClass) await loadAttendance(firstClass);
  classSelect.addEventListener('change', (e) => loadAttendance(e.target.value));

  // Ably subscribe for realtime updates (authUrl)
  async function initAblySubscribe(classId) {
    if (!window.Ably) await import('https://cdn.ably.io/lib/ably.min-1.js');
    try {
      const ably = new Ably.Realtime({ authUrl: '/api/ably/token' });
      const ch = ably.channels.get(`attendance-${classId}`);
      ch.subscribe('update', (msg) => {
        const d = msg.data; // { studentId, week: "week3", present: true }
        const row = document.querySelector(`#attTable tr[data-id="${d.studentId}"]`);
        if (row) {
          const cb = row.querySelector(`.week-checkbox[data-week="${d.week}"]`);
          if (cb) cb.checked = !!d.present;
        }
      });
    } catch (err) { console.warn('Ably subscribe failed', err); }
  }

  initAblySubscribe(firstClass);
});
