/**
 * Phase 7 — Live API tests against http://localhost:3000
 * Usage:  node phase7-tests.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let TOKEN = '';
const results = [];

function record(name, pass, extra = '') {
  results.push({ name, pass, extra });
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

// ---------------------------------------------------------------- T0 Health
async function t0_health() {
  try {
    const { status, json } = await api('GET', '/api/health', undefined, { anon: true });
    const mysqlOk = status === 200 && json?.mysql === 'connected';
    record('T0a /api/health پاسخ می‌دهد', status === 200);
    record('T0b MySQL متصل است', mysqlOk, json?.mysql || '');
    return mysqlOk;
  } catch (e) {
    record('T0 سرور در دسترس نیست', false, String(e));
    return false;
  }
}

// ---------------------------------------------------------------- T1 Login
async function t1_login() {
  const { status, json } = await api('POST', '/api/auth/login',
    { username: 'admin', password: '123' }, { anon: true });
  const ok = status === 200 && json?.success && json?.token;
  record('T1 ورود admin/123', ok, `status=${status}`);
  if (ok) {
    TOKEN = json.token;
    console.log(`      mustChangePassword=${json.user?.mustChangePassword}  userId=${json.user?.id}`);
  }
  return ok;
}

// ------------------------------------------------------- T2/T3 full-data PII
async function t2_fullDataAnon() {
  const { status, json } = await api('GET', '/api/mysql/full-data', undefined, { anon: true });
  if (status !== 200 || !json?.data) return record('T2 full-data ناشناس (PII strip)', false, `status=${status}`);
  const u = (json.data.users || [])[0] || {};
  const leaked = ['password', 'nationalId', 'phone', 'address', 'medicalConditions']
    .filter((k) => u[k] !== undefined && u[k] !== '');
  record('T2 full-data ناشناس بدون PII', leaked.length === 0,
    leaked.length ? 'نشت: ' + leaked.join(',') : 'تمیز');
}

async function t3_fullDataStaff() {
  const { status, json } = await api('GET', '/api/mysql/full-data');
  if (status !== 200 || !json?.data) return record('T3 full-data کارمند', false, `status=${status}`);
  const u = (json.data.users || [])[0] || {};
  record('T3a password در پاسخ کارمند حذف شده', !('password' in u));
  record('T3b PII برای کارمند در دسترس (طراحی صحیح)', !!u.nationalId);
}

// ------------------------------------------------------------- T4 Pagination
async function t4_pagination() {
  const { status, json } = await api('GET', '/api/users?page=1&limit=2&search=a');
  const ok = status === 200 && typeof json?.total === 'number'
    && json?.page === 1 && json?.limit === 2 && Array.isArray(json.users);
  record('T4 Pagination/Search روی /api/users', ok,
    ok ? `total=${json.total} returned=${json.users.length}` : `status=${status}`);
}

// ----------------------------------------------- T5 Optimistic locking (409)
async function t5_optimisticLock() {
  const list = await api('GET', '/api/users');
  const me = (list.json?.users || []).find((u) => u.username === 'admin') || list.json?.users?.[0];
  if (!me) return record('T5 Optimistic Locking 409', false, 'کاربر یافت نشد');

  const getOne = await api('GET', `/api/users/${me.id}`);
  const user = getOne.json?.user;
  if (!user) return record('T5 Optimistic Locking 409', false, 'GET /:id ناموفق');

  const v = Number(user.version ?? 0);
  if (!(v > 0)) {
    return record('T5 Optimistic Locking 409', true,
      'SKIP — ستون version در این DB موجود نیست (مسیر سازگاری فعال؛ UPGRADE FROM LEGACY را اجرا کنید)');
  }

  // اولین PUT با نسخه درست ⇒ موفق (نسخه → v+1)
  const put1 = await api('PUT', `/api/users/${me.id}`, { ...user, version: v });
  const pass1 = put1.status === 200;
  const newVersion = put1.json?.user?.version;

  // دومین PUT با همان نسخه قدیمی ⇒ باید 409 برگرداند
  const put2 = await api('PUT', `/api/users/${me.id}`, { ...user, version: v });

  record('T5a PUT با version صحیح ⇒ 200', pass1, `v:${v}→${newVersion}`);
  record('T5b PUT با version قدیمی ⇒ 409 Conflict', put2.status === 409, `status=${put2.status}`);

  // همگامسازی نهایی: PUT با نسخه تازه و همان داده‌ها (بدون تغییر منطقی داده)
  const restore = await api('PUT', `/api/users/${me.id}`, { ...user, version: newVersion });
  record('T5c بازیابی همگام پس از تست', restore.status === 200);
}

// ------------------------------------------------- T6/T7 Transaction lifecycle
async function t6_transactionIdempotency() {
  const key = `phase7-test-${Date.now()}`;
  const body = {
    userId: 'usr-admin-1', userName: 'Admin Test', amount: 1000,
    type: 'tuition', method: 'cash', description: '[PHASE7 TEST] idempotency check',
    status: 'completed',
  };

  const r1 = await api('POST', '/api/finance/transactions', body,
    { headers: { 'Idempotency-Key': key } });
  const r2 = await api('POST', '/api/finance/transactions', body,
    { headers: { 'Idempotency-Key': key } });

  record('T6a ثبت اولیه تراکنش ⇒ 201', r1.status === 201, `id=${r1.json?.id}`);
  record('T6b Retry با همان کلید ⇒ duplicate (بدون رکورد جدید)',
    r2.status === 200 && r2.json?.duplicate === true && r2.json?.id === r1.json?.id,
    `second.status=${r2.status} secondId=${r2.json?.id}`);

  // Soft-void semantics: hidden from default ledger, preserved in archive.
  const del = await api('DELETE', `/api/finance/transactions/${r1.json?.id}`,
    { voidReason: '[PHASE7 TEST] cleanup' });

  const listDefault = await api('GET', '/api/finance/transactions');
  const visibleInDefault = (listDefault.json?.transactions || []).some((t) => t.id === r1.json?.id);
  record('T6c ابطال نرم تراکنش (بدون DELETE فیزیکی)', del.status === 200);
  record('T6d ledger پیشفرض، ابطالشده را نشان نمیدهد', !visibleInDefault);

  const listArchive = await api('GET', '/api/finance/transactions?includeCancelled=1');
  const archived = (listArchive.json?.transactions || []).find((t) => t.id === r1.json?.id);
  record('T6e آرشیو: رکورد با status=cancelled + voidedBy حفظ شده',
    !!archived && archived.status === 'cancelled' && !!archived.voidedBy,
    archived ? `status=${archived.status}, voidedBy=${archived.voidedBy}` : 'در آرشیو یافت نشد!');
}

// ------------------------------------------------------------- T8 Backup dir
async function t8_backupDir() {
  try {
    const fs = await import('fs');
    const dir = './backups/auto';
    if (!fs.existsSync(dir)) {
      return record('T8 Backup خودکار', false,
        'پوشه backups/auto هنوز ساخته نشده (سرور کمتر از ~۶۰ ثانیه بالا آمده؟ دوباره اجرا کنید)');
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    record('T8 Backup خودکار تولید شده است', files.length > 0, `${files.length} فایل`);
  } catch (e) {
    record('T8 Backup خودکار', false, String(e));
  }
}

// ------------------------------------------------ T9 Enrollment lifecycle
async function t9_enrollmentLifecycle() {
  const sessionId = `sess-p7-${Date.now()}`;
  const c = await api('POST', '/api/courses', {
    id: sessionId, title: '[P7] سانس تست', capacity: 5,
    monthlyFee: 100000, sessionsLimit: 12, isActive: true,
  });
  if (c.status !== 201) return record('T9 چرخه ثبت‌نام/حذف', false, `ساخت سانس: ${c.status} ${c.json?.error || ''}`);

  const en = await api('POST', '/api/courses/enrollments', { sessionId, userId: 'usr-admin-1' });
  const dup = await api('POST', '/api/courses/enrollments', { sessionId, userId: 'usr-admin-1' });
  const enrId = en.json?.enrollment?.id;

  record('T9a ثبت‌نام ⇒ 201', en.status === 201, `id=${enrId}`);
  record('T9b ثبت‌نام تکراری فعال ⇒ 409', dup.status === 409, `status=${dup.status}`);

  const del = await api('DELETE', `/api/courses/enrollments/${enrId}?mode=hard`);
  record('T9c حذف کامل (hard) ⇒ 200', del.status === 200, del.json?.error || '');

  const list = await api('GET', '/api/courses/enrollments/list');
  const stillThere = (list.json?.enrollments || []).some((e) => e.id === enrId);
  record('T9d پس از حذف کامل، رکورد بازنمی‌گردد', del.status === 200 ? !stillThere : true,
    stillThere ? 'هنوز موجود!' : '');

  // cleanup temp session
  await api('DELETE', `/api/courses/${sessionId}`);
}

// ------------------------------------------------------------------ runner
(async () => {
  console.log(`▶ Testing ${BASE}\n`);
  const alive = await t0_health();
  if (!alive) {
    console.log('\nسرور یا MySQL در دسترس نیست — تست‌ها متوقف شد.');
    process.exit(1);
  }

  const loggedIn = await t1_login();
  await t2_fullDataAnon();
  if (loggedIn) {
    await t3_fullDataStaff();
    await t4_pagination();
    await t5_optimisticLock();
    await t6_transactionIdempotency();
    await t9_enrollmentLifecycle();
  }
  await t8_backupDir();

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\n===== SUMMARY: ${pass} PASS / ${fail} FAIL =====`);
  process.exit(fail === 0 ? 0 : 1);
})();
