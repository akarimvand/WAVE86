# ۰۷ — گزارش ممیزی QC/QA (QA Audit Report)

**ممیز:** بازرسی مستقل کد | **تاریخ:** 2026-08-24 | **دامنه:** کل مخزن (بک‌اند، فرانت‌اند، DB، پیکربندی، مخزن)
**روش:** بازخوانی خط‌به‌خط هسته بک‌اند و موتور sync فرانت، تحلیل ایستا، اجرای `tsc --noEmit` و `vite build`
**مستندات قبلی پروژه ملاک نبوده؛ همه یافته‌ها مستقیماً از کد استخراج شده‌اند.**

---

## ۱. خلاصه مدیریتی

| شاخص | وضعیت |
|---|---|
| بیلد Production | ✅ پاس (`vite build` + esbuild سرور) |
| چک تایپ | ✅ صفر خطا — اما `strict:true` در tsconfig **فعال نیست** |
| یافته‌ها | 🔴 Critical: 2 · 🟠 High: 7 · 🟡 Medium: 9 · 🟢 Low: 6 |
| ریسک اصلی | شکست کنترل دسترسی در اندپوینت همگام‌سازی کامل State |
| آمادگی production | **شرطی** — پیش از انتشار عمومی حداقل C1/C2 باید اصلاح شود |

## ۲. یافته‌های بحرانی (Critical)

### C1 — شکست کنترل دسترسی در `POST /api/mysql/sync` (Mass Assignment / Privilege Escalation)
- **شاهد:** `server/routes/sync.routes.ts:13` → `router.post('/sync', authenticateJwt, ...)` بدون هیچ `requireRoles`.
- **اثر:** هر کاربر واردشده (مثلاً athlete) می‌تواند با یک POST دستی، آرایه `users` دلخواه — شامل خودش با `roles:["super_admin"]` و حتی password جدید — را upsert کند. `SyncRepository.syncUsers` ستون `roles` را با ON DUPLICATE KEY UPDATE به‌روز می‌کند و password دریافتی هش و ذخیره می‌شود. **این معادل کنترل کامل سیستم از طریق حساب معمولی است.**
- **توصیه:** محدود کردن sync به staffGuard + حذف `users/roles/transactions` از payload مسیر عمومی (یا تفکیک sync ادمین از sync خودکاربر)، و اعتبارسنجی سمت سرور که کاربر فقط رکورد خودش را تغییر دهد.

### C2 — مخزن Git حاوی دامپ دیتابیس Production با PII
- **شاهد:** `oytblnmz_mouj (3).sql` = **57MB**، `oytblnmz_mouj (5).sql` در ریشه پروژه؛ نام فایل منطبق بر دیتابیس cPanel واقعی هاست.
- **اثر:** احتمال بالای شامل nationalId/phone/address اعضای واقعی. نشت داده شخصی + بloat شدید مخزن.
- **توصیه:** حذف فوری از مخزن (+پاکسازی تاریخچه git)، انتقال به storage رمزشده خارجی.

## ۳. یافته‌های High

| # | یافته | شاهد (فایل:خط) | توصیه |
|---|---|---|---|
| H1 | مایگریشن‌های 001–۰۰۴ ارجاع‌شده در کد **در مخزن موجود نیستند** (فقط 005). self-healing جبران می‌کند ولی DOUBLE→DECIMAL را انجام نمی‌دهد و history ناقص است | `database/migrations/` فقط 005 · `mysql.ts:870-885` | افزودن مجدد فایل‌ها یا migration واحد normalize-money |
| H2 | پول مالی در runtime-DDL همچنان **DOUBLE** (transactions.amount, products.price/buyPrice, shop_invoices.totalAmount, invoice items) — مغایر schema.sql v3 | `mysql.ts:398,436,453,821-822,846,862-864` | migration تبدیل نوع DECIMAL(18,2) + تست گرد کردن |
| H3 | JWT سی‌روزه بدون refresh/revoke؛ logout فقط سمت کلاینت؛ توکن در sessionStorage | `middleware.ts:119` · `db.ts:195` | عمر کوتاه + refresh یا blacklist؛ httpOnly cookie |
| H4 | `GET /api/mysql/full-data` برای بازدیدکننده ناشناس هم لیست کاربران (اسم/نقش/آواتار) را برمی‌گرداند؛ بدون pagination روی ~۱۷ جدول | `sync.routes.ts:496-505` | endpoint عمومی سبک جداگانه برای صفحات public |
| H5 | CSP با `unsafe-inline`+`unsafe-eval` و `frameAncestors *` (clickjacking ممکن) | `middleware.ts:54,59` | nonce-based CSP + frame-ancestors 'self' |
| H6 | Optimistic locking در batchUpsert بر مقایسه رشته جلالی + heuristic `LENGTH()` تکیه دارد؛ ستون version عددی در مسیر sync استفاده نمی‌شود | `repository.ts:27-28` | استفاده از version عددی در upsert |
| H7 | هیچ تست خودکار/CI وجود ندارد؛ اسکریپت‌های تست دستی ریشه اجرا/اتومات نمی‌شوند | root *.mjs | vitest+supertest+pipeline |

## ۴. یافته‌های Medium

| # | یافته | شاهد |
|---|---|---|
| M1 | تکرار ماژول DB: `server/mysql.ts` نسخه موازی db.ts است (pool/config دومِ مرده + fallback کاربر root/db_climbing) — ریسک drift | mysql.ts:20-124 |
| M2 | bcrypt cost=8 و کش `plaintext→hash` در Map بی‌پایان (رمز خام در RAM می‌ماند) | db.ts:224-240 |
| M3 | آپلود multipart با optionalJwt (بدون احراز هویت هم قابل فراخوانی) | upload.routes.ts:147-153 |
| M4 | `filename` آزاد در backup/save ⇒ نوشتن خارج از BACKUP_DIR ممکن است (path traversal؛ نیازمند حساب admin) | backup.routes.ts:25-26 |
| M5 | install/test-db و save-config تا قبل از «نصب» عمومی‌اند؛ نام database در CREATE DATABASE interpolate شده | install.routes.ts:51-61 · db.ts:153 |
| M6 | JSON body 50mb + rate 1500/15m ⇒ سطح DoS بزرگ؛ base64 داخل JSON sync | server.ts:45 |
| M7 | uncaughtException/unhandledRejection بلعیده می‌شوند (ادامه حیات process در وضعیت نامعلوم) | server.ts:28-33 |
| M8 | اجبار تغییر رمز اولین ورود فقط flag است؛ enforcement سمت UI پیاده نشده | auth.routes.ts:148-154 |
| M9 | تاریخ‌ها VARCHAR جلالی ⇒ عدم امکان query/index زمانی، sort اشتباه، مقایسه نسخه‌ای شکننده | کل اسکیما |

## ۵. یافته‌های Low

- **L1** — errorHandler پیام `err.message` خام به کلاینت می‌فرستد (`middleware.ts:270`)
- **L2** — `/api/health` حتی با MySQL قطع هم `status:'ok'` برمی‌گرداند (`server.ts:83-91`)
- **L3** — `isInstalled()` همیشه true و منطق مرده است (`db.ts:75`)
- **L4** — seed ادمین با رمز '123' و nationalId نمونه در کد (`mysql.ts:951`) — با mustChangePassword جبران جزئی شده
- **L5** — tsconfig بدون `strict`, `noUnusedLocals`, `noUncheckedIndexedAccess` (tsconfig.json)
- **L6** — فایل‌های زائد ریشه: dev_out.txt, diag.txt, port.txt, proc.txt, dedupe_out.txt, New Text Document.txt, دو فایل zip

## ۶. نقاط قوت مشاهده‌شده 👍

1. تراکنش اتمیک + rollback کامل در sync با پیام شفاف
2. Idempotency-Key واقعی مالی با مدیریت race روی ER_DUP_ENTRY
3. `pendingLocalMutations` — راه‌حل هوشمندانه ضد overwrite پولینگ ۵ثانیه‌ای
4. صف mutation آفلاین با replay ترتیبی پس از بازگشت اتصال
5. PII minimization سه‌سطحی سمت سرور در full-data
6. magic-byte validation + sanitize نام فایل در همه مسیرهای آپلود/base64
7. Migration runner idempotent + readiness gate + graceful shutdown کامل
8. Backup خودکار با retention چندلایه (۷روز/۴هفته/۳ماه) + مقصد remote
9. Audit Trail غنی (oldValue/newValue/ip/userAgent) با fallback نسخه قدیمی DB
10. صفر خطای tsc و بیلد production تمیز

## ۷. نقشه راه پیشنهادی اصلاح (اولویت‌بندی‌شده)

| فاز | اقدام | یافته‌های پوشش‌داده |
|---|---|---|
| ۰ (فوری) | گارد RBAC روی /sync؛ حذف دامپ SQL از مخزن+تاریخچه؛ چرخش رمزها/JWT_SECRET در صورت تأیید افشا | C1, C2 |
| ۱ | migration DECIMAL + بازگرداندن 001–004 به مخزن؛ فعال‌سازی strict:true | H1, H2, L5 |
| ۲ | JWT کوتاه‌عمر+refresh، httpOnly cookie، frame-ancestors 'self'، حذف unsafe-eval | H3, H5 |
| ۳ | endpoint عمومی سبک برای صفحات public؛ pagination روی full-data؛ الزام JWT برای آپلود | H4, M3, M6 |
| ۴ | ادغام mysql.ts در db.ts؛ حذف کش plaintext؛ bcrypt cost≥10؛ enforcement mustChangePassword | M1, M2, M8, L4 |
| ۵ | vitest/supertest + CI؛ تست دوره‌ای restore بکاپ | H7 |

## ۸. جمع‌بندی ممیز

پروژه از نظر **عملکردی بالغ** است و در جزئیات مهندسیِ داده (idempotency، soft-void، offline queue، audit trail) سرمایه‌گذاری جدی دیده است. اما الگوی «Full-State Sync با اعتماد به کلاینت» بنیاداً با امنیت چندنقشی سازگار نیست و یافته C1 نشان می‌دهد این اعتماد سوءاستفاده‌پذیر است. با اجرای فاز ۰ و ۱ نقشه راه، سیستم قابل دفاع می‌شود.

**تصمیم پیشنهادی: Conditional Pass — توقف انتشار عمومی تا تکمیل فاز صفر.**

---
*این گزارش بر اساس بررسی ایستا تهیه شده؛ تست نفوذ و بارگذاری جداگانه لازم است.*

