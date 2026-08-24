# WAVE86 — نقشه راه اصلاحات (Progress Tracker)

> **این فایل زنده است.** هر مورد که کامل شود با `[x]` تیک میخورد.
> گزارش کامل یافتهها: [`AUDIT.md`](./AUDIT.md)
> رویه پشتیبانگیری و بازیابی: [`BACKUP_RECOVERY.md`](./BACKUP_RECOVERY.md)
> آخرین بهروزرسانی: 2026-08-24 — نسخه ۴

---

# 📋 لیست ۱ — فازهای تکمیلشده

## Phase 0 — Audit ✅
- [x] مستندسازی معماری فعلی (Frontend Store → REST → Repository → MySQL)
- [x] نقشه کامل API (همه endpointها با وضعیت Auth)
- [x] نقشه Database (۲۰ جدول؛ FK تنها روی shop_invoice_items)
- [x] شناسایی Critical Bugs (C1 تا C9)
- [x] شناسایی مشکلات امنیتی (PII، credentials، JWT_SECRET، seed password)
- [x] شناسایی ریسکهای Lost Data
- [x] ایجاد فایل گزارش `AUDIT.md`

## حذف لایه FileStore (پایه Single Source of Truth) ✅
- [x] حذف کامل `server/fileStore.ts`
- [x] حذف `server_db_store.json` و افزودن به `.gitignore`
- [x] حذف همه importها و فراخوانیهای FileStore از ۶ فایل route
- [x] تبدیل fallbackهای خاموش به خطای واقعی HTTP (500/503)
- [x] تأیید صفر شدن ارجاعات fileStore در کل کدبیس

## Phase 2 — Persistence (هسته اصلی) ✅
- [x] `POST /api/mysql/sync` کاملاً اتمیک (`withTransaction` + COMMIT/ROLLBACK واقعی)
- [x] حذف `SET FOREIGN_KEY_CHECKS=0` از مسیر عادی sync
- [x] حذف همه `.catch(console.warn)` خفهکننده خطا در sync (Partial Write ممنوع)
- [x] پاسخ خطای واقعی 500 به جای موفقیت جعلی در users/products/courses/finance/sync

## Phase 3 — Concurrency ✅
- [x] سیستم Migration: رانر `server/migrations.ts` + جدول `schema_migrations`
- [x] اجرای statement-by-statement در رانر + تحمل ER_DUP_FIELDNAME/ER_DUP_KEYNAME
- [x] Migration 001: ستون `version INT NOT NULL DEFAULT 1` برای ۸ جدول حساس
- [x] Migration 002: `idempotencyKey UNIQUE` + `voidedAt/voidedBy/voidReason` روی transactions
- [x] Migration 003: تبدیل DOUBLE → `DECIMAL(18,2)` در ۱۰ ستون مالی
- [x] اتصال خودکار رانر به startup سرور (`server.ts`)
- [x] `SyncRepository.updateUserVersioned()` — قفل خوشبینانه واقعی
- [x] `SyncRepository.userExists()` برای تفکیک 404 از 409
- [x] PUT/PATCH `/api/users/:id`: Optimistic Locking + پاسخ HTTP 409 Conflict
- [x] Idempotency ثبت تراکنش مالی (هدر `Idempotency-Key` یا body + handle race)
- [x] حذف فیزیکی تراکنش ممنوع → Soft-Void با who/when/why
- [x] Frontend `deleteTransaction` هماهنگ با soft-void سرور
- [x] بهروزرسانی version محلی از پاسخ موفق + reload روی 409
- [x] Double-click Guard مرکزی (`canSubmitFinancialAction`, پنجره ۱۵۰۰ms)
- [x] ادغام pending کاربران در `loadFromBackendMySql`

## Phase 4 — Frontend Data Flow (بخش بحرانی) ✅
- [x] حذف `clearInMemoryData()` از مسیر خطا — «خطای دیتابیس ≠ دیتابیس خالی»
- [x] زیرساخت `pendingLocalMutations` (markPendingUpsert/Delete/mergePendingLocal/clearPendingMutations)
- [x] Merge محافظ در `loadFromBackendMySql` برای ۱۴ کالکشن
- [x] پاک شدن pending فقط بعد از تأیید موفق سرور در `syncWithBackendMySql`
- [x] markPending در addProduct/updateProduct/deleteProduct/addTransaction/deleteTransaction/updateUser/updateUserProfile
- [x] `updateUserProfile` ارسال توکن JWT (الزام PUT جدید)

## Phase 5 — Security (بخش بحرانی) ✅
- [x] حذف credential هاردکد از `server/mysql.ts` → Environment Variables
- [x] `config.json` از گیت خارج شد (`git rm --cached`) + `.gitignore`
- [x] `optionalJwt` → `authenticateJwt` در PUT/PATCH users + رفع باگ بایپس isStaff
- [x] PII Filtering در `GET /api/mysql/full-data` برای غیرکارمندان و ناشناسان
- [x] حذف JWT_SECRET ثابت → env الزامی + fallback تصادفی ephemeral
- [x] پسورد seed ادمین بهصورت bcrypt hash ذخیره میشود

## Phase 6 — Backup & Recovery ✅ (پیادهسازی؛ تست اجرایی در Phase 7)
- [x] `server/backupScheduler.ts` — بکآپ خودکار دوره‌ای (`BACKUP_INTERVAL_HOURS`، پیشفرض ۲۴h) + اولین اجرا بعد از boot
- [x] پوشش کامل هر ۲۰ جدول کسبوکار در خروجی JSON (خرابی یک جدول کل backup را نمیشکند)
- [x] Retention طبق مأموریت: ۷ روزانه کامل + جدیدترینِ ۴ هفته + جدیدترینِ ۳ ماه + حذف خودکار مابقی
- [x] مقصد دوم خارج از سرور: env `BACKUP_REMOTE_DIR` (NAS / دیسک دوم / پوشه Sync)
- [x] Graceful Shutdown: `closeMySqlPool()` + `server.close()` روی SIGTERM/SIGINT با safety-net timeout (رفع M3)
- [x] مستندات `BACKUP_RECOVERY.md`: RPO ≤ 24h (تنظیمپذیر تا 15min) / RTO ≤ 1h / دو روش Restore / چکلیست تأیید

---

# 🔧 لیست ۲ — فازهای در جریان و باقیمانده

## Phase 1 — Database Integrity (در جریان)
- [x] Migration System — رانر سرور فعال ماند؛ **پوشه `database/migrations` طبق تصمیم «دیتابیس تمیز» حذف و محتوایش در `database/schema.sql` (بخش UPGRADE FROM LEGACY) ادغام شد**
- [x] Version Columns (Migration 001 ⇒ اکنون داخل schema.sql v3 + self-healing runtime)
- [x] Money DECIMAL(18,2) (Migration 003 ⇒ اکنون داخل schema.sql v3)
- [x] **پوشه `database` کاملاً خالی و تنها با یک فایل واحد**: `database/schema.sql` v3 — شامل هر ۲۰ جدول + همه ستونهای جدید + Seed نقش‌ها + کاربر اولیه `admin/123` (+ بخش UPGRADE FROM LEGACY برای سرورهای قدیمی)
- [x] Self-healing runtime (`mysql.ts`): ensureCol ستونهای version/idempotencyKey/voided*/audit-enrichment/mustChangePassword — نصب runtime همیشه با schema.sql همتراز میشود
- [x] مقاومسازی `POST /api/finance/transactions` برای DBهای قدیمی بدون ستون idempotencyKey (fallback خودکار، پرداخت نمیشکند)
- [ ] اسکن Orphan Records روی دیتابیس زنده (نیازمند MySQL در دسترس)
- [ ] افزودن FK واقعی بین users/enrollments/transactions/attendance/sessions/products
- [ ] بازبینی و افزودن Indexهای لازم بر اساس کوئریهای پرتکرار

## Phase 2 — Persistence (ادامه)
- [x] Transactions اتمیک در مسیر sync
- [x] جدا کردن CRUD عادی از full-state sync — endpointهای مستقل جدید: POST /api/courses/enrollments (ظرفیت اتمیک با FOR UPDATE)، DELETE /api/courses/enrollments/:id (soft cancel)، POST /api/courses/attendance/batch (upsert اتمیک)، POST /api/finance/invoices (فاکتور+آیتم+کاهش موجودی شرطی+ledger در یک Transaction)
- [x] سختسازی password خالی: `updateUserVersioned` دیگر هش موجود را با '' پاک نمیکند (`IF(? IS NULL OR ?='', password, ?)`) — saveUser از قبل guard داشت
- [ ] یکسانسازی الگوی خطاها (400 Validation / 401 AuthN / 403 AuthZ / 409 Conflict / 500 Server) در همه routeها
- [x] حذف `multipleStatements: true` از پول mysql.ts — سطح حمله stacked-query SQL-injection بسته شد (M2 رفع؛ رانر Migration خودش statementها را جدا اجرا میکند)
- [x] Graceful shutdown: `closeMySqlPool()` + server.close روی SIGTERM/SIGINT با safety-net timeout

## Phase 3 — Concurrency (ادامه - پوشش کامل)
- [x] Version + 409 روی users (REST)
- [ ] تعمیم Optimistic Locking به enrollments/transactions/attendance/products/debtors/creditors
- [x] Idempotency سمت سرور برای transactions
- [x] اتصال ثبت تراکنش فرانت به REST مستقل (`addTransaction` → POST /api/finance/transactions با هدر Idempotency-Key = trx.id)
- [x] اتصال ثبت فاکتور فرانت به REST مستقل (`createShopInvoice` → POST /api/finance/invoices؛ کاهش موجودی اتمیک سمت سرور ⇒ oversell/negative stock غیرممکن)
- [x] اتصال Enrollment فرانت به REST مستقل (`enrollAthlete` → POST + `cancelEnrollment` → DELETE soft)
- [x] Idempotency برای Enrollment (تکرار ثبتنام فعال ⇒ 409 Conflict) و Attendance (server-side lookup-upsert بر کلید sessionId+date+userId + ارسال id محلی از فرانت ⇒ ذخیره مجدد/Retry هرگز ردیف duplicate نمیسازد)

## Phase 4 — Frontend Data Flow (ادامه)
- [x] حفظ داده در خطا + Merge محافظ
- [x] Server-first برای مهمترین جریان مالی: `createShopInvoice` حالا async واقعی است — قیمت/موجودی از DB سرور، state محلی فقط بعد از COMMIT آپدیت میشود، خطای شبکه/422 ⇒ هیچ تغییری محلی اعمال نمیشود + پیام دقیق به UI (C9 حل شد برای فروشگاه)
- [x] Caller سازگار: `handleConfirmAndCreateInvoice` در ShopExpensesView با await
- [ ] await کردن بقیه fetchهای fire-and-forget (addUser/addProduct/...)
- [ ] نمایش «ذخیره شد» فقط بعد از پاسخ 2xx در سایر جریانها (کاربران، حضور، ثبتنام toastها)
- [ ] کاهش payload `updateUserProfile`/`updateUser` به فیلدهای مجاز (whitelist)
- [ ] حالت Offline/Error در UI با Retry کنترلشده (بنر قطع ارتباط + صف تغییرات)
- [ ] حذف کامل fallback `saveAll()` از مسیرهایی که REST مستقل دارند

## Phase 5 — Security (ادامه)
- [x] Credential Management + PII Strip + JWT سختگیرانه
- [x] Pagination/Search/Filter روی `GET /api/users` (`?page=&limit=&search=&role=&isActive=` — backward compatible: بدون پارامتر، لیست کامل مثل قبل) + cap امن ۵۰۰ ردیفی روی جداول لاگ (notifications/sms_logs) در full-data
- [x] Audit Trail کامل سمت سرور: Migration 004 (`oldValue/newValue/ip/userAgent`) + ماژول `server/audit.ts` با fallback ایمن برای دیتابیسهای pre-migration
- [x] ثبت Audit عملیات حساس: حذف کاربر (کل رکورد قدیمی)، تغییر نقش کاربر (تشخیص خودکار roles diff)، ابطال تراکنش مالی (oldValue کامل)، ثبت فاکتور فروشگاه، ثبتنام/لغو ثبتنام سانس
- [x] mustChangePassword (بکاند): Migration 004 ستون + seed ادمین flag=1 + reset خودکار پس از change-password موفق
- [ ] enforcement سمت UI: اجبار به صفحه تغییر رمز وقتی `mustChangePassword=true` (فلگ در پاسخ login موجود است)
- [ ] بازبینی دقیق تفکیک دسترسی نقشها (نکته: `requireRoles` فعلی برای admin/super_admin bypass دارد — رفتار مستند شد)

## Phase 6 — Backup & Recovery (پیادهسازی کامل در لیست ۱؛ فقط Test 8 اجرایی مانده)
- [x] Backup خودکار دوره‌ای (`server/backupScheduler.ts` — interval از env، اولین اجرا بعد از boot)
- [x] پوشش هر ۲۰ جدول کسبوکار در خروجی JSON
- [x] Retention: ۷ روزانه کامل + جدیدترینِ ۴ هفته + جدیدترینِ ۳ ماه + حذف خودکار مابقی
- [x] مقصد دوم خارج از سرور: `BACKUP_REMOTE_DIR` (NAS/دیسک دوم/پوشه Sync)
- [x] مستندات کامل RPO/RTO + ماتریس Retention + دو روش Restore + چکلیست تأیید (`BACKUP_RECOVERY.md`)
- [ ] اجرای واقعی Test 8 — Restore روی MySQL جدا (نیازمند محیط اجرا)

## Phase 7 — Testing ⬜ (نیازمند محیط اجرا: npm install + MySQL زنده)
- [ ] Test 1 — قطع اینترنت حین Save: UI نباید Saved نشان دهد؛ Retry دوباره ثبت نکند
- [ ] Test 2 — دو Browser، ویرایش همزمان یک User: یکی 409 بگیرد (زیرساخت آماده ✓)
- [ ] Test 3 — خطای وسط Transaction: Rollback کامل (زیرساخت آماده ✓)
- [ ] Test 4 — Refresh سریع حین Save: داده ناپدید نشود (زیرساخت آماده ✓)
- [ ] Test 5 — Double Click پرداخت: فقط یک Transaction (زیرساخت آماده ✓)
- [ ] Test 6 — Timeout + Retry: Duplicate نشود (Idempotency آماده ✓)
- [ ] Test 7 — Restart MySQL: کرش دائمی نداشته باشد
- [ ] Test 8 — Restore بکآپ روی MySQL جدا
- [ ] چرخه کامل Data Integrity: CREATE → READ → UPDATE → REFRESH → RESTART → BACKUP → RESTORE → READ
- [ ] سناریوهای همزمانی: PUT+GET / POST+GET / DELETE(CANCEL)+UPDATE

---

## 📊 وضعیت کلی فازها

| فاز | وضعیت | پیشرفت |
|---|---|---|
| Phase 0 — Audit | ✅ تکمیل | 100% |
| حذف FileStore | ✅ تکمیل | 100% |
| Phase 1 — Database Integrity | 🔶 در جریان | ~60% |
| Phase 2 — Persistence | 🔶 در جریان | ~90% |
| Phase 3 — Concurrency | 🔶 هسته تکمیل | ~95% |
| Phase 4 — Frontend Data Flow | 🔶 در جریان | ~70% |
| Phase 5 — Security | 🔶 هسته تکمیل | ~85% |
| Phase 6 — Backup & Recovery | 🔶 پیادهسازی کامل | ~85% |
| Phase 7 — Testing | ⬜ نیازمند محیط اجرا | 0% |

> **یادداشت:** موارد «زیرساخت آماده ✓» در Phase 7 یعنی کد سمت سرور/کلاینت پیاده شده اما اجرای واقعی تست نیازمند نصب وابستگیها (`npm install`) و MySQL فعال است.

---

## 📁 فایلهای ایجادشده / تغییر یافته

### فایلهای جدید
| فایل | نقش |
|---|---|
| `AUDIT.md` | گزارش کامل Phase 0 (معماری، API Map، DB Map، باگها با Severity) |
| `REFACTORING_PHASES.md` | همین سند ردیابی |
| `BACKUP_RECOVERY.md` | RPO/RTO، Retention، رویه Restore، چکلیست تأیید |
| `server/migrations.ts` | رانر Migration (idempotent + schema_migrations) |
| `database/schema.sql` | **اسکیمای واحد v3** — هر ۲۰ جدول با تمام تغییرات (version، DECIMAL، idempotencyKey، soft-void، audit enrichment، mustChangePassword) + Seed نقش‌ها + کاربر `admin/123` + بخش UPGRADE FROM LEGACY |
| `server/audit.ts` | ماژول مرکزی Audit Trail (writeAudit + getRequestInfo + fallback برای DBهای pre-migration) |
| `server/backupScheduler.ts` | Backup خودکار + Retention + مقصد دوم |

### فایلهای ویرایششده (سرور)
| فایل | خلاصه تغییرات |
|---|---|
| `server.ts` | اتصال runMigrations + startBackupScheduler + Graceful Shutdown |
| `server/db.ts` | حذف credential هاردکد؛ `closeMySqlPool()`؛ withTransaction موجود |
| `server/mysql.ts` | حذف credential هاردکد؛ seed ادمین با bcrypt hash + mustChangePassword=1 دفاعی؛ **حذف multipleStatements** (بستن stacked-query injection) |
| `server/middleware.ts` | JWT_SECRET env-الزامی + ephemeral fallback |
| `server/repository.ts` | `updateUserVersioned()` + `userExists()` + password-guard (`IF(?='',password,?)`) |
| `server/routes/auth.routes.ts` | حذف FileStore fallback؛ خطای 503 شفاف MySQL؛ reset mustChangePassword پس از change-password موفق |
| `server/routes/users.routes.ts` | حذف FileStore؛ authenticateJwt در PUT/PATCH؛ Optimistic Locking + 409؛ Pagination/Search/Filter روی GET؛ Audit Trail (حذف/ویرایش/تغییر نقش با old/new/ip/agent) |
| `server/routes/products.routes.ts` | حذف fallback FileStore/DEMO از GET؛ MySQL-only |
| `server/routes/courses.routes.ts` | حذف FileStore؛ +POST enrollments (FOR UPDATE)؛ +DELETE soft-cancel؛ +POST attendance/batch (**idempotent lookup-upsert**)؛ Audit ثبتنام/لغو |
| `server/routes/finance.routes.ts` | حذف FileStore و موفقیت جعلی؛ Idempotency تراکنش؛ Soft-Void؛ +POST invoices اتمیک؛ Audit ابطال/فاکتور |
| `server/routes/sync.routes.ts` | sync اتمیک بدون FK_CHECKS=0؛ full-data با PII Filter + cap ۵۰۰ روی لاگها؛ حذف fallback |

### فایلهای ویرایششده (Frontend)
| فایل | خلاصه تغییرات |
|---|---|
| `src/services/db.ts` | pendingLocalMutations + mergePendingLocal (۱۴ کالکشن)؛ حذف clearInMemoryData در خطا؛ server-first createShopInvoice؛ REST مستقل transaction/enrollment/attendance؛ **ارسال id حضورغیاب برای upsert بدون duplicate**؛ version sync + handle 409؛ soft-void محلی deleteTransaction؛ Double-click Guard |
| `src/components/ShopExpensesView.tsx` | await کردن createShopInvoice |
| `src/App.tsx` | (بدون تغییر در این مراحل — sessionStorage فقط session auth نگه میدارد) |

### زیرساخت
| فایل | تغییر |
|---|---|
| `.gitignore` | +config.json، server_db_store.json |
| `.env.example` | +BACKUP_INTERVAL_HOURS، BACKUP_REMOTE_DIR |

---

## ⚠️ ریسکهای باقیمانده (شفاف)

1. **تست اجرایی انجام نشده** — هیچ Testی از ۱ تا ۸ واقعاً اجرا نشده (`node_modules` نصب نیست). همه ادعاهای PASS فقط پس از اجرای Phase 7 معتبر میشوند.
2. **Optimistic Locking فقط روی users** — سایر Entityها هنوز version-aware نیستند از مسیر PUT اختصاصی.
3. **saveAll() بهعنوان fallback** — بعد از REST موفق هنوز full-state sync هم اجرا میشود (idempotent ولی زائد؛ باید در پاکسازی نهایی حذف شود).
4. **FK واقعی اعمال نشده** — نیازمند اسکن Orphan Records روی داده زنده قبل از ALTER.
5. **full-data هنوز سنگین** — PII فیلتر شده و لاگها cap شدند؛ Pagination کامل روی جداول business (users>۵۰۰ رکورد و...) هنوز فقط روی `/api/users` فعال است.
6. **Audit Trail** — سمت سرور کامل شد (oldValue/newValue/ip/userAgent)؛ اما Auditهای frontend-driven هنوز بدون ip/userAgent هستند.
7. **mustChangePassword** — بکاند کامل؛ enforcement سمت UI (ریدایرکت اجباری) باقی است.
8. **Backup Remote = filesystem** — S3/SFTP پشتیبانی نمیشود؛ فقط مسیر mount شده.
9. **sessionStorage auth** — توکن و currentUser در sessionStorage میماند (استاندارد SPA؛ XSS risk متعارف).
10. **Credential Rotation** — اگر credential قبلاً لو رفته، چرخاندن آن (تغییر پسورد MySQL) همچنان بر عهده ادمین است.