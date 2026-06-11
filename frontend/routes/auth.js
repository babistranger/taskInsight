function bindLogin(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("err") || document.getElementById("msg"); err.textContent = "";
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.value.trim(),
          senha: form.password.value,
        }),
      });
      setSession(data.token, data.usuario);
      location.href = "/tela%201/";
    } catch (e) { err.textContent = "E-mail ou senha inválidos."; }
  });
}

function validarSenha(senha) {
  if (senha.length < 8)            return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(senha))        return "A senha deve conter pelo menos uma letra maiúscula.";
  if (!/[0-9]/.test(senha))        return "A senha deve conter pelo menos um número.";
  if (!/[^A-Za-z0-9]/.test(senha)) return "A senha deve conter pelo menos um caractere especial.";
  return null;
}

function bindRegister(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("err") || document.getElementById("msg"); err.textContent = "";
    const erroSenha = validarSenha(form.password.value);
    if (erroSenha) { err.textContent = erroSenha; return; }
    try {
      const data = await api("/api/auth/cadastro", {
        method: "POST",
        body: JSON.stringify({
          nome: form.elements['name'].value.trim(),
          email: form.email.value.trim(),
          senha: form.password.value,
        }),
      });
      setSession(data.token, data.usuario);
      location.href = "/login/";
    } catch (e) {
      err.textContent = e.message === "E-mail já cadastrado." ? "Este e-mail já está em uso." : "Não foi possível cadastrar.";
    }
  });
}
