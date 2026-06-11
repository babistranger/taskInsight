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
  setupEditButtons();

  if (window.lucide) lucide.createIcons();
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
  const dataLimite = formatDataLimite(task.data_limite);

  return `
    <article class="card-task" data-id="${taskId}" draggable="true">
      <div class="card-top">
        <span class="tag ${tagClass}">${tagLabel}</span>
        <button class="btn-edit" data-id="${taskId}" draggable="false" type="button" aria-label="Editar tarefa" title="Editar tarefa">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
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
        <div class="meta-group">
          <span class="meta">${formatCategory(task.categoria)}</span>
          ${dataLimite ? `<span class="meta meta-deadline"><i data-lucide="calendar"></i> ${dataLimite}</span>` : ""}
        </div>
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
   EDIÇÃO DE TAREFA (abre o popup já preenchido)
   Endpoint: PATCH {API_BASE}/api/tasks/:id
   ============================================================ */

function setupEditButtons() {
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const taskId = btn.dataset.id;
      const task = currentTasks.find((item) => (item._id || item.id) === taskId);
      if (task) openTaskModal(task);
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

/* ============================================================
   CRIAÇÃO E EDIÇÃO DE TAREFA
   Criar  -> POST  {API_BASE}/api/tasks
   Editar -> PATCH {API_BASE}/api/tasks/:id  (envia apenas os
             campos alterados pelo usuário)
   ============================================================ */

let taskBeingEdited = null; // null = criando | objeto da tarefa = editando

function setPriorityActive(value) {
  const priorityButtons = document.querySelectorAll(".priority-btn");
  const priorityInput = document.getElementById("taskPrioridade");

  priorityButtons.forEach((btn) => btn.classList.remove("active"));
  const target = document.querySelector(`.priority-btn[data-value="${value}"]`)
    || document.querySelector('.priority-btn[data-value="media"]');
  target?.classList.add("active");
  if (priorityInput) priorityInput.value = target?.dataset.value || "media";
}

// Abre o popup. Sem argumento -> modo "Nova Tarefa".
// Passando uma tarefa -> modo "Editar Tarefa", com os campos pré-preenchidos.
function openTaskModal(task = null) {
  const modal = document.getElementById("taskModal");
  const form = document.getElementById("taskForm");
  const dataLimiteInput = document.getElementById("taskDataLimite");
  const title = document.getElementById("taskModalTitle");
  const subtitle = document.getElementById("taskModalSubtitle");
  const submitLabel = document.getElementById("taskSubmitLabel");

  if (!modal || !form) return;

  form.reset();
  taskBeingEdited = task;

  if (task) {
    // ---- modo edição: preenche o formulário com os dados da tarefa ----
    if (title) title.textContent = "Editar Tarefa";
    if (subtitle) subtitle.textContent = "Atualize apenas os campos que deseja alterar";
    if (submitLabel) submitLabel.textContent = "Salvar Alterações";

    form.elements["tarefa"].value = task.tarefa || "";
    form.elements["descricao"].value = task.descricao || "";
    form.elements["categoria"].value = task.categoria || "Outras Demandas";
    form.elements["status"].value = task.status || "a_fazer";
    form.elements["tempo_gasto"].value = task.tempo_gasto ?? 0;

    if (dataLimiteInput) {
      dataLimiteInput.value = task.data_limite
        ? new Date(task.data_limite).toISOString().slice(0, 10)
        : "";
    }

    setPriorityActive(task.prioridade || "media");
  } else {
    // ---- modo criação: valores padrão ----
    if (title) title.textContent = "Nova Tarefa";
    if (subtitle) subtitle.textContent = "Preencha os detalhes da sua próxima entrega";
    if (submitLabel) submitLabel.textContent = "Criar Tarefa";

    setPriorityActive("media");

    if (dataLimiteInput) {
      dataLimiteInput.value = new Date().toISOString().slice(0, 10);
    }
  }

  modal.classList.add("active");
}

function closeTaskModal() {
  taskBeingEdited = null;
  document.getElementById("taskModal")?.classList.remove("active");
}

function setupTaskModal() {
  const modal = document.getElementById("taskModal");
  const form = document.getElementById("taskForm");
  const closeBtn = document.getElementById("closeTaskModalBtn");
  const cancelBtn = document.getElementById("cancelTaskBtn");
  const priorityButtons = document.querySelectorAll(".priority-btn");
  const priorityInput = document.getElementById("taskPrioridade");

  if (!modal || !form) return;

  priorityButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      priorityButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (priorityInput) priorityInput.value = btn.dataset.value;
    });
  });

  closeBtn?.addEventListener("click", closeTaskModal);
  cancelBtn?.addEventListener("click", closeTaskModal);

  // Clicar fora do modal ou pressionar Esc NÃO fecha o popup.
  // O usuário só sai pelo botão de fechar (X) ou "Cancelar".

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    const tarefa = (formData.get("tarefa") || "").trim();
    if (!tarefa) {
      alert("Informe o nome da tarefa.");
      return;
    }

    const valores = {
      tarefa,
      descricao: (formData.get("descricao") || "").trim(),
      categoria: formData.get("categoria"),
      status: formData.get("status"),
      prioridade: formData.get("prioridade"),
      tempo_gasto: parseFloat(formData.get("tempo_gasto")) || 0,
      data_limite: formData.get("data_limite") || null
    };

    submitBtn.disabled = true;
    try {
      if (taskBeingEdited) {
        // ---- Edição: envia somente os campos que o usuário alterou ----
        const taskId = taskBeingEdited._id || taskBeingEdited.id;
        const original = taskBeingEdited;
        const originalDataLimite = original.data_limite
          ? new Date(original.data_limite).toISOString().slice(0, 10)
          : "";

        const payload = {};
        if (valores.tarefa !== (original.tarefa || "")) payload.tarefa = valores.tarefa;
        if (valores.descricao !== (original.descricao || "")) payload.descricao = valores.descricao;
        if (valores.categoria !== (original.categoria || "")) payload.categoria = valores.categoria;
        if (valores.status !== (original.status || "")) payload.status = valores.status;
        if (valores.prioridade !== (original.prioridade || "")) payload.prioridade = valores.prioridade;
        if (valores.tempo_gasto !== (original.tempo_gasto ?? 0)) payload.tempo_gasto = valores.tempo_gasto;
        if ((valores.data_limite || "") !== originalDataLimite) payload.data_limite = valores.data_limite;

        if (Object.keys(payload).length === 0) {
          closeTaskModal();
          return;
        }

        const tarefaAtualizada = await apiRequest(`/api/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        currentTasks = currentTasks.map((t) => {
          const id = t._id || t.id;
          return id === taskId ? tarefaAtualizada : t;
        });

        renderBoard(currentTasks);
        closeTaskModal();
      } else {
        // ---- Criação ----
        const novaTarefa = await apiRequest("/api/tasks", {
          method: "POST",
          body: JSON.stringify(valores)
        });

        currentTasks.push(novaTarefa);
        renderBoard(currentTasks);
        closeTaskModal();
      }
    } catch (error) {
      alert(error.message || "Não foi possível salvar a tarefa.");
    } finally {
      submitBtn.disabled = false;
    }
  });
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
  if (userRole) userRole.textContent = "Desenvolvedor";
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

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Formata data_limite no padrão "dd mmm" (ex: "15 jun")
function formatDataLimite(dataISO) {
  if (!dataISO) return null;

  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return null;

  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = MESES_ABREV[data.getUTCMonth()];

  return `${dia} ${mes}`;
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
  setupTaskModal();
  try {
    const tasks = await fetchTasks();
    renderBoard(tasks);
  } catch (error) {
    board.innerHTML = `<p class="board-message">${escapeHtml(error.message)}</p>`;
  }

  // Veio da tela 2 com "Nova Tarefa" -> abre o popup automaticamente
  const params = new URLSearchParams(window.location.search);
  if (params.get("novaTarefa") === "1") {
    openTaskModal();
    params.delete("novaTarefa");
    const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
    window.history.replaceState({}, "", newUrl);
  }
}

window.addEventListener("pageshow", () => {
  ensureAuthenticated();
});

document.querySelectorAll(".fab, .btn-accent").forEach((button) => {
  button.addEventListener("click", () => openTaskModal());
});

initBoard();
