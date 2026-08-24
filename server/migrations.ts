import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database', 'migrations');

/**
 * Splits a .sql file into individual executable statements.
 * The main pool does NOT enable multipleStatements (security), so each
 * statement must be executed separately. Comment lines are stripped first.
 */
function splitSqlStatements(sql: string): string[] {
  const stripped = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Migration runner — applies pending .sql migration files once, in sorted order.
 * Applied migrations are recorded in the `schema_migrations` table so they are
 * never re-applied. Each file is executed statement-by-statement; duplicate
 * column/index errors are tolerated so a partially-applied migration can resume.
 */
export async function runMigrations(pool: mysql.Pool): Promise<{ applied: string[]; skipped: string[] }> {
  const applied: string[] = [];
  const skipped: string[] = [];

  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(255) PRIMARY KEY,
    description VARCHAR(255),
    appliedAt VARCHAR(100)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return { applied, skipped };
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  const [rows]: any = await pool.query('SELECT id FROM schema_migrations');
  const appliedSet = new Set((rows || []).map((r: any) => r.id));

  for (const file of files) {
    if (appliedSet.has(file)) {
      skipped.push(file);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const statements = splitSqlStatements(sql);

    try {
      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (stmtErr: any) {
          // Tolerate idempotent re-application artifacts (partial prior run)
          const code = stmtErr?.code || '';
          if (code === 'ER_DUP_FIELDNAME' || code === 'ER_DUP_KEYNAME') {
            console.warn(`[Migration] ${file}: skipping already-existing object (${code})`);
            continue;
          }
          throw stmtErr;
        }
      }

      await pool.query(
        'INSERT INTO schema_migrations (id, description, appliedAt) VALUES (?, ?, ?)',
        [file, file, new Date().toISOString()]
      );
      console.log(`[Migration] Applied ${file} (${statements.length} statements)`);
      applied.push(file);
    } catch (err: any) {
      console.error(`[Migration] FAILED ${file}:`, err.message || err);
      throw new Error(`Migration ${file} failed: ${err.message || err}`);
    }
  }

  return { applied, skipped };
}