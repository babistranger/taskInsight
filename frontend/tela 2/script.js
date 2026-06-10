/* ============================================================
   TELA 2 — DASHBOARD DE ANALYTICS
   ------------------------------------------------------------
   Endpoint principal:
     GET {API_BASE}/analytics/overview
     Header: Authorization: Bearer <ti_token>

   Formato esperado da resposta:
   {
     progress: 84,                              // % geral (number 0-100)
     deliveries: [                              // lista de "Minhas Entregas"
       { title, sub, badge, cls }               // cls = badge-hoje | badge-amanha | badge-sexta
     ],
     timeArea: [                                // barras "Tempo por Área"
       { label, value, color }                  // value em horas; color = CSS color
     ],
     distribution: {                            // gráfico Chart.js
       labels:    ["Código","Cursos",...],
       completed: [62,18,38,12],                // barras azuis
       allocated: [80,20,40,15]                 // barras laranja
     }
   }
   ============================================================ */

// >>> TROCAR pela URL real do back-end <<<
const API_BASE = "http://localhost:3000";

/* ---------- MOCK fallback ----------
   Espelha exatamente o contrato esperado pelos renderers. Usado quando
   GET /api/tasks/analytics/resumo falha (offline / sem token válido). ----- */
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
    labels:    ["Código", "Cursos", "Debug", "Outras"],
    completed: [62, 18, 38, 12],
    allocated: [80, 20, 40, 15]
  }
};

/* ---------- Mapeamentos categoria <-> exibição ---------- */
const CATEGORIA_META = {
  "Escrevendo Código": { label: "Escrita de Código",  color: "var(--accent)" },
  "Cursos":            { label: "Cursos & Estudos",   color: "var(--primary)" },
  "Debugging":         { label: "Debugging & Fixes",  color: "var(--accent)" },
  "Outras Demandas":   { label: "Outras Demandas",    color: "#c9b89c" }
};

const STATUS_LABEL = {
  a_fazer: "A Fazer",
  em_progresso: "Em Progresso",
  em_revisao: "Em Revisão",
  concluido: "Concluído"
};

const PRIORIDADE_BADGE = { alta: "badge-hoje", media: "badge-amanha", baixa: "badge-sexta" };

const PERIOD_TITLES = {
  diario: "Distribuição Diária",
  semanal: "Distribuição Semanal",
  mensal: "Distribuição Mensal"
};

/* ============================================================
   formatDeadline(dataISO)
   Formata data_limite em texto curto (Hoje / Amanhã / dd/mm).
   ============================================================ */
function formatDeadline(dataISO) {
  if (!dataISO) return "Sem prazo";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const alvo = new Date(dataISO);
  alvo.setHours(0, 0, 0, 0);

  const diffDias = Math.round((alvo - hoje) / 86400000);

  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Amanhã";
  return alvo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* ============================================================
   transformResumo(data)
   Converte a resposta de GET /api/tasks/analytics/resumo no
   formato esperado pelos renderers desta tela.
   ============================================================ */
function transformResumo(data) {
  const timeArea = (data.por_categoria || [])
    .map((item) => ({
      label: CATEGORIA_META[item._id]?.label || item._id,
      value: Math.round((item.tempo_total || 0) * 10) / 10,
      color: CATEGORIA_META[item._id]?.color || "var(--primary)"
    }))
    .filter((item) => item.value > 0);

  const deliveries = (data.proximas_entregas || []).map((tarefa) => ({
    title: tarefa.tarefa,
    sub: STATUS_LABEL[tarefa.status] || tarefa.status,
    badge: formatDeadline(tarefa.data_limite),
    cls: PRIORIDADE_BADGE[tarefa.prioridade] || "badge-amanha"
  }));

  return {
    progress: data.progresso ?? 0,
    deliveries,
    timeArea,
    distribution: data.distribuicao || { labels: [], completed: [], allocated: [] }
  };
}

/* ============================================================
   Guard de rota + preencher dados do usuário no sidebar.
   - ti_token  -> obrigatório (senão volta para login)
   - ti_user   -> { name, role } salvo no login
   ============================================================ */
function redirectToLogin() {
  window.location.replace("../login/index.html");
}

function ensureAuthenticated() {
  const token = localStorage.getItem("ti_token");
  if (!token) {
    redirectToLogin();
    return false;
  }

  return true;
}

(function guard() {
  if (!ensureAuthenticated()) return;

  const u = JSON.parse(localStorage.getItem("ti_user") || "{}");
  if (u.name) document.getElementById("userName").textContent = u.name;
  if (u.role) document.getElementById("userRole").textContent = u.role;
})();

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (!logoutButton) return;

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("ti_token");
    localStorage.removeItem("ti_user");
    redirectToLogin();
  });
}

setupLogout();

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

window.addEventListener("pageshow", () => {
  ensureAuthenticated();
});

/* ============================================================
   fetchAnalytics(periodo)
   Chama GET /api/tasks/analytics/resumo?periodo=diario|semanal|mensal
   e converte a resposta para o formato esperado pelos renderers.
   Em caso de falha, devolve MOCK.
   ============================================================ */
async function fetchAnalytics(periodo = "semanal") {
  try {
    const token = localStorage.getItem("ti_token");
    const res = await fetch(`${API_BASE}/api/tasks/analytics/resumo?periodo=${periodo}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return transformResumo(data);
  } catch {
    return MOCK; //  fallback enquanto offline / sem token válido
  }
}

/* ============================================================
   renderDeliveries(list)
   list = data.deliveries (array de { title, sub, badge, cls })
   Preenche o <ul id="deliveries"> com os itens vindos da API.
   ============================================================ */
function renderDeliveries(list) {
  const ul = document.getElementById("deliveries");
  ul.innerHTML = list.map((d) => `
    <li>
      <div>
        <div class="d-title">${d.title}</div>   <!-- d.title -->
        <div class="d-sub">${d.sub}</div>       <!-- d.sub   -->
      </div>
      <span class="badge ${d.cls}">${d.badge}</span> <!-- d.cls / d.badge -->
    </li>
  `).join("");
}

/* ============================================================
   renderTimeArea(items)
   items = data.timeArea (array de { label, value, color })
   Gera barras horizontais dentro de <div id="timeArea">.
   ============================================================ */
function renderTimeArea(items) {
  if (!items.length) {
    document.getElementById("timeArea").innerHTML = `<p class="muted">Sem dados de tempo registrados ainda.</p>`;
    return;
  }

  const max = Math.max(...items.map((i) => i.value));
  document.getElementById("timeArea").innerHTML = items.map((it) => `
    <div class="bar-item">
      <div class="bar-label">
        <span>${it.label}</span>      <!-- it.label -->
        <strong>${it.value}h</strong> <!-- it.value (em horas) -->
      </div>
      <div class="bar-track">
        <!-- it.value normalizado pelo máximo + it.color do CSS -->
        <div class="bar-fill" style="width:${(it.value / max) * 100}%; background:${it.color}"></div>
      </div>
    </div>
  `).join("");
}

/* ============================================================
   renderProgress(pct)
   pct = data.progress (0-100)
   Atualiza o número grande e a largura da barra de progresso.
   ============================================================ */
function renderProgress(pct) {
  document.getElementById("progressPct").textContent = pct + "%"; // <span id="progressPct">
  document.getElementById("progressBar").style.width = pct + "%"; // <div  id="progressBar">
}

/* ============================================================
   renderChart(d)
   d = data.distribution { labels, completed, allocated }
   Renderiza o gráfico de barras no <canvas id="distChart">.
   ============================================================ */
let distChartInstance = null;

function renderChart(d) {
  const ctx = document.getElementById("distChart");

  if (distChartInstance) {
    distChartInstance.destroy();
  }

  distChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: d.labels, // eixo X (categorias vindas da API)
      datasets: [
        // 1ª série -> tarefas completas (azul claro)
        { label: "Tarefas Completas", data: d.completed, backgroundColor: "#b8cdea", borderRadius: 6 },
        // 2ª série -> tempo alocado (laranja)
        { label: "Tempo Alocado",     data: d.allocated, backgroundColor: "#e89547", borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#efe9dc" }, ticks: { color: "#6b7388" } },
        x: { grid: { display: false }, ticks: { color: "#6b7388" } }
      }
    }
  });
}

/* ============================================================
   setupDistFilter()
   Liga o <select id="distPeriod"> à troca de período do gráfico
   de distribuição. Atualiza o título e refaz a busca/render.
   ============================================================ */
function setupDistFilter() {
  const select = document.getElementById("distPeriod");
  const title = document.getElementById("distTitle");

  if (!select) return;

  select.addEventListener("change", async () => {
    const periodo = select.value;

    if (title) title.textContent = PERIOD_TITLES[periodo] || "Distribuição";

    const data = await fetchAnalytics(periodo);
    renderChart(data.distribution);
  });
}

/* ============================================================
   Bootstrap da tela: busca os dados e renderiza tudo.
   Se quiser auto-refresh, envolver em setInterval(... , 60000).
   ============================================================ */
fetchAnalytics("semanal").then((data) => {
  renderProgress(data.progress);          // <- data.progress
  renderDeliveries(data.deliveries);      // <- data.deliveries
  renderTimeArea(data.timeArea);          // <- data.timeArea
  renderChart(data.distribution);         // <- data.distribution
});

setupDistFilter();

/* ============================================================
   Botão "Nova Tarefa" do sidebar (.btn-accent) leva para a tela 1.
   Pode futuramente abrir um modal direto e chamar POST /tasks.
   ============================================================ */
document.querySelectorAll(".btn-accent").forEach((b) =>
  b.addEventListener("click", () => (window.location.href = "../tela%201/index.html"))
);
