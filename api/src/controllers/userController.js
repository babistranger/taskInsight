const User = require('../models/user');
const Task = require('../models/tasks');

// Validar formato de email
const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validarSenha = (senha) => {
  if (senha.length < 8)            return 'A senha deve ter no mínimo 8 caracteres.';
  if (!/[A-Z]/.test(senha))        return 'A senha deve conter pelo menos uma letra maiúscula.';
  if (!/[0-9]/.test(senha))        return 'A senha deve conter pelo menos um número.';
  if (!/[^A-Za-z0-9]/.test(senha)) return 'A senha deve conter pelo menos um caractere especial.';
  return null;
};

// GET /api/users/me
const getPerfil = (req, res) => {
  const { _id, nome, email, createdAt } = req.usuario;
  res.json({ id: _id, nome, email, criadoEm: createdAt });
};

// PATCH /api/users/me
const atualizarPerfil = async (req, res) => {
  const { nome, email } = req.body;

  if (!nome && !email) {
    return res.status(400).json({ erro: 'Informe ao menos um campo para atualizar.' });
  }

  try {
    if (email) {
      if (!validarEmail(email)) {
        return res.status(400).json({ erro: 'E-mail inválido.' });
      }
      const existente = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.usuario._id },
      });
      if (existente) return res.status(409).json({ erro: 'E-mail já está em uso.' });
    }

    const atualizacao = {};
    if (nome) atualizacao.nome = nome.trim();
    if (email) atualizacao.email = email.trim().toLowerCase();

    const usuario = await User.findByIdAndUpdate(
      req.usuario._id,
      atualizacao,
      { new: true, runValidators: true }
    );

    res.json({ id: usuario._id, nome: usuario.nome, email: usuario.email });
  } catch (err) {
    const detalhe = process.env.NODE_ENV === 'development' ? err.message : undefined;
    res.status(500).json({ erro: 'Erro ao atualizar perfil.', ...(detalhe && { detalhe }) });
  }
};

// PATCH /api/users/me/senha
const trocarSenha = async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: 'Informe a senha atual e a nova senha.' });
  }
  const erroSenha = validarSenha(novaSenha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  try {
    const usuario = await User.findById(req.usuario._id).select('+senha');
    const senhaOk = await usuario.verificarSenha(senhaAtual, usuario.senha);
    if (!senhaOk) return res.status(401).json({ erro: 'Senha atual incorreta.' });

    usuario.senha = novaSenha; // pre-save hook faz o hash
    await usuario.save();

    res.json({ mensagem: 'Senha atualizada com sucesso.' });
  } catch (err) {
    const detalhe = process.env.NODE_ENV === 'development' ? err.message : undefined;
    res.status(500).json({ erro: 'Erro ao trocar senha.', ...(detalhe && { detalhe }) });
  }
};

// DELETE /api/users/me
const deletarConta = async (req, res) => {
  const { senha } = req.body;

  if (!senha) return res.status(400).json({ erro: 'Informe a senha para confirmar.' });

  try {
    const usuario = await User.findById(req.usuario._id).select('+senha');
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });

    const senhaOk = await usuario.verificarSenha(senha, usuario.senha);
    if (!senhaOk) return res.status(401).json({ erro: 'Senha incorreta.' });

    // Remove tarefas primeiro; só depois remove o usuário
    await Task.deleteMany({ usuario: req.usuario._id });
    await usuario.deleteOne();

    res.json({ mensagem: 'Conta e todas as tarefas removidas com sucesso.' });
  } catch (err) {
    const detalhe = process.env.NODE_ENV === 'development' ? err.message : undefined;
    res.status(500).json({ erro: 'Erro ao deletar conta.', ...(detalhe && { detalhe }) });
  }
};

module.exports = { getPerfil, atualizarPerfil, trocarSenha, deletarConta };
