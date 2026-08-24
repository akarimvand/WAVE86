/**
 * AGGRESSIVE TESTS — اجرای آزاد روی دیتابیس زنده (با اجازه صاحب پروژه)
 * پوشش: Rollback واقعی · حذفهای گروه۳ · Restore روی DB جدا (Test 8)
 */
import fs from 'fs';
import mysql from 'mysql2/promise';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const TS = Date.now();
let TOKEN = '';
const results = [];

function rec(name, pass, extra = '') {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
}

async function api(method, path, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!opts.anon && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// ============================================================ ۰) راهاندازی
async function setup() {
  const h = await api('GET', '/api/health', undefined, { anon: true });
  rec('SETUP سرور + MySQL', h.status === 200 && h.json?.mysql === 'connected');
  const l = await api('POST', '/api/auth/login',
    { username: 'admin', password: '123' }, { anon: true });
  TOKEN = l.json?.token || '';
  rec('SETUP ورود ادمین', !!TOKEN);
}

// ============================================================ ۱) ROLLBACK واقعی (Test 3)
async function t_rollback() {
  console.log('\n■ ROLLBACK — خطای عمدی وسط تراکنش فاکتور');

  // کالای تستی با موجودی مشخص
  const c = await api('POST', '/api/products', {
    code: `RB-${TS}`, name: '[E2E-RB] کالا', price: 10000, buyPrice: 5000,
    stock: 10, isActive: true, unit: 'عدد',
  });
  const pid = c.json?.product?.id;

  const before = Number((await api('GET', '/api/products')).json.products.find((p) => p.id === pid)?.stock);

  // تراکنش عمداً در میانه شکست میخورد:
  //   گام۱ موجودی کم میشود (موفق)
  //   گام۲ ورزشکار ناموجود ⇒ 404 ⇒ ROLLBACK کل عملیات
  const bad = await api('POST', '/api/finance/invoices', {
    athleteId: 'NO-SUCH-ATHLETE-E2E',
    items: [{ productId: pid, quantity: 4 }],
    paymentMethod: 'cash',
  });

  const after = Number((await api('GET', '/api/products')).json.products.find((p) => p.id === pid)?.stock);

  rec('RB-1 شکست وسط تراکنش ⇒ 404', bad.status === 404, `status=${bad.status}`);
  rec('RB-2 موجودی پس از Rollback دستنخورده (10→10)',
    before === 10 && after === 10, `before=${before} after=${after}`);

  // پاکسازی کالا
  await api('DELETE', `/api/products/${pid}`);
}

// ============================================================ ۲) حذفهای گروه۳
async function t_group3Deletes() {
  console.log('\n■ GROUP-3 DELETE ENDPOINTS');

  // --- اطلاعیه: تزریق از طریق sync → خواندن → حذف → نبود
  const annId = `e2e-ann-${TS}`;
  await api('POST', '/api/mysql/sync',
    { announcements: [{ id: annId, title: '[E2E] تست', subtitle: '', imageUrl: '',
      discountTag: '', startDate: '', endDate: '', isActive: true,
      targetAudience: 'all', createdAt: new Date().toISOString() }] });

  let vis = (await api('GET', '/api/club/announcements', undefined, { anon: true }))
    .json?.announcements?.some((a) => a.id === annId);
  rec('ANN-1 تزریق + خواندن ⇒ موجود', !!vis);

  const dAnn = await api('DELETE', `/api/club/announcements/${annId}`);
  vis = ((await api('GET', '/api/club/announcements', undefined, { anon: true }))
    .json?.announcements || []).some((a) => a.id === annId);
  rec('ANN-2 حذف ⇒ دیگر موجود نیست', dAnn.status === 200 && !vis);

  // --- بیمه
  const insId = `e2e-ins-${TS}`;
  await api('POST', '/api/mysql/sync', {
    insuranceRequests: [{ id: insId, userId: ADMIN_ID_PLACEHOLDER(), userName: '[E2E]',
      userNationalId: '', insuranceNumber: `INS-${TS}`, startDate: '', expiryDate: '',
      documentUrl: '', fileName: '', status: 'pending', rejectionReason: '',
      createdAt: new Date().toISOString(), reviewedAt: '', reviewedBy: '' }],
  });
  let insVis = (await api('GET', '/api/club/insurance')).json?.insuranceRequests
    ?.some((r) => r.id === insId);
  rec('INS-1 تزریق بیمه ⇒ موجود', !!insVis);
  const dIns = await api('DELETE', `/api/club/insurance/${insId}`);
  insVis = ((await api('GET', '/api/club/insurance')).json?.insuranceRequests || [])
    .some((r) => r.id === insId);
  rec('INS-2 حذف بیمه ⇒ gone', dIns.status === 200 && !insVis);
}
function ADMIN_ID_PLACEHOLDER() { return 'usr-admin-1'; }

// --- پیامک‌ها و لینک‌ها و اعلان‌ها در PART3
// ============================================================ ۳) SMS/Links/Notif
async function t_smsLinksNotifs() {
  console.log('\n■ SMS-LOGS / LINKS / NOTIFICATIONS');

  // --- لاگ پیامک: تزریق → حذف تکی
  const sid = `e2e-sms-${TS}`;
  await api('POST', '/api/mysql/sync', {
    smsLogs: [{ id: sid, recipients: ['09120000000'], recipientNames: ['E2E'],
      message: '[E2E]', channel: 'sms', type: 'bulk', targetGroup: 'custom',
      status: 'sent', cost: 0, packId: '', messageIds: [],
      sentBy: 'E2E', sentAt: new Date().toISOString(), errorMessage: '' }],
  });
  const d1 = await api('DELETE', `/api/club/smslogs/${sid}`);
  rec('SMS-1 حذف تک لاگ ⇒ 200', d1.status === 200);

  // پاکسازی کامل (دو رکورد دیگر تزریق و پاک همه)
  const s2 = `e2e-sms-b-${TS}`, s3 = `e2e-sms-c-${TS}`;
  await api('POST', '/api/mysql/sync', { smsLogs: [
    { id: s2, recipients: [], recipientNames: [], message: '', channel: 'sms',
      type: '', targetGroup: '', status: 'sent', cost: 0, packId: '',
      messageIds: [], sentBy: '', sentAt: '', errorMessage: '' },
    { ...same(), id: s3 },
  ]});
  function same() { return {}; }
  const dAll = await api('DELETE', '/api/club/smslogs/all');
  rec('SMS-2 پاکسازی همه ⇒ 200', dAll.status === 200);

  // --- لینک والد-فرزند
  const linkId = `e2e-link-${TS}`;
  await api('POST', '/api/mysql/sync', {
    links: [{ id: linkId, parentId: 'usr-admin-1',
      athleteId: 'usr-admin-1', relationType: 'father', createdAt: new Date().toISOString() }],
  });
  let lVis = ((await api('GET', '/api/mysql/full-data')).json?.data?.links || [])
    .some((l) => l.id === linkId);
  rec('LNK-1 تزریق لینک ⇒ موجود', !!lVis);
  const dl = await api('DELETE', `/api/club/links/${linkId}`);
  lVis = ((await api('GET', '/api/mysql/full-data')).json?.data?.links || [])
    .some((l) => l.id === linkId);
  rec('LNK-2 حذف لینک ⇒ gone', dl.status === 200 && !lVis);

  // --- اعلان خواندهشده کاربر
  const nid = `e2e-notif-${TS}`;
  await api('POST', '/api/mysql/sync', {
    notifications: [{ id: nid, userId: ADMIN_ID_PLACEHOLDER(), targetAudience: 'individual',
      title: '[E2E]', message: 'test', category: 'test', isRead: 1,
      actionLink: '', createdAt: new Date().toISOString() }],
  });
  // علامت خواندهشدن سمت سرور (endpoint موجود)
  await api('PUT', `/api/club/notifications/${nid}/read`);
  const delRead = await api('POST', '/api/club/notifications/delete-read',
    { userId: ADMIN_ID_PLACEHOLDER(), ids: [nid] });
  const notifList = (await api('GET', '/api/club/notifications')).json?.notifications || [];
  const still = notifList.some((n) => n.id === nid);
  rec('NOTIF-1 حذف اعلانهای خواندهشده ⇒ gone از سرور',
    delRead.status === 200 && !still, `deleted=${delRead.json?.deleted}`);
}

// ============================================================ ۴) RESTORE (Test 8)
const RESTORE_DB = 'wave86_e2e_restore';

async function t_restore() {
  console.log('\n■ TEST 8 — RESTORE روی دیتابیس جدا');
  let conn;
  try {
    const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8')).db;
    const autoDir = './backups/auto';
    if (!fs.existsSync(autoDir)) return rec('RST-0 بکآپ موجود', false, 'backups/auto خالی');

    const latest = fs.readdirSync(autoDir).filter((f) => f.endsWith('.json')).sort().pop();
    const backup = JSON.parse(fs.readFileSync(`${autoDir}/${latest}`, 'utf8'));
    rec('RST-1 بکآپ ورودی', true, `${latest} (${(fs.statSync(`${autoDir}/${latest}`).size / 1024).toFixed(0)} KB)`);

    conn = await mysql.createConnection({
      host: cfg.host, port: cfg.port, user: cfg.user,
      password: cfg.password || '', multipleStatements: false,
    });

    // ساخت دیتابیس ایزوله + اعمال اسکیمای v3
    await conn.query(`DROP DATABASE IF EXISTS \`${RESTORE_DB}\``);
    await conn.query(`CREATE DATABASE \`${RESTORE_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.changeUser({ database: RESTORE_DB });

    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    const schemaSql = fs.readFileSync('./database/schema.sql', 'utf8');
    // اجرای statementها (هر CREATE/INSERT یک خطی؛ فایل ما خطبهخط ساخت یافته است)
    const cleaned = schemaSql
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    for (const stmt of cleaned.split(';').map((s) => s.trim()).filter(Boolean)) {
      try { await conn.query(stmt); }
      catch (e) {
        if (!['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(e.code)) throw e;
      }
    }
    rec('RST-2 اسکیمای v3 روی DB جدا ساخته شد', true);

    // درج دادههای بکآپ
    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    let tablesOk = 0, tablesBad = 0;
    const counts = {};
    for (const [table, rows] of Object.entries(backup.data || {})) {
      if (!Array.isArray(rows) || rows.length === 0) { counts[table] = 0; continue; }
      // Seed rows from schema.sql must not survive the restore of this table
      await conn.query(`TRUNCATE TABLE \`${table}\``);
      // Only insert columns that actually exist in the restored schema
      // (older backups may carry legacy columns like logo_Icon that were renamed)
      const [colsInfo] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
      const validCols = new Set(colsInfo.map((c) => c.Field));
      const cols = Object.keys(rows[0]).filter((cName) => validCols.has(cName));
      const rowPh = `(${cols.map(() => '?').join(',')})`;
      try {
        for (const r of rows) {
          const vals = cols.map((cName) => {
            let val = r[cName];
            if (val !== null && typeof val === 'object') val = JSON.stringify(val);
            return val === undefined ? null : val;
          });
          await conn.query(
            `INSERT INTO \`${table}\` (${cols.map((cN) => `\`${cN}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            vals
          );
        }
        counts[table] = rows.length; tablesOk++;
      } catch (e) {
        tablesBad++; console.warn(`  restore ${table}:`, e.message);
        counts[table] = -1;
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS=1');

    // صحتسنجی تعدادی
    let mismatches = 0;
    for (const [table, expected] of Object.entries(counts)) {
      if (expected < 0) { mismatches++; continue; }
      const [cntRow] = await conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
      if (Number(cntRow[0].n) !== expected) mismatches++;
    }
    rec('RST-3 درج تمام دادهها بدون خطا', tablesBad === 0,
      `tables ok=${tablesOk} bad=${tablesBad}`);
    rec('RST-4 شمارش همه جدولها منطبق با بکآپ', mismatches === 0,
      mismatches ? `${mismatches} مغایرت` : 'همه منطبق');

    // نمونه کوئری کاربردی: ورودپذیری ادمین restore شده
    const [admins] = await conn.query(
      "SELECT username, mustChangePassword FROM users WHERE id='usr-admin-1'"
    );
    rec('RST-5 ادمین restore شده موجود است',
      admins?.[0]?.username === 'admin', `mustChange=${admins?.[0]?.mustChangePassword}`);

    // پاکسازی DB تستی
    await conn.query(`DROP DATABASE IF EXISTS \`${RESTORE_DB}\``);
    rec('RST-6 پاکسازی دیتابیس تستی', true);
  } catch (e) {
    rec('TEST 8 Restore', false, e.message || String(e));
  } finally {
    try { await conn?.end(); } catch {}
  }
}

// ============================================================ RUNNER
(async () => {
  console.log(`▶ AGGRESSIVE tests vs ${BASE}\n`);
  await setup();
  await t_rollback();
  await t_group3Deletes();
  await t_smsLinksNotifs();
  await t_restore();

  const pass = results.filter((r) => r.pass).length;
  console.log(`\n===== AGGRESSIVE SUMMARY: ${pass} PASS / ${results.length - pass} FAIL =====`);
  process.exit(pass === results.length ? 0 : 1);
})();
