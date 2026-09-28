(function () {
  'use strict';

  const STORAGE_KEY = 'todo-app.items';
  const FILTER_KEY = 'todo-app.filter';
  const FILTERS = ['all', 'active', 'completed'];
  const EMPTY_MESSAGES = {
    all: '할 일이 없습니다. 위에서 새 할 일을 추가해 보세요.',
    active: '진행 중인 할 일이 없습니다.',
    completed: '완료된 할 일이 없습니다.',
  };

  // localStorage can be unavailable (private mode, blocked storage), so never let it break the app.
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore: the app keeps working in memory.
    }
  }

  function loadTodos() {
    const items = load(STORAGE_KEY, []);
    return Array.isArray(items)
      ? items.filter((t) => t && typeof t.id === 'string' && typeof t.text === 'string')
      : [];
  }

  function uid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  let todos = loadTodos();
  let filter = FILTERS.includes(load(FILTER_KEY, 'all')) ? load(FILTER_KEY, 'all') : 'all';
  let editingId = null;

  const $ = (selector) => document.querySelector(selector);
  const form = $('#new-todo-form');
  const input = $('#new-todo');
  const list = $('#todo-list');
  const toolbar = $('#toolbar');
  const toggleAll = $('#toggle-all');
  const emptyMsg = $('#empty');
  const footer = $('#footer');
  const count = $('#count');
  const clearCompleted = $('#clear-completed');
  const filterButtons = document.querySelectorAll('.filters button');

  $('#today').textContent = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  function commit() {
    save(STORAGE_KEY, todos);
    render();
  }

  function visibleTodos() {
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  }

  function createItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.dataset.id = todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', '완료 표시');
    li.appendChild(checkbox);

    if (editingId === todo.id) {
      const edit = document.createElement('input');
      edit.type = 'text';
      edit.className = 'edit-input';
      edit.value = todo.text;
      edit.maxLength = 200;
      edit.setAttribute('aria-label', '할 일 수정');
      li.appendChild(edit);
    } else {
      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = todo.text;
      li.appendChild(text);

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn edit';
      editBtn.textContent = '수정';
      li.appendChild(editBtn);
    }

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'icon-btn delete';
    del.textContent = '삭제';
    del.setAttribute('aria-label', '삭제');
    li.appendChild(del);

    return li;
  }

  function render() {
    const items = visibleTodos();
    list.replaceChildren(...items.map(createItem));

    const remaining = todos.filter((t) => !t.completed).length;
    const completed = todos.length - remaining;
    const hasTodos = todos.length > 0;

    toolbar.hidden = !hasTodos;
    footer.hidden = !hasTodos;
    toggleAll.checked = hasTodos && remaining === 0;
    count.textContent = `남은 할 일 ${remaining}개`;
    clearCompleted.disabled = completed === 0;

    emptyMsg.hidden = items.length > 0;
    emptyMsg.textContent = EMPTY_MESSAGES[hasTodos ? filter : 'all'];

    filterButtons.forEach((btn) => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    const edit = list.querySelector('.edit-input');
    if (edit) {
      edit.focus();
      edit.setSelectionRange(edit.value.length, edit.value.length);
    }
  }

  function findTodo(id) {
    return todos.find((t) => t.id === id);
  }

  function startEditing(id) {
    editingId = id;
    render();
  }

  function finishEditing(id, value) {
    if (editingId !== id) return; // already handled (e.g. Enter followed by blur)
    editingId = null;
    const text = value.trim();
    if (text) {
      const todo = findTodo(id);
      if (todo) todo.text = text;
    } else {
      todos = todos.filter((t) => t.id !== id);
    }
    commit();
  }

  function cancelEditing() {
    editingId = null;
    render();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    todos.push({ id: uid(), text, completed: false, createdAt: Date.now() });
    input.value = '';
    // Show the new item even if the "completed" filter is active.
    if (filter === 'completed') {
      filter = 'all';
      save(FILTER_KEY, filter);
    }
    commit();
  });

  list.addEventListener('change', (e) => {
    if (!e.target.classList.contains('toggle')) return;
    const todo = findTodo(e.target.closest('li').dataset.id);
    if (!todo) return;
    todo.completed = e.target.checked;
    commit();
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.classList.contains('delete')) {
      if (editingId === id) editingId = null;
      todos = todos.filter((t) => t.id !== id);
      commit();
    } else if (e.target.classList.contains('edit')) {
      startEditing(id);
    }
  });

  list.addEventListener('dblclick', (e) => {
    if (!e.target.classList.contains('todo-text')) return;
    startEditing(e.target.closest('li').dataset.id);
  });

  list.addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('edit-input')) return;
    const id = e.target.closest('li').dataset.id;
    if (e.key === 'Enter' && !e.isComposing) {
      finishEditing(id, e.target.value);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  });

  list.addEventListener('focusout', (e) => {
    if (!e.target.classList.contains('edit-input')) return;
    finishEditing(e.target.closest('li').dataset.id, e.target.value);
  });

  toggleAll.addEventListener('change', () => {
    const done = toggleAll.checked;
    todos.forEach((t) => { t.completed = done; });
    commit();
  });

  clearCompleted.addEventListener('click', () => {
    todos = todos.filter((t) => !t.completed);
    commit();
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      save(FILTER_KEY, filter);
      render();
    });
  });

  // Keep multiple open tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    todos = loadTodos();
    if (editingId && !findTodo(editingId)) editingId = null;
    render();
  });

  render();
})();
