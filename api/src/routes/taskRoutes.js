const express = require('express');
const {
  listarTarefas,
  buscarTarefa,
  criarTarefa,
  atualizarTarefa,
  atualizarStatus,
  deletarTarefa,
  getResumoAnalytics,
} = require('../controllers/taskController');
const { proteger } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(proteger);

// Rota específica antes de /:id para evitar ambiguidade
router.get('/analytics/resumo', getResumoAnalytics);

router.get('/', listarTarefas);
router.get('/:id', buscarTarefa);
router.post('/', criarTarefa);
router.patch('/:id/status', atualizarStatus);
router.patch('/:id', atualizarTarefa);
router.delete('/:id', deletarTarefa);

module.exports = router;
