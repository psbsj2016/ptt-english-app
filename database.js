const Database = require('better-sqlite3');
const path = require('path');

// Caminho do banco de dados
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');

// Criar conexão com SQLite
const db = new Database(dbPath);

// Habilitar chaves estrangeiras
db.pragma('foreign_keys = ON');

// Criar tabelas
function initializeDatabase() {
  // Tabela de Usuários
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT DEFAULT 'Iniciante',
      total_xp INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Progresso Diário
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      activities_completed INTEGER DEFAULT 0,
      total_time_minutes INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    )
  `);

  // Tabela de Atividades Completas
  db.exec(`
    CREATE TABLE IF NOT EXISTS completed_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 50,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabela de Configurações do Usuário
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      notifications_enabled INTEGER DEFAULT 1,
      dark_mode INTEGER DEFAULT 0,
      language TEXT DEFAULT 'pt-BR',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Índices para performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_id ON completed_activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_date ON daily_progress(date);
    CREATE INDEX IF NOT EXISTS idx_activity_type ON completed_activities(activity_type);
  `);

  console.log('✅ Banco de dados inicializado com sucesso!');
}

// Exportar instância do banco e funções
module.exports = {
  db,
  initializeDatabase
};