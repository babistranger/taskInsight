const COLS = [
  { key: "a_fazer",      label: "A Fazer",      color: "#3b5a8a" },
  { key: "em_progresso", label: "Em Progresso", color: "#5a83b7" },
  { key: "em_revisao",   label: "Em Revisão",   color: "#e89547" },
  { key: "concluido",    label: "Concluído",    color: "#4f9e6d" },
];

const STATUS_LABEL = Object.fromEntries(COLS.map(c => [c.key, c.label]));

const MOCK_TASKS = [
  { _id: "1", status: "a_fazer",      prioridade: "alta",  tarefa: "Redesign da Landing Page",   descricao: "Atualizar componentes para o novo estilo visual." },
  { _id: "2", status: "a_fazer",      prioridade: "media", tarefa: "Integração API de Pagamento", descricao: "Finalizar webhooks para pagamentos recorrentes." },
  { _id: "3", status: "em_progresso", prioridade: "alta",  tarefa: "Otimização de Performance",   descricao: "Reduzir tempo de carregamento em 40%." },
  { _id: "4", status: "em_revisao",   prioridade: "baixa", tarefa: "Copywriting Blog Posts",      descricao: "Revisar textos para o lançamento." },
  { _id: "5", status: "concluido",    prioridade: "media", tarefa: "Briefing de Marketing Q3",    descricao: "Planejamento estratégico para as campanhas." },
];

const MOCK_SUMMARY = {
  por_status: [
    { _id: "a_fazer", count: 2 },
    { _id: "em_progresso", count: 1 },
    { _id: "em_revisao", count: 1 },
    { _id: "concluido", count: 1 },
  ],
  progresso: 20,
};

async function loadAll() {
  // Tarefas e KPIs independentes — falha num não bloqueia o outro
  const [tasksResult, summaryResult] = await Promise.allSettled([
    api("/api/tasks"),
    api("/api/tasks/analytics/resumo"),
  ]);

  const tasks   = tasksResult.status === "fulfilled" && tasksResult.value?.length
    ? tasksResult.value : MOCK_TASKS;
  const summary = summaryResult.status === "fulfilled" && summaryResult.value?.total > 0
    ? summaryResult.value : MOCK_SUMMARY;

  renderBoard(tasks);
  renderKpis(summary);
}

function renderKpis(s) {
  const k = document.getElementById("kpis");
  if (!k) return; // elemento não existe nesta tela

  // por_status é array [{_id, count}] — converter para dict
  const byStatus = Object.fromEntries(
    (s.por_status || []).map(item => [item._id, item.count])
  );

  const items = [
    { ico: "📋", lbl: "Pendentes",    val: byStatus.a_fazer      || 0 },
    { ico: "🔄", lbl: "Em Progresso", val: byStatus.em_progresso || 0 },
    { ico: "✅", lbl: "Concluídas",   val: byStatus.concluido    || 0 },
    { ico: "📊", lbl: "Conclusão",    val: `${s.progresso || 0}%` },
  ];

  k.innerHTML = items.map(i => `
    <div class="kpi"><div class="ico">${i.ico}</div>
      <div><div class="lbl">${i.lbl}</div><div class="val">${i.val}</div></div></div>`).join("");
}

function renderBoard(tasks) {
  const board = document.getElementById("board");
  board.innerHTML = COLS.map(c => {
    const items = tasks.filter(t => t.status === c.key);
    return `<div class="column">
      <div class="col-head">
        <span class="dot" style="background:${c.color}"></span>
        ${c.label}
        <span class="count">${items.length}</span>
      </div>
      ${items.map(taskCard).join("") || '<p style="color:#aaa;font-size:12px">—</p>'}
    </div>`;
  }).join("");

  board.querySelectorAll("[data-advance]").forEach(b => b.addEventListener("click", () => advance(b.dataset.advance)));
  board.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => removeTask(b.dataset.del)));
}

function taskCard(t) {
  const tagClass = { alta: "tag-alta", media: "tag-media", baixa: "tag-baixa" }[t.prioridade] || "tag-baixa";
  const tagLabel = { alta: "Alta", media: "Média", baixa: "Baixa" }[t.prioridade] || t.prioridade;
  return `<article class="card-task" data-id="${t._id}">
    <div style="display:flex;align-items:center;gap:8px">
      <span class="tag ${tagClass}">${tagLabel}</span>
    </div>
    <h3>${escapeHtml(t.tarefa)}</h3>
    <p>${escapeHtml(t.descricao || "")}</p>
    <div class="card-foot">
      <div style="display:flex;gap:8px">
        <button data-advance="${t._id}" style="font-size:12px;padding:4px 8px;cursor:pointer">Avançar →</button>
        <button data-del="${t._id}" style="font-size:12px;padding:4px 8px;cursor:pointer">Excluir</button>
      </div>
    </div>
  </article>`;
}

function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

async function advance(id) {
  // Tarefas MOCK não existem na API
  if (!id || id.length < 10) { alert("Esta é uma tarefa de demonstração e não pode ser movida."); return; }
  try {
    const tasks = await api("/api/tasks");
    const t = tasks.find(x => x._id === id); if (!t) return;
    const order = COLS.map(c => c.key);
    const next = order[Math.min(order.indexOf(t.status) + 1, order.length - 1)];
    await api(`/api/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    loadAll();
  } catch (err) {
    alert("Não foi possível avançar a tarefa. Tente novamente.");
  }
}

async function removeTask(id) {
  if (!confirm("Excluir esta tarefa?")) return;
  // Tarefas MOCK não existem na API
  if (!id || id.length < 10) { alert("Esta é uma tarefa de demonstração e não pode ser excluída."); return; }
  try {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    loadAll();
  } catch (err) {
    alert("Não foi possível excluir a tarefa. Tente novamente.");
  }
}

function bindNewTask() {
  const modal = document.getElementById("modal");
  if (!modal) return; // modal não existe nesta tela
  const fab    = document.getElementById("fab");
  const cancel = document.getElementById("cancel");
  if (fab)    fab.onclick    = () => modal.classList.add("show");
  if (cancel) cancel.onclick = () => modal.classList.remove("show");
  document.getElementById("new-task").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        tarefa: f.title.value,
        descricao: f.description.value,
        prioridade: f.priority.value,
        status: f.status.value,
        categoria: f.category.value,
      }),
    });
    f.reset(); modal.classList.remove("show"); loadAll();
  });
}
