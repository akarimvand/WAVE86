import fs from 'fs';
import mysql from 'mysql2/promise';
const BASE = 'http://127.0.0.1:3000';
const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8')).db;
const db = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password || '', database: cfg.database });
let res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: '123' }) });
const { token } = await res.json();
// simulate a frontend that sends an ALREADY-stringified permissions payload
// (the exact condition that used to trigger runaway double-encoding)
const roles = ['admin', 'athlete', 'coach'].map(k => ({
  id: `role-${k === 'admin' ? 'admin' : k}`, key_name: k, title: k,
  description: '', permissions: JSON.stringify([{ action: 'view', resource: 'dashboard' }]),
  isSystem: 1,
}));
res = await fetch(BASE + '/api/mysql/sync', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ roles }),
});
console.log('sync status:', res.status);
for (let round = 1; round <= 3; round++) {
  await fetch(BASE + '/api/mysql/sync', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ roles }),
  });
}
const [rows] = await db.query("SELECT id, LENGTH(permissions) sz, permissions FROM roles WHERE key_name IN ('admin','athlete','coach')");
rows.forEach(r => console.log(r.id, '| size:', r.sz, 'bytes |', JSON.stringify(r.permissions).slice(0, 80)));
const bad = rows.filter(r => r.sz > 500);
console.log(bad.length === 0 ? 'NO REGROWTH ✅' : 'REGROWTH ❌');
await db.query("UPDATE roles SET permissions='[]' WHERE key_name IN ('admin','athlete','coach')");
await db.end(); process.exit(bad.length ? 1 : 0);
