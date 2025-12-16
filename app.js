// =========================
// CONFIG
// =========================
const API_BASE = "http://localhost:3000";

const endpoints = {
  today: (date) => `${API_BASE}/tasks/today?date=${encodeURIComponent(date)}`,
  create: () => `${API_BASE}/tasks`,
  patch: (id) => `${API_BASE}/tasks/${encodeURIComponent(id)}`
};

// =========================
// STATE
// =========================
let tasks = [];
let filter = "all"; // all | open | done

// =========================
// DOM
// =========================
const list = document.getElementById("list");
const statusText = document.getElementById("statusText");
const dateText = document.getElementById("dateText");

const createForm = document.getElementById("createForm");
const titleInput = document.getElementById("titleInput");
const refreshBtn = document.getElementById("refreshBtn");

const showAllBtn = document.getElementById("showAllBtn");
const showOpenBtn = document.getElementById("showOpenBtn");
const showDoneBtn = document.getElementById("showDoneBtn");

// =========================
// HELPERS
// =========================
function setStatus(msg){ statusText.textContent = msg; }

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function setFilter(next){
  filter = next;
  showAllBtn.classList.toggle("active", filter === "all");
  showOpenBtn.classList.toggle("active", filter === "open");
  showDoneBtn.classList.toggle("active", filter === "done");
  render();
}

function filteredTasks(){
  if(filter === "open") return tasks.filter(t => !t.completed);
  if(filter === "done") return tasks.filter(t => t.completed);
  return tasks;
}

async function apiFetch(url, options = {}){
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  if(!res.ok){
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? " - " + detail : ""}`);
  }

  const ct = res.headers.get("content-type") || "";
  if(ct.includes("application/json")) return res.json();
  return null;
}

// =========================
// API
// =========================
async function loadToday(){
  const date = todayISO();
  dateText.textContent = date;

  setStatus("Loading…");
  tasks = await apiFetch(endpoints.today(date));
  setStatus(tasks.length ? `Loaded ${tasks.length}` : "No tasks yet.");
  render();
}

async function createTask(title){
  const date = todayISO();
  const body = JSON.stringify({ title, date });
  const created = await apiFetch(endpoints.create(), { method:"POST", body });
  tasks.unshift(created);
  setStatus("Added.");
  render();
}

async function toggleTask(task){
  // Optimistic UI (se siente más app)
  const nextCompleted = !task.completed;
  tasks = tasks.map(t => t.id === task.id ? { ...t, completed: nextCompleted } : t);
  render();

  try{
    const body = JSON.stringify({ completed: nextCompleted });
    const updated = await apiFetch(endpoints.patch(task.id), { method:"PATCH", body });
    tasks = tasks.map(t => t.id === updated.id ? updated : t);
    setStatus(updated.completed ? "Done." : "Undone.");
    render();
  }catch(err){
    // rollback
    tasks = tasks.map(t => t.id === task.id ? { ...t, completed: !nextCompleted } : t);
    render();
    setStatus("Error: " + err.message);
  }
}

// =========================
// RENDER
// =========================
function render(){
  const items = filteredTasks();
  list.innerHTML = "";

  if(items.length === 0){
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nothing here. Add a task above.";
    list.appendChild(empty);
    return;
  }

  for(const t of items){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "taskbtn" + (t.completed ? " done" : "");
    btn.title = "Tap to toggle";

    const text = document.createElement("div");
    text.className = "tasktext";
    text.innerHTML = escapeHtml(t.title);

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = t.completed ? "✓" : "•";

    btn.appendChild(text);
    btn.appendChild(badge);

    btn.onclick = () => toggleTask(t);
    list.appendChild(btn);
  }
}

// =========================
// EVENTS
// =========================
createForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if(!title) return;
  titleInput.value = "";
  createTask(title).catch(err => setStatus("Error: " + err.message));
});

refreshBtn.addEventListener("click", () => {
  loadToday().catch(err => setStatus("Error: " + err.message));
});

showAllBtn.addEventListener("click", () => setFilter("all"));
showOpenBtn.addEventListener("click", () => setFilter("open"));
showDoneBtn.addEventListener("click", () => setFilter("done"));

// =========================
// INIT
// =========================
loadToday().catch(err => setStatus("Error: " + err.message));
