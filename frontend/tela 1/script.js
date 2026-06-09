/* Guard + dados do usuário no sidebar */
requireAuth();
const u = user();
if (u?.nome) document.getElementById("userName").textContent = u.nome;

/* Carrega tarefas e inicializa modal */
loadAll();
bindNewTask();
