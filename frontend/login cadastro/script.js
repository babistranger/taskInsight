const API_BASE = "http://localhost:3000";

function validarSenha(senha) {
  if (senha.length < 8)            return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(senha))        return "A senha deve conter pelo menos uma letra maiúscula.";
  if (!/[0-9]/.test(senha))        return "A senha deve conter pelo menos um número.";
  if (!/[^A-Za-z0-9]/.test(senha)) return "A senha deve conter pelo menos um caractere especial.";
  return null;
}

/* ---- Toggle mostrar/esconder senha ---- */
const toggle = document.getElementById("togglePass");
const passInput = document.getElementById("password");
toggle.addEventListener("click", () => {
  const isPw = passInput.type === "password";
  passInput.type = isPw ? "text" : "password";
  toggle.innerHTML = `<i class="lucide ${isPw ? "lucide-eye-off" : "lucide-eye"}"></i>`;
});

/* ---- Submit do formulário de cadastro ---- */
const form = document.getElementById("signupForm");
const msg  = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.style.color = "var(--muted)";
  msg.textContent = "Criando conta...";

  const nome  = form.elements["name"].value.trim();
  const email = form.email.value.trim();
  const senha = form.password.value;

  const erroSenha = validarSenha(senha);
  if (!nome || !email) {
    msg.style.color = "var(--accent)";
    msg.textContent = "Preencha todos os campos.";
    return;
  }
  if (erroSenha) {
    msg.style.color = "var(--accent)";
    msg.textContent = erroSenha;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.style.color = "var(--accent)";
      msg.textContent = (data.erro || "Não foi possível criar a conta.") + (data.detalhe ? ` — ${data.detalhe}` : "");
      return;
    }

    localStorage.setItem("ti_token", data.token);
    localStorage.setItem("ti_user", JSON.stringify(data.usuario));

    msg.style.color = "var(--primary)";
    msg.textContent = "Conta criada com sucesso!";

    setTimeout(() => {
      window.location.href = "../login/index.html";
    }, 800);
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    msg.style.color = "var(--accent)";
    msg.textContent = "Não foi possível conectar ao servidor.";
  }
});
