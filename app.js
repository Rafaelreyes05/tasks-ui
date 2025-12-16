// =========================
// CONFIG
// =========================
const API_BASE = "https://tasks-api-production-17eb.up.railway.app";

const endpoints = {
  list: () => `${API_BASE}/tasks`,
  create: () => `${API_BASE}/tasks`,
  update: (id) => `${API_BASE}/tasks/${encodeURIComponent(id)}`
};

// =========================
// DOM
// =========================
const listEl = document.getElementById("list");
const fab = document.getElementById("fab");

const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModal");
const addForm = document.getElementById("addForm");
const taskInput = document.getElementById("taskInput");
const statusEl = document.getElementById("status");

// =========================
// STATE
// =========================
let tasks = [];

// =========================
// HELPERS
// =========================
function setStatus(msg){ statusEl.textContent = msg || ""; }

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

async function apiFetch(url, options = {}){
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if(!res.ok){
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

function openModal(){
  modal.classList.remove("hidden");
  setStatus("");
  taskInput.value = "";
  setTimeout(() => taskInput.focus(), 0);
}

function closeModal(){
  modal.classList.add("hidden");
  setStatus("");
}

function checkIconSVG(){
  return `
    <svg viewBox="0 0 24 24">
      <path fill="#fff"
        d="M9.2 16.6 4.9 12.3l-1.4 1.4 5.7 5.7L20.5 8.1l-1.4-1.4z"/>
    </svg>
  `;
}

// =========================
// RENDER
// =========================
function render(){
  listEl.innerHTML = "";

  if(!tasks.length){
    const hint = document.createElement("div");
    hint.style.opacity = ".55";
    hint.style.color = "#fff";
    hint.style.fontSize = "14px";
    hint.textContent = "No tasks. Tap + to add one.";
    listEl.appendChild(hint);
    return;
  }

  for(const t of tasks){
    const row = document.createElement("div");
    row.className = "row" + (t.completed ? " done" : "");

    const badge = document.createElement("div");
    badge.className = "checkBadge";
    badge.innerHTML = checkIconSVG();

    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "taskPill";
    pill.innerHTML = escapeHtml(t.name);

    pill.onclick = () => toggleTask(t);

    row.appendChild(badge);
    row.appendChild(pill);
    listEl.appendChild(row);
  }
}

// =========================
// API ACTIONS
// =========================
async function loadTasks(){
  tasks = await apiFetch(endpoints.list());
  render();
}

async function createTask(name){
  const body = JSON.stringify({
    name,
    completed: false
  });

  const created = await apiFetch(endpoints.create(), {
    method: "POST",
    body
  });

  tasks.unshift(created);
  render();
}

async function updateTask(task){
  const body = JSON.stringify({
    name: task.name,
    completed: task.completed
  });

  return apiFetch(endpoints.update(task.id), {
    method: "PUT",
    body
  });
}

async function toggleTask(task){
  const nextCompleted = !task.completed;

  // Optimistic UI
  tasks = tasks.map(t =>
    t.id === task.id ? { ...t, completed: nextCompleted } : t
  );
  render();

  try{
    const updated = await updateTask({
      ...task,
      completed: nextCompleted
    });

    // Sync with DB response
    tasks = tasks.map(t =>
      t.id === updated.id ? updated : t
    );
    render();
  }catch(err){
    // rollback
    tasks = tasks.map(t =>
      t.id === task.id ? { ...t, completed: !nextCompleted } : t
    );
    render();
    console.error("Update failed:", err.message);
  }
}

// =========================
// EVENTS
// =========================
fab.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

modal.addEventListener("click", e => {
  if(e.target === modal) closeModal();
});

window.addEventListener("keydown", e => {
  if(e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

addForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = taskInput.value.trim();
  if(!name) return;

  setStatus("Saving...");
  try{
    await createTask(name);
    closeModal();
  }catch(err){
    setStatus("Error: " + err.message);
  }
});

// =========================
// INIT
// =========================
loadTasks().catch(err => console.error(err));
