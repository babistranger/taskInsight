const express = require('express');
const { getPerfil, atualizarPerfil, trocarSenha, deletarConta } = require('../controllers/userController');
const { proteger } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(proteger);

// GET  /api/users/me
router.get('/me', getPerfil);

// PATCH /api/users/me
router.patch('/me', atualizarPerfil);

// PATCH /api/users/me/senha
router.patch('/me/senha', trocarSenha);

// DELETE /api/users/me
router.delete('/me', deletarConta);

module.exports = router;
