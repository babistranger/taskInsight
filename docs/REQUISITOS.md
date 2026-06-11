# TaskInsight — Documento de Requisitos e Arquitetura

**Versão:** 2.0
**Data:** 2026-06-11
**Autor:** Squad 5 TaskInsight

---

## 1. Visão Geral

TaskInsight é uma aplicação web de gestão de tarefas com foco em **clareza cognitiva** e **simplicidade visual**. Permite que usuários organizem tarefas em um quadro Kanban, acompanhem métricas de produtividade em um dashboard de analytics e consultem relatórios detalhados e filtráveis em um dashboard analítico dedicado.

A aplicação é desenhada para execução **local no sistema operacional** (Windows/macOS/Linux), seguindo uma arquitetura clássica em **3 camadas** desacopladas, com um módulo adicional de relatórios em Streamlit.

## 2. Objetivos

- Cadastrar e autenticar usuários com segurança (JWT).
- Permitir CRUD de tarefas com status, prioridade, categoria, tempo gasto e prazo.
- Exibir o quadro Kanban com 4 colunas (A Fazer, Em Progresso, Em Revisão, Concluído).
- Apresentar dashboard analítico (Tela 2) com KPIs, próximas entregas e distribuição por categoria/prioridade.
- Apresentar relatórios detalhados e filtráveis (Tela 3), com gráficos e tabela ordenável de tarefas.

## 3. Requisitos Funcionais

| ID    | Descrição |
|-------|-----------|
| RF01  | O sistema deve permitir cadastro com nome, e-mail e senha (mín. 8 caracteres, com maiúscula, número e caractere especial). |
| RF02  | O sistema deve autenticar via e-mail + senha emitindo um token JWT (HS256). |
| RF03  | O usuário autenticado deve poder criar, editar, excluir e listar suas próprias tarefas. |
| RF04  | Tarefas têm os atributos: nome (`tarefa`), descrição, categoria, status, prioridade, tempo gasto (horas) e data limite. |
| RF05  | O quadro deve agrupar tarefas pelas 4 colunas de status (`a_fazer`, `em_progresso`, `em_revisao`, `concluido`). |
| RF06  | O dashboard de analytics (Tela 2) deve exibir: progresso geral, totais por status/categoria/prioridade, próximas entregas e distribuição de tempo por categoria, com filtro por período (diário/semanal/mensal). |
| RF07  | O sistema deve isolar dados por usuário (cada usuário só vê suas tarefas). |
| RF08  | O sistema deve permitir logout (descarte do token no cliente). |
| RF09  | A tela de Relatórios (Tela 3) deve exibir, via dashboard Streamlit embutido, KPIs, gráficos de status/prioridade e uma tabela ordenável de tarefas, com filtros por categoria, status, prioridade, tempo gasto e intervalo de prazo. |
| RF10  | O acesso ao dashboard Streamlit deve ser feito automaticamente (sem novo login), repassando o token JWT já obtido na Tela 3 via parâmetro de URL (`?token=`), validado contra a API. |

## 4. Requisitos Não Funcionais

| ID     | Descrição |
|--------|-----------|
| RNF01  | Senhas armazenadas com hash **bcrypt** (cost 12), via hook `pre('save')` do Mongoose. |
| RNF02  | Comunicação cliente↔API em JSON via HTTP, autenticada por **Bearer JWT**. |
| RNF03  | API deve responder rapidamente para uso local (sem carga concorrente significativa). |
| RNF04  | Interface responsiva (mínimo 768 px), com layout adaptado a partir de 820 px na Tela 3. |
| RNF05  | Código organizado em camadas claramente separadas (rotas, controllers, models, middlewares). |
| RNF06  | MongoDB com índices compostos em `tasks` (`usuario + status`, `usuario + deadline`) e índice único em `users.email`. |
| RNF07  | CORS habilitado via variável `FRONTEND_URL` (padrão `*` em desenvolvimento). |

## 5. Arquitetura

### 5.1 Visão geral

```
┌──────────────────────────────────────────────────────────────┐
│ CAMADA 1 — APRESENTAÇÃO (Frontend)                           │
│ HTML5 + CSS3 + JavaScript Vanilla                            │
│ Servida estaticamente pela própria API (Express.static)      │
│ Telas: login, cadastro, tela 1 (Kanban), tela 2 (Analytics), │
│        tela 3 (Relatórios — embute o dashboard Streamlit)    │
│ Responsável por UI, validação básica e armazenamento do JWT  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP/JSON  +  Authorization: Bearer
┌─────────────────────────▼────────────────────────────────────┐
│ CAMADA 2 — APLICAÇÃO (API REST)                              │
│ Node.js + Express 5 + Mongoose                               │
│ jsonwebtoken (HS256) · bcryptjs · regras de negócio          │
│ Porta 3000                                                   │
└─────────────────────────┬────────────────────────────────────┘
                          │ Mongoose (driver oficial)
┌─────────────────────────▼────────────────────────────────────┐
│ CAMADA 3 — DADOS                                             │
│ MongoDB — coleções: users, tasks                             │
└──────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │ Dashboard de Relatórios (Streamlit) — dashboard.py     │
  │ Python · Plotly · Pandas · requests                    │
  │ Porta 8501 — consome a API REST via JWT                │
  │ Embutido na Tela 3 via <iframe>, com auto-login por    │
  │ token repassado em ?token= (validado em /api/users/me) │
  └────────────────────────────────────────────────────────┘
```

### 5.2 Componentes

**Frontend (`/frontend`)**
- `login/` — Tela de login (`index.html`, `script.js`).
- `login cadastro/` — Tela de cadastro.
- `tela 1/` — Quadro Kanban (CRUD de tarefas, drag entre colunas via `PATCH /api/tasks/:id/status`).
- `tela 2/` — Dashboard de Analytics (KPIs, gráficos, próximas entregas — consome `/api/tasks/analytics/resumo`).
- `tela 3/` — Relatórios: shell (sidebar, autenticação, logout) + `<iframe>` apontando para o Streamlit (`http://localhost:8501`), com repasse de `ti_token` via `?token=`.
- Paleta: laranja `#f97316` (acento), azul do projeto `#5a83b7`, fundo creme `#fdfaf5`.

**API (`/api/src`)**
- `app.js` — bootstrap Express, CORS, arquivos estáticos do frontend, montagem das rotas.
- `server.js` — conexão com MongoDB e `app.listen`.
- `routes/authRoutes.js` — `POST /api/auth/cadastro`, `POST /api/auth/login`.
- `routes/userRoutes.js` — `GET/PATCH/DELETE /api/users/me`, `PATCH /api/users/me/senha` (todas protegidas por JWT).
- `routes/taskRoutes.js` — CRUD de tarefas + `GET /api/tasks/analytics/resumo` (todas protegidas por JWT).
- `controllers/authController.js`, `controllers/userController.js`, `controllers/taskController.js` — regras de negócio.
- `middlewares/authMiddleware.js` (`proteger`) — valida o JWT e injeta `req.usuario`.
- `models/user.js`, `models/tasks.js` — schemas Mongoose.

**Dashboard de Relatórios (`/dashboard`)**
- `dashboard.py` — Streamlit consumindo `GET /api/tasks` e `GET /api/users/me`; gráficos com Plotly e tabela ordenável (`st.dataframe` + `pandas.Styler`).
- `requirements.txt` — dependências Python.

### 5.3 Fluxo de autenticação JWT

```
Cliente ─POST /api/auth/login {email, senha}──► API
API: verifica bcrypt → emite JWT (jsonwebtoken, HS256) ──► Cliente
Cliente armazena { token, usuario } em localStorage (ti_token, ti_user)
Toda requisição subsequente envia: Authorization: Bearer <ti_token>
API (middleware proteger) decodifica e valida; injeta req.usuario na request
```

### 5.4 Fluxo de auto-login do dashboard Streamlit (Tela 3)

```
Tela 3 (já autenticada) ──monta──► <iframe src="http://localhost:8501/?token=<ti_token>">
dashboard.py lê ?token= via st.query_params
dashboard.py ──GET /api/users/me  Authorization: Bearer <token>──► API
Se válido: token/usuário guardados em st.session_state (sem tela de login)
Se inválido/ausente: exibe aviso para acessar pela tela "Relatórios"
```

A barra lateral nativa do Streamlit é ocultada via CSS
(`[data-testid="stSidebar"]` e `[data-testid="stSidebarCollapsedControl"]`
com `display:none`); não há fluxo de login/logout dentro do Streamlit.

## 6. Endpoints da API

| Método | Rota                            | Auth | Descrição                                  |
|--------|----------------------------------|------|----------------------------------------------|
| POST   | `/api/auth/cadastro`            | —    | Cadastro de usuário → retorna `{token, usuario}` |
| POST   | `/api/auth/login`               | —    | Login → retorna `{token, usuario}`            |
| GET    | `/api/users/me`                  | JWT  | Dados do usuário autenticado                  |
| PATCH  | `/api/users/me`                  | JWT  | Atualiza dados do perfil                      |
| PATCH  | `/api/users/me/senha`            | JWT  | Troca de senha                                |
| DELETE | `/api/users/me`                  | JWT  | Remove a conta                                |
| GET    | `/api/tasks`                    | JWT  | Lista tarefas do usuário                      |
| GET    | `/api/tasks/:id`                  | JWT  | Detalhe de uma tarefa                         |
| POST   | `/api/tasks`                    | JWT  | Cria tarefa                                   |
| PATCH  | `/api/tasks/:id`                  | JWT  | Atualiza tarefa                               |
| PATCH  | `/api/tasks/:id/status`           | JWT  | Atualiza apenas o status (drag-and-drop)      |
| DELETE | `/api/tasks/:id`                  | JWT  | Exclui tarefa                                 |
| GET    | `/api/tasks/analytics/resumo`   | JWT  | KPIs e agregados (Tela 2 e dashboard Streamlit) |
| GET    | `/api/health`                    | —    | Health-check                                  |

## 7. Modelo de Dados (MongoDB)

```js
// users
{
  _id: ObjectId,
  nome: String,
  email: String,        // unique, lowercase
  senha: String,        // hash bcrypt, select: false
  createdAt, updatedAt: Date
}

// tasks
{
  _id: ObjectId,
  usuario: ObjectId,    // ref User
  tarefa: String,
  descricao: String,
  categoria: "Escrevendo Código" | "Cursos" | "Debugging" | "Outras Demandas",
  status: "a_fazer" | "em_progresso" | "em_revisao" | "concluido",
  prioridade: "alta" | "media" | "baixa",
  tempo_gasto: Number,   // horas
  data_limite: Date,
  createdAt, updatedAt: Date
}
```

Índices: `users.email` (unique), `tasks.{usuario, status}`, `tasks.{usuario, deadline}`.

## 8. Segurança

- Senhas: **bcrypt** (bcryptjs, cost 12) via hook `pre('save')` no model `User`.
- Tokens: **JWT HS256** (jsonwebtoken), segredo via variável de ambiente `JWT_SECRET` e expiração via `JWT_EXPIRES_IN`.
- Cliente faz logout removendo `ti_token`/`ti_user` do `localStorage` e redirecionando para o login.
- Validação de senha no cadastro (mínimo 8 caracteres, maiúscula, número, caractere especial).
- CORS controlado em `app.js` via `FRONTEND_URL` (ajustar para domínio em produção).
- Isolamento por `usuario` (ObjectId) em todas as queries de tarefas.
- O dashboard Streamlit não armazena credenciais: reaproveita o JWT da sessão do navegador, validado a cada acesso via `/api/users/me`.

## 9. Tecnologias

| Camada               | Tecnologia                          | Versão  |
|----------------------|---------------------------------------|---------|
| Frontend             | HTML5, CSS3, JavaScript ES2020         | —       |
| API                  | Node.js · Express                     | 5.2     |
| ORM/ODM              | Mongoose                               | 9.6     |
| Auth                 | jsonwebtoken · bcryptjs                | 9.0 · 3.0 |
| Dashboard Relatórios | Streamlit · Plotly · Pandas · requests | 1.38 · 5.24 · 2.2 · 2.32 |
| Banco                | MongoDB                                | 6+      |

## 10. Como Executar

```bash
# Banco
mongod --dbpath ./data

# API (também serve o frontend estático em /)
cd api
npm install
npm start                                   # http://localhost:3000

# Dashboard de Relatórios (Streamlit)
pip install -r dashboard/requirements.txt
cd dashboard && streamlit run dashboard.py  # http://localhost:8501
```

Acesse `http://localhost:3000` (redireciona para a tela de login). A
Tela 3 ("Relatórios") embute automaticamente o dashboard Streamlit,
repassando o token de sessão.

## 11. Roadmap

- v2.1 — Refresh tokens e logout server-side (blacklist).
- v2.2 — Drag-and-drop nativo no quadro.
- v2.3 — Times e compartilhamento de tarefas (RBAC).
- v2.4 — Notificações por e-mail e webhooks.
- v3.0 — Versão SaaS multi-tenant com hospedagem em nuvem.
