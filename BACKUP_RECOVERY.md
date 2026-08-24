# WAVE86 — Backup & Recovery (Phase 6)

> فایل زنده رویههای پشتیبانگیری و بازیابی. پیادهسازی: `server/backupScheduler.ts`
> آخرین بهروزرسانی: 2026-08-24

---

## ۱. اهداف Recovery — RPO و RTO

| سنجه | مقدار هدف | توضیح |
|---|---|---|
| **RPO** (حداکثر داده ازدسترفته مجاز) | **≤ ۲۴ ساعت** | بکآپ خودکار روزانه؛ بدترین حالت ۲۴ ساعت داده از بین میرود |
| **RTO** (حداکثر زمان بازگشت سرویس) | **≤ ۱ ساعت** | Restore JSON از طریق endpoint داخلی یا ایمپورت دستی |

> برای رسیدن RPO به ≤ ۱۵ دقیقه: `BACKUP_INTERVAL_HOURS=0.25` در env تنظیم کنید.

---

## ۲. معماری Backup

```
MySQL ──(هر BACKUP_INTERVAL_HOURS، پیشفرض 24h)──▶ backups/auto/*.json   (Local)
                                            └─────────────────────────▶ BACKUP_REMOTE_DIR/*.json  (Off-server)
```

- **مقصد اول:** `<project>/backups/auto/` — همان سرور
- **مقصد دوم (الزامی Production):** متغیر محیطی `BACKUP_REMOTE_DIR`
  - مثال ویندوز/نکستکلود: `BACKUP_REMOTE_DIR=\\NAS\wave86-backups`
  - مثال لینوکس: `BACKUP_REMOTE_DIR=/mnt/backup-nas/wave86`
  - این پوشه باید **خارج از سرور اپلیکیشن** باشد (NAS، دیسک دوم، Sync ابری)

### متغیرهای محیطی
| کلید | پیشفرض | توضیح |
|---|---|---|
| `BACKUP_INTERVAL_HOURS` | `24` | فاصله اجرای بکآپ خودکار |
| `BACKUP_REMOTE_DIR` | خالی | مسیر مقصد دوم؛ اگر خالی باشد فقط Local |

### جدولهای پوششدادهشده (۲۰ جدول)
roles, users, parent_athlete_links, audit_logs, pre_registrations, club_settings,
club_announcements, courses, enrollments, transactions, attendance_records,
debtors, creditors, insurance_requests, support_tickets, app_notifications,
products, shop_invoice_items, shop_invoices, sms_logs

---

## ۳. سیاست Retention

| پنجره | نگهداری |
|---|---|
| ۷ روز اخیر | همه نسخهها |
| هفتههای بعدی | جدیدترین نسخه هر هفته تا حداکثر ۴ هفته |
| ماههای بعدی | جدیدترین نسخه هر ماه تا حداکثر ۳ ماه |
| مابقی | حذف خودکار پس از هر چرخه |

---

## ۴. رویه Restore

### روش A — از داخل اپلیکیشن (JSON)
1. ورود با نقش `super_admin` / `admin`
2. بخش Data Import Management → انتخاب فایل بکآپ → Restore
3. فراخوانی `POST /api/backup/restore-host` با `{filename}` (upsert تراکنشی تمام کالکشنها)

### روش B — دستی (SQL Dump)
اگر از `mysqldump` استفاده میکنید:
```bash
# ایجاد dump
mysqldump -h HOST -u USER -p --single-transaction --routines DB_NAME > dump.sql
# بازیابی روی سرور جدا
mysql -h NEW_HOST -u USER -p NEW_DB_NAME < dump.sql
```

### چکلیست تأیید پس از Restore
```sql
SELECT COUNT(*) FROM users;          -- تعداد منطقی؟
SELECT COUNT(*) FROM transactions;   -- تراکنش مالی موجود؟
SELECT COUNT(*) FROM enrollments WHERE status='active';
SELECT id, username FROM users WHERE activeRole='super_admin' LIMIT 3;
SELECT MAX(createdAt) FROM transactions;  -- تازهترین رکورد نزدیک زمان بکآپ؟
```
- [ ] ورود ادمین تست شود (`comparePassword` روی هشها کار میکند)
- [ ] یک ثبتنام آزمایشی CREATE → READ موفق
- [ ] لاگ خطاهای Restore بررسی شد

---

## ۵. مسئولیتها و زمانبندی عملیاتی
| وظیفه | تناوب | مسئول |
|---|---|---|
| بررسی لاگ `[BackupScheduler]` | روزانه | ادمین سرور |
| تست Restore کامل (Test 8) | ماهانه | ادمین DB |
| چرخش/آرشیو مقصد Remote | فصلی | ادمین زیرساخت |
