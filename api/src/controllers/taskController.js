const Task = require('../models/tasks');

// ──────────────────────────────────────────────
// GET /api/tasks
// Query params: status, categoria, prioridade
// ──────────────────────────────────────────────
const listarTarefas = async (req, res) => {
  const { status, categoria, prioridade } = req.query;
  const filtro = { usuario: req.usuario._id };

  if (status) filtro.status = status;
  if (categoria) filtro.categoria = categoria;
  if (prioridade) filtro.prioridade = prioridade;

  try {
    const tarefas = await Task.find(filtro).sort({ createdAt: -1 });
    res.json(tarefas);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar tarefas.', detalhe: err.message });
  }
};

// ──────────────────────────────────────────────
// GET /api/tasks/:id
// ──────────────────────────────────────────────
const buscarTarefa = async (req, res) => {
  try {
    const tarefa = await Task.findOne({
      _id: req.params.id,
      usuario: req.usuario._id,
    });

    if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

    res.json(tarefa);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar tarefa.', detalhe: err.message });
  }
};

// ──────────────────────────────────────────────
// POST /api/tasks
// Body: tarefa, descricao, categoria, status,
//       prioridade, tempo_gasto, data_limite
// ──────────────────────────────────────────────
const criarTarefa = async (req, res) => {
  const { tarefa, descricao, categoria, status, prioridade, tempo_gasto, data_limite} = req.body;

  if (!tarefa || !tarefa.trim()) {
    return res.status(400).json({ erro: 'O campo "tarefa" é obrigatório.' });
  }

  try {
    const nova = await Task.create({
      usuario: req.usuario._id,
      tarefa: tarefa.trim(),
      descricao: descricao?.trim() || '',
      categoria: categoria || 'Outras Demandas',
      status: status || 'a_fazer',
      prioridade: prioridade || 'media',
      tempo_gasto: tempo_gasto ?? 0,
      data_limite: data_limite ? new Date(data_limite) : null,
    });

    res.status(201).json(nova);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao criar tarefa.', detalhe: err.message });
  }
};

// ──────────────────────────────────────────────
// PATCH /api/tasks/:id
// Atualiza apenas os campos enviados
// ──────────────────────────────────────────────
const atualizarTarefa = async (req, res) => {
  const CAMPOS_PERMITIDOS = [
    'tarefa', 'descricao', 'categoria', 'status',
    'prioridade', 'tempo_gasto', 'data_limite',
  ];

  const atualizacao = {};
  CAMPOS_PERMITIDOS.forEach((campo) => {
    if (req.body[campo] !== undefined) {
      atualizacao[campo] = campo === 'data_limite' && req.body[campo]
        ? new Date(req.body[campo])
        : req.body[campo];
    }
  });

  if (Object.keys(atualizacao).length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo válido para atualizar.' });
  }

  try {
    const tarefa = await Task.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario._id },
      atualizacao,
      { new: true, runValidators: true }
    );

    if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

    res.json(tarefa);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao atualizar tarefa.', detalhe: err.message });
  }
};

// ──────────────────────────────────────────────
// PATCH /api/tasks/:id/status
// Atalho para mover card no kanban
// Body: { status: 'em_progresso' }
// ──────────────────────────────────────────────
const atualizarStatus = async (req, res) => {
  const { status } = req.body;
  const STATUS_VALIDOS = ['a_fazer', 'em_progresso', 'em_revisao', 'concluido'];

  if (!status || !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({
      erro: 'Status inválido.',
      validos: STATUS_VALIDOS,
    });
  }

  try {
    const tarefa = await Task.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario._id },
      { status },
      { new: true }
    );

    if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

    res.json(tarefa);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar status.', detalhe: err.message });
  }
};

// ──────────────────────────────────────────────
// DELETE /api/tasks/:id
// ──────────────────────────────────────────────
const deletarTarefa = async (req, res) => {
  try {
    const tarefa = await Task.findOneAndDelete({
      _id: req.params.id,
      usuario: req.usuario._id,
    });

    if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

    res.json({ mensagem: 'Tarefa removida com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao deletar tarefa.', detalhe: err.message });
  }
};

// Categorias fixas do schema + rótulos curtos para gráficos
const CATEGORIAS = ['Escrevendo Código', 'Cursos', 'Debugging', 'Outras Demandas'];
const CATEGORIA_LABEL_CURTO = {
  'Escrevendo Código': 'Código',
  'Cursos': 'Cursos',
  'Debugging': 'Debug',
  'Outras Demandas': 'Outras',
};

// Calcula a data de início de um período (diario | semanal | mensal)
const inicioDoPeriodo = (periodo) => {
  const data = new Date();
  data.setHours(0, 0, 0, 0);

  if (periodo === 'mensal') {
    data.setDate(1);
  } else if (periodo === 'semanal') {
    const diaSemana = data.getDay(); // 0 = domingo
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana; // volta até segunda-feira
    data.setDate(data.getDate() + diff);
  }
  // 'diario' (ou qualquer outro valor) usa o início do dia atual

  return data;
};

// Calcula a data de fim (exclusivo) de um período (diario | semanal | mensal),
// a partir do seu início (ver inicioDoPeriodo)
const fimDoPeriodo = (periodo, inicio) => {
  const data = new Date(inicio);

  if (periodo === 'mensal') {
    data.setMonth(data.getMonth() + 1);
  } else if (periodo === 'semanal') {
    data.setDate(data.getDate() + 7);
  } else {
    data.setDate(data.getDate() + 1);
  }

  return data;
};

// ──────────────────────────────────────────────
// GET /api/tasks/analytics/resumo
// Query params: periodo (diario | semanal | mensal) -> afeta "distribuicao"
// Dados agregados para o dashboard
// ──────────────────────────────────────────────
const getResumoAnalytics = async (req, res) => {
  try {
    const userId = req.usuario._id;

    const periodosValidos = ['diario', 'semanal', 'mensal'];
    const periodo = periodosValidos.includes(req.query.periodo) ? req.query.periodo : 'semanal';
    const inicioPeriodo = inicioDoPeriodo(periodo);
    const fimPeriodo = fimDoPeriodo(periodo, inicioPeriodo);

    const [
      total,
      concluidas,
      porStatus,
      porCategoria,
      porPrioridade,
      porCategoriaPrioridadeTodas,
      porCategoriaPrioridadePeriodo,
      completasPeriodo,
      alocadoPeriodo,
    ] = await Promise.all([
      Task.countDocuments({ usuario: userId }),
      Task.countDocuments({ usuario: userId, status: 'concluido' }),

      Task.aggregate([
        { $match: { usuario: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: { usuario: userId } },
        {
          $group: {
            _id: '$categoria',
            count: { $sum: 1 },
            tempo_total: { $sum: '$tempo_gasto' },
          },
        },
      ]),

      Task.aggregate([
        { $match: { usuario: userId } },
        {
          $group: {
            _id: '$prioridade',
            count: { $sum: 1 },
            tempo_total: { $sum: '$tempo_gasto' },
          },
        },
      ]),

      // Tempo gasto agrupado por categoria + prioridade (todas as tarefas),
      // usado como base/fallback para o card "Tempo por Área".
      Task.aggregate([
        { $match: { usuario: userId } },
        {
          $group: {
            _id: { categoria: '$categoria', prioridade: '$prioridade' },
            count: { $sum: 1 },
            tempo_total: { $sum: '$tempo_gasto' },
          },
        },
      ]),

      // Mesmo agrupamento, restrito às tarefas com data_limite dentro do
      // período selecionado (diário/semanal/mensal). O tempo_total alimenta
      // a barra de cada categoria e a prioridade com mais horas define a
      // cor da barra (alta = laranja, média = bege, baixa = azul).
      Task.aggregate([
        {
          $match: {
            usuario: userId,
            data_limite: { $gte: inicioPeriodo, $lt: fimPeriodo },
          },
        },
        {
          $group: {
            _id: { categoria: '$categoria', prioridade: '$prioridade' },
            count: { $sum: 1 },
            tempo_total: { $sum: '$tempo_gasto' },
          },
        },
      ]),

      // Tarefas concluídas dentro do período selecionado, por categoria
      Task.aggregate([
        {
          $match: {
            usuario: userId,
            status: 'concluido',
            updatedAt: { $gte: inicioPeriodo },
          },
        },
        { $group: { _id: '$categoria', count: { $sum: 1 } } },
      ]),

      // Tempo alocado (tempo_gasto) em tarefas atualizadas dentro do período, por categoria
      Task.aggregate([
        { $match: { usuario: userId, updatedAt: { $gte: inicioPeriodo } } },
        { $group: { _id: '$categoria', tempo_total: { $sum: '$tempo_gasto' } } },
      ]),
    ]);

    const hoje = new Date();
    const proximas_entregas = await Task.find({
      usuario: userId,
      status: { $ne: 'concluido' },
      data_limite: { $gte: hoje },
    })
      .sort({ data_limite: 1 })
      .limit(5)
      .select('tarefa data_limite prioridade status');

    const carga_semanal = await Task.aggregate([
      { $match: { usuario: userId, status: { $ne: 'concluido' } } },
      { $group: { _id: null, total: { $sum: '$tempo_gasto' } } },
    ]);

    // "Tempo por Área": usa o agrupamento filtrado pelo período (tarefas com
    // data_limite dentro do período selecionado); se não houver nenhuma
    // tarefa com prazo nesse período, cai para o total geral (todas as
    // tarefas) para que o card sempre reflita dados reais existentes.
    const porCategoriaPrioridade = porCategoriaPrioridadePeriodo.length > 0
      ? porCategoriaPrioridadePeriodo
      : porCategoriaPrioridadeTodas;

    // Monta a distribuição por categoria no período selecionado
    const mapCompletas = Object.fromEntries(completasPeriodo.map((i) => [i._id, i.count]));
    const mapAlocado = Object.fromEntries(alocadoPeriodo.map((i) => [i._id, i.tempo_total]));

    const distribuicao = {
      periodo,
      labels: CATEGORIAS.map((c) => CATEGORIA_LABEL_CURTO[c]),
      completed: CATEGORIAS.map((c) => mapCompletas[c] || 0),
      allocated: CATEGORIAS.map((c) => Math.round((mapAlocado[c] || 0) * 10) / 10),
    };

    res.json({
      progresso: total > 0 ? Math.round((concluidas / total) * 100) : 0,
      total,
      concluidas,
      por_status: porStatus,
      por_categoria: porCategoria,
      por_prioridade: porPrioridade,
      por_categoria_prioridade: porCategoriaPrioridade,
      proximas_entregas,
      carga_semanal: carga_semanal[0]?.total ?? 0,
      distribuicao,
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar analytics.', detalhe: err.message });
  }
};

module.exports = {
  listarTarefas,
  buscarTarefa,
  criarTarefa,
  atualizarTarefa,
  atualizarStatus,
  deletarTarefa,
  getResumoAnalytics,
};