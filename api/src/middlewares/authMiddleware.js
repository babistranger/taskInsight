const jwt = require('jsonwebtoken');
const User = require('../models/user');

const proteger = async (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Não autenticado. Token ausente.' });
  }

  const token = auth.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = await User.findById(decoded.id);
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado.' });
    }
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
};

module.exports = { proteger };
