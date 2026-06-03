/* ============================================================
   TELA DE LOGIN — integração com Back-end
   ------------------------------------------------------------
   Endpoint principal: POST {API_BASE}/auth/login
   Body enviado:       { email, password }
   Resposta esperada:  { token: "<jwt>", user: { name, role } }
   Após sucesso:       salva token + user no localStorage e
                       redireciona para a tela 2 (dashboard).
   ============================================================ */

// >>> TROCAR pela URL real do back-end <<<
const API_BASE = "http://localhost:3000";

/* ---- UI: botão "olho" mostrar/esconder senha (não envolve API) ---- */
const toggle = document.getElementById("togglePass");
const passInput = document.getElementById("password");
toggle.addEventListener("click", () => {
  const isPw = passInput.type === "password";
  passInput.type = isPw ? "text" : "password";
  toggle.innerHTML = `<i class="lucide ${isPw ? "lucide-eye-off" : "lucide-eye"}"></i>`;
});

/* ---- Submit do formulário de login ---- */
const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");   // <p id="msg"> usado para feedback

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    msg.style.color = "var(--accent)";
    msg.textContent = "Preencha e-mail e senha.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      msg.style.color = "var(--accent)";
      msg.textContent = "E-mail ou senha incorretos.";
      return;
    }

    const data = await res.json();
    localStorage.setItem("ti_token", data.token);

    const savedUser = JSON.parse(localStorage.getItem("ti_registered_user") || "null");
    const user = data.user || savedUser || { name: "Usuário", role: "Membro" };
    localStorage.setItem("ti_user", JSON.stringify(user));

    msg.style.color = "var(--primary)";
    msg.textContent = "Login realizado com sucesso!";

    setTimeout(() => {
      window.location.href = "../tela%202/index.html";
    }, 600);
  } catch (error) {
    console.error("Erro no login:", error);
    msg.style.color = "var(--accent)";
    msg.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  }
});
