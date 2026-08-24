import fs from 'fs';
import mysql from 'mysql2/promise';
const BASE = 'http://127.0.0.1:3000';
const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8')).db;
const db = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password || '', database: cfg.database });
let res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: '123' }) });
const { token } = await res.json();
// cleanup leftovers from previous runs first
await db.query("DELETE FROM enrollments WHERE userId='usr-admin-1'");
// need an active session + admin user
const [sess] = await db.query("SELECT id FROM courses WHERE isActive = 1 LIMIT 1");
if (!sess.length) { console.log('NO ACTIVE SESSION — create one first'); process.exit(1); }
const sessionId = sess[0].id;
const CID = `enr-dupfix-${Date.now()}`;
// 1) REST POST with client id
res = await fetch(BASE + '/api/courses/enrollments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ id: CID, sessionId, userId: 'usr-admin-1', paymentMethod: 'pos' }),
});
console.log('POST status:', res.status);
const j = await res.json().catch(() => null);
console.log('server used client id?', j?.enrollment?.id === CID ? 'YES ✅' : 'NO ❌ (' + j?.enrollment?.id + ')');
// 2) simulate the follow-up full-state sync carrying the local row under SAME id
const [row] = await db.query('SELECT * FROM enrollments WHERE id = ?', [CID]);
if (!row.length) { console.log('ROW MISSING'); process.exit(1); }
res = await fetch(BASE + '/api/mysql/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ enrollments: [{ ...row[0] }] }),
});
console.log('sync upsert status:', res.status);
// 3) count rows for this person+session
const [cnt] = await db.query('SELECT COUNT(*) n FROM enrollments WHERE sessionId=? AND userId=? AND status="active"', [sessionId, 'usr-admin-1']);
console.log('rows for athlete in session:', cnt[0].n, cnt[0].n === 1 ? '✅ no duplicate' : '❌ DUPLICATED');
// cleanup
await db.query('DELETE FROM enrollments WHERE id = ?', [CID]);
await db.end(); process.exit(0);
