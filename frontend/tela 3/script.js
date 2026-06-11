/* ============================================================
   TELA 3 — RELATÓRIOS
   ------------------------------------------------------------
   Os relatórios (KPIs, filtros, gráficos e tabela de tarefas) são
   gerados e renderizados pelo dashboard.py (Streamlit), embutido
   nesta tela via <iframe> (ver index.html). Este script cuida
   apenas do "casco" da página: autenticação, sidebar e logout —
   igual às telas 1 e 2.
   ============================================================ */

/* ============================================================
   Guard de rota + sidebar (igual às telas 1 e 2)
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
   setupStreamlitFrame()
   Repassa o token já salvo (ti_token) para o dashboard.py via
   query string (?token=...), tanto no <iframe> quanto no link
   "Abrir em nova aba" — assim o Streamlit faz auto-login sem
   pedir e-mail/senha de novo (ver dashboard.py).
   ============================================================ */
const STREAMLIT_BASE_URL = "http://localhost:8501";

function setupStreamlitFrame() {
  const token = localStorage.getItem("ti_token");
  if (!token) return;

  const url = `${STREAMLIT_BASE_URL}/?token=${encodeURIComponent(token)}`;

  const frame = document.getElementById("streamlitFrame");
  if (frame) frame.src = url;

  const link = document.getElementById("openStreamlitLink");
  if (link) link.href = url;
}

setupStreamlitFrame();

/* ============================================================
   Botão "Nova Tarefa" do sidebar (.btn-accent) leva para a tela 1
   e sinaliza (via query string) para abrir o popup "Nova Tarefa"
   automaticamente assim que a tela 1 carregar.
   ============================================================ */
document.querySelectorAll(".btn-accent").forEach((b) =>
  b.addEventListener("click", () => (window.location.href = "../tela%201/index.html?novaTarefa=1"))
);
