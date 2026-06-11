# TaskInsight — Guia de Integração Front-end ↔ Back-end

Este documento descreve como as telas em `/frontend` e o dashboard em
`/dashboard` se conectam à API em `/api`, incluindo os contratos
(endpoints, payloads) e o esquema de dados realmente usados pela
aplicação hoje.

## Estrutura

```
login/             -> Tela de login              (POST /api/auth/login)
login cadastro/    -> Tela de cadastro           (POST /api/auth/cadastro)
tela 1/            -> Quadro de Tarefas          (GET/POST/PATCH/DELETE /api/tasks)
tela 2/            -> Dashboard de Analytics     (GET /api/tasks/analytics/resumo)
tela 3/            -> Relatórios                 (Streamlit embutido via <iframe>)
```

## Configuração da API

Em **todos** os arquivos `script.js` (telas 1, 2, 3, login e cadastro)
existe no topo:

```js
const API_BASE = "http://localhost:3000";
```

Troque essa constante pela URL real do seu back-end caso necessário.

## Autenticação

Após login/cadastro bem-sucedido, o front guarda no `localStorage`:

| Chave         | Conteúdo                                        |
|---------------|--------------------------------------------------|
| `ti_token`    | JWT (string) retornado por `/api/auth/login`     |
| `ti_user`     | Objeto JSON `{ id, nome, email }`                |

Todas as chamadas autenticadas enviam:

```
Authorization: Bearer <ti_token>
```

Se o token for inválido/ausente, cada tela redireciona para
`login/index.html` (ver `ensureAuthenticated()` em cada `script.js`).

## Contratos da API

### POST /api/auth/cadastro
Request:
```json
{ "nome": "Ricardo Silva", "email": "ricardo@x.com", "senha": "Senha@123" }
```
Regras de senha: mínimo 8 caracteres, ao menos 1 maiúscula, 1 número e
1 caractere especial.

Response 201:
```json
{
  "token": "jwt...",
  "usuario": { "id": "65a...", "nome": "Ricardo Silva", "email": "ricardo@x.com" }
}
```

### POST /api/auth/login
Request:
```json
{ "email": "ricardo@x.com", "senha": "Senha@123" }
```
Response 200: mesmo formato do cadastro (`token` + `usuario`).

### GET /api/users/me  (JWT)
Response 200:
```json
{ "id": "65a...", "nome": "Ricardo Silva", "email": "ricardo@x.com", "criadoEm": "2026-05-01T12:00:00.000Z" }
```
Usado pelas telas 1/2/3 para exibir nome/avatar do usuário, e pelo
`dashboard.py` (Streamlit) para validar o token recebido via
`?token=` (auto-login, ver seção "Tela 3 / Streamlit" abaixo).

### Tarefas (tela 1) — `/api/tasks` (JWT)

| Método | Rota                            | Descrição                                |
|--------|----------------------------------|--------------------------------------------|
| GET    | `/api/tasks`                    | Lista as tarefas do usuário autenticado    |
| GET    | `/api/tasks/:id`                 | Busca uma tarefa específica                |
| POST   | `/api/tasks`                    | Cria nova tarefa                           |
| PATCH  | `/api/tasks/:id`                  | Atualiza campos de uma tarefa              |
| PATCH  | `/api/tasks/:id/status`          | Move a tarefa entre colunas (status)       |
| DELETE | `/api/tasks/:id`                  | Exclui uma tarefa                          |
| GET    | `/api/tasks/analytics/resumo`   | KPIs/agregados (ver Tela 2)                |

Cada tarefa retornada tem o formato:
```json
{
  "_id": "65b...",
  "usuario": "65a...",
  "tarefa": "Redesign da Landing Page",
  "descricao": "string opcional",
  "categoria": "Escrevendo Código | Cursos | Debugging | Outras Demandas",
  "status": "a_fazer | em_progresso | em_revisao | concluido",
  "prioridade": "alta | media | baixa",
  "tempo_gasto": 4.5,
  "data_limite": "2026-06-15T00:00:00.000Z",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-05T09:30:00.000Z"
}
```

### GET /api/tasks/analytics/resumo?periodo=diario|semanal|mensal  (tela 2, JWT)

Response 200:
```json
{
  "progresso": 84,
  "total": 25,
  "concluidas": 21,
  "por_status": [{ "_id": "concluido", "count": 21 }],
  "por_categoria": [{ "_id": "Cursos", "count": 5, "tempo_total": 12 }],
  "por_prioridade": [{ "_id": "alta", "count": 8, "tempo_total": 30 }],
  "por_categoria_prioridade": [{ "_id": { "categoria": "Cursos", "prioridade": "media" }, "count": 3, "tempo_total": 8 }],
  "proximas_entregas": [{ "tarefa": "...", "data_limite": "...", "prioridade": "alta", "status": "a_fazer" }],
  "carga_semanal": 18,
  "distribuicao": {
    "periodo": "semanal",
    "labels": ["Código", "Cursos", "Debug", "Outras"],
    "completed": [62, 18, 38, 12],
    "allocated": [80, 20, 40, 15]
  }
}
```

## Tela 3 (Relatórios) e o dashboard Streamlit

A Tela 3 não monta mais KPIs/gráficos/tabela em JavaScript. O
`script.js` da Tela 3 cuida apenas de autenticação (guard), sidebar e
logout — exatamente como as telas 1 e 2. Todo o relatório (filtros,
KPIs, gráficos de status/prioridade e tabela de tarefas ordenável) é
gerado pelo **`dashboard.py`** (Streamlit) e embutido na página via
`<iframe>`.

### Auto-login (token pass-through)

O Streamlit roda em outra origem (`http://localhost:8501`) e não
acessa o `localStorage` da Tela 3. Para evitar pedir login de novo:

1. `setupStreamlitFrame()` (em `tela 3/script.js`) lê `ti_token` do
   `localStorage` e monta a URL `http://localhost:8501/?token=<ti_token>`,
   usada tanto no `src` do `<iframe id="streamlitFrame">` quanto no
   link "Abrir em nova aba".
2. `dashboard.py` lê `?token=` via `st.query_params`, valida o token
   chamando `GET /api/users/me` com `Authorization: Bearer <token>` e,
   se válido, guarda o token/usuário em `st.session_state` — sem exibir
   tela de login.
3. Se não houver token válido (ex.: acesso direto a
   `http://localhost:8501` fora da Tela 3), o dashboard exibe um aviso
   pedindo para acessar pela tela "Relatórios" do TaskInsight.

A barra lateral padrão do Streamlit foi **removida completamente**
(CSS `display:none` em `[data-testid="stSidebar"]` e
`[data-testid="stSidebarCollapsedControl"]`); não há login/logout
manual dentro do Streamlit — o logout continua sendo feito pela Tela 3.

### Funcionalidades do dashboard.py

- **Filtros** (`expander "🔍 Filtros"`): categoria, status, prioridade,
  tempo gasto mínimo e intervalo de prazo (data de/até). Botões
  "Aplicar Filtros" (azul) e "Limpar Filtros" (branco), lado a lado.
- **Indicador de filtro ativo**: quando algum filtro está aplicado, um
  selo "🔍 Filtro ativo" aparece acima dos gráficos, junto de um botão
  "✕ Limpar Filtros" que reseta todos os filtros.
- **KPIs**: cards de Pendentes, Em Progresso, Concluídas e % de
  Conclusão (sempre refletindo os filtros aplicados).
- **Gráficos**: barras por status e doughnut por prioridade
  (`plotly.express`), com as mesmas cores usadas no resto do app.
- **Tabela "Todas as Tarefas"**: `st.dataframe` nativo com células de
  Status/Prioridade coloridas (via `pandas.Styler`); clicar no
  cabeçalho de uma coluna ordena a tabela.

### Como executar

```bash
# API (porta 3000) — também serve o frontend estático em /
cd api && npm install && npm start

# Dashboard (Streamlit, porta 8501)
pip install -r dashboard/requirements.txt
cd dashboard && streamlit run dashboard.py
```

`dashboard/requirements.txt`:
```
streamlit==1.38.0
requests==2.32.3
pandas==2.2.2
plotly==5.24.1
```

A variável de ambiente `API_URL` (padrão `http://localhost:3000`) pode
ser usada para apontar o `dashboard.py` para outra instância da API.
