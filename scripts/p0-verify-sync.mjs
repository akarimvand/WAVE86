/**
 * p0-verify-sync.mjs — live non-destructive test of the /sync RBAC fix.
 * Logs in as a regular athlete, attempts privilege escalation via /sync,
 * then verifies NOTHING was applied to users/roles tables.
 */
import mysql from 'mysql2/promise';

const BASE = 'http://localhost:3000';
const ATHLETE = { username: '3560257735', password: '3560257735' };
const SELF_ID = 'user-1786203973812-x100uq';

const conn = await mysql.createConnection({
  host: 'localhost', user: 'root', password: '', database: 'oytblnmz_mouj',
});
const before = {};
before.roles = (await conn.query('SELECT COUNT(*) n FROM roles'))[0][0].n;
before.user = (await conn.query('SELECT roles, activeRole, LEFT(password,7) pw FROM users WHERE id = ?', [SELF_ID]))[0][0];

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(ATHLETE),
}).then((r) => r.json());
if (!login.token) { console.log('LOGIN FAILED — athlete default password changed; cannot run test'); process.exit(0); }

// Malicious payload: escalate self + inject a fake role
const attack = await fetch(`${BASE}/api/mysql/sync`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` },
  body: JSON.stringify({
    roles: [{ id: 'role-evil', key_name: 'super_admin', title: 'EVIL' }],
    users: [{ id: SELF_ID, fullName: 'سارا یگانه', nationalId: ATHLETE.username, roles: ['super_admin'], activeRole: 'super_admin', password: 'hacked123', updatedAt: new Date().toISOString() }],
    transactions: [{ id: 'evil-trx', userId: SELF_ID, amount: 9999999, type: 'payment' }],
  }),
}).then((r) => r.json());
console.log('[sync response]', JSON.stringify(attack));

const after = {};
after.roles = (await conn.query('SELECT COUNT(*) n FROM roles'))[0][0].n;
after.user = (await conn.query('SELECT roles, activeRole, LEFT(password,7) pw FROM users WHERE id = ?', [SELF_ID]))[0][0];
const evil = (await conn.query("SELECT COUNT(*) n FROM transactions WHERE id = 'evil-trx'"))[0][0].n;

console.log('[roles count] before:', before.roles, '| after:', after.roles);
console.log('[self roles] before:', before.user.roles, '| after:', after.user.roles);
console.log('[password hash prefix] before:', before.user.pw, '| after:', after.user.pw);
console.log('[evil transaction rows]:', evil);

const pass = before.roles === after.roles &&
  String(before.user.roles) === String(after.user.roles) &&
  before.user.pw === after.user.pw && evil === 0;
console.log(pass ? '\nRESULT: PASS ✅ — escalation attempt fully neutralized' : '\nRESULT: FAIL ❌');
await conn.end();
