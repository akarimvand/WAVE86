/**
 * migrate-links.mjs — ساخت مجدد parent_athlete_links بر اساس دیتای فعلی
 * ورودی: database/oldlink.txt (دامپ قدیمی users + links با ID های قدیمی)
 * کلید تطبیق: nationalId (پایدار بین دیتابیس‌ها)
 * خروجی: database/new_parent_athlete_links.sql (+ اعمال اختیاری با --apply)
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const HOST = process.env.DB_HOST || 'localhost';
const PORT = Number(process.env.DB_PORT) || 3306;
const USER = process.env.DB_USER || 'root';
const PASS = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME || 'qdexnhxv_mouj';
const APPLY = process.argv.includes('--apply');

const SRC = path.resolve(process.cwd(), 'database', 'oldlink.txt');
const OUT = path.resolve(process.cwd(), 'database', 'new_parent_athlete_links.sql');

/** Parser توپل‌های SQL با پشتیبانی escape های \' و \\ و '' */
function parseTuples(sectionText) {
  const tuples = [];
  let i = sectionText.indexOf('(');
  while (i !== -1) {
    let fields = [];
    let cur = '';
    let inStr = false;
    let valid = false;
    // ★ اسکن از «بعد از» پرانتز باز شروع میشود
    let j = i + 1;
    for (; j < sectionText.length; j++) {
      const ch = sectionText[j];
      if (inStr) {
        if (ch === '\\') { cur += ch + (sectionText[j + 1] || ''); j++; continue; }
        if (ch === "'") {
          if (sectionText[j + 1] === "'") { cur += "''"; j++; continue; }
          inStr = false; cur += ch; continue;
        }
        cur += ch; continue;
      }
      if (ch === "'") { inStr = true; cur += ch; continue; }
      if (ch === ',') { fields.push(cur.trim()); cur = ''; continue; }
      if (ch === ')') { fields.push(cur.trim()); valid = true; break; }
      cur += ch;
    }
    if (!valid) break;
    tuples.push(fields);
    j++;
    while (j < sectionText.length && sectionText[j] !== '(') {
      if (sectionText[j] === ';') return tuples; // پایان statement
      j++;
    }
    i = j;
  }
  return tuples;
}

function unquote(v) {
  if (v === undefined || v === 'NULL') return null;
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/\\"/g, '"');
  }
  return v;
}

function normalizeNat(v) {
  if (!v) return '';
  return String(v).trim()
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

// ---------- 1) Parse oldlink.txt ----------
const raw = fs.readFileSync(SRC, 'utf-8');
const usersStart = raw.indexOf("INSERT INTO `users`");
const linksStart = raw.indexOf("INSERT INTO `parent_athlete_links`");
if (usersStart === -1 || linksStart === -1) {
  console.error('[Migrate] oldlink.txt does not contain expected INSERT sections.');
  process.exit(1);
}

const oldUsersRaw = parseTuples(raw.slice(usersStart, linksStart));
const oldLinksRaw = parseTuples(raw.slice(linksStart));

// ستون‌های users طبق هدر فایل: index 0=id, 8=nationalId, 5=fullName
const oldUsers = new Map(); // oldId -> {nationalId, fullName}
for (const t of oldUsersRaw) {
  if (!t[0] || !t[0].startsWith("'")) continue; // رد کردن توپل سرآیند (لیست ستون‌ها)
  const id = unquote(t[0]);
  const nationalId = normalizeNat(unquote(t[8]));
  const fullName = unquote(t[5]);
  oldUsers.set(id, { nationalId, fullName });
}

const oldLinks = [];
for (const t of oldLinksRaw) {
  if (!t[0] || !t[0].startsWith("'")) continue; // رد کردن توپل سرآیند
  oldLinks.push({
    id: unquote(t[0]),
    parentId: unquote(t[1]),
    athleteId: unquote(t[2]),
    relationType: unquote(t[3]) || 'father',
    createdAt: unquote(t[4]) || '',
  });
}
console.log(`[Migrate] Parsed ${oldUsers.size} old users, ${oldLinks.length} old links.`);

// ---------- 2) Current users ----------
const conn = await mysql.createConnection({ host: HOST, port: PORT, user: USER, password: PASS, database: DB_NAME });
const [rows] = await conn.query("SELECT id, username, nationalId, fullName, roles FROM users");
const natToNew = new Map();
const dupes = [];
for (const r of rows) {
  for (const key of [normalizeNat(r.nationalId), normalizeNat(r.username)]) {
    if (!key) continue;
    if (natToNew.has(key) && natToNew.get(key) !== r.id) dupes.push(key);
    else natToNew.set(key, r.id);
  }
}
if (dupes.length) {
  console.warn(`[Migrate] WARNING — duplicate nationalId keys in current DB: ${[...new Set(dupes)].join(', ')}`);
}

// ---------- 3) Map & build rows ----------
const mapped = [];
const missing = [];
for (const l of oldLinks) {
  const pOld = oldUsers.get(l.parentId);
  const aOld = oldUsers.get(l.athleteId);
  const pKey = pOld ? pOld.nationalId : '';
  const aKey = aOld ? aOld.nationalId : '';
  const newParent = natToNew.get(pKey);
  const newAthlete = natToNew.get(aKey);
  if (!pOld || !aOld || !newParent || !newAthlete) {
    const reason = !pOld ? `parent old-id not found (${l.parentId})`
      : !aOld ? `athlete old-id not found (${l.athleteId})`
      : !newParent ? `parent nationalId "${pKey}" (${pOld.fullName}) NOT in current DB`
      : `athlete nationalId "${aKey}" (${aOld.fullName}) NOT in current DB`;
    missing.push({ link: l.id, reason });
    continue;
  }
  if (newParent === newAthlete) {
    missing.push({ link: l.id, reason: `parent & athlete resolved to SAME user (${newParent})` });
    continue;
  }
  mapped.push({
    id: l.id,
    parentId: newParent,
    athleteId: newAthlete,
    relationType: l.relationType,
    createdAt: l.createdAt,
    pName: pOld.fullName, aName: aOld.fullName,
  });
}
console.log(`\n[Migrate] Mapped ${mapped.length}/${oldLinks.length} links; unresolved: ${missing.length}`);
missing.forEach(m => console.warn(`   X ${m.link}: ${m.reason}`));
console.log('\n--- Mapping preview ---');
mapped.forEach(m => console.log(`  ${m.relationType.padEnd(6)} | ${m.pName} -> ${m.aName}`));

// ---------- 4) Generate SQL ----------
const esc = (s) => s === null ? 'NULL' : `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
let sql = `-- ============================================================================
-- new_parent_athlete_links.sql — بازسازی لینک‌های والد/فرزند برای دیتابیس فعلی
-- ----------------------------------------------------------------------------
-- تولیدشده در: ${new Date().toISOString()}
-- منبع: database/oldlink.txt (لینک‌های قدیمی) | کلید تطبیق: nationalId
-- نتیجه: ${mapped.length} لینک نگاشت شد، ${missing.length} لینک حل نشد
-- قابل اجرای مجدد (INSERT IGNORE) — FK به users فعال است
-- ============================================================================

SET NAMES utf8mb4;

`;
if (mapped.length > 0) {
  sql += `INSERT IGNORE INTO \`parent_athlete_links\` (\`id\`, \`parentId\`, \`athleteId\`, \`relationType\`, \`createdAt\`) VALUES\n`;
  sql += mapped.map(m =>
    `(${esc(m.id)}, ${esc(m.parentId)}, ${esc(m.athleteId)}, ${esc(m.relationType)}, ${esc(m.createdAt)})`
  ).join(',\n') + ';\n';
} else {
  sql += '-- هیچ لینکی برای درج وجود ندارد.\n';
}
fs.writeFileSync(OUT, sql, 'utf-8');
console.log(`\n[Migrate] SQL written -> ${OUT}`);

// ---------- 5) Optional apply ----------
if (APPLY && mapped.length > 0) {
  const [res] = await conn.query(
    `INSERT IGNORE INTO parent_athlete_links (id, parentId, athleteId, relationType, createdAt) VALUES ?`,
    [mapped.map(m => [m.id, m.parentId, m.athleteId, m.relationType, m.createdAt])]
  );
  console.log(`[Migrate] APPLIED -> inserted=${res.affectedRows}`);
  const [[{ c }]] = await conn.query('SELECT COUNT(*) AS c FROM parent_athlete_links');
  console.log(`[Migrate] parent_athlete_links total rows now: ${c}`);
}
await conn.end();

