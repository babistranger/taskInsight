/* ============================================================
   TELA DE CADASTRO — integração com Back-end
   ------------------------------------------------------------
   Endpoint: POST {API_BASE}/auth/register
   Body:     { name, email, password }
   Resposta: { token: "<jwt>", user: { name, role } }
   Após sucesso -> salva no localStorage e vai para a tela 2.
   ============================================================ */

// >>> TROCAR pela URL real do back-end <<<
const API_BASE = "https://api.taskinsight.example.com";

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

  // Monta o payload com os dados do formulário
  // -> Mesmos nomes esperados pelo back-end no endpoint /auth/register
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value
  };

  // Validação simples (a API deve revalidar)
  if (!payload.name || !payload.email || payload.password.length < 6) {
    msg.style.color = "var(--accent)";
    msg.textContent = "Preencha todos os campos corretamente.";
    return;
  }

  try {
    /* ===== CHAMADA À API =====
       Endpoint: POST {API_BASE}/auth/register
       Body:     payload (JSON com name, email, password)
       ============================ */
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);

    let data;
    if (res && res.ok) {
      // ✅ Resposta real
      // Esperado: { token: string, user: { name: string, role: string } }
      data = await res.json();
    } else {
      // ⚠️ Fallback MOCK quando API ainda não está pronta — remover depois
      data = { token: "demo-token", user: { name: payload.name, role: "Novo Membro" } };
    }

    /* ===== Persistência ===== */
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
