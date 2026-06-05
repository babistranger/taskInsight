const API_BASE = "http://localhost:3000";

/* ---- Toggle mostrar/esconder senha ---- */
const toggle = document.getElementById("togglePass");
const passInput = document.getElementById("password");
toggle.addEventListener("click", () => {
  const isPw = passInput.type === "password";
  passInput.type = isPw ? "text" : "password";
  toggle.innerHTML = `<i class="lucide ${isPw ? "lucide-eye-off" : "lucide-eye"}"></i>`;
});

/* ---- Submit do formulário de login ---- */
const form = document.getElementById("loginForm");
const msg  = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";

  const email = form.email.value.trim();
  const senha = form.password.value;

  if (!email || !senha) {
    msg.style.color = "var(--accent)";
    msg.textContent = "Preencha e-mail e senha.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.style.color = "var(--accent)";
      msg.textContent = data.erro || "E-mail ou senha incorretos.";
      return;
    }

    localStorage.setItem("ti_token", data.token);
    localStorage.setItem("ti_user", JSON.stringify(data.usuario));

    msg.style.color = "var(--primary)";
    msg.textContent = "Login realizado com sucesso!";

    setTimeout(() => {
      window.location.href = "../tela%202/index.html";
    }, 600);
  } catch (error) {
    console.error("Erro no login:", error);
    msg.style.color = "var(--accent)";
    msg.textContent = "Não foi possível conectar ao servidor.";
  }
});
