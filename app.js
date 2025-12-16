// =========================
// CONFIG
// =========================
const API_BASE = "https://tasks-api-production-17eb.up.railway.app";

// Your routes:
const endpoints = {
  list: () => `${API_BASE}/tasks`,
  create: () => `${API_BASE}/tasks`,
  // If later you add persistence for toggling, use:
  // patch: (id) => `${API_BASE}/tasks/${encodeURIComponent(id)}`
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
  return String(str).replace(/[&<>"']/g, (c) => ({
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
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M9.2 16.6 4.9 12.3l-1.4 1.4 5.7 5.7L20.5 8.1l-1.4-1.4z"/>
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
    // Expecting API to return at least: { id, title, completed }
    // If your API returns "task" instead of "title", we handle it:
    const title = t.title ?? t.task ?? t.name ?? "Untitled";

    const row = document.createElement("div");
    row.className = "row" + (t.completed ? " done" : "");

    const badge = document.createElement("div");
    badge.className = "checkBadge";
    badge.innerHTML = checkIconSVG();

    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "taskPill";
    pill.innerHTML = escapeHtml(title);

    // Toggle in UI (non-persistent until you have PATCH route)
    pill.onclick = () => {
      tasks = tasks.map(x => x === t ? { ...x, completed: !x.completed } : x);
      render();
    };

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

async function createTask(title){
  // Most common: { title }.
  // If your backend expects { task } instead, change it here.
  const body = JSON.stringify({ title });

  const created = await apiFetch(endpoints.create(), { method:"POST", body });

  // If API returns created task:
  if(created && typeof created === "object"){
    tasks.unshift(created);
  } else {
    // If API returns nothing, reload.
    await loadTasks();
  }

  render();
}

// =========================
// EVENTS
// =========================
fab.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (e) => { if(e.target === modal) closeModal(); });

window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if(!title) return;

  setStatus("Saving…");
  try{
    await createTask(title);
    closeModal();
  }catch(err){
    setStatus("Error: " + err.message);
  }
});

// =========================
// INIT
// =========================
loadTasks().catch(err => {
  console.error(err);
});
