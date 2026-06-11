# TaskInsight — Documento de Requisitos e Arquitetura

**Versão:** 2.1  
**Data:** 2026-06-11  
**Autor:** Squad 5 TaskInsight

---

## 1. Visão Geral

TaskInsight é uma aplicação web de gestão de tarefas com foco em **clareza cognitiva** e **simplicidade visual**. Permite que usuários organizem tarefas em um quadro Kanban, acompanhem métricas de produtividade em um dashboard analítico (Tela 2) e consultem relatórios filtráveis (Tela 3).

A aplicação é desenhada para execução **local no sistema operacional** (Windows/macOS/Linux), seguindo uma arquitetura clássica em **3 camadas** desacopladas, com um módulo adicional de relatórios em Streamlit.
A aplicação é desenhada para execução **local no sistema operacional** (Windows/macOS/Linux), seguindo uma arquitetura clássica em **3 camadas** desacopladas, com um módulo adicional de relatórios em Streamlit.

## 2. Objetivos

- Cadastrar e autenticar usuários com segurança (JWT).
- Permitir CRUD de tarefas com status, prioridade, categoria, tempo gasto e prazo.
- Permitir CRUD de tarefas com status, prioridade, categoria, tempo gasto e prazo.
- Exibir o quadro Kanban com 4 colunas (A Fazer, Em Progresso, Em Revisão, Concluído).
- Apresentar dashboard analítico (Tela 2) com KPIs, gráficos de evolução e distribuição por categoria.
- Apresentar relatórios filtráveis (Tela 3) com KPIs, gráficos e tabela completa de tarefas, via dashboard Streamlit embutido.

## 3. Requisitos Funcionais

| ID    | Descrição |
|-------|-----------|
| RF01  | O sistema deve permitir cadastro com nome, e-mail e senha (mín. 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial). |
| RF02  | O sistema deve autenticar via e-mail + senha emitindo um token JWT (HS256, validade configurável via `JWT_EXPIRES_IN`, padrão 1 dia). |
| RF03  | O usuário autenticado deve poder criar, editar, excluir e listar suas próprias tarefas. |
| RF04  | Tarefas têm os atributos: `tarefa`, `descricao`, `categoria` (Escrevendo Código/Cursos/Debugging/Outras Demandas), `status`, `prioridade` (alta/media/baixa), `tempo_gasto` (horas), `data_limite`, `createdAt`/`updatedAt`. |
| RF05  | O quadro deve agrupar tarefas pelas 4 colunas de status (a_fazer, em_progresso, em_revisao, concluido), com endpoint dedicado para mover cards (`PATCH /api/tasks/:id/status`). |
| RF06  | O dashboard (Tela 2) deve exibir: total por status, taxa de conclusão, distribuição por categoria/prioridade, próximas entregas, carga semanal e distribuição de tempo (concluído x alocado) por categoria, filtrável por período (diário/semanal/mensal). |
| RF07  | O sistema deve isolar dados por usuário (cada usuário só vê suas tarefas). |
| RF08  | O sistema deve permitir logout (descarte do token no cliente). |
| RF09  | A Tela 3 (Relatórios) deve exibir, via dashboard Streamlit embutido em `<iframe>`: painel de filtros (categoria, status, prioridade, tempo gasto, intervalo de prazo), KPIs, gráficos de status/prioridade e tabela completa de tarefas ordenável. |
| RF10  | O acesso ao dashboard Streamlit (Tela 3) deve reaproveitar a sessão já autenticada no front-end (auto-login via token JWT passado por query string), sem exigir novo login. |

## 4. Requisitos Não Funcionais

| ID     | Descrição |
|--------|-----------|
| RNF01  | Senhas armazenadas com hash **bcrypt** (cost 12). |
| RNF02  | Comunicação cliente↔API em JSON via HTTP, autenticada por **Bearer JWT**. |
| RNF03  | API deve responder em < 300 ms para 95% das requisições em carga local. |
| RNF04  | Interface responsiva (mínimo 768 px). |
| RNF05  | Código organizado em camadas claramente separadas (rotas, controllers, models, middlewares). |
| RNF06  | Banco MongoDB deve possuir índices em `users.email` (unique), `tasks.{usuario,status}` e `tasks.{usuario,deadline}`. |
| RNF07  | CORS habilitado para as origens necessárias ao front-end e ao dashboard Streamlit. |

## 5. Arquitetura

### 5.1 Visão em 3 camadas + módulo de relatórios

```
┌──────────────────────────────────────────────────────────────┐
│ CAMADA 1 — APRESENTAÇÃO (Frontend)                           │
│ HTML5 + CSS3 + JavaScript Vanilla                            │
│ Servida estaticamente pela própria API (porta 3000)          │
│ Telas: login, login cadastro, tela 1 (Kanban),               │
│        tela 2 (Analytics), tela 3 (Relatórios)               │
│ Responsável por UI, validação básica e armazenamento do JWT  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP/JSON  +  Authorization: Bearer
┌─────────────────────────▼────────────────────────────────────┐
│ CAMADA 2 — APLICAÇÃO (API REST)                              │
│ Node.js + Express 5 + Mongoose 9                             │
│ jsonwebtoken (HS256) · bcryptjs · regras de negócio          │
│ Porta 3000                                                   │
└─────────────────────────┬────────────────────────────────────┘
                          │ Mongoose (ODM)
┌─────────────────────────▼────────────────────────────────────┐
│ CAMADA 3 — DADOS                                             │
│ MongoDB — coleções: users, tasks                             │
│ MongoDB — coleções: users, tasks                             │
└──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │ Dashboard de Relatórios (Streamlit)  │
  │ Python · Plotly · Pandas             │
  │ Porta 8501 — embutido via <iframe>   │
  │ na Tela 3, com auto-login por token  │
  │ JWT (consome /api/users/me e /api/   │
  │ tasks)                                │
  └──────────────────────────────────────┘
```

### 5.2 Componentes

**Frontend (`/frontend`)**
- `login/` — Tela de login.
- `login cadastro/` — Tela de cadastro.
- `tela 1/` — Quadro Kanban (CRUD de tarefas, drag-and-drop entre status).
- `tela 2/` — Gráficos e Analytics (KPIs, gráficos de status/prioridade/categoria, próximas entregas, carga semanal).
- `tela 3/` — Relatórios: casco (sidebar/auth/logout) + `<iframe>` com o dashboard Streamlit.
- `assets/` — ícones e imagens compartilhadas.
- `routes/` — páginas auxiliares de roteamento.
- Cada `script.js` define `const API_BASE = "http://localhost:3000"` e usa `localStorage` (`ti_token`, `ti_user`) para autenticação.

**API (`/api`)**
- `src/server.js` — bootstrap do servidor (porta via `PORT`, padrão 3000) e conexão com MongoDB.
- `src/app.js` — instância do Express, middlewares (CORS, JSON), montagem das rotas e arquivos estáticos do frontend, `GET /api/health`.
- `src/routes/authRoutes.js` — `POST /api/auth/cadastro`, `POST /api/auth/login`.
- `src/routes/userRoutes.js` — `GET/PATCH/DELETE /api/users/me`, `PATCH /api/users/me/senha` (todas autenticadas).
- `src/routes/taskRoutes.js` — CRUD de tarefas + `GET /api/tasks/analytics/resumo` (todas autenticadas).
- `src/controllers/` — `authController.js`, `userController.js`, `taskController.js`.
- `src/models/` — `user.js` (hash de senha via hook `pre('save')`), `tasks.js`.
- `src/middlewares/authMiddleware.js` — `proteger` (valida JWT e injeta `req.usuario`).

**Dashboard (`/dashboard`)**
- `dashboard.py` — Streamlit; auto-login via `?token=`, painel de filtros, KPIs, gráficos (Plotly) e tabela ordenável (Pandas Styler).
- `requirements.txt` — `streamlit==1.38.0`, `requests==2.32.3`, `pandas==2.2.2`, `plotly==5.24.1`.

**Banco (MongoDB)**
- `users { _id, nome, email (unique, lowercase), senha (bcrypt, select:false), createdAt, updatedAt }`
- `tasks { _id, usuario (ObjectId -> users), tarefa, descricao, categoria, status, prioridade, tempo_gasto, data_limite, createdAt, updatedAt }`

### 5.3 Fluxo de autenticação JWT

```
Cliente ─POST /api/auth/login {email,senha}──► API
API: verifica bcrypt → emite JWT (HS256) ──► Cliente { token, usuario }
Cliente armazena token em localStorage (ti_token) e usuario (ti_user)
Toda requisição subsequente envia: Authorization: Bearer <token>
Middleware "proteger" decodifica e valida; injeta req.usuario na request
```

### 5.4 Fluxo de auto-login do dashboard Streamlit (Tela 3)

```
Tela 3 (já autenticada, possui ti_token)
  └─► script.js monta src do <iframe>:
        http://localhost:8501/?token=<ti_token>

dashboard.py (Streamlit)
  └─► lê st.query_params["token"]
  └─► GET /api/users/me  com Authorization: Bearer <token>
        ├─ 200 OK  → sessão autenticada, carrega GET /api/tasks
        └─ erro    → exibe instrução para acessar via TaskInsight
```

A barra lateral do Streamlit fica oculta (CSS); não há mais formulário de
login dentro do dashboard — o login acontece sempre pelo front-end
TaskInsight.

## 6. Endpoints da API

| Método | Rota                          | Auth | Descrição                                  |
|--------|-------------------------------|------|---------------------------------------------|
| POST   | `/api/auth/cadastro`          | —    | Cadastro de usuário → retorna `{token, usuario}` |
| POST   | `/api/auth/login`             | —    | Login → retorna `{token, usuario}`          |
| GET    | `/api/users/me`                | JWT  | Dados do usuário autenticado                |
| PATCH  | `/api/users/me`                | JWT  | Atualiza nome/e-mail                        |
| PATCH  | `/api/users/me/senha`          | JWT  | Troca de senha                              |
| DELETE | `/api/users/me`                | JWT  | Exclui a conta                              |
| GET    | `/api/tasks`                   | JWT  | Lista tarefas do usuário (filtros: status, categoria, prioridade) |
| GET    | `/api/tasks/:id`                | JWT  | Detalhe de uma tarefa                       |
| POST   | `/api/tasks`                   | JWT  | Cria tarefa                                 |
| PATCH  | `/api/tasks/:id`                | JWT  | Atualiza campos da tarefa                   |
| PATCH  | `/api/tasks/:id/status`         | JWT  | Move o card (atualiza apenas o status)      |
| DELETE | `/api/tasks/:id`                | JWT  | Exclui tarefa                               |
| GET    | `/api/tasks/analytics/resumo`   | JWT  | KPIs e agregados (param `periodo`)          |
| GET    | `/api/health`                   | —    | Health-check                                |

## 7. Modelo de Dados (MongoDB / Mongoose)

```js
```js
// users
{
  _id: ObjectId,
  nome: String,                 // obrigatório
  email: String,                // obrigatório, unique, lowercase
  senha: String,                // bcrypt hash (cost 12), select:false
  createdAt: Date,
  updatedAt: Date,
}

// tasks
{
  _id: ObjectId,
  usuario: ObjectId,             // ref -> User, obrigatório
  tarefa: String,                 // obrigatório
  descricao: String,              // default ""
  categoria: "Escrevendo Código" | "Cursos" | "Debugging" | "Outras Demandas", // default "Outras Demandas"
  status: "a_fazer" | "em_progresso" | "em_revisao" | "concluido",             // default "a_fazer"
  prioridade: "alta" | "media" | "baixa",                                      // default "media"
  tempo_gasto: Number,             // horas, default 0, min 0
  data_limite: Date | null,        // default null
  createdAt: Date,
  updatedAt: Date,
}
```

Índices: `users.email` (unique), `tasks.{usuario, status}`, `tasks.{usuario, deadline}`.
Índices: `users.email` (unique), `tasks.{usuario, status}`, `tasks.{usuario, deadline}`.

## 8. Segurança

- Senhas: **bcrypt** (cost 12) via hook `pre('save')` no model `User`.
- Tokens: **JWT HS256**, segredo via `JWT_SECRET`, expiração via `JWT_EXPIRES_IN` (padrão 1 dia).
- Validação de senha no cadastro: mín. 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial.
- Cliente faz logout (descarta `ti_token`/`ti_user`) ao receber `401`.
- CORS configurado em `app.js`.
- Isolamento por `usuario` em todas as queries de tarefas (filtro `{ usuario: req.usuario._id }`).
- O token JWT também trafega via query string (`?token=`) no fluxo de auto-login do Streamlit — uso restrito a ambiente local/desenvolvimento.

## 9. Tecnologias

| Camada       | Tecnologia                              | Versão        |
|--------------|-------------------------------------------|----------------|
| Frontend     | HTML5, CSS3, JavaScript ES2020             | —              |
| API          | Node.js · Express · Mongoose               | Express 5.2 · Mongoose 9.6 |
| Auth         | jsonwebtoken · bcryptjs                    | 9.0 · 3.0      |
| Config/CORS  | dotenv · cors                              | 17.4 · 2.8     |
| Dashboard    | Streamlit · Plotly · Pandas · Requests     | 1.38 · 5.24 · 2.2 · 2.32 |
| Banco        | MongoDB · Mongoose                         | — · 9.6        |

## 10. Como Executar

```bash
# Banco
mongod --dbpath ./data

# API + Frontend (a API serve o frontend estaticamente)
cd api
npm install
npm start                       # http://localhost:3000

# Dashboard (Tela 3 — Relatórios)
cd dashboard
pip install -r requirements.txt
streamlit run dashboard.py      # http://localhost:8501
```

Acesse `http://localhost:3000` (redireciona para a tela de login). A
Tela 3 ("Relatórios") embute automaticamente o dashboard Streamlit,
repassando o token de sessão.

## 11. Roadmap

- v2.2 — Refresh tokens e logout server-side (blacklist).
- v2.3 — Drag-and-drop nativo no quadro Kanban.
- v2.4 — Times e compartilhamento de tarefas (RBAC).
- v2.5 — Notificações por e-mail e webhooks.
- v3.0 — Versão SaaS multi-tenant com hospedagem em nuvem.
