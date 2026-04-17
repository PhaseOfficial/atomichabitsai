import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'batsir.db';

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT, -- Supabase user ID
      title TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'daily',
      preferred_time TEXT, -- e.g. "08:00"
      weekend_flexibility INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      two_minute_version TEXT, -- Gateway version (Make it Easy)
      location TEXT, -- For Implementation Intentions
      anchor_habit_id TEXT, -- For Habit Stacking
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT, -- Supabase user ID
      date TEXT NOT NULL,
      time_blocks TEXT NOT NULL DEFAULT '[]', -- JSON string
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL,
      status TEXT NOT NULL,
      logged_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON string
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shortcuts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT, -- Lucide icon name or emoji
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'doing', 'done'
      estimated_sessions INTEGER DEFAULT 1,
      completed_sessions INTEGER DEFAULT 0,
      tag TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Simple migration to add missing columns if they don't exist
  try {
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(habits)`);
    const columnNames = (tableInfo as any[]).map(c => c.name);
    
    if (!columnNames.includes('preferred_time')) {
      await db.execAsync(`ALTER TABLE habits ADD COLUMN preferred_time TEXT;`);
    }
    if (!columnNames.includes('weekend_flexibility')) {
      await db.execAsync(`ALTER TABLE habits ADD COLUMN weekend_flexibility INTEGER DEFAULT 0;`);
    }
    if (!columnNames.includes('current_streak')) {
      await db.execAsync(`ALTER TABLE habits ADD COLUMN current_streak INTEGER DEFAULT 0;`);
    }
    if (!columnNames.includes('max_streak')) {
      await db.execAsync(`ALTER TABLE habits ADD COLUMN max_streak INTEGER DEFAULT 0;`);
    }
    if (!columnNames.includes('two_minute_version')) {
      await db.execAsync(`ALTER TABLE habits ADD COLUMN two_minute_version TEXT;`);
    }
    if (!columnNames.includes('location')) {
      await db.execAsync(`ALTER TABLE habits ADD COLUMN location TEXT;`);
    }
    if (!columnNames.includes('anchor_habit_id')) {
      await db.execAsync(`ALTER TABLE habits ADD COLUMN anchor_habit_id TEXT;`);
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
  
  return db;
};

export const getDb = async () => {
  return await SQLite.openDatabaseAsync(DATABASE_NAME);
};
