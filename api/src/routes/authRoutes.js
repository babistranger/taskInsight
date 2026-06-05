const express = require('express');
const { cadastro, login } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/cadastro
router.post('/cadastro', cadastro);

// POST /api/auth/login
router.post('/login', login);

module.exports = router;
