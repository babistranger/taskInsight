# TaskInsight — Versão Comentada (guia de integração com o Back-end)

Esta pasta contém os mesmos 4 módulos do projeto original, mas com **comentários
explicativos em português** indicando, em cada ponto, **o que vem da API** e
**onde colocar cada dado retornado pelo back-end**.

## Estrutura

```
login/             -> Tela de login           (POST /auth/login)
login cadastro/    -> Tela de cadastro        (POST /auth/register)
tela 1/            -> Quadro de Tarefas       (GET/POST /tasks)
tela 2/            -> Dashboard de Analytics  (GET /analytics/overview)
```

## Configuração da API

Em **todos** os arquivos `script.js` existe no topo:

```js
const API_BASE = "https://api.taskinsight.example.com";
```

Troque essa constante pela URL real do seu back-end. Ex.:
`const API_BASE = "https://meubackend.com/api/v1";`

## Autenticação

Após login/cadastro bem-sucedido, o front guarda no `localStorage`:

| Chave         | Conteúdo                                  |
|---------------|-------------------------------------------|
| `ti_token`    | JWT (string) retornado por `/auth/login`  |
| `ti_user`     | Objeto JSON `{ name, role, ... }`         |

Todas as chamadas autenticadas enviam:

```
Authorization: Bearer <ti_token>
```

## Contratos esperados da API

### POST /auth/login  e  POST /auth/register
Request:
```json
{ "email": "...", "password": "...", "name": "..." }
```
Response 200:
```json
{
  "token": "jwt...",
  "user": { "name": "Ricardo Silva", "role": "Desenvolvedor FullStack" }
}
```

### GET /tasks  (tela 1)
Response 200 — array de tarefas:
```json
[
  {
    "id": 1,
    "status": "todo|progress|review|done",
    "priority": "alta|media|baixa|final",
    "title": "string",
    "desc":  "string",
    "assignee": "RS",          // iniciais do responsável
    "comments": 5,              // opcional
    "views": 12,                // opcional
    "active": true,             // opcional (mostra "Ativo")
    "date": "12 Out",           // opcional
    "pinned": true,             // opcional
    "done": true                // risca o título quando concluída
  }
]
```

### GET /analytics/overview  (tela 2)
Response 200:
```json
{
  "progress": 84,
  "deliveries": [
    { "title": "...", "sub": "...", "badge": "Hoje",   "cls": "badge-hoje" },
    { "title": "...", "sub": "...", "badge": "Amanhã", "cls": "badge-amanha" },
    { "title": "...", "sub": "...", "badge": "Sexta",  "cls": "badge-sexta" }
  ],
  "timeArea": [
    { "label": "Escrita de Código", "value": 80, "color": "var(--accent)" }
  ],
  "distribution": {
    "labels":    ["Código","Cursos","Debug","Outras"],
    "completed": [62,18,38,12],
    "allocated": [80,20,40,15]
  }
}
```

> Enquanto a API não estiver pronta, todos os scripts caem automaticamente
> num **MOCK** local, então as telas continuam funcionando offline.
