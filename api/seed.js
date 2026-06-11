// seed.js — Cadastra usuários e cria tarefas via API
// Uso: node seed.js
// (rode com o servidor já no ar: npm run dev ou node src/server.js)

const BASE_URL = 'http://localhost:3000/api';

const usuarios = [
  { nome: 'Ana Souza',    email: 'ana.souza@email.com',    senha: 'senha123456' },
  { nome: 'Bruno Lima',   email: 'bruno.lima@email.com',   senha: 'senha123456' },
  { nome: 'Carla Mendes', email: 'carla.mendes@email.com', senha: 'senha123456' },
];

// Tarefas distribuídas: índice 0 = Ana, 1 = Bruno, 2 = Carla
const tarefas = [
  // Ana Souza
  {
    usuario: 0,
    tarefa: 'Implementar autenticação JWT',
    descricao: 'Adicionar login e cadastro com geração de token JWT e middleware de proteção de rotas.',
    categoria: 'Escrevendo Código',
    status: 'concluido',
    prioridade: 'alta',
    tempo_gasto: 4.5,
    data_limite: '2026-06-05T18:00:00.000Z',
  },
  {
    usuario: 0,
    tarefa: 'Corrigir bug no filtro de tarefas',
    descricao: 'Filtro por status não está retornando tarefas em_revisao corretamente.',
    categoria: 'Debugging',
    status: 'em_progresso',
    prioridade: 'alta',
    tempo_gasto: 1.0,
    data_limite: '2026-06-10T12:00:00.000Z',
  },
  {
    usuario: 0,
    tarefa: 'Documentar endpoints da API',
    descricao: 'Criar documentação Swagger/OpenAPI para todas as rotas.',
    categoria: 'Outras Demandas',
    status: 'a_fazer',
    prioridade: 'media',
    tempo_gasto: 0,
    data_limite: '2026-06-15T18:00:00.000Z',
  },
  // Bruno Lima
  {
    usuario: 1,
    tarefa: 'Curso Node.js avançado',
    descricao: 'Completar os módulos 5 a 8 sobre streams e cluster.',
    categoria: 'Cursos',
    status: 'em_progresso',
    prioridade: 'media',
    tempo_gasto: 3.0,
    data_limite: '2026-06-20T23:59:00.000Z',
  },
  {
    usuario: 1,
    tarefa: 'Revisar pull request do colega',
    descricao: 'Analisar o PR #42 com refatoração do controller de usuários.',
    categoria: 'Outras Demandas',
    status: 'em_revisao',
    prioridade: 'media',
    tempo_gasto: 0.5,
    data_limite: '2026-06-09T17:00:00.000Z',
  },
  {
    usuario: 1,
    tarefa: 'Estudar MongoDB Aggregation Pipeline',
    descricao: 'Praticar $group, $lookup e $project para os relatórios de analytics.',
    categoria: 'Cursos',
    status: 'concluido',
    prioridade: 'alta',
    tempo_gasto: 6.0,
    data_limite: '2026-06-01T23:59:00.000Z',
  },
  // Carla Mendes
  {
    usuario: 2,
    tarefa: 'Criar seeds do banco de dados',
    descricao: 'Script para popular o banco com dados de teste automaticamente.',
    categoria: 'Escrevendo Código',
    status: 'a_fazer',
    prioridade: 'baixa',
    tempo_gasto: 0,
    data_limite: null,
  },
  {
    usuario: 2,
    tarefa: 'Configurar CI/CD no GitHub Actions',
    descricao: 'Pipeline de build e testes automáticos a cada push na main.',
    categoria: 'Escrevendo Código',
    status: 'a_fazer',
    prioridade: 'alta',
    tempo_gasto: 0,
    data_limite: '2026-06-12T18:00:00.000Z',
  },
];

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function patch(url, body, token) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function seed() {
  console.log('🌱 Iniciando seed...\n');
  const tokens = [];

  // 1. Cadastrar usuários
  for (const u of usuarios) {
    const res = await post(`${BASE_URL}/auth/cadastro`, u);
    if (res.token) {
      tokens.push(res.token);
      console.log(`✅ Usuário criado: ${u.nome}`);
    } else {
      // Usuário já existe — faz login
      const login = await post(`${BASE_URL}/auth/login`, { email: u.email, senha: u.senha });
      if (login.token) {
        tokens.push(login.token);
        console.log(`🔑 Login realizado: ${u.nome} (já existia)`);
      } else {
        console.error(`❌ Falha em ${u.nome}:`, res.message || res);
        tokens.push(null);
      }
    }
  }

  console.log('');

  // 2. Criar tarefas
  for (const t of tarefas) {
    const token = tokens[t.usuario];
    if (!token) { console.error(`⛔ Sem token para usuário ${t.usuario}`); continue; }

    const { usuario, status, ...body } = t;

    const res = await post(`${BASE_URL}/tasks`, body, token);

    if (res._id) {
      // Atualiza status se não for o padrão
      if (status && status !== 'a_fazer') {
        await patch(`${BASE_URL}/tasks/${res._id}/status`, { status }, token);
      }
      console.log(`📝 Tarefa criada: "${t.tarefa}" → ${usuarios[t.usuario].nome}`);
    } else {
      console.error(`❌ Falha na tarefa "${t.tarefa}":`, res.message || res);
    }
  }

  console.log('\n✨ Seed concluído!');
}

seed().catch(console.error);
