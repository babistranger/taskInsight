module.exports = (err, req, res, next) => {
  console.error(err);

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const mensagens = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ erro: 'Dados inválidos.', detalhes: mensagens });
  }

  // ID inválido (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  // Chave duplicada (e.g. email já cadastrado)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    return res.status(409).json({ erro: `${campo} já está em uso.` });
  }

  // JWT inválido (caso propagado via next(err))
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ erro: 'Token inválido.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ erro: 'Token expirado.' });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({ erro: err.message || 'Erro interno do servidor.' });
};
