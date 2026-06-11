# TaskInsight — Documentação Técnica

**Versão:** 2.0  
**Stack:** Node.js · Express · MongoDB Atlas · Streamlit  

---

## 1. Visão Geral

TaskInsight é uma aplicação web de gestão de tarefas com quadro Kanban e dashboard analítico. Os dados são isolados por usuário (cada um vê apenas suas próprias tarefas), autenticação via JWT e persistência em MongoDB Atlas.

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────┐
│  FRONTEND — HTML5 + CSS3 + JS Vanilla       │
│  login/  · login cadastro/  · tela 1/  · tela 2/  │
│  Servido pelo próprio Express (porta 3000)  │
└───────────────────┬─────────────────────────┘
                    │ HTTP/JSON · Authorization: Bearer <JWT>
┌───────────────────▼─────────────────────────┐
│  API REST — Node.js · Express 5             │
│  Porta: 3000 (configurável via .env)        │
│  JWT · bcryptjs · mongoose                  │
└───────────────────┬─────────────────────────┘
                    │ mongoose (driver oficial)
┌───────────────────▼─────────────────────────┐
│  MongoDB Atlas                              │
│  Banco: taskInsight                         │
│  Coleções: users · tasks                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  DASHBOARD ANALÍTICO — Python · Streamlit   │
│  Porta: 8501                                │
│  Consome a API REST via JWT                 │
└─────────────────────────────────────────────┘
```

---

## 3. Estrutura de Pastas

```
taskInsight/
├── api/
│   ├── .env                        # Variáveis de ambiente
│   └── src/
│       ├── app.js                  # Configuração Express + middlewares + static
│       ├── server.js               # Entry point (dotenv + listen)
│       ├── controllers/
│       │   ├── authController.js   # Cadastro e login
│       │   ├── taskController.js   # CRUD de tarefas + analytics
│       │   └── userController.js   # Perfil e senha
│       ├── middlewares/
│       │   ├── authMiddleware.js   # Validação JWT → req.usuario
│       │   └── errorMiddleware.js  # Handler de erros Mongoose/JWT
│       ├── models/
│       │   ├── user.js             # Schema User (nome, email, senha)
│       │   └── tasks.js            # Schema Task (tarefa, status, prioridade...)
│       └── routes/
│           ├── authRoutes.js       # POST /api/auth/*
│           ├── userRoutes.js       # GET|PATCH|DELETE /api/users/me
│           └── taskRoutes.js       # CRUD /api/tasks + analytics
├── js/
│   └── db.js                       # Conexão MongoDB (mongoose)
├── frontend/
│   ├── routes/
│   │   ├── api.js                  # Wrapper fetch + gestão de sessão
│   │   ├── auth.js                 # bindLogin / bindRegister
│   │   └── board.js                # Kanban + KPIs + nova tarefa
│   ├── login/                      # Tela de login
│   ├── login cadastro/             # Tela de cadastro
│   ├── tela 1/                     # Quadro Kanban
│   └── tela 2/                     # Dashboard de Analytics
├── dashboard/
│   ├── dashboard.py                # Dashboard Streamlit
│   └── requirements.txt
├── docs/                           # Esta documentação
└── taskInsight_vb/
    ├── index.js                    # Entry point do projeto
    └── package.json                # Dependências Node.js
```

---

## 4. Variáveis de Ambiente (`api/.env`)

| Variável       | Descrição                              | Exemplo |
|----------------|----------------------------------------|---------|
| `MONGODB_URI`  | URI de conexão MongoDB Atlas ou local  | `mongodb+srv://user:pass@cluster.mongodb.net/taskInsight` |
| `JWT_SECRET`   | Segredo para assinatura dos tokens JWT | string longa e aleatória |
| `PORT`         | Porta do servidor Express              | `3000` |
| `JWT_EXPIRES_IN` | Tempo de expiração do token          | `1d` |
| `FRONTEND_URL` | Origem permitida no CORS (produção)    | `https://meusite.com` |

---

## 5. Como Executar

### Pré-requisitos
- Node.js v18+
- Python 3.11+ (apenas para o dashboard Streamlit)
- Conta no MongoDB Atlas (ou MongoDB local)

### API + Frontend

```bash
cd /Users/bgma/taskInsight/taskInsight_vb
npm install
npm run dev
```

Acesse `http://localhost:3000` — redireciona automaticamente para o login.

### Dashboard Streamlit (opcional)

```bash
cd /Users/bgma/taskInsight/dashboard
pip install -r requirements.txt
streamlit run dashboard.py
```

Acesse `http://localhost:8501`.

---

## 6. Endpoints da API

Todas as rotas autenticadas exigem o header:
```
Authorization: Bearer <token>
```

### Autenticação

| Método | Rota                   | Auth | Descrição         |
|--------|------------------------|------|-------------------|
| POST   | `/api/auth/cadastro`   | —    | Criar conta       |
| POST   | `/api/auth/login`      | —    | Login → JWT       |

**POST `/api/auth/cadastro`**
```json
// Request
{ "nome": "Maria Silva", "email": "maria@email.com", "senha": "Senha@123" }

// Response 201
{ "token": "<jwt>", "usuario": { "id": "...", "nome": "Maria Silva", "email": "maria@email.com" } }
```

**POST `/api/auth/login`**
```json
// Request
{ "email": "maria@email.com", "senha": "Senha@123" }

// Response 200
{ "token": "<jwt>", "usuario": { "id": "...", "nome": "Maria Silva", "email": "maria@email.com" } }
```

### Usuário

| Método | Rota                    | Auth | Descrição              |
|--------|-------------------------|------|------------------------|
| GET    | `/api/users/me`         | JWT  | Dados do perfil        |
| PATCH  | `/api/users/me`         | JWT  | Atualizar nome/email   |
| PATCH  | `/api/users/me/senha`   | JWT  | Trocar senha           |
| DELETE | `/api/users/me`         | JWT  | Excluir conta          |

### Tarefas

| Método | Rota                            | Auth | Descrição                    |
|--------|---------------------------------|------|------------------------------|
| GET    | `/api/tasks`                    | JWT  | Listar tarefas (com filtros) |
| POST   | `/api/tasks`                    | JWT  | Criar tarefa                 |
| GET    | `/api/tasks/:id`                | JWT  | Buscar tarefa por ID         |
| PATCH  | `/api/tasks/:id`                | JWT  | Atualizar tarefa             |
| PATCH  | `/api/tasks/:id/status`         | JWT  | Atualizar só o status        |
| DELETE | `/api/tasks/:id`                | JWT  | Excluir tarefa               |
| GET    | `/api/tasks/analytics/resumo`   | JWT  | Dados agregados p/ dashboard |

**Filtros GET `/api/tasks`:** `?status=a_fazer&categoria=Cursos&prioridade=alta`

**POST `/api/tasks`**
```json
// Request
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
// Response 200
{
  "progresso": 65,
  "total": 20,
  "concluidas": 13,
  "por_status": [
    { "_id": "a_fazer", "count": 4 },
    { "_id": "em_progresso", "count": 2 },
    { "_id": "concluido", "count": 13 }
  ],
  "por_categoria": [
    { "_id": "Escrevendo Código", "count": 8, "tempo_total": 24 }
  ],
  "por_prioridade": [
    { "_id": "alta", "count": 6 }
  ],
  "proximas_entregas": [...],
  "carga_semanal": 12
}
```

### Health Check

| Método | Rota          | Auth | Descrição         |
|--------|---------------|------|-------------------|
| GET    | `/api/health` | —    | Status do servidor |

---

## 7. Modelos de Dados

### User
```
nome         String   obrigatório
email        String   único, lowercase
senha        String   bcrypt hash, select:false, mín. 8 chars
createdAt    Date     automático
updatedAt    Date     automático
```

### Task
```
usuario      ObjectId ref: User, obrigatório
tarefa       String   obrigatório
descricao    String   default: ''
categoria    Enum     'Escrevendo Código' | 'Cursos' | 'Debugging' | 'Outras Demandas'
status       Enum     'a_fazer' | 'em_progresso' | 'em_revisao' | 'concluido'
prioridade   Enum     'alta' | 'media' | 'baixa'
tempo_gasto  Number   horas, default: 0
data_limite  Date     opcional
createdAt    Date     automático
updatedAt    Date     automático
```

---

## 8. Regras de Senha

| Regra                         |
|-------------------------------|
| Mínimo 8 caracteres           |
| Pelo menos uma letra maiúscula |
| Pelo menos um número          |
| Pelo menos um caractere especial |

Validação aplicada no frontend (imediata) e no backend (fonte de verdade).

---

## 9. Autenticação — Fluxo JWT

```
1. POST /api/auth/login  { email, senha }
2. API valida bcrypt → assina JWT (HS256, 1 dia)
3. Frontend salva em localStorage:
     ti_token  →  string JWT
     ti_user   →  { id, nome, email }
4. Toda requisição subsequente envia:
     Authorization: Bearer <ti_token>
5. authMiddleware.js valida o token → popula req.usuario
6. Token expirado ou inválido → 401 → frontend redireciona para login
```

---

## 10. Segurança

- Senhas com **bcrypt** (cost 12), nunca retornadas na API (`select: false`)
- JWT **HS256** com segredo via variável de ambiente
- Isolamento total por `usuario` em todas as queries de tarefas
- Middleware de erro trata duplicatas (11000), CastError, ValidationError
- CORS configurável via `FRONTEND_URL` no `.env`

---

## 11. Tecnologias

| Camada        | Tecnologia                   | Versão   |
|---------------|------------------------------|----------|
| Runtime       | Node.js                      | v26      |
| Framework API | Express                      | 5.x      |
| ODM           | Mongoose                     | 8.x      |
| Auth          | jsonwebtoken · bcryptjs       | 9.x · 3.x |
| Config        | dotenv                       | 17.x     |
| Banco         | MongoDB Atlas                | 6+       |
| Dashboard     | Streamlit · Plotly · Pandas  | 1.38 · 5 · 2.2 |
| Frontend      | HTML5 · CSS3 · JS Vanilla    | —        |

---

## 12. Roadmap

- **v2.1** — Conectar `tela 2` ao endpoint `/api/tasks/analytics/resumo` (substituir MOCK)
- **v2.2** — Drag-and-drop nativo no Kanban
- **v2.3** — Refresh tokens (expiração renovável sem novo login)
- **v3.0** — Times e compartilhamento de tarefas (RBAC)
