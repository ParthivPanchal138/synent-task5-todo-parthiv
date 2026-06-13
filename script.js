'use strict';

let tasks        = [];
let currentFilter = 'all';
let editingId     = null;
let editPrio      = 'medium';
let addPrio       = 'medium';
let searchQuery   = '';

const STORAGE_KEY = 'stackspark-tasks';

const taskList      = document.getElementById('taskList');
const taskInput     = document.getElementById('taskInput');
const addBtn        = document.getElementById('addBtn');
const dueDateInput  = document.getElementById('dueDateInput');
const emptyState    = document.getElementById('emptyState');
const searchInput   = document.getElementById('searchInput');
const searchClear   = document.getElementById('searchClear');
const selectAll     = document.getElementById('selectAll');
const bulkComplete  = document.getElementById('bulkComplete');
const bulkDelete    = document.getElementById('bulkDelete');
const clearCompleted= document.getElementById('clearCompleted');
const themeBtn      = document.getElementById('themeBtn');
const mobSidebarBtn = document.getElementById('mobSidebarBtn');
const sidebar       = document.querySelector('.sidebar');
const mainDate      = document.getElementById('mainDate');
const toast         = document.getElementById('toast');
const toastMsg      = document.getElementById('toastMsg');
const prioBtn       = document.getElementById('prioBtn');
const prioDot       = document.getElementById('prioDot');
const prioLabel     = document.getElementById('prioLabel');
const prioDropdown  = document.getElementById('prioDropdown');
const editOverlay   = document.getElementById('editOverlay');
const editInput     = document.getElementById('editInput');
const editDate      = document.getElementById('editDate');
const editClose     = document.getElementById('editClose');
const editCancel    = document.getElementById('editCancel');
const editSave      = document.getElementById('editSave');
const ringFill      = document.getElementById('ringFill');
const ringPct       = document.getElementById('ringPct');
const statAll       = document.getElementById('statAll');
const statActive    = document.getElementById('statActive');
const statDone      = document.getElementById('statDone');

/* ══════════════════════════════
   STORAGE
══════════════════════════════ */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Storage error:', e);
  }
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch (e) {
    tasks = [];
  }
}

/* ══════════════════════════════
   GENERATE ID
══════════════════════════════ */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ══════════════════════════════
   DATE HELPERS
══════════════════════════════ */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dateStr + 'T00:00:00');
  return due < today;
}

function setMainDate() {
  const now = new Date();
  mainDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/* ══════════════════════════════
   TOAST
══════════════════════════════ */
let toastTimer;
function showToast(msg, type = 'success') {
  toast.className = `toast ${type}`;
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ══════════════════════════════
   STATS & PROGRESS RING
══════════════════════════════ */
function updateStats() {
  const total     = tasks.length;
  const done      = tasks.filter(t => t.completed).length;
  const active    = total - done;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
  const circumference = 314; // 2 * π * 50

  statAll.textContent    = total;
  statActive.textContent = active;
  statDone.textContent   = done;
  ringPct.textContent    = pct + '%';

  const offset = circumference - (pct / 100) * circumference;
  ringFill.style.strokeDashoffset = offset;
}

/* ══════════════════════════════
   RENDER
══════════════════════════════ */
function getFilteredTasks() {
  let list = [...tasks];

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(t => t.text.toLowerCase().includes(q));
  }

  // Status filter
  if (currentFilter === 'active')    list = list.filter(t => !t.completed);
  if (currentFilter === 'completed') list = list.filter(t => t.completed);
  if (currentFilter === 'high')      list = list.filter(t => t.priority === 'high');
  if (currentFilter === 'medium')    list = list.filter(t => t.priority === 'medium');
  if (currentFilter === 'low')       list = list.filter(t => t.priority === 'low');

  return list;
}

function render() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    filtered.forEach((task, idx) => {
      const card = createTaskCard(task, idx);
      taskList.appendChild(card);
    });
  }

  updateStats();
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card prio-${task.priority}${task.completed ? ' completed' : ''}`;
  card.dataset.id = task.id;

  const overdueClass = isOverdue(task.dueDate) && !task.completed ? ' overdue' : '';
  const dueDateHTML  = task.dueDate
    ? `<span class="task-date${overdueClass}">📅 ${formatDate(task.dueDate)}${isOverdue(task.dueDate) && !task.completed ? ' · Overdue' : ''}</span>`
    : '';

  const createdTime = new Date(task.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  card.innerHTML = `
    <!-- Select checkbox -->
    <label class="task-select-wrap" title="Select task">
      <input type="checkbox" class="task-select" data-id="${task.id}"/>
      <div class="select-box"></div>
    </label>

    <!-- Complete checkbox -->
    <label class="task-check-wrap" title="Mark complete">
      <input type="checkbox" class="task-complete" data-id="${task.id}" ${task.completed ? 'checked' : ''}/>
      <div class="custom-check"></div>
    </label>

    <!-- Body -->
    <div class="task-body">
      <p class="task-text">${escapeHtml(task.text)}</p>
      <div class="task-meta">
        <span class="task-prio-tag ${task.priority}">${task.priority}</span>
        ${dueDateHTML}
        <span class="task-time">${createdTime}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="task-actions">
      <button class="task-act-btn edit-btn" data-id="${task.id}" title="Edit task">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="task-act-btn del del-btn" data-id="${task.id}" title="Delete task">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
  `;

  return card;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════
   ADD TASK
══════════════════════════════ */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    showToast('Please enter a task!', 'error');
    return;
  }

  const task = {
    id:        genId(),
    text,
    completed: false,
    priority:  addPrio,
    dueDate:   dueDateInput.value || '',
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  saveTasks();
  render();

  taskInput.value   = '';
  dueDateInput.value = '';
  taskInput.focus();
  showToast('Task added!', 'success');
}

/* ══════════════════════════════
   COMPLETE TASK
══════════════════════════════ */
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
  showToast(task.completed ? 'Task completed! ✓' : 'Task reopened.', task.completed ? 'success' : 'info');
}

/* ══════════════════════════════
   DELETE TASK
══════════════════════════════ */
function deleteTask(id) {
  const card = taskList.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, 280);
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
  showToast('Task deleted.', 'error');
}

/* ══════════════════════════════
   EDIT TASK
══════════════════════════════ */
function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId          = id;
  editPrio           = task.priority;
  editInput.value    = task.text;
  editDate.value     = task.dueDate || '';

  // Set selected priority button
  document.querySelectorAll('.modal-prio-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.prio === task.priority);
  });

  editOverlay.classList.add('open');
  setTimeout(() => editInput.focus(), 100);
}

function closeEdit() {
  editOverlay.classList.remove('open');
  editingId = null;
}

function saveEdit() {
  const text = editInput.value.trim();
  if (!text) { editInput.focus(); return; }

  const task = tasks.find(t => t.id === editingId);
  if (!task) return;

  task.text     = text;
  task.priority = editPrio;
  task.dueDate  = editDate.value || '';

  saveTasks();
  render();
  closeEdit();
  showToast('Task updated!', 'info');
}

/* ══════════════════════════════
   BULK ACTIONS
══════════════════════════════ */
function getSelectedIds() {
  return [...document.querySelectorAll('.task-select:checked')].map(el => el.dataset.id);
}

bulkComplete.addEventListener('click', () => {
  const ids = getSelectedIds();
  if (!ids.length) { showToast('Select tasks first.', 'error'); return; }
  ids.forEach(id => {
    const t = tasks.find(t => t.id === id);
    if (t) t.completed = true;
  });
  saveTasks(); render();
  selectAll.checked = false;
  showToast(`${ids.length} task(s) completed!`, 'success');
});

bulkDelete.addEventListener('click', () => {
  const ids = getSelectedIds();
  if (!ids.length) { showToast('Select tasks first.', 'error'); return; }
  tasks = tasks.filter(t => !ids.includes(t.id));
  saveTasks(); render();
  selectAll.checked = false;
  showToast(`${ids.length} task(s) deleted.`, 'error');
});

selectAll.addEventListener('change', () => {
  document.querySelectorAll('.task-select').forEach(cb => {
    cb.checked = selectAll.checked;
  });
});

clearCompleted.addEventListener('click', () => {
  const count = tasks.filter(t => t.completed).length;
  if (!count) { showToast('No completed tasks.', 'info'); return; }
  tasks = tasks.filter(t => !t.completed);
  saveTasks(); render();
  showToast(`${count} completed task(s) cleared.`, 'success');
});

/* ══════════════════════════════
   EVENT DELEGATION — TASK LIST
══════════════════════════════ */
taskList.addEventListener('click', (e) => {
  const completeInput = e.target.closest('.task-complete');
  const editBtn       = e.target.closest('.edit-btn');
  const delBtn        = e.target.closest('.del-btn');

  if (completeInput) toggleComplete(completeInput.dataset.id);
  if (editBtn)       openEdit(editBtn.dataset.id);
  if (delBtn)        deleteTask(delBtn.dataset.id);
});

/* ══════════════════════════════
   FILTERS
══════════════════════════════ */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

/* ══════════════════════════════
   SEARCH
══════════════════════════════ */
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  searchClear.classList.toggle('visible', searchQuery.length > 0);
  render();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('visible');
  render();
  searchInput.focus();
});

/* ══════════════════════════════
   PRIORITY SELECTOR (add form)
══════════════════════════════ */
prioBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  prioDropdown.classList.toggle('open');
});

document.querySelectorAll('.prio-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    addPrio = opt.dataset.prio;
    prioDot.className   = `prio-dot ${addPrio}`;
    prioLabel.textContent = addPrio.charAt(0).toUpperCase() + addPrio.slice(1);
    prioDropdown.classList.remove('open');
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.prio-select-wrap')) {
    prioDropdown.classList.remove('open');
  }
});

/* ══════════════════════════════
   ADD TASK EVENTS
══════════════════════════════ */
addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

/* ══════════════════════════════
   EDIT MODAL EVENTS
══════════════════════════════ */
editClose.addEventListener('click',  closeEdit);
editCancel.addEventListener('click', closeEdit);
editSave.addEventListener('click',   saveEdit);

editInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveEdit();
  if (e.key === 'Escape') closeEdit();
});

editOverlay.addEventListener('click', (e) => {
  if (e.target === editOverlay) closeEdit();
});

document.querySelectorAll('.modal-prio-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    editPrio = btn.dataset.prio;
    document.querySelectorAll('.modal-prio-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

/* ══════════════════════════════
   THEME TOGGLE
══════════════════════════════ */
const savedTheme = localStorage.getItem('ss-todo-theme') || 'dark';
if (savedTheme === 'light') {
  document.body.classList.add('light');
  themeBtn.textContent = '☀️';
}

themeBtn.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  themeBtn.textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('ss-todo-theme', isLight ? 'light' : 'dark');
});

/* ══════════════════════════════
   MOBILE SIDEBAR TOGGLE
══════════════════════════════ */
mobSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (window.innerWidth <= 820) {
    if (!sidebar.contains(e.target) && !mobSidebarBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

/* ══════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════ */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEdit();

  // Ctrl/Cmd + K = focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }

  // Ctrl/Cmd + N = focus add input
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    taskInput.focus();
  }
});

/* ══════════════════════════════
   SEED DEMO TASKS (first visit)
══════════════════════════════ */
function seedDemoTasks() {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const fmt = (d) => d.toISOString().split('T')[0];

  tasks = [
    { id: genId(), text: 'Complete Task 5 — To-Do List App for Synent internship', completed: false, priority: 'high',   dueDate: fmt(tomorrow),  createdAt: Date.now() - 5000 },
    { id: genId(), text: 'Record demo video for all 4 Basic tasks',                completed: true,  priority: 'high',   dueDate: fmt(today),     createdAt: Date.now() - 4000 },
    { id: genId(), text: 'Push all repos to GitHub with 5+ commits each',          completed: false, priority: 'medium', dueDate: fmt(tomorrow),  createdAt: Date.now() - 3000 },
    { id: genId(), text: 'Post completed projects on LinkedIn',                    completed: false, priority: 'medium', dueDate: '',             createdAt: Date.now() - 2000 },
    { id: genId(), text: 'Submit all tasks before June 15 deadline',               completed: false, priority: 'high',   dueDate: '2026-06-15',   createdAt: Date.now() - 1000 },
    { id: genId(), text: 'Join Synent Telegram community',                         completed: true,  priority: 'low',    dueDate: fmt(yesterday), createdAt: Date.now() - 500  },
  ];

  saveTasks();
}

/* ══════════════════════════════
   INIT
══════════════════════════════ */
function init() {
  setMainDate();
  loadTasks();
  seedDemoTasks();
  loadTasks(); // reload after seed
  render();
  taskInput.focus();
}

init();
