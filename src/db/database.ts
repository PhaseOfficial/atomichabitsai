import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'batsir.db';

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  
  await db.execAsync('PRAGMA journal_mode = WAL;');
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'daily',
      preferred_time TEXT,
      weekend_flexibility INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      two_minute_version TEXT,
      location TEXT,
      anchor_habit_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      date TEXT NOT NULL,
      time_blocks TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      habit_id TEXT NOT NULL,
      status TEXT NOT NULL,
      logged_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS shortcuts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      estimated_sessions INTEGER DEFAULT 1,
      completed_sessions INTEGER DEFAULT 0,
      tag TEXT,
      todos TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS sync_history (
      old_id TEXT PRIMARY KEY NOT NULL,
      new_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      synced_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      author TEXT,
      total_pages INTEGER DEFAULT 0,
      current_page INTEGER DEFAULT 0,
      last_page_read INTEGER DEFAULT 0,
      file_uri TEXT,
      cover_uri TEXT,
      status TEXT DEFAULT 'want_to_read',
      synthesis TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS reading_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      book_id TEXT NOT NULL,
      pages_read INTEGER DEFAULT 0,
      duration_minutes REAL DEFAULT 0,
      duration_seconds REAL DEFAULT 0,
      logged_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS reading_sessions (
      book_id TEXT PRIMARY KEY NOT NULL,
      start_time INTEGER NOT NULL,
      start_page INTEGER NOT NULL,
      last_update_time INTEGER NOT NULL,
      accumulated_time INTEGER NOT NULL,
      notes TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      book_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    );`
  ];

  for (const tableSql of tables) {
    try {
      await db.execAsync(tableSql);
    } catch (err) {
      console.error('Error creating table:', err, tableSql);
      throw err; // Re-throw to stop initialization
    }
  }

  // Migration logic
  try {
    const habitsInfo = await db.getAllAsync(`PRAGMA table_info(habits)`);
    const hCols = (habitsInfo as any[]).map(c => c.name);
    if (!hCols.includes('preferred_time')) await db.execAsync(`ALTER TABLE habits ADD COLUMN preferred_time TEXT;`);
    if (!hCols.includes('weekend_flexibility')) await db.execAsync(`ALTER TABLE habits ADD COLUMN weekend_flexibility INTEGER DEFAULT 0;`);
    if (!hCols.includes('current_streak')) await db.execAsync(`ALTER TABLE habits ADD COLUMN current_streak INTEGER DEFAULT 0;`);
    if (!hCols.includes('max_streak')) await db.execAsync(`ALTER TABLE habits ADD COLUMN max_streak INTEGER DEFAULT 0;`);
    if (!hCols.includes('two_minute_version')) await db.execAsync(`ALTER TABLE habits ADD COLUMN two_minute_version TEXT;`);
    if (!hCols.includes('location')) await db.execAsync(`ALTER TABLE habits ADD COLUMN location TEXT;`);
    if (!hCols.includes('anchor_habit_id')) await db.execAsync(`ALTER TABLE habits ADD COLUMN anchor_habit_id TEXT;`);

    const taskInfo = await db.getAllAsync(`PRAGMA table_info(tasks)`);
    const tCols = (taskInfo as any[]).map(c => c.name);
    if (!tCols.includes('todos')) await db.execAsync(`ALTER TABLE tasks ADD COLUMN todos TEXT NOT NULL DEFAULT '[]';`);

    const readingLogInfo = await db.getAllAsync(`PRAGMA table_info(reading_logs)`);
    const rlCols = (readingLogInfo as any[]).map(c => c.name);
    if (!rlCols.includes('user_id')) await db.execAsync(`ALTER TABLE reading_logs ADD COLUMN user_id TEXT;`);
    if (!rlCols.includes('duration_seconds')) await db.execAsync(`ALTER TABLE reading_logs ADD COLUMN duration_seconds REAL DEFAULT 0;`);

    const bookmarksInfo = await db.getAllAsync(`PRAGMA table_info(bookmarks)`);
    const bCols = (bookmarksInfo as any[]).map(c => c.name);
    if (bCols.length > 0 && !bCols.includes('user_id')) {
      await db.execAsync(`ALTER TABLE bookmarks ADD COLUMN user_id TEXT;`);
    }

    const logsInfo = await db.getAllAsync(`PRAGMA table_info(logs)`);
    const lCols = (logsInfo as any[]).map(c => c.name);
    if (!lCols.includes('user_id')) await db.execAsync(`ALTER TABLE logs ADD COLUMN user_id TEXT;`);

    const booksInfo = await db.getAllAsync(`PRAGMA table_info(books)`);
    const bookCols = (booksInfo as any[]).map(c => c.name);
    if (!bookCols.includes('last_page_read')) await db.execAsync(`ALTER TABLE books ADD COLUMN last_page_read INTEGER DEFAULT 0;`);
    if (!bookCols.includes('synthesis')) await db.execAsync(`ALTER TABLE books ADD COLUMN synthesis TEXT;`);
  } catch (error) {
    console.error('Migration error:', error);
  }
  
  return db;
};

export const getDb = async () => {
  return await SQLite.openDatabaseAsync(DATABASE_NAME);
};
