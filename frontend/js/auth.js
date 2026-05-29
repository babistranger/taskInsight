function bindLogin(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"); err.textContent = "";
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.value.trim(),
          password: form.password.value,
        }),
      });
      setSession(data.token, data.user);
      location.href = "app.html";
    } catch (e) { err.textContent = "E-mail ou senha inválidos."; }
  });
}

function bindRegister(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("err"); err.textContent = "";
    if (form.password.value.length < 8) { err.textContent = "A senha deve ter pelo menos 8 caracteres."; return; }
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value,
        }),
      });
      setSession(data.token, data.user);
      location.href = "app.html";
    } catch (e) {
      err.textContent = e.message === "email_in_use" ? "Este e-mail já está em uso." : "Não foi possível cadastrar.";
    }
  });
}
