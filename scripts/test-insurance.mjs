/**
 * test-insurance.mjs â€” ØªØ³Øª Ú©Ø§Ù…Ù„ Ù†ÙˆØ´ØªÙ†/Ø®ÙˆØ§Ù†Ø¯Ù† insurance_requests Ø§Ø² Ø·Ø±ÛŒÙ‚ ØªÙ…Ø§Ù… Ù…Ø³ÛŒØ±Ù‡Ø§
 * Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ ØªØ³Øª Ù¾Ø³ Ø§Ø² Ø§Ø¬Ø±Ø§ Ø­Ø°Ù Ù†Ù…ÛŒØ´ÙˆÙ†Ø¯ (Ø·Ø¨Ù‚ Ø¯Ø±Ø®ÙˆØ§Ø³Øª).
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const results = [];
const log = (ok, name, extra = '') => {
  results.push({ ok, name });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
};

// PNG Ù…Ø¹ØªØ¨Ø± Û¸ Ø¨Ø§ÛŒØªÛŒ (magic bytes ØµØ­ÛŒØ­ Ø¨Ø±Ø§ÛŒ validateFileMagicBytes)
const TINY_PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');

async function api(method, url, body, token) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'qdexnhxv_mouj' });
const q = async (sql, p) => (await conn.query(sql, p))[0];

console.log('========== SETUP ==========');
let r = await api('POST', '/api/auth/login', { username: 'admin', password: '123' });
log(r.status === 200 && !!r.json?.token, 'SETUP: login admin/123');
const ADMIN = r.json.token;
const ADMIN_NAME = 'Ù…Ø¯ÛŒØ± Ú©Ù„ Ù…Ø¬Ù…ÙˆØ¹Ù‡';

r = await api('POST', '/api/users', {
  id: 'user-qa-ins-athlete', username: '9900000101', nationalId: '9900000101',
  fullName: 'ÙˆØ±Ø²Ø´Ú©Ø§Ø± ØªØ³Øª Ø¨ÛŒÙ…Ù‡ [QA-TEST]', firstName: 'ØªØ³Øª', lastName: 'Ø¨ÛŒÙ…Ù‡',
  phone: '09120000001', roles: ['athlete'], activeRole: 'athlete',
  isActive: true, password: 'QaTest!123', createdAt: '1405/06/02',
}, ADMIN);
log([200,201,409].includes(r.status), 'SETUP: create QA athlete (ÙØ±Ù… Ù…Ø¯ÛŒØ±ÛŒØª Ú©Ø§Ø±Ø¨Ø±Ø§Ù†)', `http=${r.status}`);

const [athRows] = await conn.query("SELECT id, version FROM users WHERE id='user-qa-ins-athlete'");
const ATHLETE_ID = athRows[0]?.id;
const ATH_VER = Number(athRows[0]?.version || 1);
log(!!ATHLETE_ID, 'SETUP: QA athlete present in DB', ATHLETE_ID);

console.log('\n========== TEST A: Ø«Ø¨Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¬Ø¯ÛŒØ¯ (ÙØ±Ù… ÙˆØ±Ø²Ø´Ú©Ø§Ø± -> sync) ==========');
const nowUpd = () => new Date().toISOString();
const reqA = {
  id: 'ins-qa-test-001', userId: ATHLETE_ID,
  userName: 'ÙˆØ±Ø²Ø´Ú©Ø§Ø± ØªØ³Øª Ø¨ÛŒÙ…Ù‡ [QA-TEST]', userNationalId: '9900000101',
  insuranceNumber: 'QA-INS-1001', startDate: '1405/06/01', expiryDate: '1406/06/01',
  documentUrl: TINY_PNG, fileName: 'qa-card.png', status: 'pending',
  createdAt: '1405/06/02', updatedAt: nowUpd(),
};
r = await api('POST', '/api/mysql/sync', { insuranceRequests: [reqA] }, ADMIN);
log(r.status === 200 && r.json?.success === true, 'A1: POST /api/mysql/sync (submit pending)', `http=${r.status}`);

let dbRow = (await q('SELECT * FROM insurance_requests WHERE id=?', ['ins-qa-test-001']))[0];
log(!!dbRow, 'A2: row exists in MySQL');
log(dbRow?.status === 'pending' && dbRow?.insuranceNumber === 'QA-INS-1001', 'A3: fields persisted', JSON.stringify({ st: dbRow?.status, no: dbRow?.insuranceNumber }));
const docConverted = typeof dbRow?.documentUrl === 'string' && dbRow.documentUrl.startsWith('/uploads/');
log(docConverted, 'A4: base64 converted to file URL', dbRow?.documentUrl);
if (docConverted) {
  const rel = dbRow.documentUrl.replace(/^\/uploads\//, '');
  const filePath = path.join(process.cwd(), 'uploads', ...rel.split('/'));
  log(fs.existsSync(filePath), 'A5: uploaded file physically exists on disk', `${path.basename(filePath)} (${fs.existsSync(filePath) ? fs.statSync(filePath).size + 'B' : 'MISSING'})`);
}

console.log('\n========== TEST B: Ø§Ø±Ø³Ø§Ù„ Ù…Ø¬Ø¯Ø¯ Ù‡Ù…Ø§Ù† id (upsert) ==========');
const reqB = { ...reqA, insuranceNumber: 'QA-INS-1001-B', updatedAt: nowUpd() };
r = await api('POST', '/api/mysql/sync', { insuranceRequests: [reqB] }, ADMIN);
log(r.status === 200, 'B1: re-sync same id (update)');
dbRow = (await q('SELECT insuranceNumber FROM insurance_requests WHERE id=?', ['ins-qa-test-001']))[0];
log(dbRow?.insuranceNumber === 'QA-INS-1001-B', 'B2: row UPDATED not duplicated', dbRow?.insuranceNumber);

console.log('\n========== TEST C: ØªØ§ÛŒÛŒØ¯ Ø§Ø¯Ù…ÛŒÙ† + Ù‡Ù…Ú¯Ø§Ù…â€ŒØ³Ø§Ø²ÛŒ ÙˆØ¶Ø¹ÛŒØª Ú©Ø§Ø±Ø¨Ø± ==========');
const reqC = { ...reqB, status: 'approved', reviewedAt: nowUpd(), reviewedBy: ADMIN_NAME, updatedAt: nowUpd() };
const userC = {
  id: ATHLETE_ID, fullName: 'ÙˆØ±Ø²Ø´Ú©Ø§Ø± ØªØ³Øª Ø¨ÛŒÙ…Ù‡ [QA-TEST]', nationalId: '9900000101',
  roles: ['athlete'], activeRole: 'athlete', isActive: true,
  insuranceNumber: 'QA-INS-1001-B', insuranceExpiryDate: '1406/06/01', isInsuranceValid: true,
  version: ATH_VER, updatedAt: nowUpd(),
};
r = await api('POST', '/api/mysql/sync', { insuranceRequests: [reqC], users: [userC] }, ADMIN);
log(r.status === 200, 'C1: approve via sync (+user flags)', `http=${r.status}`);
dbRow = (await q('SELECT status, reviewedBy FROM insurance_requests WHERE id=?', ['ins-qa-test-001']))[0];
log(dbRow?.status === 'approved' && !!dbRow?.reviewedBy, 'C2: DB status=approved + reviewer set', `${dbRow?.status}/${dbRow?.reviewedBy}`);
const uRow = (await q('SELECT insuranceNumber, isInsuranceValid FROM users WHERE id=?', [ATHLETE_ID]))[0];
log(uRow?.isInsuranceValid === 1 && uRow?.insuranceNumber === 'QA-INS-1001-B', 'C3: users.insurance flags synced', JSON.stringify(uRow));

console.log('\n========== TEST D: Ø±Ø¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øª (Ù…Ø³ÛŒØ± reject) ==========');
const reqD = {
  id: 'ins-qa-test-003', userId: ATHLETE_ID,
  userName: 'ÙˆØ±Ø²Ø´Ú©Ø§Ø± ØªØ³Øª Ø¨ÛŒÙ…Ù‡ [QA-TEST]', userNationalId: '9900000101',
  insuranceNumber: 'QA-INS-1003', startDate: '1405/06/01', expiryDate: '1406/06/01',
  documentUrl: '', fileName: '', status: 'rejected', rejectionReason: 'QA: ØªØµÙˆÛŒØ± Ú©Ø§Ø±Øª Ù†Ø§Ø®ÙˆØ§Ù†Ø§ Ø§Ø³Øª',
  createdAt: '1405/06/02', updatedAt: nowUpd(),
};
r = await api('POST', '/api/mysql/sync', { insuranceRequests: [reqD] }, ADMIN);
dbRow = (await q('SELECT status, rejectionReason FROM insurance_requests WHERE id=?', ['ins-qa-test-003']))[0];
log(r.status === 200 && dbRow?.status === 'rejected' && !!dbRow?.rejectionReason, 'D1: rejected + reason persisted', dbRow?.status);

console.log('\n========== TEST E: Ù…Ø³ÛŒØ± ØªØ´Ø®ÛŒØµÛŒ sync-detailed ==========');
const reqE = {
  id: 'ins-qa-test-004', userId: ATHLETE_ID,
  userName: 'ÙˆØ±Ø²Ø´Ú©Ø§Ø± ØªØ³Øª Ø¨ÛŒÙ…Ù‡ [QA-TEST]', userNationalId: '9900000101',
  insuranceNumber: 'QA-INS-1004', startDate: '1405/06/01', expiryDate: '1406/06/01',
  documentUrl: '', fileName: '', status: 'pending', createdAt: '1405/06/02', updatedAt: nowUpd(),
};
r = await api('POST', '/api/mysql/sync-detailed', { insuranceRequests: [reqE] }, ADMIN);
const step = (r.json?.steps || []).find(s => s.table === 'insurance_requests');
log(r.status === 200 && r.json?.summary?.failedTables === 0, 'E1: sync-detailed succeeded', JSON.stringify(r.json?.summary));
log(!!step, 'E2: insuranceRequests step reported', step ? step.title : 'N/A');

console.log('\n========== TEST F: Ø®ÙˆØ§Ù†Ø¯Ù† GET /api/club/insurance (staffGuard) ==========');
r = await api('GET', '/api/club/insurance', null, ADMIN);
const listIds = (r.json?.insuranceRequests || []).map(x => x.id).filter(id => String(id).startsWith('ins-qa-test'));
log(r.status === 200, 'F1: GET /api/club/insurance ok', `total=${(r.json?.insuranceRequests || []).length}`);
log(listIds.length >= 3, 'F2: QA rows visible to staff', listIds.join(','));

r = await api('GET', '/api/club/insurance');
log(r.status === 403 || r.status === 401, 'F3: anonymous blocked (401/403)', `http=${r.status}`);

console.log('\n========== TEST G: Ø®ÙˆØ§Ù†Ø¯Ù† full-data Ø¨Ø§ ÙÛŒÙ„ØªØ± PII Ø³Ù‡â€ŒØ³Ø·Ø­ÛŒ ==========');
let fd = await api('GET', '/api/mysql/full-data', null, ADMIN);
const adminSees = (fd.json?.data?.insuranceRequests || []).filter(x => String(x.id).startsWith('ins-qa-test')).length;
log(fd.status === 200 && adminSees >= 3, 'G1: staff sees QA requests in full-data', `count=${adminSees}`);

fd = await api('GET', '/api/mysql/full-data');
const anonCount = (fd.json?.data?.insuranceRequests || []).length;
log(fd.status === 200 && anonCount === 0, 'G2: anonymous gets EMPTY insuranceRequests (PII filter)', `count=${anonCount}`);

console.log('\n========== FINAL: Ø´Ù…Ø§Ø±Ø´ Ù…Ø³ØªÙ‚ÛŒÙ… DB ==========');
const [[{ cnt }]] = await conn.query("SELECT COUNT(*) AS cnt FROM insurance_requests WHERE id LIKE 'ins-qa-test%'");
const [all] = await conn.query("SELECT id, status, insuranceNumber, reviewedBy FROM insurance_requests WHERE id LIKE 'ins-qa-test%' ORDER BY id");
log(cnt >= 3, 'FINAL: QA rows persisted in MySQL (kept, NOT deleted)', `rows=${cnt}`);
console.table(all);

const pass = results.filter(r => r.ok).length;
console.log(`\n================ RESULT: ${pass}/${results.length} PASSED =================`);
await conn.end();
process.exit(pass === results.length ? 0 : 1);

