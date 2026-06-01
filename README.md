# TaskInsight

Aplicação web de produtividade em **arquitetura 3 camadas**, executável no sistema operacional (desktop/servidor local), inspirada nas telas de referência (Login, Cadastro, Quadro de Tarefas e Dashboard de Analytics).

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  CAMADA DE APRESENTAÇÃO (Frontend)                          │
│  HTML5 + CSS3 + JavaScript (Vanilla)                        │
│  Servida via http.server na porta 8080                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS/JSON + JWT Bearer
┌──────────────────────────▼──────────────────────────────────┐
│  CAMADA DE APLICAÇÃO (API REST)                             │
│  Python + Flask + PyJWT + bcrypt                            │
│  Porta 5000                                                 │
│  - Autenticação JWT (login/registro/refresh)                │
│  - CRUD de tarefas, categorias                              │
│  - Endpoints de métricas para o dashboard                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ PyMongo
┌──────────────────────────▼──────────────────────────────────┐
│  CAMADA DE DADOS                                            │
│  MongoDB 6+ (coleções: users, tasks, categories)            │
└─────────────────────────────────────────────────────────────┘

  Dashboard Analítico (Python / Streamlit) — porta 8501
  Consome a mesma API REST autenticando via JWT.
```

## Stack

| Camada       | Tecnologia                                    |
|--------------|-----------------------------------------------|
| Frontend     | HTML, CSS, JavaScript puro                    |
| API          | Python 3.11, Flask, Flask-CORS, PyJWT, bcrypt |
| Dashboard    | Python, Streamlit, Plotly, Pandas             |
| Banco        | MongoDB (PyMongo)                             |

## Como executar (local)

Pré-requisitos: Python 3.11+, MongoDB rodando em `mongodb://localhost:27017`.

```bash
# 1. Dependências
pip install -r api/requirements.txt
pip install -r dashboard/requirements.txt

# 2. API (porta 5000)
cd api && python app.py

# 3. Frontend (porta 8080)
cd frontend && python -m http.server 8080
# acesse http://localhost:8080

# 4. Dashboard (porta 8501)
cd dashboard && streamlit run dashboard.py
```

## Documentação

Veja [`docs/REQUISITOS.md`](docs/REQUISITOS.md) para o documento completo de requisitos e arquitetura.

## Estrutura

```
taskinsight/
├── frontend/         # HTML/CSS/JS (apresentação)
│   ├── index.html        # Login
│   ├── cadastro.html     # Cadastro
│   ├── app.html          # Quadro de tarefas
│   ├── css/styles.css
│   └── js/{api.js,auth.js,board.js}
├── api/              # Flask + JWT (aplicação)
│   ├── app.py
│   ├── auth.py
│   ├── routes.py
│   ├── db.py
│   └── requirements.txt
├── dashboard/        # Streamlit (analytics)
│   ├── dashboard.py
│   └── requirements.txt
└── docs/
    └── REQUISITOS.md
```
oi