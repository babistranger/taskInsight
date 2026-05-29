/* ============================================================
   TELA 1 — QUADRO DE TAREFAS (Kanban)
   ------------------------------------------------------------
   Endpoints usados:
     GET  {API_BASE}/tasks                  -> retorna lista de tarefas
     POST {API_BASE}/tasks   (futuro)       -> criar nova tarefa
     PUT  {API_BASE}/tasks/:id (futuro)     -> atualizar status/priority

   Autenticação: header  Authorization: Bearer <ti_token>
   ============================================================ */

// >>> TROCAR pela URL real do back-end <<<
const API_BASE = "https://api.taskinsight.example.com";

/* ---------- MOCK fallback ----------
   Usado quando a API não responde. Cada objeto representa o
   formato esperado de uma tarefa retornada por GET /tasks:

   {
     id:        number,
     status:    "todo" | "progress" | "review" | "done",
     priority:  "alta" | "media"   | "baixa"  | "final",
     title:     string,
     desc:      string,
     assignee:  string,   // iniciais exibidas no avatar (ex.: "RS")
     comments?: number,   // mostra ícone de balão + contagem
     views?:    number,   // mostra ícone de olho + contagem
     active?:   boolean,  // exibe selo "Ativo"
     date?:     string,   // exibe a data no rodapé do card
     pinned?:   boolean,  // exibe ícone de pin
     done?:     boolean   // risca o título
   }
   ----------------------------------- */
const MOCK_TASKS = [
  { id: 1, status: "todo",       priority: "alta",  title: "Redesign da Landing Page", desc: "Atualizar componentes para o novo estilo visual Glassmorphism v2.", assignee: "RS", comments: 5, pinned: true },
  { id: 2, status: "todo",       priority: "media", title: "Integração API Stripe",   desc: "Finalizar os webhooks para processamento de pagamentos recorrentes.", assignee: "AM", views: 2 },
  { id: 3, status: "progress",   priority: "alta",  title: "Otimização de Performance", desc: "Reduzir tempo de carregamento inicial em 40% conforme SEO.", assignee: "JS", active: true },
  { id: 4, status: "review",     priority: "baixa", title: "Copywriting Blog Posts",  desc: "Revisar textos para o lançamento da funcionalidade de IA.", assignee: "LF", views: 12 },
  { id: 5, status: "done",       priority: "final", title: "Briefing de Marketing Q3", desc: "Planejamento estratégico para as campanhas de outono.", assignee: "MC", date: "12 Out", done: true }
];

/* ---------- Definição das colunas do Kanban ----------
   O `id` precisa bater com `task.status` retornado pela API. -------- */
const COLUMNS = [
  { id: "todo",     label: "A Fazer",      color: "#3b5a8a" },
  { id: "progress", label: "Em Progresso", color: "#5a83b7" },
  { id: "review",   label: "Em Revisão",   color: "#e89547" },
  { id: "done",     label: "Concluído",    color: "#4f9e6d" }
];

// Referência ao <div id="board"> do HTML
const board = document.getElementById("board");

/* ============================================================
   fetchTasks()
   Faz GET {API_BASE}/tasks com Bearer token. Em caso de erro,
   devolve o MOCK_TASKS para a tela continuar funcionando.
   ============================================================ */
async function fetchTasks() {
  try {
    const token = localStorage.getItem("ti_token"); // salvo no login
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    return await res.json(); // deve devolver Array<Task>
  } catch {
    return MOCK_TASKS; // ⚠️ remover quando API estiver pronta
  }
}

/* ============================================================
   renderBoard(tasks)
   Recebe a lista da API e gera as 4 colunas com os cards.
   ============================================================ */
function renderBoard(tasks) {
  board.innerHTML = "";
  COLUMNS.forEach((col) => {
    // Filtra as tarefas cuja `status` é igual ao id da coluna
    const colTasks = tasks.filter((t) => t.status === col.id);

    const wrap = document.createElement("div");
    wrap.className = "column";
    wrap.innerHTML = `
      <div class="col-head">
        <span class="dot" style="background:${col.color}"></span>
        ${col.label}
        <span class="count">${colTasks.length}</span>  <!-- contagem da API -->
      </div>
      ${colTasks.map(renderCard).join("")}
    `;
    board.appendChild(wrap);
  });
}

/* ============================================================
   renderCard(t)
   Constrói o HTML de um card a partir de uma task (objeto da API).
   Cada propriedade da task é mapeada para um elemento visual:
     t.priority -> tag colorida no topo
     t.pinned   -> ícone de pin
     t.title    -> <h3>
     t.desc     -> <p>
     t.assignee -> avatar com iniciais
     t.comments / t.views / t.active / t.date -> rodapé do card
     t.done     -> aplica strikethrough no título
   ============================================================ */
function renderCard(t) {
  const tagClass = { alta: "tag-alta", baixa: "tag-baixa", media: "tag-media", final: "tag-final" }[t.priority] || "tag-baixa";
  const tagLabel = { alta: "Alta", baixa: "Baixa", media: "Média", final: "Finalizada" }[t.priority] || "—";
  const titleStyle = t.done ? "text-decoration:line-through;color:var(--muted);" : "";

  // Rodapé do card: escolhe qual métrica mostrar conforme campos vindos da API
  const footRight = t.comments ? `<span class="meta"><i class="lucide lucide-message-square"></i> ${t.comments}</span>`
                  : t.views    ? `<span class="meta"><i class="lucide lucide-eye"></i> ${t.views}</span>`
                  : t.active   ? `<span class="meta" style="color:var(--success)"><i class="lucide lucide-activity"></i> Ativo</span>`
                  : t.date     ? `<span class="meta">${t.date}</span>` : "";

  const pin = t.pinned ? `<i class="lucide lucide-pin" style="color:var(--muted);font-size:14px;margin-left:auto"></i>` : "";

  return `
    <article class="card-task" data-id="${t.id}">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="tag ${tagClass}">${tagLabel}</span>
        ${pin}
      </div>
      <h3 style="${titleStyle}">${t.title}</h3>
      <p>${t.desc}</p>
      <div class="card-foot">
        <span class="avatar-sm">${t.assignee}</span>
        ${footRight}
      </div>
    </article>
  `;
}

/* ============================================================
   Guard de rota: se não houver token salvo (usuário não logado),
   redireciona para a tela de login.
   Também atualiza nome/cargo no sidebar com os dados de ti_user.
   ============================================================ */
(function guard() {
  const token = localStorage.getItem("ti_token");
  if (!token) { window.location.href = "../login/index.html"; return; }

  const u = JSON.parse(localStorage.getItem("ti_user") || "{}");
  // Preenche o sidebar com os dados do usuário vindos da API
  if (u.name) document.getElementById("userName").textContent = u.name;
  if (u.role) document.getElementById("userRole").textContent = u.role;
})();

// Carrega as tarefas (API ou mock) e renderiza
fetchTasks().then(renderBoard);

/* ============================================================
   Botões "Nova Tarefa" (sidebar) e FAB (canto inferior)
   ⚙️ Substituir o alert por:
       1. abrir modal de criação
       2. POST {API_BASE}/tasks com body { title, desc, status, priority, assignee }
       3. ao sucesso, recarregar fetchTasks().then(renderBoard)
   ============================================================ */
document.querySelectorAll(".fab, .btn-accent").forEach((b) => {
  b.addEventListener("click", () => alert("Abrir modal de nova tarefa (integrar com API POST /tasks)"));
});
