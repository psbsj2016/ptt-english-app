require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar banco de dados
initializeDatabase();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas da API
app.use('/api', routes);

// Rota principal - serve o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota para manifest.json
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/manifest.json'));
});

// Rota para service worker
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/sw.js'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🚀 PTT English Backend Iniciado!    ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║   📡 Servidor: http://localhost:${PORT}      ║`);
  console.log(`║   📊 API: http://localhost:${PORT}/api       ║`);
  console.log(`║   💾 Banco: ${process.env.DATABASE_PATH}     ║`);
  console.log('╚════════════════════════════════════════╝');
});