import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

let pool: mysql.Pool | null = null;
let currentConfig: DbConfig | null = null;

export function loadSavedConfig(): DbConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (data) {
        if (data.db) return data.db as DbConfig;
        if (data.host && data.database) {
          return {
            host: data.host,
            port: Number(data.port) || 3306,
            user: data.user || process.env.DB_USER || '',
            password: data.password || process.env.DB_PASSWORD || '',
            database: data.database || process.env.DB_NAME || '',
          };
        }
      }
    }
  } catch (err) {
    console.error('[Config] Error reading config.json:', err);
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  };
}

export const getMySqlConfig = loadSavedConfig;

export function saveConfig(dbConfig: DbConfig) {
  const configData = {
    installed: true,
    installedAt: new Date().toISOString(),
    db: dbConfig,
  };
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configData, null, 2), 'utf-8');
  console.log('[Config] Config saved to config.json');
}

export const saveMySqlConfig = saveConfig;

export function isInstalled(): boolean {
  return true;
}

export function resetInstallation() {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    fs.unlinkSync(CONFIG_FILE_PATH);
  }
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
  currentConfig = null;
}

/**
 * Graceful shutdown helper: closes all pooled connections so the process can
 * exit cleanly on SIGTERM/SIGINT without hanging or leaking connections.
 */
export async function closeMySqlPool(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = null;
    currentConfig = null;
    await p.end().catch(() => {});
    console.log('[DB] MySQL connection pool closed.');
  }
}

export function reinitializePool(newConfig?: DbConfig): mysql.Pool {
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
  return getMySqlPool(newConfig);
}

export function getMySqlPool(customConfig?: DbConfig): mysql.Pool {
  const cfg = customConfig || loadSavedConfig();

  if (!pool || JSON.stringify(currentConfig) !== JSON.stringify(cfg)) {
    if (pool) {
      pool.end().catch(() => {});
    }
    currentConfig = cfg;
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password || '',
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      charset: 'utf8mb4',
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 5000,
    });
  }
  return pool;
}

export async function testMySqlConnection(config?: DbConfig): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const targetConfig = config || loadSavedConfig();
    if (!targetConfig) {
      return { success: false, error: 'تنظیمات دیتابیس MySQL یافت نشد.' };
    }

    const connection = await mysql.createConnection({
      host: targetConfig.host,
      port: targetConfig.port,
      user: targetConfig.user,
      password: targetConfig.password || '',
      connectTimeout: 8000,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${targetConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.changeUser({ database: targetConfig.database });
    await connection.query('SELECT 1 as result');
    await connection.end();

    return { success: true, message: `اتصال به MySQL و دیتابیس ${targetConfig.database} با موفقیت انجام شد.` };
  } catch (err: any) {
    if (err.code !== 'ECONNREFUSED') {
      console.error('MySQL Connection Error:', err);
    }
    return { success: false, error: err.message || 'خطا در برقراری ارتباط با MySQL' };
  }
}

export const testMySqlConfig = testMySqlConnection;

/**
 * Helper to get in-memory or cached Club Settings
 */
let cachedClubSettings: any = {
  name: 'باشگاه سنگ‌نوردی موج',
  slogan: 'اوج افتخار، تمرکز و استقامت در سنگ‌نوردی',
  logoIcon: 'mountain',
  themePalette: 'teal',
  smsApiKey: '',
  smsLineNumber: '30007732',
  smsSignature: 'باشگاه موج',
  baleBotToken: '',
  baleChannelOrChatId: '',
};

export function getClubSettings() {
  return cachedClubSettings;
}

export function setClubSettings(settings: any) {
  cachedClubSettings = { ...cachedClubSettings, ...settings };
}

/**
 * Execute callback within a database transaction block
 */
export async function withTransaction<T>(
  poolOrConn: mysql.Pool | mysql.PoolConnection,
  callback: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  let conn: mysql.PoolConnection;
  let isNewConnection = false;

  if ('getConnection' in poolOrConn) {
    conn = await poolOrConn.getConnection();
    isNewConnection = true;
  } else {
    conn = poolOrConn;
  }

  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    if (isNewConnection) {
      conn.release();
    }
  }
}

const passwordHashCache = new Map<string, string>();

/**
 * Helper to hash passwords asynchronously using bcryptjs with in-memory caching for high performance
 */
export async function hashPassword(plainPassword?: string): Promise<string> {
  if (!plainPassword) return '$2a$10$UnXJgQdE4xS3H5kL3O.5y.S3L4E8K0R6Q2P1M0N9O8P7Q6R5S4T3U';
  if (plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$')) {
    return plainPassword;
  }
  if (passwordHashCache.has(plainPassword)) {
    return passwordHashCache.get(plainPassword)!;
  }
  const hash = await bcrypt.hash(plainPassword, 8);
  passwordHashCache.set(plainPassword, hash);
  return hash;
}

/**
 * Helper to compare plain password against hashed password asynchronously
 */
export async function comparePassword(plainPassword: string, hashedPassword?: string): Promise<boolean> {
  if (!plainPassword || !hashedPassword) return false;
  if (!hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
    return plainPassword === hashedPassword;
  }
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch {
    return false;
  }
}
