/**
 * rebuild-db.mjs — بازسازی کامل دیتابیس مطابق database/schema.sql
 * مراحل: اتصال → بررسی وجود DB → بکاپ JSON از داده فعلی → اجرای schema.sql → تأیید
 * استفاده: node scripts/rebuild-db.mjs
 * متغیرهای محیطی اختیاری: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const HOST = process.env.DB_HOST || 'localhost';
const PORT = Number(process.env.DB_PORT) || 3306;
const USER = process.env.DB_USER || 'root';
const PASS = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME || 'qdexnhxv_mouj';

const SCHEMA_FILE = path.resolve(process.cwd(), 'database', 'schema.sql');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

function splitStatements(sql) {
  const stripped = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  console.log(`[Rebuild] Target: ${USER}@${HOST}:${PORT}/${DB_NAME}`);

  // ---------- 1) Connect (server-level, no database) ----------
  let conn;
  try {
    conn = await mysql.createConnection({ host: HOST, port: PORT, user: USER, password: PASS, connectTimeout: 8000 });
  } catch (err) {
    console.error('[Rebuild] FAILED to connect:', err.code || '', err.message);
    process.exit(2);
  }
  const [dbs] = await conn.query('SHOW DATABASES LIKE ?', [DB_NAME]);
  if (!dbs || dbs.length === 0) {
    console.error(`[Rebuild] Database "${DB_NAME}" does NOT exist on this server.`);
    await conn.end();
    process.exit(3);
  }
  console.log(`[Rebuild] Database "${DB_NAME}" found.`);

  // ---------- 2) Backup current data ----------
  await conn.changeUser({ database: DB_NAME });
  const [existingTables] = await conn.query('SHOW TABLES');
  const tableNames = (existingTables || []).map((r) => Object.values(r)[0]);
  console.log(`[Rebuild] Existing tables: ${tableNames.length}`);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(BACKUP_DIR, `pre-rebuild_${DB_NAME}_${stamp}.json`);
  const backup = { backupDate: new Date().toISOString(), reason: 'pre-rebuild', database: DB_NAME, data: {} };

  for (const t of tableNames) {
    try {
      const [rows] = await conn.query(`SELECT * FROM \`${t}\``);
      backup.data[t] = rows;
      console.log(`[Backup] ${t}: ${(rows || []).length} row(s)`);
    } catch (e) {
      console.warn(`[Backup] ${t}: READ FAILED (${e.message}) — recorded as null`);
      backup.data[t] = null;
    }
  }
  fs.writeFileSync(backupFile, JSON.stringify(backup), 'utf-8');
  console.log(`[Backup] Saved → ${backupFile} (${(fs.statSync(backupFile).size / 1024).toFixed(1)} KB)`);

  // ---------- 3) Execute schema.sql ----------
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`[Rebuild] schema.sql not found at ${SCHEMA_FILE}`);
    await conn.end();
    process.exit(4);
  }
  const statements = splitStatements(fs.readFileSync(SCHEMA_FILE, 'utf-8'));
  console.log(`[Rebuild] Executing ${statements.length} statements from schema.sql ...`);

  let done = 0;
  let tolerated = 0;
  const TOLERATED_CODES = new Set(['ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME', 'ER_FK_DUP_NAME', 'ER_DUP_CONSTRAINT_NAME']);
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      done++;
    } catch (err) {
      // Idempotent tolerance — same policy as server/migrations.ts for
      // objects that schema.sql defines twice (CREATE TABLE index + trailing ALTER).
      if (TOLERATED_CODES.has(err.code)) {
        tolerated++;
        console.warn(`[Rebuild] skipped already-existing object (${err.code}): ${stmt.slice(0, 90)}...`);
        done++;
        continue;
      }
      console.error('[Rebuild] STATEMENT FAILED:\n', stmt.slice(0, 300), '\nERROR:', err.code || '', err.message);
      console.error('[Rebuild] Aborting. Backup of previous data is preserved at:', backupFile);
      await conn.end();
      process.exit(5);
    }
  }
  console.log(`[Rebuild] ${done}/${statements.length} statements processed (${tolerated} tolerated duplicates).`);

  // ---------- 4) Verify ----------
  const [tablesAfter] = await conn.query('SHOW TABLES');
  const finalTables = (tablesAfter || []).map((r) => Object.values(r)[0]).sort();
  console.log('\n===== RESULT =====');
  console.log(`Tables created: ${finalTables.length}`);
  finalTables.forEach((t) => process.stdout.write(`  - ${t}\n`));

  for (const t of ['users', 'roles', 'user_roles']) {
    if (finalTables.includes(t)) {
      const [cnt] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
      console.log(`${t}: ${cnt[0].c} row(s)`);
    }
  }

  await conn.end();
  console.log('\n[Rebuild] DONE ✅');
}

main();
