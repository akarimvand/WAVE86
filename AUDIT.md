# WAVE86 — Phase 0 Audit Report

تاریخ: 2026-08-24
وضعیت: معماری فعلی ثبت شد؛ اصلاحات فازبندیشده آغاز شد.

## ۱. معماری فعلی (Current Architecture)

```
Frontend (React SPA)
 ├── dbStore (StorageEngine) ← "database" کلاینت، همه Entityها در آرایههای حافظه
 │     ├── saveAll() → syncWithBackendMySql() → POST /api/mysql/sync (کل State)
 │     ├── loadFromBackendMySql() → GET /api/mysql/full-data (کل دیتابیس)
 │     └── setInterval 5s + focus + visibilitychange → loadFromBackendMySql
 ├── fetch fire-and-forget به REST (بدون await)
 └── UI موفقیت را قبل از تأیید سرور نمایش میدهد (Optimistic)
              ↓
REST API (server.ts → routes/*)
              ↓
Middleware (authenticateJwt / optionalJwt / requireRoles / validateRequestBody)
              ↓
Repository (SyncRepository — batchUpsert با ON DUPLICATE KEY UPDATE)
              ↓
MySQL Connection Pool (mysql2, connectionLimit=15)
```

## ۲. نقشه API فعلی

| Method & Path | Auth | یادداشت |
|---|---|---|
| POST /api/auth/login, GET /me, POST /change-password | عمومی / JWT | — |
| GET/POST /api/users، GET/PUT/PATCH/DELETE /:id | staff/admin/JWT | PUT/PATCH اکنون authenticateJwt |
| GET/POST /api/products، PUT/DELETE /:id، POST /seed-demo | GET عمومی | — |
| GET/POST/DELETE /api/courses، DELETE /attendance/:id | JWT/roles | — |
| GET/POST/DELETE /api/finance/transactions | financeGuard | DELETE فیزیکی مالی (باید soft) |
| DELETE /api/finance/debtors/:id، /creditors/:id | financeGuard | DELETE فیزیکی |
| GET /api/finance/invoices|debtors|creditors | financeGuard | — |
| GET/POST /api/club/*، notifications، tickets، insurance، attendance | متغیر | — |
| POST /api/sms/* ، /api/bale/* | staffGuard | کلیدها از club_settings |
| POST/GET/DELETE /api/backup/* | admin | — |
| POST /api/upload/* | JWT/admin | — |
| GET/POST /api/install/* | عمومی یا super_admin | — |
| POST /api/mysql/sync | authenticateJwt | کل State؛ Partial Write |
| POST /api/mysql/sync-detailed | super_admin/admin | per-table |
| GET /api/mysql/full-data | optionalJwt | کل دیتابیس؛ PII |

## ۳. نقشه Database (۲۰ جدول)

roles، users، parent_athlete_links، audit_logs، pre_registrations، club_settings،
club_announcements، courses، enrollments، transactions، attendance_records، debtors،
creditors، insurance_requests، support_tickets، app_notifications، products،
shop_invoice_items (دارای FK)، shop_invoices، sms_logs

- FK واقعی فقط ۱ مورد: shop_invoice_items.invoiceId → shop_invoices
- تمام ستونهای مالی DOUBLE
- تمام timestamp ها VARCHAR (جلالی) → مقایسه نسخهای ناممکن
- بدون ستون version، بدون Idempotency Key، بدون soft-delete مالی

## ۴. مشکلات با Severity

### CRITICAL
| # | مشکل | فایل | وضعیت |
|---|---|---|---|
| C1 | Race اصلی ناپدیدشدن داده: mutation خوشبینانه → sync با تأخیر → پولینگ ۵s state را overwrite میکند | src/services/db.ts | اصلاح شد (Phase 4) |
| C2 | sync غیر اتمیک: catch خفهکن per-entity + SET FOREIGN_KEY_CHECKS=0 → Partial Write | server/routes/sync.routes.ts | اصلاح شد (Phase 2) |
| C3 | خطای DB = خالی شدن UI (clearInMemoryData) | src/services/db.ts | اصلاح شد (Phase 4) |
| C4 | full-data بدون JWT → PII (nationalId, phone, address, medical, بیمه) | server/routes/sync.routes.ts | اصلاح شد (Phase 5) |
| C5 | تراکنش مالی Hard Delete | server/routes/finance.routes.ts | اصلاح شد (Phase 3: soft-void) |
| C6 | JWT_SECRET هاردکد | server/middleware.ts | اصلاح شد (Phase 5) |
| C7 | پسورد seed ادمین '123' خام | server/mysql.ts | اصلاح شد (Phase 5) |
| C8 | Double-click = Duplicate (بدون idempotency) | frontend+routes | اصلاح شد (Phase 3) |
| C9 | نمایش «ذخیره شد» قبل از تأیید سرور | src/services/db.ts | جزئی (Phase 4 ادامه) |

### HIGH
| # | مشکل | وضعیت |
|---|---|---|
| H1 | Optimistic Locking ساختگی (مقایسه updatedAt جلالی) | اصلاح شد (Phase 3: version + 409 روی users) |
| H2 | پول DOUBLE | اصلاح شد (Migration 003: DECIMAL(18,2)) |
| H3 | بدون FK واقعی → Orphan Records | پس از بررسی داده (فاز بعدی) |
| H4 | full-data بدون Pagination/Filtering | در برنامه (Phase 5) |
| H5 | updateUserProfile کل آبجکت user را میفرستد | در برنامه (Phase 4) |
| H6 | seed ادمین بدون اجبار تغییر رمز | در برنامه (Phase 5) |

### MEDIUM
| # | مشکل | وضعیت |
|---|---|---|
| M1 | بدون Migration System | اصلاح شد (Phase 1/3: رانر + schema_migrations) |
| M2 | multipleStatements: true | بررسی (mysql.ts پول؛ db.ts ندارد) |
| M3 | بدون graceful shutdown pool.end | در برنامه |
| M4 | audit trail ناقص | در برنامه (Phase 5) |

## ۵. پیادهسازی Phase 3 — Concurrency (تکمیل شد)

| مورد | فایل | توضیح |
|---|---|---|
| Migration Framework | server/migrations.ts + database/migrations/*.sql | رانر idempotent با جدول schema_migrations؛ اجرای statement-by-statement (پول multipleStatements ندارد)؛ خطاهای ER_DUP_FIELDNAME/ER_DUP_KEYNAME تحمل میشوند |
| Migration 001 | database/migrations/001_add_version_columns.sql | ستون version INT برای users، enrollments، transactions، attendance_records، courses، products، debtors، creditors |
| Migration 002 | database/migrations/002_add_transaction_integrity.sql | idempotencyKey UNIQUE + voidedAt/voidedBy/voidReason برای soft-void مالی |
| Migration 003 | database/migrations/003_convert_money_to_decimal.sql | تبدیل DOUBLE → DECIMAL(18,2) در ۱۰ ستون مالی |
| Optimistic Locking | server/repository.ts updateUserVersioned + userExists | UPDATE ... version=version+1 WHERE id=? AND version=? |
| HTTP 409 Conflict | server/routes/users.routes.ts PUT/PATCH | affectedRows=0 ⇒ 409 با پیام «اطلاعات توسط کاربر دیگری تغییر کرده» |
| Idempotency تراکنش | server/routes/finance.routes.ts POST /transactions | کلید از هدر Idempotency-Key یا body؛ تکرار ⇒ 200 با duplicate:true؛ مسابقه unique index هم handle میشود |
| Soft-Void مالی | finance.routes DELETE /transactions/:id | UPDATE status='cancelled' + voidedAt/voidedBy/voidReason (هیچ حذف فیزیکی) |
| Frontend version sync | src/services/db.ts updateUser/updateUserProfile | بعد از PUT موفق، version محلی از پاسخ بهروز میشود؛ 409 ⇒ loadFromBackendMySql |
| Frontend soft-void | deleteTransaction | بهجای حذف از آرایه: status='cancelled' + voidedAt/By/Reason |
| Double-click Guard | canSubmitFinancialAction | پنجره ۱۵۰۰ms برای addTransaction و createShopInvoice |
| Pending merge users | loadFromBackendMySql | کاربران نیز با pendingLocalMutations ادغام میشوند (ضد overwrite پولینگ) |

## ۶. فازهای باقیمانده

- **Phase 4 ادامه**: await کردن RESTها؛ جدا کردن CRUD عادی از full-state sync (هر Entity API مستقل)
- **Phase 5 ادامه**: Pagination/Filtering روی full-data؛ Audit Trail کامل (oldValue/newValue/ip/userAgent)
- **Phase 6**: Backup خارج از سرور + Retention (7 روزانه/۴ هفتگی/۳ ماهانه) + تست Restore
- **Phase 7**: اجرای تستهای ۱–۸ پس از نصب node_modules (در این محیط npm install انجام نشده)
- **FK واقعی**: پس از اسکن Orphan Records (نیازمند دیتابیس زنده)

