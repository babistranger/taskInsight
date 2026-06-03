/* ============================================================
   TELA DE CADASTRO — integração com Back-end
   ------------------------------------------------------------
   Endpoint: POST {API_BASE}/auth/register
   Body:     { name, email, password }
   Resposta: { token: "<jwt>", user: { name, role } }
   Após sucesso -> salva no localStorage e vai para a tela 2.
   ============================================================ */

// >>> TROCAR pela URL real do back-end <<<
const API_BASE = "http://localhost:3000";

/* ---- Toggle mostrar/esconder senha (somente UI) ---- */
const toggle = document.getElementById("togglePass");
const passInput = document.getElementById("password");
toggle.addEventListener("click", () => {
  const isPw = passInput.type === "password";
  passInput.type = isPw ? "text" : "password";
  toggle.innerHTML = `<i class="lucide ${isPw ? "lucide-eye-off" : "lucide-eye"}"></i>`;
});

/* ---- Submit do formulário de cadastro ---- */
const form = document.getElementById("signupForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.style.color = "var(--muted)";
  msg.textContent = "Criando conta...";

  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value
  };

  if (!payload.name || !payload.email || payload.password.length < 6) {
    msg.style.color = "var(--accent)";
    msg.textContent = "Preencha todos os campos corretamente.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      msg.style.color = "var(--accent)";
      msg.textContent = errorText || "Não foi possível criar a conta.";
      return;
    }

    const registeredUser = {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: "Novo Membro"
    };

    localStorage.setItem("ti_registered_user", JSON.stringify(registeredUser));

    msg.style.color = "var(--primary)";
    msg.textContent = "Conta criada com sucesso! Vá para o login.";

    setTimeout(() => {
      window.location.href = "../login/index.html";
    }, 800);
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    msg.style.color = "var(--accent)";
    msg.textContent = "Ocorreu um erro. Tente novamente.";
  }
});
