# TaskInsight — Versão Comentada (guia de integração com o Back-end)

Esta pasta contém os módulos do front-end do TaskInsight, com **comentários
explicativos em português** indicando, em cada ponto, **o que vem da API** e
**onde colocar cada dado retornado pelo back-end**.

## Estrutura

```
login/             -> Tela de login              (POST /api/auth/login)
login cadastro/    -> Tela de cadastro           (POST /api/auth/cadastro)
tela 1/            -> Quadro de Tarefas (Kanban) (GET/POST/PATCH/DELETE /api/tasks)
tela 2/            -> Gráficos e Analytics       (GET /api/tasks/analytics/resumo)
tela 3/            -> Relatórios                 (iframe com dashboard Streamlit)
assets/            -> ícones e imagens compartilhadas
routes/            -> páginas auxiliares de roteamento
```

## Configuração da API

Em **todos** os arquivos `script.js` (telas 1, 2, 3, login e cadastro)
existe no topo:

```js
const API_BASE = "http://localhost:3000";
```

Por padrão a própria API (Express) já serve o front-end estaticamente nessa
mesma porta, então normalmente não é preciso alterar essa constante. Caso o
front seja servido separadamente, troque `API_BASE` pela URL real do back-end.

## Autenticação

Após login/cadastro bem-sucedido, o front guarda no `localStorage`:

| Chave         | Conteúdo                                            |
|---------------|------------------------------------------------------|
| `ti_token`    | JWT (string) retornado por `/api/auth/login` ou `/api/auth/cadastro` |
| `ti_user`     | Objeto JSON `{ id, nome, email }`                    |

Todas as chamadas autenticadas enviam:

```
Authorization: Bearer <ti_token>
```

Se a API responder `401`, o front deve limpar `ti_token`/`ti_user` e
redirecionar para `login/index.html`.

## Contratos da API

### POST /api/auth/cadastro
Request:
```json
{ "nome": "Ricardo Silva", "email": "ricardo@exemplo.com", "senha": "Senha@123" }
```
Regras de senha: mínimo 8 caracteres, pelo menos 1 letra maiúscula, 1 número
e 1 caractere especial.

Response 201:
```json
{
  "token": "jwt...",
  "usuario": { "id": "65a...", "nome": "Ricardo Silva", "email": "ricardo@exemplo.com" }
}
```
Erros: `400` (campos faltando / senha fraca), `409` (e-mail já cadastrado).

### POST /api/auth/login
Request:
```json
{ "email": "ricardo@exemplo.com", "senha": "Senha@123" }
```
Regras de senha: mínimo 8 caracteres, ao menos 1 maiúscula, 1 número e
1 caractere especial.

Response 201:
```json
{
  "token": "jwt...",
  "usuario": { "id": "65a...", "nome": "Ricardo Silva", "email": "ricardo@exemplo.com" }
}
```
Erros: `400` (campos faltando), `401` (credenciais inválidas).

### GET /api/users/me  (autenticado)
Response 200 — dados do usuário logado (usado pelo dashboard Streamlit para
validar o token recebido via `?token=`):
```json
{ "id": "65a...", "nome": "Ricardo Silva", "email": "ricardo@exemplo.com" }
```

Outros endpoints de usuário (autenticados):
- `PATCH /api/users/me` — atualiza nome/e-mail.
- `PATCH /api/users/me/senha` — troca de senha.
- `DELETE /api/users/me` — exclui a conta.

### GET /api/tasks  (tela 1, tela 2 e tela 3/dashboard)
Query params opcionais: `status`, `categoria`, `prioridade`.

Response 200 — array de tarefas:
```json
[
  {
    "_id": "65b...",
    "usuario": "65a...",
    "tarefa": "Refatorar autenticação",
    "descricao": "Migrar para JWT com expiração configurável",
    "categoria": "Escrevendo Código",
    "status": "em_progresso",
    "prioridade": "alta",
    "tempo_gasto": 3.5,
    "data_limite": "2026-06-15T00:00:00.000Z",
    "createdAt": "2026-06-01T12:00:00.000Z",
    "updatedAt": "2026-06-09T08:30:00.000Z"
  }
]
```

Valores possíveis:
- `categoria`: `"Escrevendo Código" | "Cursos" | "Debugging" | "Outras Demandas"`
- `status`: `"a_fazer" | "em_progresso" | "em_revisao" | "concluido"`
- `prioridade`: `"alta" | "media" | "baixa"`
- `tempo_gasto`: número (horas), padrão `0`
- `data_limite`: data ISO ou `null`

### POST /api/tasks  (criar tarefa)
Request — apenas `tarefa` é obrigatório, demais campos têm default:
```json
{
  "tarefa": "Nova tarefa",
  "descricao": "",
  "categoria": "Outras Demandas",
  "status": "a_fazer",
  "prioridade": "media",
  "tempo_gasto": 0,
  "data_limite": null
}
```
Response 201: a tarefa criada (mesmo formato do `GET /api/tasks`).

### GET /api/tasks/:id, PATCH /api/tasks/:id, DELETE /api/tasks/:id
- `GET` retorna a tarefa.
- `PATCH` aceita qualquer subconjunto de `tarefa, descricao, categoria, status, prioridade, tempo_gasto, data_limite`.
- `DELETE` retorna `{ "mensagem": "Tarefa removida com sucesso." }`.

### PATCH /api/tasks/:id/status  (mover card no Kanban)
Request:
```json
{ "status": "em_progresso" }
```
`status` deve ser um dos 4 valores válidos.

### GET /api/tasks/analytics/resumo  (tela 2)
Query param opcional: `periodo` = `diario | semanal | mensal` (padrão `semanal`).
Afeta apenas o campo `distribuicao`.

Response 200:
```json
{
  "progresso": 84,
  "total": 25,
  "concluidas": 21,
  "por_status": [
    { "_id": "a_fazer", "count": 2 },
    { "_id": "em_progresso", "count": 1 },
    { "_id": "em_revisao", "count": 1 },
    { "_id": "concluido", "count": 21 }
  ],
  "por_categoria": [
    { "_id": "Escrevendo Código", "count": 10, "tempo_total": 32 }
  ],
  "por_prioridade": [
    { "_id": "alta", "count": 5, "tempo_total": 18 }
  ],
  "por_categoria_prioridade": [
    { "_id": { "categoria": "Escrevendo Código", "prioridade": "alta" }, "count": 3, "tempo_total": 12 }
  ],
  "proximas_entregas": [
    { "_id": "65b...", "tarefa": "Revisar PR", "data_limite": "2026-06-12T00:00:00.000Z", "prioridade": "alta", "status": "em_progresso" }
  ],
  "carga_semanal": 14.5,
  "distribuicao": {
    "periodo": "semanal",
    "labels": ["Código", "Cursos", "Debug", "Outras"],
    "completed": [62, 18, 38, 12],
    "allocated": [80, 20, 40, 15]
  }
}
```

Notas:
- `por_status`, `por_categoria`, `por_prioridade`, `por_categoria_prioridade` e
  `proximas_entregas` vêm como **arrays** (resultado de agregações do
  MongoDB) — converta para `dict`/`map` por `_id` quando precisar de acesso
  direto (ex.: `por_status` → `{ a_fazer: 2, em_progresso: 1, ... }`).
- `por_categoria_prioridade` traz o tempo gasto por categoria/prioridade
  filtrado pelo `periodo` (com fallback para o total geral se não houver
  tarefas com `data_limite` no período); é a base do card "Tempo por Área".

### GET /api/health
Health-check simples, sem autenticação.

## Tela 3 (Relatórios) e o dashboard Streamlit

A Tela 3 não reimplementa os relatórios em JS — ela é um "casco" (sidebar +
autenticação + logout, igual às telas 1 e 2) com um `<iframe>` que embute o
dashboard Python (Streamlit), responsável por filtros, KPIs, gráficos e a
tabela completa de tarefas.

### Fluxo de auto-login (token pass-through)

1. O usuário já está autenticado na Tela 3 (possui `ti_token` no `localStorage`).
2. `script.js` (`setupStreamlitFrame()`) monta a URL do iframe como:
   ```
   http://localhost:8501/?token=<ti_token>
   ```
   e usa a mesma URL no link "Abrir em nova aba".
3. `dashboard.py` lê `st.query_params["token"]`, valida o token chamando
   `GET /api/users/me` com `Authorization: Bearer <token>` e, se válido,
   considera o usuário autenticado — sem pedir e-mail/senha novamente.
4. Se não houver token válido, o Streamlit exibe uma mensagem orientando o
   usuário a acessar pelo TaskInsight (não há mais formulário de login no
   Streamlit; a barra lateral fica oculta).

### O que `dashboard.py` faz

- Busca `GET /api/tasks` (todas as tarefas do usuário).
- Painel de filtros (expansível): categoria, status, prioridade, tempo gasto
  mínimo e intervalo de prazo (`data_limite`), com botão "Limpar Filtros".
- KPIs: Pendentes, Em Progresso, Concluídas, % Conclusão (cards estilizados).
- Gráfico de barras "Tarefas por Status" e gráfico de pizza "Tarefas por
  Prioridade", com as mesmas cores usadas no front-end.
- Tabela "Todas as Tarefas" (ordenável por coluna), com Status e Prioridade
  coloridos como nas etiquetas do front-end.

### Como executar

```bash
# Banco
mongod --dbpath ./data

# API + Frontend (a API serve o frontend estaticamente)
cd api
npm install
npm start                 # http://localhost:3000

# Dashboard (Tela 3)
cd dashboard
pip install -r requirements.txt
streamlit run dashboard.py   # http://localhost:8501
```

Acesse `http://localhost:3000`, faça login e navegue até **Dashboard →
Relatórios** para ver o dashboard embutido.
