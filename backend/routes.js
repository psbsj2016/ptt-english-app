const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./database');

const router = express.Router();

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

// Registrar usuário
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validar campos
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se email já existe
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name) VALUES (?, ?, ?)
    `);
    const result = stmt.run(email, hashedPassword, name);

    // Criar configurações padrão
    db.prepare(`
      INSERT INTO user_settings (user_id) VALUES (?)
    `).run(result.lastInsertRowid);

    // Gerar token
    const token = jwt.sign(
      { id: result.lastInsertRowid, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: result.lastInsertRowid,
        email,
        name,
        level: 'Iniciante',
        total_xp: 0
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        level: user.level,
        total_xp: user.total_xp
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// ============================================
// ROTAS DE PROGRESSO
// ============================================

// Completar atividade
router.post('/progress/activity', authenticateToken, (req, res) => {
  try {
    const { activity_type, activity_name, score = 0, xp_earned = 50 } = req.body;
    const userId = req.user.id;

    if (!activity_type || !activity_name) {
      return res.status(400).json({ error: 'Tipo e nome da atividade são obrigatórios' });
    }

    // Registrar atividade completada
    db.prepare(`
      INSERT INTO completed_activities (user_id, activity_type, activity_name, score, xp_earned)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, activity_type, activity_name, score, xp_earned);

    // Atualizar XP total do usuário
    db.prepare(`
      UPDATE users SET total_xp = total_xp + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(xp_earned, userId);

    // Atualizar progresso diário
    const today = new Date().toISOString().split('T')[0];
    
    db.prepare(`
      INSERT INTO daily_progress (user_id, date, activities_completed, total_time_minutes)
      VALUES (?, ?, 1, 5)
      ON CONFLICT(user_id, date) DO UPDATE SET
        activities_completed = activities_completed + 1
    `).run(userId, today);

    // Buscar novo total de XP
    const user = db.prepare('SELECT total_xp, level FROM users WHERE id = ?').get(userId);

    res.json({
      message: 'Atividade completada com sucesso',
      xp_earned,
      total_xp: user.total_xp,
      level: user.level
    });
  } catch (error) {
    console.error('Erro ao registrar atividade:', error);
    res.status(500).json({ error: 'Erro ao registrar atividade' });
  }
});

// Buscar progresso do usuário
router.get('/progress', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Progresso total
    const totalActivities = db.prepare(`
      SELECT COUNT(*) as count FROM completed_activities WHERE user_id = ?
    `).get(userId);

    // Progresso dos últimos 7 dias
    const weeklyProgress = db.prepare(`
      SELECT date, activities_completed FROM daily_progress 
      WHERE user_id = ? AND date >= date('now', '-7 days')
      ORDER BY date ASC
    `).all(userId);

    // Atividades por tipo
    const activitiesByType = db.prepare(`
      SELECT activity_type, COUNT(*) as count, SUM(xp_earned) as total_xp
      FROM completed_activities 
      WHERE user_id = ?
      GROUP BY activity_type
    `).all(userId);

    res.json({
      total_activities: totalActivities.count,
      weekly_progress: weeklyProgress,
      activities_by_type: activitiesByType
    });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// ============================================
// ROTAS DO USUÁRIO
// ============================================

// Perfil do usuário
router.get('/user/profile', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const user = db.prepare(`
      SELECT id, email, name, level, total_xp, created_at FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Atualizar configurações
router.put('/user/settings', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { notifications_enabled, dark_mode, language } = req.body;

    db.prepare(`
      UPDATE user_settings SET
        notifications_enabled = COALESCE(?, notifications_enabled),
        dark_mode = COALESCE(?, dark_mode),
        language = COALESCE(?, language)
      WHERE user_id = ?
    `).run(notifications_enabled, dark_mode, language, userId);

    res.json({ message: 'Configurações atualizadas' });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// ============================================
// ROTAS PÚBLICAS
// ============================================

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;