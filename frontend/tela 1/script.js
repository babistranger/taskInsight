/* ============================================================
   TELA 1 - QUADRO DE TAREFAS (Kanban)
   ------------------------------------------------------------
   Endpoints usados:
     GET   {API_BASE}/api/tasks             -> lista tarefas do usuario logado
     PATCH {API_BASE}/api/tasks/:id/status  -> move tarefa entre colunas

   Autenticacao: header Authorization: Bearer <ti_token>
   ============================================================ */

const API_BASE = "http://localhost:3000";

const COLUMNS = [
  { id: "a_fazer", label: "A Fazer", color: "#3b5a8a" },
  { id: "em_progresso", label: "Em Progresso", color: "#5a83b7" },
  { id: "em_revisao", label: "Em Revisão", color: "#e89547" },
  { id: "concluido", label: "Concluído", color: "#4f9e6d" }
];

const board = document.getElementById("board");
let currentTasks = [];

function getToken() {
  return localStorage.getItem("ti_token");
}

function redirectToLogin() {
  window.location.replace("../login/index.html");
}

function ensureAuthenticated() {
  if (!getToken()) {
    redirectToLogin();
    return false;
  }

  return true;
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    localStorage.removeItem("ti_token");
    localStorage.removeItem("ti_user");
    redirectToLogin();
    throw new Error("Sessão expirada.");
  }

  if (!res.ok) {
    throw new Error(data?.erro || "Erro ao comunicar com a API.");
  }

  return data;
}

async function fetchTasks() {
  return apiRequest("/api/tasks");
}

function renderBoard(tasks) {
  currentTasks = tasks;
  board.innerHTML = "";

  COLUMNS.forEach((col) => {
    const colTasks = tasks.filter((task) => task.status === col.id);
    const wrap = document.createElement("div");

    wrap.className = "column";
    wrap.innerHTML = `
      <div class="col-head">
        <span class="dot" style="background:${col.color}"></span>
        ${col.label}
        <span class="count">${colTasks.length}</span>
      </div>
      <div class="drop-zone" data-status="${col.id}">
        ${colTasks.map(renderCard).join("") || '<p class="empty-column">Sem tarefas</p>'}
      </div>
    `;

    board.appendChild(wrap);
  });

  setupDragAndDrop();
  setupDeleteButtons();
}

function renderCard(task) {
  const priority = task.prioridade || "media";
  const tagClass = {
    alta: "tag-alta",
    media: "tag-media",
    baixa: "tag-baixa"
  }[priority] || "tag-media";
  const tagLabel = {
    alta: "Alta",
    media: "Média",
    baixa: "Baixa"
  }[priority] || "Média";
  const taskId = task._id || task.id;
  const userInitials = getUserInitials();

  return `
    <article class="card-task" data-id="${taskId}" draggable="true">
      <div class="card-top">
        <span class="tag ${tagClass}">${tagLabel}</span>
        <button class="btn-delete" data-id="${taskId}" draggable="false" type="button" aria-label="Excluir tarefa" title="Excluir tarefa">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
      <h3>${escapeHtml(task.tarefa || "Tarefa sem título")}</h3>
      <p>${escapeHtml(task.descricao || "Sem descrição")}</p>
      <div class="card-foot">
        <span class="avatar-sm">${userInitials}</span>
        <span class="meta">${formatCategory(task.categoria)}</span>
      </div>
    </article>
  `;
}

function setupDragAndDrop() {
  document.querySelectorAll(".card-task").forEach((card) => {
    card.addEventListener("dragstart", () => {
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document.querySelectorAll(".drop-zone-active").forEach((zone) => {
        zone.classList.remove("drop-zone-active");
      });
    });
  });

  document.querySelectorAll(".drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("drop-zone-active");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("drop-zone-active");
    });

    zone.addEventListener("drop", async (event) => {
      event.preventDefault();
      zone.classList.remove("drop-zone-active");

      const draggingCard = document.querySelector(".dragging");
      if (!draggingCard) return;

      const taskId = draggingCard.dataset.id;
      const newStatus = zone.dataset.status;
      const task = currentTasks.find((item) => (item._id || item.id) === taskId);

      if (!task || task.status === newStatus) return;

      await moveTask(taskId, newStatus);
    });
  });
}

/* ============================================================
   EXCLUSÃO DE TAREFA
   Endpoint: DELETE {API_BASE}/api/tasks/:id
   ============================================================ */

let taskIdToDelete = null;

function setupDeleteButtons() {
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      openDeleteModal(btn.dataset.id);
    });
  });
}

function openDeleteModal(taskId) {
  taskIdToDelete = taskId;
  document.getElementById("deleteModal")?.classList.add("active");
}

function closeDeleteModal() {
  taskIdToDelete = null;
  document.getElementById("deleteModal")?.classList.remove("active");
}

function setupDeleteModal() {
  const modal = document.getElementById("deleteModal");
  const cancelBtn = document.getElementById("cancelDeleteBtn");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  if (!modal || !cancelBtn || !confirmBtn) return;

  cancelBtn.addEventListener("click", closeDeleteModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeDeleteModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("active")) {
      closeDeleteModal();
    }
  });

  confirmBtn.addEventListener("click", async () => {
    if (!taskIdToDelete) return;

    confirmBtn.disabled = true;
    try {
      await deleteTask(taskIdToDelete);
      closeDeleteModal();
    } catch (error) {
      alert(error.message || "Não foi possível excluir a tarefa.");
    } finally {
      confirmBtn.disabled = false;
    }
  });
}

async function deleteTask(taskId) {
  await apiRequest(`/api/tasks/${taskId}`, { method: "DELETE" });

  currentTasks = currentTasks.filter((task) => (task._id || task.id) !== taskId);
  renderBoard(currentTasks);
}

async function moveTask(taskId, newStatus) {
  board.classList.add("board-updating");

  try {
    const updatedTask = await apiRequest(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus })
    });

    currentTasks = currentTasks.map((task) => {
      const id = task._id || task.id;
      return id === taskId ? updatedTask : task;
    });

    renderBoard(currentTasks);
  } catch (error) {
    alert(error.message || "Não foi possível mover a tarefa.");
  } finally {
    board.classList.remove("board-updating");
  }
}

function setupUserInfo() {
  const user = JSON.parse(localStorage.getItem("ti_user") || "{}");
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const avatar = document.querySelector(".user .avatar");

  if (user.nome && userName) userName.textContent = user.nome;
  if (user.name && userName) userName.textContent = user.name;
  if (userRole) userRole.textContent = user.role || "Usuário";
  if (avatar) avatar.textContent = getUserInitials();
}


function setupSidebarToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const group = document.querySelector(".nav-group");

  if (!toggle || !group) return;

  toggle.addEventListener("click", () => {
    const isOpen = group.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

setupSidebarToggle();

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (!logoutButton) return;

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("ti_token");
    localStorage.removeItem("ti_user");
    redirectToLogin();
  });
}

function getUserInitials() {
  const user = JSON.parse(localStorage.getItem("ti_user") || "{}");
  const name = user.nome || user.name || "Usuario";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatCategory(category) {
  return category || "Outras Demandas";
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

async function initBoard() {
  if (!ensureAuthenticated()) return;

  setupUserInfo();
  setupLogout();
  setupDeleteModal();
  try {
    const tasks = await fetchTasks();
    renderBoard(tasks);
  } catch (error) {
    board.innerHTML = `<p class="board-message">${escapeHtml(error.message)}</p>`;
  }
}

window.addEventListener("pageshow", () => {
  ensureAuthenticated();
});

document.querySelectorAll(".fab, .btn-accent").forEach((button) => {
  button.addEventListener("click", () => alert("A criação de tarefas será integrada na próxima etapa."));
});

initBoard();
