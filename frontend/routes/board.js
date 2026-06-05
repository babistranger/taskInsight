const COLS = [
  { key: "a_fazer", label: "A Fazer" },
  { key: "em_progresso", label: "Em Progresso" },
  { key: "em_revisao", label: "Em Revisão" },
  { key: "concluido", label: "Concluído" },
];

const STATUS_LABEL = Object.fromEntries(COLS.map(c => [c.key, c.label]));

async function loadAll() {
  const [tasks, summary] = await Promise.all([
    api("/api/tasks"),
    api("/api/tasks/analytics/resumo"),
  ]);
  renderKpis(summary);
  renderBoard(tasks);
}

function renderKpis(s) {
  const k = document.getElementById("kpis");

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
    return `<div class="col"><h3>${c.label} <span class="count">${items.length}</span></h3>
      ${items.map(taskCard).join("") || '<p style="color:#aaa;font-size:12px">—</p>'}
    </div>`;
  }).join("");

  board.querySelectorAll("[data-advance]").forEach(b => b.addEventListener("click", () => advance(b.dataset.advance)));
  board.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => removeTask(b.dataset.del)));
}

function taskCard(t) {
  return `<div class="card">
    <span class="prio ${t.prioridade}">${t.prioridade}</span>
    <h4>${escapeHtml(t.tarefa)}</h4>
    <p>${escapeHtml(t.descricao || "")}</p>
    <div class="actions">
      <button data-advance="${t._id}">Avançar →</button>
      <button data-del="${t._id}">Excluir</button>
    </div></div>`;
}

function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

async function advance(id) {
  const tasks = await api("/api/tasks");
  const t = tasks.find(x => x._id === id); if (!t) return;
  const order = COLS.map(c => c.key);
  const next = order[Math.min(order.indexOf(t.status) + 1, order.length - 1)];
  await api(`/api/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
  loadAll();
}

async function removeTask(id) {
  if (!confirm("Excluir esta tarefa?")) return;
  await api(`/api/tasks/${id}`, { method: "DELETE" });
  loadAll();
}

function bindNewTask() {
  const modal = document.getElementById("modal");
  document.getElementById("fab").onclick = () => modal.classList.add("show");
  document.getElementById("cancel").onclick = () => modal.classList.remove("show");
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
