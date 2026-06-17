# TaskInsight

**Versão:** 2.1
**Stack:** Node.js · Express 5 · MongoDB Atlas · JavaScript · Streamlit (Python)

Aplicação web de gestão de tarefas com quadro **Kanban**, **dashboard analítico** e isolamento total de dados por usuário (cada conta vê apenas suas próprias tarefas). Autenticação via **JWT**, senhas com **bcrypt** e persistência em **MongoDB Atlas**.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Fluxo do Usuário](#3-fluxo-do-usuário)
4. [Fluxo da Aplicação](#4-fluxo-da-aplicação)
5. [Estrutura de Pastas](#5-estrutura-de-pastas)
6. [Variáveis de Ambiente](#6-variáveis-de-ambiente)
7. [Como Executar](#7-como-executar)
8. [Endpoints da API](#8-endpoints-da-api)
9. [Modelos de Dados](#9-modelos-de-dados)
10. [Regras de Senha](#10-regras-de-senha)
11. [Autenticação — Fluxo JWT](#11-autenticação--fluxo-jwt)
12. [Segurança](#12-segurança)
13. [Tecnologias](#13-tecnologias)
14. [Roadmap](#14-roadmap)

---

## 1. Visão Geral

TaskInsight permite que cada usuário:

- **Cadastre-se** e faça **login** com e-mail e senha.
- **Crie, edite, mova e exclua tarefas** organizadas por categoria, prioridade e prazo.
- Acompanhe o trabalho em um **quadro Kanban** com quatro colunas (A Fazer · Em Progresso · Em Revisão · Concluído).
- Visualize **KPIs e gráficos** de produtividade no dashboard analítico (web e Streamlit).
- Gerencie o próprio **perfil** (nome, e-mail, troca de senha, exclusão de conta).

---

## 2. Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND — HTML5 + CSS3 + JS                            │
│  login/ · login cadastro/ · tela 1/ (Kanban)             │
│  tela 2/ (Analytics) · tela 3/ (Perfil)                  │
│  Servido pelo próprio Express (porta 3000)               │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP/JSON · Authorization: Bearer <JWT>
┌────────────────────────▼─────────────────────────────────┐
│  API REST — Node.js + Express 5                          │
│  Porta 3000 (configurável via .env)                      │
│  JWT · bcryptjs · mongoose · CORS · dotenv               │
└────────────────────────┬─────────────────────────────────┘
                         │ mongoose
┌────────────────────────▼─────────────────────────────────┐
│  MongoDB Atlas                                           │
│  Banco: taskInsight   Coleções: users · tasks            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  DASHBOARD ANALÍTICO — Python · Streamlit · Plotly       │
│  Porta 8501  ·  consome a API REST com JWT               │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Fluxo do Usuário

```
      ┌──────────────┐
      │   Acessa /   │
      └──────┬───────┘
             ▼
     ┌──────────────────┐    não tem conta    ┌─────────────────────┐
     │  Tela de Login   │ ──────────────────> │  Tela de Cadastro   │
     │                  │ <─────────┐         │                     │
     └──────┬───────────┘           │         └──────────┬──────────┘
            │ credenciais válidas   │                    │ cria conta
            ▼                       └────────────────────┘
     ┌──────────────────────────────────────────────────────────┐
     │   Tela 1 — Quadro Kanban                                 │
     │   • Visualiza KPIs (total, concluídas, progresso %)      │
     │   • Cria nova tarefa (categoria, prioridade, prazo)      │
     │   • Move tarefa entre colunas (a_fazer → concluido)      │
     │   • Edita / exclui tarefa                                │
     └──────┬───────────────────────────────────────────────────┘
            │                                     │
            ▼                                     │ 
   ┌────────────────────┐                         │
   │ Tela 2 — Analytics │                         │
   │ Gráficos por       │                         │
   │ status, categoria, │                         │ logout   
   │ prioridade e prazo │                         │
   └────────────────────┘                         │
            │ logout                              │
            ▼                                     │
    ┌──────────────┐                              │
    │    Login     │ <────────────────────────────┘
    └──────────────┘
```

**Jornada típica (happy path):**

1. Usuário abre `http://localhost:3000` → é redirecionado para o **Login**.
2. Clica em *Criar conta* → preenche **nome, e-mail, senha** (regras de senha validadas em tempo real).
3. Após cadastro, recebe o JWT e é direcionado direto para o **Kanban (tela 1)**.
4. Cria sua primeira tarefa pelo botão **+ Nova Tarefa**.
5. Move a tarefa entre colunas conforme avança o trabalho.
6. Abre o **Analytics (tela 2)** para acompanhar progresso e carga semanal.

---

## 4. Fluxo da Aplicação

### 4.1 Inicialização

```
server.js
  └─ carrega dotenv (.env)
      └─ conecta MongoDB (js/db.js → mongoose)
          └─ app.js registra middlewares + rotas + static
              └─ app.listen(PORT)
```

### 4.2 Ciclo de uma requisição autenticada

```
Frontend (routes/api.js)
  ├─ lê JWT do localStorage (ti_token)
  ├─ monta fetch com header Authorization: Bearer <token>
  ▼
Express (app.js)
  ├─ cors() · express.json()
  ├─ /api/auth/*   → authRoutes  (públicas)
  ├─ /api/users/*  → userRoutes  ┐
  ├─ /api/tasks/*  → taskRoutes  ├─ authMiddleware → req.usuario
  ▼
Controller (controllers/*.js)
  ├─ valida payload
  ├─ executa operação no Model (Mongoose)
  │     · queries SEMPRE filtradas por { usuario: req.usuario.id }
  ▼
MongoDB Atlas
  ├─ retorna documento(s)
  ▼
Controller → res.json(...)
  │
  ├─ erro? → next(err) → errorMiddleware → resposta padronizada
  ▼
Frontend renderiza (board.js / dashboard)
```

### 4.3 Criação de tarefa (exemplo end-to-end)

```
Usuário clica "+ Nova Tarefa"
  → board.js coleta dados do formulário
  → api.js: POST /api/tasks  { tarefa, categoria, prioridade, ... }
      Authorization: Bearer <JWT>
  → authMiddleware valida token → req.usuario = { id, email }
  → taskController.criar()
      · cria Task com usuario = req.usuario.id
      · Mongoose persiste no MongoDB
  → 201 Created { task }
  → board.js insere card na coluna correspondente e atualiza KPIs
```

### 4.4 Tratamento de erros

```
Qualquer throw / next(err)
  → errorMiddleware
      · Mongoose ValidationError → 400 + { campo: mensagem }
      · CastError (id inválido)  → 400
      · Duplicate key (11000)    → 409 (e-mail já cadastrado)
      · JsonWebTokenError        → 401
      · TokenExpiredError        → 401 (frontend redireciona p/ login)
      · Demais erros             → 500
```

---

## 5. Estrutura de Pastas

```
taskInsight/
├── api/
│   ├── .env                          # Variáveis de ambiente
│   └── src/
│       ├── app.js                    # Express + middlewares + static
│       ├── server.js                 # Entry point (dotenv + listen)
│       ├── controllers/
│       │   ├── authController.js     # Cadastro e login
│       │   ├── taskController.js     # CRUD de tarefas + analytics
│       │   └── userController.js     # Perfil e senha (sem tela de configuração)
│       ├── middlewares/
│       │   ├── authMiddleware.js     # Valida JWT → req.usuario
│       │   └── errorMiddleware.js    # Handler de erros
│       ├── models/
│       │   ├── user.js               # Schema User
│       │   └── tasks.js              # Schema Task
│       └── routes/
│           ├── authRoutes.js         # POST /api/auth/*
│           ├── userRoutes.js         # /api/users/me
│           └── taskRoutes.js         # /api/tasks + analytics
├── js/
│   └── db.js                         # Conexão MongoDB (mongoose)
├── frontend/
│   ├── routes/
│   │   ├── api.js                    # Wrapper fetch + sessão
│   │   ├── auth.js                   # bindLogin / bindRegister
│   │   └── board.js                  # Kanban + KPIs + nova tarefa
│   ├── login/                        # Tela de login
│   ├── login cadastro/               # Tela de cadastro
│   ├── tela 1/                       # Quadro Kanban
│   ├── tela 2/                       # Dashboard Analytics
│                    
├── dashboard/
│   ├── dashboard.py                  # Dashboard Streamlit
│   └── requirements.txt
├── package.json
└── README.md
```

---

## 6. Variáveis de Ambiente

Arquivo `api/.env`:

| Variável         | Descrição                                | Exemplo                                                     |
|------------------|------------------------------------------|-------------------------------------------------------------|
| `MONGODB_URI`    | URI MongoDB Atlas ou local               | `mongodb+srv://user:pass@cluster.mongodb.net/taskInsight`   |
| `JWT_SECRET`     | Segredo para assinatura dos tokens JWT   | string longa e aleatória                                    |
| `JWT_EXPIRES_IN` | Tempo de expiração do token              | `1d`                                                        |
| `PORT`           | Porta do servidor Express                | `3000`                                                      |
| `FRONTEND_URL`   | Origem permitida no CORS (produção)      | `https://meusite.com`                                       |

---

## 7. Como Executar

### Pré-requisitos
- **Node.js v18+**
- **Python 3.11+** (apenas para o dashboard Streamlit)
- Conta no **MongoDB Atlas** (ou MongoDB local)

### API + Frontend (Terminal 1)

```bash
# na raiz do projeto
yarn install
yarn dev
```

Acesse **http://localhost:3000** — o servidor redireciona automaticamente para a tela de login.

### Dashboard Streamlit (Terminal 2)

```bash
cd dashboard
pip install -r requirements.txt (Python 3.12 - necessário ter a versão rodando ou um ambiente python / Streamlit 1.58 - necessário upgrade após baixar os requirements)
streamlit run dashboard.py
```

Acesse **http://localhost:8501**.

---

## 8. Endpoints da API

Todas as rotas autenticadas exigem o header:

```
Authorization: Bearer <token>
```

### 8.1 Autenticação

| Método | Rota                  | Auth | Descrição          |
|--------|-----------------------|------|--------------------|
| POST   | `/api/auth/cadastro`  | —    | Criar conta        |
| POST   | `/api/auth/login`     | —    | Login → retorna JWT |

**POST `/api/auth/cadastro`**
```json
// Request
{ "nome": "Maria Silva", "email": "maria@email.com", "senha": "Senha@123" }

// Response 201
{
  "token": "<jwt>",
  "usuario": { "id": "...", "nome": "Maria Silva", "email": "maria@email.com" }
}
```

**POST `/api/auth/login`**
```json
// Request
{ "email": "maria@email.com", "senha": "Senha@123" }

// Response 200
{
  "token": "<jwt>",
  "usuario": { "id": "...", "nome": "Maria Silva", "email": "maria@email.com" }
}
```

### 8.2 Usuário

| Método | Rota                  | Auth | Descrição              |
|--------|-----------------------|------|------------------------|
| GET    | `/api/users/me`       | JWT  | Dados do perfil        |
| PATCH  | `/api/users/me`       | JWT  | Atualizar nome / e-mail |
| PATCH  | `/api/users/me/senha` | JWT  | Trocar senha           |
| DELETE | `/api/users/me`       | JWT  | Excluir conta          |

### 8.3 Tarefas

| Método | Rota                             | Auth | Descrição                       |
|--------|----------------------------------|------|---------------------------------|
| GET    | `/api/tasks`                     | JWT  | Listar tarefas (com filtros)    |
| POST   | `/api/tasks`                     | JWT  | Criar tarefa (necessário Token) |
| GET    | `/api/tasks/:id`                 | JWT  | Buscar tarefa por ID            |
| PATCH  | `/api/tasks/:id`                 | JWT  | Atualizar tarefa                |
| PATCH  | `/api/tasks/:id/status`          | JWT  | Atualizar apenas o status       |
| DELETE | `/api/tasks/:id`                 | JWT  | Excluir tarefa                  |
| GET    | `/api/tasks/analytics/resumo`    | JWT  | Dados agregados para dashboard  |

**Filtros suportados em `GET /api/tasks`:**
```
?status=a_fazer&categoria=Cursos&prioridade=alta
```

**POST `/api/tasks`**
```json
{
  "tarefa": "Implementar autenticação",
  "descricao": "JWT com bcrypt",
  "categoria": "Escrevendo Código",
  "status": "a_fazer",
  "prioridade": "alta",
  "tempo_gasto": 0,
  "data_limite": "2026-06-30"
}
```

**GET `/api/tasks/analytics/resumo`**
```json
{
  "progresso": 65,
  "total": 20,
  "concluidas": 13,
  "por_status":     [ { "_id": "a_fazer", "count": 4 } ],
  "por_categoria":  [ { "_id": "Escrevendo Código", "count": 8, "tempo_total": 24 } ],
  "por_prioridade": [ { "_id": "alta", "count": 6 } ],
  "proximas_entregas": [ ],
  "carga_semanal": 12
}
```

### 8.4 Health Check

| Método | Rota          | Auth | Descrição          |
|--------|---------------|------|--------------------|
| GET    | `/api/health` | —    | Status do servidor |

---

## 9. Modelos de Dados

### User
```
nome         String   obrigatório
email        String   único, lowercase
senha        String   bcrypt hash · select:false · mín. 8 caracteres
createdAt    Date     automático
updatedAt    Date     automático
```

### Task
```
usuario      ObjectId ref: User · obrigatório · index
tarefa       String   obrigatório
descricao    String   default: ''
categoria    Enum     'Escrevendo Código' | 'Cursos' | 'Debugging' | 'Outras Demandas'
status       Enum     'a_fazer' | 'em_progresso' | 'em_revisao' | 'concluido'
prioridade   Enum     'alta' | 'media' | 'baixa'
tempo_gasto  Number   horas · default: 0
data_limite  Date     opcional
createdAt    Date     automático
updatedAt    Date     automático
```

---

## 10. Regras de Senha

| Regra                              |
|------------------------------------|
| Mínimo de 8 caracteres             |
| Pelo menos uma letra **maiúscula** |
| Pelo menos um **número**           |
| Pelo menos um **caractere especial** |

Validação aplicada no **frontend** (feedback imediato) e no **backend** (fonte de verdade).

---

## 11. Autenticação — Fluxo JWT

```
1. POST /api/auth/login  { email, senha }
2. API valida bcrypt → assina JWT (HS256, 1 dia)
3. Frontend salva em localStorage:
     ti_token  →  string JWT
     ti_user   →  { id, nome, email }
4. Toda requisição subsequente envia:
     Authorization: Bearer <ti_token>
5. authMiddleware valida o token → popula req.usuario
6. Token expirado ou inválido → 401 → frontend redireciona para /login
```

---

## 12. Segurança

- Senhas com **bcrypt** (cost 12) — nunca retornadas pela API (`select: false`).
- JWT **HS256** com segredo via variável de ambiente.
- **Isolamento total por usuário** em todas as queries de tarefas (`{ usuario: req.usuario.id }`).
- Middleware de erro trata duplicatas (`11000`), `CastError` e `ValidationError`.
- **CORS** configurável via `FRONTEND_URL` no `.env`.
- Validação de entrada em todos os controllers antes de tocar o banco.

---

## 13. Tecnologias

| Camada         | Tecnologia                    | Versão           |
|----------------|-------------------------------|------------------|
| Runtime        | Node.js                       | v18+             |
| Framework API  | Express                       | 5.x              |
| ODM            | Mongoose                      | 8.x              |
| Auth           | jsonwebtoken · bcryptjs       | 9.x · 3.x        |
| Config         | dotenv                        | 17.x             |
| Banco          | MongoDB Atlas                 | 6+               |
| Dashboard      | Streamlit · Plotly · Pandas   | 1.58 · 5 · 2.2   |
| Frontend       | HTML5 · CSS3 · JS             | —                |
| Dev            | nodemon                       | 3.x              |

---

## 14. Roadmap

- **v2.1** — Conectar `tela 2` ao endpoint `/api/tasks/analytics/resumo` (substituir MOCK).
- **v2.2** — Drag-and-drop nativo no Kanban.
- **v2.3** — Refresh tokens (expiração renovável sem novo login).
- **v3.0** — Times e compartilhamento de tarefas (RBAC).
