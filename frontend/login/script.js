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
const API_BASE = "https://api.taskinsight.example.com";

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

  const savedUser = JSON.parse(
    localStorage.getItem("ti_registered_user") || "null"
  );

  if (!savedUser) {
    msg.style.color = "var(--accent)";
    msg.textContent = "Nenhum usuário cadastrado. Crie uma conta primeiro.";
    return;
  }

  if (email !== savedUser.email || password !== savedUser.password) {
    msg.style.color = "var(--accent)";
    msg.textContent = "E-mail ou senha incorretos.";
    return;
  }

  const data = {
    token: "demo-token",
    user: {
      name: savedUser.name,
      role: savedUser.role
    }
  };

  localStorage.setItem("ti_token", data.token);
  localStorage.setItem("ti_user", JSON.stringify(data.user));

  msg.style.color = "var(--primary)";
  msg.textContent = "Login realizado com sucesso!";

  setTimeout(() => {
    window.location.href = "../tela%202/index.html";
  }, 600);
});
