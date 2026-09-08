import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

const DEFAULT_CATEGORIES = [
  { id: 'cat-personal', name: 'Personal', color: '#8CA697', icon: 'heart' },
  { id: 'cat-ideas', name: 'Ideas', color: '#C5A376', icon: 'sparkles' },
  { id: 'cat-memories', name: 'Memories', color: '#A29BB2', icon: 'camera' },
  { id: 'cat-work', name: 'Work', color: '#829EB3', icon: 'briefcase' },
  { id: 'cat-random', name: 'Random', color: '#9EA6B4', icon: 'compass' },
];

/**
 * Initializes database tables and default data.
 */
async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moments (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      text TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      category_id TEXT,
      audio_uri TEXT,
      audio_duration INTEGER,
      location_name TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS moment_images (
      id TEXT PRIMARY KEY NOT NULL,
      moment_id TEXT NOT NULL,
      uri TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_moments_category_id ON moments(category_id);
    CREATE INDEX IF NOT EXISTS idx_moment_images_moment_id ON moment_images(moment_id);
  `);

  // Seed default categories if none exist
  const existingCategories = await db.getAllAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories;'
  );
  if (!existingCategories || existingCategories[0]?.count === 0) {
    const now = Date.now();
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?);',
        cat.id,
        cat.name,
        cat.color,
        cat.icon,
        now
      );
    }
  }
}

/**
 * Returns the singleton SQLite database instance, initializing it if needed.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('drift.db');
    await initSchema(dbInstance);
  }
  return dbInstance;
}
