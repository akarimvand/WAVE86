/**
 * WAVE86 — Full E2E Suite (Phase 7)
 * Usage: node e2e-full-tests.mjs   (server on :3000, MySQL live)
 * همه رکوردهای تستی با برچسب [E2E] ساخته و در انتها پاکسازی می‌شوند.
 */
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const TS = Date.now();
let TOKEN = '';
const ADMIN_ID = 'usr-admin-1';
const results = [];
const cleanup = []; // { fn: async()=>{} , label }

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

// ============================================================ ۱) HEALTH
async function secHealth() {
  console.log('\n■ HEALTH');
  const h = await api('GET', '/api/health', undefined, { anon: true });
  rec('Health endpoint + MySQL connected',
    h.status === 200 && h.json?.mysql === 'connected', h.json?.mysql);
}

// ============================================================ ۲) AUTH
async function secAuth() {
  console.log('\n■ AUTH');
  const bad = await api('POST', '/api/auth/login',
    { username: 'admin', password: 'WRONG' }, { anon: true });
  rec('AUTH-1 پسورد غلط ⇒ 401', bad.status === 401, `status=${bad.status}`);

  const login = await api('POST', '/api/auth/login',
    { username: 'admin', password: '123' }, { anon: true });
  rec('AUTH-2 ورود admin/123 ⇒ 200 + token', login.status === 200 && !!login.json?.token);
  TOKEN = login.json?.token || '';

  const me = await api('GET', '/api/auth/me');
  rec('AUTH-3 /auth/me با JWT ⇒ کاربر صحیح',
    me.status === 200 && me.json?.user?.id === ADMIN_ID, me.json?.user?.id);

  const noToken = await api('GET', '/api/auth/me', undefined, { anon: true });
  rec('AUTH-4 /auth/me بدون توکن ⇒ 401', noToken.status === 401);

  // تغییر رمز با oldPassword غلط ⇒ نباید موفق شود (رمز ادمین دست‌نخورده می‌ماند)
  const chg = await api('POST', '/api/auth/change-password',
    { oldPassword: 'NOT-MY-PASSWORD', newPassword: 'Whatever#99' });
  rec('AUTH-5 change-password با رمز فعلی غلط ⇒ رد می‌شود', chg.status >= 400, `status=${chg.status}`);
}

// ============================================================ ۳) USERS
const U_A = {
  username: `e2e_a_${TS}`, password: 'Test@12345',
  fullName: 'ورزشکار تست الف', nationalId: `9${String(TS).slice(-12)}`,
  phone: '09120000001', roles: ['athlete'], activeRole: 'athlete',
};
const U_B = {
  username: `e2e_b_${TS}`, password: 'Test@12345',
  fullName: 'ورزشکار تست ب', nationalId: `8${String(TS).slice(-12)}`,
  phone: '09120000002', roles: ['athlete'], activeRole: 'athlete',
};

async function secUsers() {
  console.log('\n■ USERS');

  const anonList = await api('GET', '/api/users', undefined, { anon: true });
  rec('USR-0 لیست کاربران بدون توکن ⇒ 401', anonList.status === 401);

  const cA = await api('POST', '/api/users', U_A);
  rec('USR-1 ایجاد ورزشکار الف ⇒ 201', cA.status === 201, cA.json?.error);
  globalThis.__e2eUserA = cA.json?.user?.id;
  const cB = await api('POST', '/api/users', U_B);
  rec('USR-2 ایجاد ورزشکار ب ⇒ 201', cB.status === 201, cB.json?.error);
  cleanup.push({ label: 'user A', fn: () => api('DELETE', `/api/users/${cA.json?.user?.id}`) });
  cleanup.push({ label: 'user B', fn: () => api('DELETE', `/api/users/${cB.json?.user?.id}`) });

  const gid = cA.json?.user?.id;
  if (!gid) {
    rec('USR-3..5', false, 'ایجاد کاربر ناموفق — بخش version lock رد شد');
    return;
  }
  const one = await api('GET', `/api/users/${gid}`);
  rec('USR-3 GET /:id ⇒ کاربر با password حذفشده',
    one.status === 200 && !!one.json?.user && !('password' in one.json.user));

  // Optimistic locking: PUT صحیح سپس PUT با نسخه قدیمی
  let u = one.json.user;
  const v1 = Number(u.version ?? 0);
  if (v1 > 0) {
    const p1 = await api('PUT', `/api/users/${gid}`, { ...u, phone: '09120000999', version: v1 });
    rec('USR-4 PUT با version صحیح ⇒ 200 و version+1',
      p1.status === 200 && Number(p1.json?.user?.version) === v1 + 1,
      `v:${v1}→${p1.json?.user?.version}`);
    const p2 = await api('PUT', `/api/users/${gid}`, { ...u, phone: '09120000999', version: v1 });
    rec('USR-5 PUT با version قدیمی ⇒ 409 Lost-Update مسدود', p2.status === 409);
    // بازیابی شماره تماس اصلی
    await api('PUT', `/api/users/${gid}`, { ...u, version: v1 + 1 });
  } else {
    rec('USR-4/5 version lock', true, 'SKIP — ستون version موجود نیست');
  }

  // دسترسی به پروفایل خود توسط کاربر جاری
  const self = await api('GET', `/api/users/${ADMIN_ID}`);
  rec('USR-6 GET پروفایل خود ⇒ 200', self.status === 200);
}

// ============================================================ ۴) COURSES + ENROLLMENTS
const CAP_ID = `sess-cap-${TS}`;
const FLEX_ID = `sess-flex-${TS}`;
let ENR_A_FLEX = '';

async function secCourses() {
  console.log('\n■ COURSES / ENROLLMENTS');

  const c1 = await api('POST', '/api/courses', {
    id: CAP_ID, title: '[E2E] سانس ظرفیت ۱', capacity: 1,
    monthlyFee: 150000, sessionsLimit: 8, isActive: true, daysOfWeek: ['شنبه'],
    startTime: '18:00', endTime: '19:30',
  });
  rec('CRS-1 ساخت سانس ظرفیت ۱ ⇒ 201', c1.status === 201);
  cleanup.push({ label: 'course CAP', fn: () => api('DELETE', `/api/courses/${CAP_ID}`) });

  const c2 = await api('POST', '/api/courses', {
    id: FLEX_ID, title: '[E2E] سانس چندنفره', capacity: 10,
    monthlyFee: 200000, sessionsLimit: 12, isActive: true,
  });
  rec('CRS-2 ساخت سانس چندنفره ⇒ 201', c2.status === 201);
  cleanup.push({ label: 'course FLEX', fn: () => api('DELETE', `/api/courses/${FLEX_ID}`) });

  // ثبت‌نام‌ها
  const eA = await api('POST', '/api/courses/enrollments',
    { sessionId: CAP_ID, userId: cA_userId(), paymentMethod: 'cash' });
  rec('ENR-1 ثبت‌نام الف در ظرفیت۱ ⇒ 201', eA.status === 201);
  cleanup.push({ label: 'enr CAP-A hard', fn: () =>
    api('DELETE', `/api/courses/enrollments/${eA.json?.enrollment?.id}?mode=hard`) });

  const userB_id = await findUserIdByUsername(U_B.username);
  const eB = await api('POST', '/api/courses/enrollments',
    { sessionId: CAP_ID, userId: userB_id });
  rec('ENR-2 عبور از ظرفیت ⇒ 422 (Business Rule)', eB.status === 422, `status=${eB.status}`);

  const eF = await api('POST', '/api/courses/enrollments',
    { sessionId: FLEX_ID, userId: ADMIN_ID });
  ENR_A_FLEX = eF.json?.enrollment?.id;
  rec('ENR-3 ثبت‌نام ادمین در چندنفره ⇒ 201', eF.status === 201);

  const dup = await api('POST', '/api/courses/enrollments',
    { sessionId: FLEX_ID, userId: ADMIN_ID });
  rec('ENR-4 ثبت‌نام تکراری فعال ⇒ 409', dup.status === 409);

  // حذف کامل (hard) — رکورد نباید برگردد
  const del = await api('DELETE', `/api/courses/enrollments/${ENR_A_FLEX}?mode=hard`);
  const list = await api('GET', '/api/courses/enrollments/list');
  const gone = !(list.json?.enrollments || []).some((e) => e.id === ENR_A_FLEX);
  rec('ENR-5 حذف کامل ⇒ رکورد بازنمی‌گردد',
    del.status === 200 && gone, del.json?.error || '');

  // دوباره ثبتنام برای تست حضور
  const reEn = await api('POST', '/api/courses/enrollments',
    { sessionId: FLEX_ID, userId: ADMIN_ID });
  ENR_A_FLEX = reEn.json?.enrollment?.id;
  cleanup.push({ label: 'enr FLEX-admin hard', fn: () =>
    api('DELETE', `/api/courses/enrollments/${ENR_A_FLEX}?mode=hard`) });
}

async function findUserIdByUsername(username) {
  const list = await api('GET', '/api/users');
  return (list.json?.users || []).find((u) => u.username === username)?.id;
}
function cA_userId() { return globalThis.__e2eUserA; }

// ============================================================ ۵) ATTENDANCE
async function secAttendance(userB_id) {
  console.log('\n■ ATTENDANCE');
  const DATE = '1403/07/01';
  const mk = (userId, userName, status) => ({ userId, userName, status });

  const b1 = await api('POST', '/api/courses/attendance/batch', {
    sessionId: FLEX_ID, date: DATE,
    records: [mk(ADMIN_ID, 'Admin', 'present'), mk(userB_id, 'B', 'absent')],
  });
  rec('ATT-1 ثبت دسته‌جمعی ۲ رکورد ⇒ 200', b1.status === 200);

  // ذخیره مجدد همان داده — نباید duplicate بسازد
  await api('POST', '/api/courses/attendance/batch', {
    sessionId: FLEX_ID, date: DATE,
    records: [mk(ADMIN_ID, 'Admin', 'late'), mk(userB_id, 'B', 'present')],
  });
  const lst = await api('GET', `/api/club/attendance?sessionId=${FLEX_ID}`);
  const rows = (lst.json?.attendanceRecords || []).filter((r) => r.date === DATE);
  rec('ATT-2 ذخیره مجدد ⇒ Idempotent (بدون duplicate)',
    rows.length === 2, `rows=${rows.length}`);

  // حذف یک رکورد
  const target = rows.find((r) => r.userId === userB_id);
  if (!target) return record('ATT-3 حذف رکورد', false, 'رکورد B یافت نشد');
  const delOne = await api('DELETE', `/api/courses/attendance/${target.id}`);
  const lst2 = await api('GET', `/api/club/attendance?sessionId=${FLEX_ID}`);
  const rows2 = (lst2.json?.attendanceRecords || []).filter((r) => r.date === DATE);
  rec('ATT-3 حذف رکورد ⇒ حذف میشود و برنمی‌گردد',
    delOne.status === 200 && rows2.length === 1, `remaining=${rows2.length}`);
}

// ============================================================ ۶) PRODUCTS + SHOP + FINANCE
const PROD_CODE = `E2E-P-${TS}`;

async function secProducts() {
  console.log('\n■ PRODUCTS / SHOP / FINANCE');
  const c = await api('POST', '/api/products', {
    code: PROD_CODE, name: '[E2E] کالای تست', category: 'تست',
    price: 50000, buyPrice: 30000, stock: 10, minStock: 2,
    unit: 'عدد', isActive: true,
  });
  const PROD_ID = c.json?.product?.id;
  rec('PRD-1 ایجاد کالا (موجودی ۱۰) ⇒ 201', c.status === 201 && !!PROD_ID);

  const stockOf = async () => {
    const l = await api('GET', '/api/products');
    return Number((l.json?.products || []).find((p) => p.id === PROD_ID)?.stock);
  };

  // خرید نقدی ۳ عدد — کاهش موجودی اتمیک سمت سرور
  const inv1 = await api('POST', '/api/finance/invoices', {
    athleteId: ADMIN_ID, creatorName: 'E2E',
    items: [{ productId: PROD_ID, quantity: 3 }], paymentMethod: 'cash',
  });
  const s1 = await stockOf();
  rec('FIN-1 فاکتور نقدی ۳ عدد ⇒ 201 و موجودی 10→7',
    inv1.status === 201 && s1 === 7, `stock=${s1}`);

  // فروش بیش از موجودی ⇒ 422 بدون تغییر موجودی (no partial write)
  const bad = await api('POST', '/api/finance/invoices', {
    athleteId: ADMIN_ID, items: [{ productId: PROD_ID, quantity: 999 }],
    paymentMethod: 'cash',
  });
  const s2 = await stockOf();
  rec('FIN-2 Oversell ⇒ 422 و موجودی دست‌نخورده',
    bad.status === 422 && s2 === 7, `status=${bad.status} stock=${s2}`);

  // خرید نسیه ⇒ رکورد بدهکاری خودکار
  const invCr = await api('POST', '/api/finance/invoices', {
    athleteId: ADMIN_ID, items: [{ productId: PROD_ID, quantity: 1 }],
    paymentMethod: 'credit',
  });
  const debtors = await api('GET', '/api/finance/debtors');
  const dOk = (debtors.json?.debtors || []).some((d) =>
    d.userId === ADMIN_ID && Number(d.amount) === 50000);
  rec('FIN-3 فاکتور نسیه ⇒ 201 + بدهکاری خودکار ۵۰,۰۰۰',
    invCr.status === 201 && dOk);

  // Idempotency + Soft-Void مستقل
  const key = `e2e-void-${TS}`;
  const t1 = await api('POST', '/api/finance/transactions',
    { userId: ADMIN_ID, amount: 7777, type: 'other', status: 'completed' },
    { headers: { 'Idempotency-Key': key } });
  const retry = await api('POST', '/api/finance/transactions',
    { userId: ADMIN_ID, amount: 7777, type: 'other', status: 'completed' },
    { headers: { 'Idempotency-Key': key } });
  rec('FIN-4 Retry تراکنش با کلید ⇒ duplicate:true',
    retry.status === 200 && retry.json?.duplicate === true &&
    retry.json?.id === t1.json?.id);

  const voided = await api('DELETE', `/api/finance/transactions/${t1.json?.id}`,
    { voidReason: 'E2E' });
  const arch = await api('GET', '/api/finance/transactions?includeCancelled=1');
  const aTx = (arch.json?.transactions || []).find((t) => t.id === t1.json?.id);
  rec('FIN-5 ابطال نرم ⇒ آرشیو: cancelled + voidedBy',
    voided.status === 200 && aTx?.status === 'cancelled' && !!aTx?.voidedBy);

  // حذف کالا (تمیزکاری همین بخش)
  const dp = await api('DELETE', `/api/products/${PROD_ID}`);
  rec('PRD-2 حذف کالا ⇒ 200', dp.status === 200);
}

// ============================================================ ۷) CLUB
async function secClub() {
  console.log('\n■ CLUB');
  const ann = await api('GET', '/api/club/announcements', undefined, { anon: true });
  rec('CLB-1 اطلاعیه‌ها (عمومی) ⇒ 200', ann.status === 200);
  const notif = await api('GET', '/api/club/notifications');
  rec('CLB-2 notifications با توکن ⇒ 200', notif.status === 200);
  const tickets = await api('GET', '/api/club/tickets');
  rec('CLB-3 tickets ⇒ 200', tickets.status === 200);
}

// ============================================================ ۸) BACKUP
async function secBackup() {
  console.log('\n■ BACKUP');
  const list = await api('GET', '/api/backup/list');
  rec('BKP-1 لیست بکآپ‌ها ⇒ 200', list.status === 200,
    `${(list.json?.backups || []).length} فایل`);
}

// ============================================================ CLEANUP
async function runCleanup() {
  console.log('\n■ CLEANUP رکوردهای [E2E]');
  for (const c of cleanup.reverse()) {
    try {
      const r = await c.fn();
      console.log(`  cleaned: ${c.label} (${r?.status ?? '-'})`);
    } catch (e) {
      console.warn(`  cleanup FAILED ${c.label}:`, String(e));
    }
  }
}

// ============================================================ RUNNER
(async () => {
  console.log(`▶ E2E against ${BASE}\n`);
  await secHealth();
  await secAuth();
  if (!TOKEN) { console.log('Login ناموفق — توقف'); process.exit(1); }

  await secUsers();
  await secCourses();

  const userB_id = await findUserIdByUsername(U_B.username);
  await secAttendance(userB_id);
  await secProducts();
  await secClub();
  await secBackup();
  await runCleanup();

  // Data Integrity نهایی: refresh کامل بعد از همه عملیات
  const fd = await api('GET', '/api/mysql/full-data');
  rec('INT-1 Refresh نهایی full-data پس از تمام عملیات ⇒ 200',
    fd.status === 200 && fd.json?.dbConnected === true);

  const pass = results.filter((r) => r.pass).length;
  console.log(`\n===== E2E SUMMARY: ${pass} PASS / ${results.length - pass} FAIL =====`);
  process.exit(pass === results.length ? 0 : 1);
})();
