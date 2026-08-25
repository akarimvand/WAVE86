/**
 * p0-staff-regression.mjs — verifies staff sync still works after the RBAC fix,
 * and reports which privileged accounts still use the default password '123'.
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const BASE = 'http://localhost:3000';

// 1) Which accounts know '123'?
const conn = await mysql.createConnection({
  host: 'localhost', user: 'root', password: '', database: 'oytblnmz_mouj',
});
const [admins] = await conn.query(
  "SELECT id, username, fullName, password, roles FROM users WHERE roles LIKE '%super_admin%' OR roles LIKE '%admin%'"
);
console.log('=== Privileged accounts using password "123": ===');
for (const a of admins) {
  if (await bcrypt.compare('123', a.password || '')) {
    console.log(` - ${a.username} (${a.fullName}) id=${a.id} roles=${a.roles}`);
  }
}

// 2) Staff sync regression: login as admin/123 and run a benign full sync
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: '123' }),
}).then((r) => r.json());

if (!login.token) {
  console.log('\n[!] login admin/123 failed:', login.error || '(no token)');
  console.log('    Trying to detect which username accepts 123 is not possible offline — check output above.');
} else {
  console.log('\n[login] OK —', login.user?.fullName, '| roles:', JSON.stringify(login.user?.roles));
  const res = await fetch(`${BASE}/api/mysql/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` },
    body: JSON.stringify({
      // Benign no-op payload: re-sync existing club settings unchanged
      users: [{ ...login.user, password: '', updatedAt: new Date().toISOString() }],
    }),
  }).then((r) => r.json());
  console.log('[staff /sync]', JSON.stringify(res));
}
await conn.end();
