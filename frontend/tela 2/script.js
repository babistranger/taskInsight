/* Guard + dados do usuário no sidebar */
requireAuth();
const u = user();
if (u?.nome) document.getElementById("userName").textContent = u.nome;

/* ---------- MOCK fallback ---------- */
const MOCK = {
  progress: 84,
  deliveries: [
    { title: "Review de Backend",  sub: "Ajustar rotas de autenticação", badge: "Hoje",    cls: "badge-hoje" },
    { title: "Documentação API",   sub: "Swagger e endpoints V2",        badge: "Amanhã",  cls: "badge-amanha" },
    { title: "Finalizar UI Kit",   sub: "Sync com tokens de cor",        badge: "Sexta",   cls: "badge-sexta" }
  ],
  timeArea: [
    { label: "Escrita de Código",   value: 80, color: "var(--accent)" },
    { label: "Cursos & Estudos",    value: 20, color: "var(--primary)" },
    { label: "Debugging & Fixes",   value: 40, color: "var(--accent)" },
    { label: "Outras Demandas",     value: 15, color: "#c9b89c" }
  ],
  distribution: {
    labels:    ["Escrevendo Código", "Cursos", "Debugging", "Outras Demandas"],
    completed: [8, 3, 5, 2],
    allocated: [24, 6, 12, 4]
  }
};

/* ============================================================
   fetchAnalytics()
   Tenta GET /api/tasks/analytics/resumo via wrapper api()
   (trata 401 → redireciona para login automaticamente).
   Em caso de qualquer outro erro, devolve o MOCK.
   ============================================================ */
async function fetchAnalytics() {
  try {
    return await api("/api/tasks/analytics/resumo");
  } catch {
    return null; // cai no MOCK abaixo
  }
}

function transformar(data) {
  if (!data || !data.total) return MOCK;

  const hoje = new Date();
  const cores = {
    "Escrevendo Código": "var(--accent)",
    "Cursos":            "var(--primary)",
    "Debugging":         "var(--accent)",
    "Outras Demandas":   "#c9b89c",
  };

  const deliveries = (data.proximas_entregas || []).map((t) => {
    const diff = t.data_limite
      ? Math.ceil((new Date(t.data_limite) - hoje) / 86400000)
      : null;
    const badge = diff === null ? "Sem prazo" : diff <= 0 ? "Hoje" : diff === 1 ? "Amanhã" : `${diff} dias`;
    const cls   = diff === null || diff > 1 ? "badge-sexta" : diff <= 0 ? "badge-hoje" : "badge-amanha";
    return { title: t.tarefa, sub: `Prioridade: ${t.prioridade}`, badge, cls };
  });

  const timeArea = (data.por_categoria || []).map((c) => ({
    label: c._id || "Outros",
    value: c.tempo_total || 0,
    color: cores[c._id] || "var(--accent)",
  }));

  const labels    = (data.por_categoria_mes || []).map((c) => c._id || 'Outros');
  const completed = (data.por_categoria_mes || []).map((c) => c.count || 0);
  const allocated = (data.por_categoria_mes || []).map((c) => c.tempo_total || 0);

  return {
    progress:     data.progresso || 0,
    deliveries:   deliveries.length ? deliveries : MOCK.deliveries,
    timeArea:     timeArea.length   ? timeArea   : MOCK.timeArea,
    distribution: labels.length     ? { labels, completed, allocated } : MOCK.distribution,
  };
}

/* ============================================================ Renders ============================================================ */
function renderProgress(pct) {
  document.getElementById("progressPct").textContent = pct + "%";
  document.getElementById("progressBar").style.width  = pct + "%";
}

function renderDeliveries(list) {
  document.getElementById("deliveries").innerHTML = list.map((d) => `
    <li>
      <div>
        <div class="d-title">${d.title}</div>
        <div class="d-sub">${d.sub}</div>
      </div>
      <span class="badge ${d.cls}">${d.badge}</span>
    </li>
  `).join("");
}

function renderTimeArea(items) {
  const max = Math.max(...items.map((i) => i.value), 1);
  document.getElementById("timeArea").innerHTML = items.map((it) => `
    <div class="bar-item">
      <div class="bar-label">
        <span>${it.label}</span>
        <strong>${it.value}h</strong>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(it.value / max) * 100}%; background:${it.color}"></div>
      </div>
    </div>
  `).join("");
}

function renderChart(d) {
  new Chart(document.getElementById("distChart"), {
    type: "bar",
    data: {
      labels: d.labels,
      datasets: [
        { label: "Tarefas", data: d.completed, backgroundColor: "#b8cdea", borderRadius: 6 },
        { label: "Horas",   data: d.allocated, backgroundColor: "#e89547", borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#efe9dc" }, ticks: { color: "#6b7388" } },
        x: { grid: { display: false }, ticks: { color: "#6b7388" } },
      },
    },
  });
}

/* Bootstrap */
fetchAnalytics()
  .then(transformar)
  .then((data) => {
    renderProgress(data.progress);
    renderDeliveries(data.deliveries);
    renderTimeArea(data.timeArea);
    renderChart(data.distribution);
  });

/* Botão "Nova Tarefa" → tela 1 */
document.querySelectorAll(".btn-accent").forEach((b) =>
  b.addEventListener("click", () => (location.href = "/tela%201/"))
);
