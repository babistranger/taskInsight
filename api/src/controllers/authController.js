const jwt = require('jsonwebtoken');
const User = require('../models/user');

const gerarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

const validarSenha = (senha) => {
  if (senha.length < 8)            return 'A senha deve ter no mínimo 8 caracteres.';
  if (!/[A-Z]/.test(senha))        return 'A senha deve conter pelo menos uma letra maiúscula.';
  if (!/[0-9]/.test(senha))        return 'A senha deve conter pelo menos um número.';
  if (!/[^A-Za-z0-9]/.test(senha)) return 'A senha deve conter pelo menos um caractere especial.';
  return null;
};

// POST /api/auth/cadastro
const cadastro = async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }
  const erroSenha = validarSenha(senha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  try {
    const existente = await User.findOne({ email: email.toLowerCase() });
    if (existente) return res.status(409).json({ erro: 'E-mail já cadastrado.' });

    const usuario = await User.create({ nome: nome.trim(), email, senha });
    const token = gerarToken(usuario._id);

    res.status(201).json({
      token,
      usuario: { id: usuario._id, nome: usuario.nome, email: usuario.email },
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar conta.', detalhe: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  try {
    const usuario = await User.findOne({ email: email.toLowerCase() }).select('+senha');

    if (!usuario || !(await usuario.verificarSenha(senha, usuario.senha))) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const token = gerarToken(usuario._id);

    res.json({
      token,
      usuario: { id: usuario._id, nome: usuario.nome, email: usuario.email },
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao fazer login.', detalhe: err.message });
  }
};

module.exports = { cadastro, login };
