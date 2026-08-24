# ۰۵ — دیتابیس MySQL

## ۱. مشخصات کلی

- **موتر:** MySQL/MariaDB 8، `utf8mb4_unicode_ci`، InnoDB
- **Pool:** mysql2 — connectionLimit=15، keepAlive فعال، multipleStatements=**خاموش** (ضد stacked-query injection)
- **کلیدها:** همه PK ها `VARCHAR(100)` تولیدی سمت کلاینت (`<prefix>-<Date.now>-<random>`)
- **تاریخ‌ها:** تقریباً همه `VARCHAR(100)` با **تقویم جلالی** (مثل `1403/05/12`) — نه DATETIME
- **جدول‌های دامنه (۲۰):** roles, users, parent_athlete_links, audit_logs, pre_registrations, club_settings, club_announcements, courses(سانس), enrollments, transactions, attendance_records, debtors, creditors, insurance_requests, support_tickets, app_notifications, products, shop_invoices, shop_invoice_items, sms_logs
- **جدول سیستمی:** schema_migrations + user_roles (junction)

## ۲. سه منبع حقیقتِ اسکیما و تفاوت‌شان

| منبع | نقش | ریسک |
|---|---|---|
| `server/mysql.ts → initializeTables` | CREATE TABLE IF NOT EXISTS در اولین اجرا | ⚠️ نسخه قدیمی: پول DOUBLE، برخی ستون‌ها مفقود |
| `ensureCol/syncCols` (self-healing) | افزودن ستون‌های جاافتاده در هر بوت | ستون‌های version/idempotency/void*/audit/mustChangePassword را می‌سازد؛ اما **نوع** ستون‌های موجود را تغییر نمی‌دهد |
| `database/schema.sql` (v3.1) | مرجع مستند/نصب دستی | کامل‌ترین حالت: DECIMAL(18,2)، FK، ایندکس |

⚠️ نتیجه: روی یک نصب تازه که از runtime-DDL استفاده کند، **پول مالی DOUBLE می‌ماند** چون Migration 003 (تبدیل DECIMAL) در مخزن وجود ندارد.

## ۳. مایگریشن‌ها

- رانر: statement-by-statement idempotent؛ خطاهای ER_DUP_FIELDNAME/KEYNAME تحمل می‌شوند؛ ثبت در `schema_migrations`.
- **در مخزن فقط `005_foreign_keys_indexes.sql` موجود است** (۹ FK + ۱۶ ایندکس).
- کد به 001 (version)، 002 (idempotency+soft-void)، 003 (DECIMAL)، 004 (audit enrichment) ارجاع می‌دهد ولی فایل‌ها غایب‌اند — جبران توسط self-healing انجام می‌شود به‌جز تبدیل نوع DOUBLE→DECIMAL.

## ۴. FK های فعال (Migration 005)

```
enrollments.userId        → users.id   CASCADE
transactions.userId       → users.id   SET NULL
debtors.userId            → users.id   CASCADE
shop_invoice_items.invoiceId → shop_invoices.id CASCADE
parent_athlete_links.parentId / athleteId → users.id CASCADE ×2
insurance_requests.userId → users.id   CASCADE
app_notifications.userId  → users.id   CASCADE
```
عمداً بدون FK: `shop_invoice_items.productId` (محصولات hard-delete می‌شوند).

## ۵. ستون‌های یکپارچگی حساس

| جدول | ستون‌ها | هدف |
|---|---|---|
| users + ۷ جدول دیگر | `version INT DEFAULT 1` | Optimistic Locking واقعی (فقط مسیر updateUserVersioned) |
| transactions | `idempotencyKey VARCHAR(100) UNIQUE` | ضد دوباره‌ثبت پرداخت |
| transactions | `voidedAt/voidedBy/voidReason` | soft-void مالی |
| audit_logs | `oldValue/newValue LONGTEXT, ip, userAgent` | Audit غنی (fallback برای DB قدیمی) |
| users | `mustChangePassword TINYINT` | اجبار تغییر رمز ادمین seed |
| user_roles | PK(user_id, role_key) | نرمال‌سازی نقش‌ها (users.roles JSON همچنان read-model) |

## ۶. الگوی دسترسی داده

- خواندن: `SELECT * FROM <table>` بدون projection — همه ستون‌ها همیشه (به‌جز password که پس از SELECT حذف می‌شود).
- نوشتن sync: `INSERT ... ON DUPLICATE KEY UPDATE` چانک ۱۰۰تایی با گارد شرطی:
  - password: فقط اگر مقدار جدید خالی نباشد.
  - بقیه ستون‌ها: اگر `VALUES(updatedAt) >= updatedAt OR ... LENGTH() heuristic` ⇒ آپدیت، وگرنه حفظ رکورد سرور.
- نوشتن REST: کوئری‌های پارامتری `?` در همه routeها؛ نام جدول/ستون فقط از whitelist داخلی.
