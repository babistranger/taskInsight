const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

const FRONTEND = path.resolve(__dirname, '../../frontend');

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Redireciona raiz para a tela de login
app.get('/', (_, res) => res.redirect('/login/'));

// Serve os arquivos estáticos do frontend
app.use(express.static(FRONTEND));

// 404 apenas para rotas /api/* não encontradas
app.use('/api', (_, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use(errorMiddleware);

module.exports = app;
