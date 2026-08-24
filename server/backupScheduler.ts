import fs from 'fs';
import path from 'path';
import { getMySqlPool } from './db';

const LOCAL_BACKUP_DIR = path.resolve(process.cwd(), 'backups', 'auto');
// Off-server target: a mounted network share / second disk / synced folder.
// Configure via env (e.g. BACKUP_REMOTE_DIR=\\\\nas\\backups or /mnt/backup-remote)
const REMOTE_BACKUP_DIR = process.env.BACKUP_REMOTE_DIR || '';

const RETENTION_DAILY_DAYS = 7;
const RETENTION_WEEKLY_COUNT = 4;
const RETENTION_MONTHLY_COUNT = 3;

const BACKUP_TABLES = [
  'roles',
  'users',
  'parent_athlete_links',
  'audit_logs',
  'pre_registrations',
  'club_settings',
  'club_announcements',
  'courses',
  'enrollments',
  'transactions',
  'attendance_records',
  'debtors',
  'creditors',
  'insurance_requests',
  'support_tickets',
  'app_notifications',
  'products',
  'shop_invoice_items',
  'shop_invoices',
  'sms_logs',
];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Creates one full JSON backup of every business table and writes it to the
 * local auto-backup dir AND (when configured) to the off-server remote dir.
 */
export async function createAutoBackup(reason: 'daily' | 'manual' = 'daily'): Promise<{ filename: string; size: number; localPath: string; remotePath?: string }> {
  const pool = getMySqlPool();
  const data: Record<string, any[]> = {};

  for (const table of BACKUP_TABLES) {
    try {
      const [rows]: any = await pool.query(`SELECT * FROM \`${table}\``);
      data[table] = rows || [];
    } catch (err: any) {
      // A missing table should not abort the whole backup; record it empty.
      console.error(`[BackupScheduler] Failed to read table ${table}:`, err.message || err);
      data[table] = [];
    }
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `moj_auto_${reason}_${stamp}.json`;

  const payload = {
    backupDate: now.toISOString(),
    reason,
    version: '2.0.0',
    app: 'WAVE86 Climbing Club',
    tables: BACKUP_TABLES,
    data,
  };

  ensureDir(LOCAL_BACKUP_DIR);
  const localPath = path.join(LOCAL_BACKUP_DIR, filename);
  fs.writeFileSync(localPath, JSON.stringify(payload), 'utf-8');
  const size = fs.statSync(localPath).size;

  let remotePath: string | undefined;
  if (REMOTE_BACKUP_DIR) {
    try {
      ensureDir(REMOTE_BACKUP_DIR);
      remotePath = path.join(REMOTE_BACKUP_DIR, filename);
      fs.writeFileSync(remotePath, JSON.stringify(payload), 'utf-8');
    } catch (err: any) {
      console.error('[BackupScheduler] Remote copy failed:', err.message || err);
    }
  }

  console.log(`[BackupScheduler] Backup created: ${filename} (${(size / 1024).toFixed(1)} KB) local${remotePath ? ' + remote' : ''}`);
  return { filename, size, localPath, remotePath };
}

/**
 * Retention policy:
 *   - keep EVERY backup from the last 7 days            (daily)
 *   - keep the newest per ISO-week for the next 4 weeks (weekly)
 *   - keep the newest per month after that, up to 3     (monthly)
 *   - delete everything else
 */
export function applyRetention(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let deleted = 0;

  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const full = path.join(dir, f);
      return { file: f, full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime); // newest first

  const now = Date.now();
  const seenWeeks = new Set<string>();
  const seenMonths = new Set<string>();
  let weeklyKept = 0;
  let monthlyKept = 0;

  for (const e of entries) {
    const ageDays = (now - e.mtime) / 86_400_000;
    const d = new Date(e.mtime);

    if (ageDays <= RETENTION_DAILY_DAYS) continue; // daily window: keep all

    if (ageDays <= RETENTION_DAILY_DAYS + 28) {
      // weekly bucket: one per ISO-ish week (year-weekNum)
      const weekKey = `${d.getUTCFullYear()}-W${Math.floor(
        (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
          Date.UTC(d.getUTCFullYear(), 0, 1)) /
          604_800_000
      )}`;
      if (!seenWeeks.has(weekKey) && weeklyKept < RETENTION_WEEKLY_COUNT) {
        seenWeeks.add(weekKey);
        weeklyKept++;
        continue;
      }
    }

    const monthKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!seenMonths.has(monthKey) && monthlyKept < RETENTION_MONTHLY_COUNT) {
      seenMonths.add(monthKey);
      monthlyKept++;
      continue;
    }

    try {
      fs.unlinkSync(e.full);
      deleted++;
    } catch (err: any) {
      console.error(`[BackupScheduler] Failed deleting ${e.file}:`, err.message || err);
    }
  }

  if (deleted > 0) console.log(`[BackupScheduler] Retention removed ${deleted} old backup(s) from ${dir}`);
  return deleted;
}

/**
 * Starts the background scheduler.
 * Interval: BACKUP_INTERVAL_HOURS env (default 24h). Also creates an immediate
 * backup on boot when none exists for today, so a fresh deployment is protected.
 */
export function startBackupScheduler(): void {
  const intervalHours = Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS) || 24);
  let running = false;

  const runCycle = async () => {
    if (running) return;
    running = true;
    try {
      await createAutoBackup('daily');
      applyRetention(LOCAL_BACKUP_DIR);
      if (REMOTE_BACKUP_DIR) applyRetention(REMOTE_BACKUP_DIR);
    } catch (err: any) {
      console.error('[BackupScheduler] Cycle failed:', err.message || err);
    } finally {
      running = false;
    }
  };

  // First run shortly after boot (lets migrations finish), then on interval.
  setTimeout(() => {
    runCycle();
    setInterval(runCycle, intervalHours * 3_600_000);
  }, 60_000);

  console.log(`[BackupScheduler] Active — interval ${intervalHours}h, local=${LOCAL_BACKUP_DIR}${REMOTE_BACKUP_DIR ? `, remote=${REMOTE_BACKUP_DIR}` : ', remote=NOT CONFIGURED (set BACKUP_REMOTE_DIR)'}`);
}