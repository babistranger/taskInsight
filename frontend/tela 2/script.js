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
const API_BASE = "https://api.taskinsight.example.com";

/* ---------- MOCK fallback ----------
   Espelha exatamente o contrato esperado da API. Usado quando
   /analytics/overview falha (offline / não implementado). ----- */
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

/* ============================================================
   Guard de rota + preencher dados do usuário no sidebar.
   - ti_token  -> obrigatório (senão volta para login)
   - ti_user   -> { name, role } salvo no login
   ============================================================ */
(function guard() {
  const token = localStorage.getItem("ti_token");
  if (!token) { window.location.href = "../login/index.html"; return; }

  const u = JSON.parse(localStorage.getItem("ti_user") || "{}");
  if (u.name) document.getElementById("userName").textContent = u.name;
  if (u.role) document.getElementById("userRole").textContent = u.role;
})();

/* ============================================================
   fetchAnalytics()
   Chama GET /analytics/overview. Em caso de falha, devolve MOCK.
   ============================================================ */
async function fetchAnalytics() {
  try {
    const token = localStorage.getItem("ti_token");
    const res = await fetch(`${API_BASE}/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    return await res.json(); // deve seguir o formato documentado acima
  } catch {
    return MOCK; // ⚠️ remover quando API estiver pronta
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
function renderChart(d) {
  const ctx = document.getElementById("distChart");
  new Chart(ctx, {
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
   Bootstrap da tela: busca os dados e renderiza tudo.
   Se quiser auto-refresh, envolver em setInterval(... , 60000).
   ============================================================ */
fetchAnalytics().then((data) => {
  renderProgress(data.progress);          // <- data.progress
  renderDeliveries(data.deliveries);      // <- data.deliveries
  renderTimeArea(data.timeArea);          // <- data.timeArea
  renderChart(data.distribution);         // <- data.distribution
});

/* ============================================================
   Botão "Nova Tarefa" do sidebar (.btn-accent) leva para a tela 1.
   Pode futuramente abrir um modal direto e chamar POST /tasks.
   ============================================================ */
document.querySelectorAll(".btn-accent").forEach((b) =>
  b.addEventListener("click", () => (window.location.href = "../tela%201/index.html"))
);
