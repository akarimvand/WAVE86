/**
 * p0-fix.mjs — one-off operational remediation (P0):
 * 1) Hash all legacy plaintext passwords with bcrypt cost 10
 * 2) Rotate the default admin/123 credential to a strong random password
 * 3) Force mustChangePassword=1 so the operator sets a personal password at next login
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: 'root',
  password: '',
  database: process.env.DB_NAME || 'oytblnmz_mouj',
});

// --- Step 1: hash plaintext passwords ---
const [rows] = await conn.query(
  "SELECT id, username FROM users WHERE password IS NOT NULL AND password <> '' AND password NOT LIKE '%$2%'"
);
let hashed = 0;
for (const u of rows) {
  const [row] = await conn.query('SELECT password FROM users WHERE id = ?', [u.id]);
  const plain = row[0].password;
  if (!plain || plain.startsWith('$2a$') || plain.startsWith('$2b$')) continue;
  const h = await bcrypt.hash(plain, 10);
  await conn.query('UPDATE users SET password = ? WHERE id = ?', [h, u.id]);
  hashed++;
}
console.log(`[1] Hashed ${hashed} plaintext passwords (of ${rows.length} found).`);

// --- Step 2: rotate default admin credential ---
const [admins] = await conn.query(
  "SELECT id, username FROM users WHERE (username = 'admin' OR id = 'usr-admin-1') LIMIT 5"
);
for (const a of admins) {
  const [row] = await conn.query('SELECT password FROM users WHERE id = ?', [a.id]);
  const ok = await bcrypt.compare('123', row[0].password || '');
  if (ok) {
    const newPwd = 'Mouj!' + crypto.randomBytes(6).toString('base64url');
    const h = await bcrypt.hash(newPwd, 10);
    await conn.query('UPDATE users SET password = ?, mustChangePassword = 1 WHERE id = ?', [h, a.id]);
    console.log(`[2] Admin "${a.username}" password rotated. NEW PASSWORD (one-time): ${newPwd}`);
    console.log('    mustChangePassword=1 — the system will force a change at next login.');
  } else {
    console.log(`[2] Admin "${a.username}" no longer uses the default password — skipped.`);
  }
}

await conn.end();
console.log('[done]');
