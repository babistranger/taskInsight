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

// ──────────────────────────────────────────────
// GET /api/tasks/analytics/resumo
// Dados agregados para o dashboard Python
// ──────────────────────────────────────────────
const getResumoAnalytics = async (req, res) => {
  try {
    const userId = req.usuario._id;

    const [total, concluidas, porStatus, porCategoria, porPrioridade] = await Promise.all([
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
        { $group: { _id: '$prioridade', count: { $sum: 1 } } },
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

    // Tempo por categoria no mês atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const porCategoriaMes = await Task.aggregate([
      { $match: { usuario: userId, createdAt: { $gte: inicioMes } } },
      {
        $group: {
          _id: '$categoria',
          count: { $sum: 1 },
          tempo_total: { $sum: '$tempo_gasto' },
        },
      },
      { $sort: { tempo_total: -1 } },
    ]);

    res.json({
      progresso: total > 0 ? Math.round((concluidas / total) * 100) : 0,
      total,
      concluidas,
      por_status: porStatus,
      por_categoria: porCategoria,
      por_prioridade: porPrioridade,
      por_categoria_mes: porCategoriaMes,
      proximas_entregas,
      carga_semanal: carga_semanal[0]?.total ?? 0,
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