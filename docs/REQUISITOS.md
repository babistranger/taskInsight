# TaskInsight — Documento de Requisitos e Arquitetura

**Versão:** 1.0  
**Data:** 2026-05-28  
**Autor:** Squad 5 TaskInsight

---

## 1. Visão Geral

TaskInsight é uma aplicação web de gestão de tarefas com foco em **clareza cognitiva** e **simplicidade visual**. Permite que usuários organizem tarefas em um quadro Kanban e acompanhem métricas de produtividade em um dashboard analítico.

A aplicação é desenhada para execução **local no sistema operacional** (Windows/macOS/Linux), seguindo uma arquitetura clássica em **3 camadas** desacopladas.

## 2. Objetivos

- Cadastrar e autenticar usuários com segurança (JWT).
- Permitir CRUD de tarefas com status, prioridade e categoria.
- Exibir o quadro Kanban com 4 colunas (A Fazer, Em Progresso, Em Revisão, Concluído).
- Apresentar dashboard analítico com KPIs e gráficos de evolução.

## 3. Requisitos Funcionais

| ID    | Descrição |
|-------|-----------|
| RF01  | O sistema deve permitir cadastro com nome, e-mail e senha (mín. 8 caracteres). |
| RF02  | O sistema deve autenticar via e-mail + senha emitindo um token JWT (HS256, 12 h). |
| RF03  | O usuário autenticado deve poder criar, editar, excluir e listar suas próprias tarefas. |
| RF04  | Tarefas têm os atributos: título, descrição, prioridade (baixa/média/alta), status, categoria, data de criação. |
| RF05  | O quadro deve agrupar tarefas pelas 4 colunas de status. |
| RF06  | O dashboard deve exibir: total por status, taxa de conclusão, distribuição por prioridade e histórico recente. |
| RF07  | O sistema deve isolar dados por usuário (cada usuário só vê suas tarefas). |
| RF08  | O sistema deve permitir logout (descarte do token no cliente). |

## 4. Requisitos Não Funcionais

| ID     | Descrição |
|--------|-----------|
| RNF01  | Senhas armazenadas com hash **bcrypt** (cost ≥ 12). |
| RNF02  | Comunicação cliente↔API em JSON via HTTP, autenticada por **Bearer JWT**. |
| RNF03  | API deve responder em < 300 ms para 95% das requisições em carga local. |
| RNF04  | Interface responsiva (mínimo 768 px). |
| RNF05  | Código organizado em camadas claramente separadas (apresentação, aplicação, dados). |
| RNF06  | Banco MongoDB deve possuir índices em `users.email` (unique) e `tasks.user_id`. |
| RNF07  | CORS habilitado apenas para origens autorizadas em produção. |

## 5. Arquitetura

### 5.1 Visão em 3 camadas

```
┌──────────────────────────────────────────────────────────────┐
│ CAMADA 1 — APRESENTAÇÃO (Frontend)                           │
│ HTML5 + CSS3 + JavaScript Vanilla                            │
│ Servida via http.server (porta 8080)                         │
│ Responsável por UI, validação básica e armazenamento do JWT  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP/JSON  +  Authorization: Bearer
┌─────────────────────────▼────────────────────────────────────┐
│ CAMADA 2 — APLICAÇÃO (API REST)                              │
│ Python 3.11 + Flask + Flask-CORS                             │
│ PyJWT (HS256) · bcrypt · regras de negócio                   │
│ Porta 3000                                                   │
└─────────────────────────┬────────────────────────────────────┘
                          │ PyMongo (driver oficial)
┌─────────────────────────▼────────────────────────────────────┐
│ CAMADA 3 — DADOS                                             │
│ MongoDB 6+ — coleções: users, tasks, categories              │
└──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │ Dashboard Analítico (Streamlit)      │
  │ Python · Plotly · Pandas             │
  │ Porta 8501 — consome API via JWT     │
  └──────────────────────────────────────┘
```

### 5.2 Componentes

**Frontend (`/frontend`)**
- `index.html` — Login.
- `cadastro.html` — Registro.
- `app.html` — Quadro Kanban + KPIs.
- `css/styles.css` — Design system (paleta laranja `#f97316`, fundo creme `#fdfaf5`).
- `js/api.js` — wrapper fetch + gestão do JWT em `localStorage`.
- `js/auth.js`, `js/board.js` — fluxos de tela.

**API (`/api`)**
- `app.py` — bootstrap Flask, CORS, health-check.
- `auth.py` — bcrypt, emissão/validação JWT, decorator `@jwt_required`.
- `routes.py` — Blueprint com endpoints REST.
- `db.py` — conexão MongoDB e criação de índices.

**Dashboard (`/dashboard`)**
- `dashboard.py` — Streamlit consumindo a API; gráficos com Plotly.

**Banco (MongoDB)**
- `users {_id, name, email (unique), password_hash, created_at}`
- `tasks {_id, user_id, title, description, priority, status, category, due_date, created_at}`

### 5.3 Fluxo de autenticação JWT

```
Cliente ─POST /auth/login {email,senha}──► API
API: verifica bcrypt → emite JWT (HS256, exp 12h) ──► Cliente
Cliente armazena token em localStorage
Toda requisição subsequente envia: Authorization: Bearer <token>
API decodifica e valida; injeta user_id no contexto da request
```

## 6. Endpoints da API

| Método | Rota                    | Auth | Descrição                            |
|--------|-------------------------|------|--------------------------------------|
| POST   | `/auth/register`        | —    | Cadastro de usuário                  |
| POST   | `/auth/login`           | —    | Login → retorna JWT                  |
| GET    | `/auth/me`              | JWT  | Dados do usuário autenticado         |
| GET    | `/tasks`                | JWT  | Lista tarefas do usuário             |
| POST   | `/tasks`                | JWT  | Cria tarefa                          |
| PATCH  | `/tasks/<id>`           | JWT  | Atualiza tarefa                      |
| DELETE | `/tasks/<id>`           | JWT  | Exclui tarefa                        |
| GET    | `/metrics/summary`      | JWT  | KPIs agregados                       |
| GET    | `/health`               | —    | Health-check                         |

## 7. Modelo de Dados (MongoDB)

```json
// users
{ "_id": ObjectId, "name": "Maria", "email": "maria@x.com",
  "password_hash": "<bcrypt>", "created_at": ISODate }

// tasks
{ "_id": ObjectId, "user_id": "65a...", "title": "Redesign Landing",
  "description": "...", "priority": "alta",
  "status": "a_fazer | em_progresso | em_revisao | concluido",
  "category": "Marketing", "due_date": "2026-06-10", "created_at": ISODate }
```

Índices: `users.email (unique)`, `tasks.user_id`, `tasks.status`.

## 8. Segurança

- Senhas: **bcrypt** com salt automático.
- Tokens: **JWT HS256**, segredo via variável de ambiente `JWT_SECRET`.
- Expiração de 12 h; cliente faz logout ao receber 401.
- Validação de entrada (tamanho mínimo de senha, status enumerado).
- CORS controlado em `app.py` (ajustar para domínio em produção).
- Isolamento por `user_id` em todas as queries de tarefas.

## 9. Tecnologias

| Camada       | Tecnologia                          | Versão  |
|--------------|-------------------------------------|---------|
| Frontend     | HTML5, CSS3, JavaScript ES2020      | —       |
| API          | Python · Flask · Flask-CORS         | 3.11 · 3.0 |
| Auth         | PyJWT · bcrypt                       | 2.9 · 4.2 |
| Dashboard    | Streamlit · Plotly · Pandas         | 1.38 · 5 · 2.2 |
| Banco        | MongoDB · PyMongo                    | 6 · 4.8 |

## 10. Como Executar

```bash
# Banco
mongod --dbpath ./data

# API
pip install -r api/requirements.txt
cd api && python app.py            # http://localhost:3000

# Frontend
cd frontend && python -m http.server 8080   # http://localhost:8080

# Dashboard
pip install -r dashboard/requirements.txt
cd dashboard && streamlit run dashboard.py  # http://localhost:8501
```

## 11. Roadmap

- v1.1 — Refresh tokens e logout server-side (blacklist).
- v1.2 — Drag-and-drop nativo no quadro.
- v1.3 — Times e compartilhamento de tarefas (RBAC).
- v1.4 — Notificações por e-mail e webhooks.
- v2.0 — Versão SaaS multi-tenant com hospedagem em nuvem.
