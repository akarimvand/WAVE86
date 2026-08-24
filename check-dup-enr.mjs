import fs from 'fs';
import mysql from 'mysql2/promise';
const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8')).db;
const c = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password || '', database: cfg.database });
const [dups] = await c.query("SELECT sessionId, userId, COUNT(*) n, GROUP_CONCAT(id) ids, GROUP_CONCAT(status) st FROM enrollments GROUP BY sessionId, userId HAVING n > 1");
console.log('== DUP (sessionId,userId) any-status ==');
dups.forEach(r => console.log(r.sessionId, '|', r.userId, '| x' + r.n, '|', r.ids, '|', r.st));
const [act] = await c.query("SELECT sessionId, userId, COUNT(*) n FROM enrollments WHERE status='active' GROUP BY sessionId, userId HAVING n > 1");
console.log('== DUP active-only:', act.length);
const [byStatus] = await c.query("SELECT status, COUNT(*) n FROM enrollments GROUP BY status");
console.log('== status counts ==');
byStatus.forEach(r => console.log(r.status, r.n));
// sample one session's rows as the UI would fetch them
const [sample] = await c.query("SELECT e.id, e.sessionId, e.userId, e.athleteName, e.status FROM enrollments e ORDER BY e.sessionId LIMIT 12");
console.log('== sample rows ==');
sample.forEach(r => console.log(r.sessionId, '|', r.userId, '|', r.status, '|', r.athleteName));
await c.end(); process.exit(0);
