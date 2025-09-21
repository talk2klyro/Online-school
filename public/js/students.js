// public/js/students.js
import { apiFetch, initAuth } from './auth.js';

async function loadStudents() {
  try {
    const res = await apiFetch('/api/students');
    const students = await res.json();
    return students;
  } catch (err) { console.error(err); return []; }
}

function createRow(s, idx, onEdit, onDelete) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${idx+1}</td>
    <td>${s.name}</td>
    <td>${s.phone || '-'}</td>
    <td>${s.sn || '-'}</td>
    <td>
      <button class="action-btn edit-btn" data-id="${s.id}">✏️ Edit</button>
      <button class="action-btn delete-btn" data-id="${s.id}">🗑️ Delete</button>
    </td>
  `;
  tr.querySelector('.edit-btn').addEventListener('click', ()=>onEdit(s.id));
  tr.querySelector('.delete-btn').addEventListener('click', ()=>onDelete(s.id));
  return tr;
}

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  const tbody = document.querySelector('#studentsTable tbody');
  const search = document.querySelector('#searchInput');

  async function refresh() {
    tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
    let students = await loadStudents();
    const q = search.value.trim().toLowerCase();
    if (q) students = students.filter(s => (s.name||'').toLowerCase().includes(q) || (s.phone||'').includes(q));
    if (!students.length) {
      tbody.innerHTML = `<tr><td colspan="5">No students</td></tr>`;
      return;
    }
    tbody.innerHTML = '';
    students.forEach((s,i) => tbody.appendChild(createRow(s, i, editStudent, deleteStudent)));
  }

  window.editStudent = (id) => {
    alert('Edit not implemented yet: ' + id);
  };

  async function deleteStudent(id) {
    if (!confirm('Delete this student?')) return;
    try {
      const res = await apiFetch('/api/students/' + id, { method: 'DELETE' });
      if (res.ok) {
        alert('Deleted');
        refresh();
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      console.error(err); alert('Network error');
    }
  }

  document.querySelector('.search-box button').addEventListener('click', refresh);
  search.addEventListener('input', () => {
    // optional: debounce in production
    refresh();
  });

  await refresh();
});
