// =========================
// CONFIG
// =========================
// Cambia esto al host de tu API (Render/Railway/etc.)
const API_BASE = "https://tasks-api-production-17eb.up.railway.app:8080";

const endpoints = {
  today: (date) => `${API_BASE}/tasks/today?date=${encodeURIComponent(date)}`,
  create: () => `${API_BASE}/tasks`,
  patch: (id) => `${API_BASE}/tasks/${encodeURIComponent(id)}`
};

// =========================
// STATE
// =========================
let tasks = [];

// =========================
// DOM
// =========================
const grid = document.getElementById("grid");
const statusText = document.getElementById("statusText");
const dateText = document.getElementById("dateText");

const createForm = document.getElementById("createForm");
const titleInput = document.getElementById("titleInput");

const refreshBtn = document.getElementById("refreshBtn");
const resetBtn = document.getElementById("resetBtn");

// =========================
// HELPERS
// =========================
function setStatus(msg){ statusText.textContent = msg; }

function todayISO(){
  // fecha local -> YYYY-MM-DD
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
  dateText.textContent = `Hoy: ${date}`;

  setStatus("Cargando tareas de hoy…");
  tasks = await apiFetch(endpoints.today(date));
  setStatus(`Tareas de hoy: ${tasks.length}`);
  render();
}

async function createTask(title){
  const date = todayISO();
  const body = JSON.stringify({ title, date });
  const created = await apiFetch(endpoints.create(), { method:"POST", body });
  tasks.unshift(created);
  setStatus("Tarea creada.");
  render();
}

async function toggleTask(task){
  const body = JSON.stringify({ completed: !task.completed });
  const updated = await apiFetch(endpoints.patch(task.id), { method:"PATCH", body });
  tasks = tasks.map(t => t.id === updated.id ? updated : t);
  setStatus(updated.completed ? "Marcada como hecha." : "Marcada como pendiente.");
  render();
}

// =========================
// RENDER
// =========================
function render(){
  grid.innerHTML = "";

  if(tasks.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No hay tareas para hoy. Agrega una arriba.";
    grid.appendChild(empty);
    return;
  }

  for(const t of tasks){
    const el = document.createElement("div");
    el.className = "task" + (t.completed ? " done" : "");
    el.title = "Click para alternar";

    const label = document.createElement("div");
    label.className = "label";
    label.innerHTML = escapeHtml(t.title);

    el.appendChild(label);
    el.onclick = () => toggleTask(t).catch(err => setStatus("Error: " + err.message));

    grid.appendChild(el);
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

resetBtn.addEventListener("click", () => {
  // Esto solo cambia UI; la persistencia debe manejarse en la API si lo quieres real.
  tasks = tasks.map(t => ({ ...t, completed: false }));
  setStatus("UI reseteada (no guardado).");
  render();
});

// =========================
// INIT
// =========================
loadToday().catch(err => {
  setStatus("No pude cargar tareas. Revisa API_BASE/CORS. " + err.message);
});
