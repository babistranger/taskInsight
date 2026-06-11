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
       { label, value, unidade, segments }      // value em horas (se a área tem
                                                  // tempo_gasto > 0) ou em nº de
                                                  // tarefas (fallback); unidade =
                                                  // "h" | " tarefa" | " tarefas";
                                                  // segments = [{ prioridade, label,
                                                  // value, unidade, color }]
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
  proximaEntrega: {
    title: "Review de Backend",
    dataISO: new Date(Date.now() + 3 * 86400000).toISOString()
  },
  // Tempo por área (categoria): cada item vira UMA barra, segmentada por
  // prioridade (alta = laranja, média = bege, baixa = azul). Áreas com horas
  // registradas mostram "Xh"; áreas sem horas (fallback) mostram "X tarefas".
  timeArea: [
    { label: "Escrita de Código", value: 42, unidade: "h", segments: [
      { prioridade: "alta",  label: "Alta",  value: 30, unidade: "h", color: "var(--accent)" },
      { prioridade: "media", label: "Média", value: 12, unidade: "h", color: "#f5e6cf" }
    ]},
    { label: "Cursos & Estudos", value: 20, unidade: "h", segments: [
      { prioridade: "media", label: "Média", value: 20, unidade: "h", color: "#f5e6cf" }
    ]},
    { label: "Debugging & Fixes", value: 33, unidade: "h", segments: [
      { prioridade: "alta",  label: "Alta",  value: 25, unidade: "h", color: "var(--accent)" },
      { prioridade: "baixa", label: "Baixa", value: 8,  unidade: "h", color: "var(--info)" }
    ]},
    { label: "Outras Demandas", value: 3, unidade: " tarefas", segments: [
      { prioridade: "baixa", label: "Baixa", value: 2, unidade: " tarefas", color: "var(--info)" },
      { prioridade: "alta",  label: "Alta",  value: 1, unidade: " tarefa",  color: "var(--accent)" }
    ]}
  ],
  distribution: {
    labels:    ["Código", "Cursos", "Debug", "Outras"],
    completed: [62, 18, 38, 12],
    allocated: [80, 20, 40, 15]
  }
};

/* ---------- Mapeamentos categoria <-> exibição ---------- */
const CATEGORIA_META = {
  "Escrevendo Código": { label: "Escrita de Código" },
  "Cursos":            { label: "Cursos & Estudos" },
  "Debugging":         { label: "Debugging & Fixes" },
  "Outras Demandas":   { label: "Outras Demandas" }
};

// Ordem de exibição das áreas (categorias) no card "Tempo por Área"
const CATEGORIA_ORDEM = ["Escrevendo Código", "Cursos", "Debugging", "Outras Demandas"];

/* ---------- Cor + rótulo de cada prioridade no card "Tempo por Área" ----------
   alta  = laranja (var(--accent))
   média = bege (igual ao tag-media do quadro de tarefas, #f5e6cf)
   baixa = azul (var(--info)) ---------- */
const PRIORIDADE_COR = {
  alta: "var(--accent)",
  media: "#f5e6cf",
  baixa: "var(--info)"
};
const PRIORIDADE_LABEL = { alta: "Alta", media: "Média", baixa: "Baixa" };
const PRIORIDADE_ORDEM = ["alta", "media", "baixa"];

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
   formatRelativeDays(dataISO)
   Formata data_limite de forma relativa para o KPI "Próxima
   Entrega" (Hoje / Amanhã / Em X dias / dd/mm para datas distantes
   ou já vencidas).
   ============================================================ */
function formatRelativeDays(dataISO) {
  if (!dataISO) return "Sem prazo";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const alvo = new Date(dataISO);
  alvo.setHours(0, 0, 0, 0);

  const diffDias = Math.round((alvo - hoje) / 86400000);

  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Amanhã";
  if (diffDias > 1) return `Em ${diffDias} dias`;
  return alvo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* ============================================================
   transformResumo(data)
   Converte a resposta de GET /api/tasks/analytics/resumo no
   formato esperado pelos renderers desta tela.
   ============================================================ */
function transformResumo(data) {
  // Tempo por Área (no período selecionado): uma barra por área (categoria),
  // segmentada internamente por prioridade (alta = laranja, média = bege,
  // baixa = azul), na ordem alta -> média -> baixa.
  //
  // Para integrar o card com TODAS as tarefas do quadro (não só as que têm
  // tempo_gasto preenchido, já que o padrão é 0h), cada área usa:
  //   - horas (tempo_gasto), se a área tiver pelo menos 1h registrada; ou
  //   - nº de tarefas, como fallback, quando a área não tem horas registradas
  //     mas possui tarefas no quadro.
  const areas = {};
  (data.por_categoria_prioridade || []).forEach((item) => {
    const categoria = item._id?.categoria;
    const prioridade = item._id?.prioridade;
    const tempo = Math.round((item.tempo_total || 0) * 10) / 10;
    const count = item.count || 0;
    if (!categoria || !prioridade || count <= 0) return;

    if (!areas[categoria]) areas[categoria] = { totalTempo: 0, totalCount: 0, porPrioridade: {} };
    areas[categoria].totalTempo = Math.round((areas[categoria].totalTempo + tempo) * 10) / 10;
    areas[categoria].totalCount += count;
    areas[categoria].porPrioridade[prioridade] = { tempo, count };
  });

  const timeArea = CATEGORIA_ORDEM
    .filter((categoria) => areas[categoria])
    .map((categoria) => {
      const area = areas[categoria];
      const usaHoras = area.totalTempo > 0;
      const unidade = (valor) => (usaHoras ? "h" : (valor === 1 ? " tarefa" : " tarefas"));

      const segments = PRIORIDADE_ORDEM
        .filter((p) => area.porPrioridade[p])
        .map((p) => {
          const dados = area.porPrioridade[p];
          const valor = usaHoras ? dados.tempo : dados.count;
          return {
            prioridade: p,
            label: PRIORIDADE_LABEL[p],
            value: valor,
            unidade: unidade(valor),
            color: PRIORIDADE_COR[p]
          };
        })
        .filter((seg) => seg.value > 0);

      const valorArea = usaHoras ? area.totalTempo : area.totalCount;

      return {
        label: CATEGORIA_META[categoria]?.label || categoria,
        value: valorArea,
        unidade: unidade(valorArea),
        segments
      };
    });

  const proximas = data.proximas_entregas || [];

  const deliveries = proximas.map((tarefa) => ({
    title: tarefa.tarefa,
    sub: STATUS_LABEL[tarefa.status] || tarefa.status,
    badge: formatDeadline(tarefa.data_limite),
    cls: PRIORIDADE_BADGE[tarefa.prioridade] || "badge-amanha"
  }));

  // Tarefa não concluída com data_limite mais próxima da data atual
  const proximaEntrega = proximas[0]
    ? { title: proximas[0].tarefa, dataISO: proximas[0].data_limite }
    : null;

  return {
    progress: data.progresso ?? 0,
    deliveries,
    proximaEntrega,
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

(function guard() {
  if (!ensureAuthenticated()) return;

  setupUserInfo();
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
    // Fallback enquanto offline / sem token válido. O card "Tempo por Área"
    // não deve exibir dados mocados: nesse caso ele fica vazio (renderTimeArea
    // mostra a mensagem "Sem dados de tempo registrados ainda.").
    return { ...MOCK, timeArea: [] };
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
   items = data.timeArea (array de { label, value, unidade, segments })
   segments = [{ prioridade, label, value, unidade, color }]
   Gera, para cada área, uma única barra horizontal multicolorida:
   o comprimento total reflete o valor da área (normalizado pelo
   máximo) e cada segmento interno representa a fatia de cada
   prioridade (alta = laranja, média = bege, baixa = azul).
   Cada área é exibida em horas (tempo_gasto) quando há tempo
   registrado, ou em nº de tarefas (fallback) quando a área tem
   tarefas no quadro mas ainda sem horas registradas.
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
        <span>${it.label}</span>                 <!-- it.label -->
        <strong>${it.value}${it.unidade}</strong> <!-- valor + unidade (h ou tarefa(s)) -->
      </div>
      <div class="bar-track" style="width:${(it.value / max) * 100}%">
        <!-- um segmento por prioridade, proporcional ao valor dentro da área -->
        ${it.segments.map((seg) => `
          <div class="bar-fill" style="flex:${seg.value} 0 0; background:${seg.color}" title="${seg.label}: ${seg.value}${seg.unidade}"></div>
        `).join("")}
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
   renderNextDelivery(item)
   item = data.proximaEntrega { title, dataISO } ou null
   Preenche o KPI "Próxima Entrega" do card "Meu Progresso" com a
   tarefa não concluída de data_limite mais próxima da data atual.
   ============================================================ */
function renderNextDelivery(item) {
  const titleEl = document.getElementById("nextDeliveryTitle");
  const dateEl = document.getElementById("nextDeliveryDate");
  if (!titleEl || !dateEl) return;

  if (!item) {
    titleEl.textContent = "Sem entregas";
    dateEl.textContent = "—";
    return;
  }

  titleEl.textContent = item.title;
  dateEl.textContent = formatRelativeDays(item.dataISO);
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
   setupTimeAreaFilter()
   Liga o <select id="timeAreaPeriod"> à troca de período do card
   "Tempo por Área". Refaz a busca (GET .../resumo?periodo=...) e
   renderiza apenas as barras de tempo por área.
   ============================================================ */
const TIME_AREA_PERIOD_TITLES = {
  diario: "Tempo por Área (Diário)",
  semanal: "Tempo por Área (Semanal)",
  mensal: "Tempo por Área (Mensal)"
};

function setupTimeAreaFilter() {
  const select = document.getElementById("timeAreaPeriod");
  const title = document.getElementById("timeAreaTitle");

  if (!select) return;

  select.addEventListener("change", async () => {
    const periodo = select.value;

    if (title) title.textContent = TIME_AREA_PERIOD_TITLES[periodo] || "Tempo por Área";

    const data = await fetchAnalytics(periodo);
    renderTimeArea(data.timeArea);
  });
}

/* ============================================================
   Bootstrap da tela: busca os dados e renderiza tudo.
   Se quiser auto-refresh, envolver em setInterval(... , 60000).
   ============================================================ */
fetchAnalytics("semanal").then((data) => {
  renderProgress(data.progress);          // <- data.progress
  renderDeliveries(data.deliveries);      // <- data.deliveries
  renderNextDelivery(data.proximaEntrega); // <- data.proximaEntrega
  renderTimeArea(data.timeArea);          // <- data.timeArea
  renderChart(data.distribution);         // <- data.distribution
});

setupDistFilter();
setupTimeAreaFilter();

/* ============================================================
   Botão "Nova Tarefa" do sidebar (.btn-accent) leva para a tela 1
   e sinaliza (via query string) para abrir o popup "Nova Tarefa"
   automaticamente assim que a tela 1 carregar.
   ============================================================ */
document.querySelectorAll(".btn-accent").forEach((b) =>
  b.addEventListener("click", () => (window.location.href = "../tela%201/index.html?novaTarefa=1"))
);
