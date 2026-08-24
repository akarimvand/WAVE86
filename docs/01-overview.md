# ۰۱ — معرفی پروژه و نقشه ماژول‌ها

## ۱. هدف کسب‌وکار

سامانه اتوماسیون باشگاه ورزشی/سنگ‌نوردی «موج» شامل: پیش‌ثبت‌نام آنلاین، مدیریت اعضا و اولیا، سانس‌ها و ثبت‌نام دوره‌ها، حضور و غیاب، حسابداری مالی (تراکنش/بدهکار/بستانکار)، بوفه و انبارداری (فاکتور POS)، بیمه ورزشی، تیکتینگ پشتیبانی، ارسال پیامک/Bale، نقش‌ها و دسترسی‌ها، گزارش تحلیلی مدیر و پورتال والد/ورزشکار.

## ۲. استک فناوری (استخراج‌شده از package.json و import های واقعی)

| لایه | فناوری | نسخه |
|---|---|---|
| UI | React | 19 |
| زبان | TypeScript | ~5.8 (strict **خاموش**) |
| Build فرانت | Vite | ^6.2.3 |
| استایل | Tailwind CSS | v4 (@tailwindcss/vite) |
| نمودار | Recharts | 3.x |
| آیکون | lucide-react | 0.546 |
| انیمیشن | motion | 12.x |
| تاریخ | تقویم جلالی سفارشی (`src/utils/jalaliDate.ts`) — بدون کتابخانه خارجی |
| سرور | Node.js ≥20 + Express | 4.21 |
| درایور DB | mysql2 | 3.23 (Connection Pool, limit=15) |
| احراز هویت | jsonwebtoken + bcryptjs (cost=8) |
| آپلود | multer (diskStorage) |
| امنیت HTTP | helmet + express-rate-limit |
| خروجی Excel | xlsx + jszip |
| Dev Runner | tsx |

## ۳. نقشه ماژول‌های بک‌اند

```
server.ts                      ← بوت‌استرپ: express، vite dev middleware، readiness gate، graceful shutdown
server/
├── db.ts                      ← ★ Pool اصلی MySQL (config.json + env)، hashPassword/comparePassword،
│                                 withTransaction، کش تنظیمات باشگاه
├── mysql.ts                   ← DDL جداول (CREATE TABLE IF NOT EXISTS) + Self-Healing ستون‌ها (ensureCol)
│                                 + seedInitialAdmin — ⚠️ تکرار کد با db.ts (pool/config دومِ بلااستفاده)
├── repository.ts              ← SyncRepository: batchUpsert چانکی (100تایی) برای ۱۹ جدول
│                                 + updateUserVersioned (Optimistic Locking واقعی)
├── middleware.ts              ← helmet/CSP، دو Rate-Limiter، JWT (sign/verify)، requireRoles،
│                                 validateRequestBody، validateFileMagicBytes، errorHandler
├── migrations.ts              ← رانر مایگریشن idempotent (جدول schema_migrations)
├── audit.ts                   ← writeAudit با oldValue/newValue/ip/userAgent + fallback
├── backupScheduler.ts         ← بکاپ JSON روزانه (7روز/4هفته/3ماه retention) + مقصد remote
└── routes/                    ← ۱۱ ماژول مسیر (auth, users, products, courses, finance, club,
                                  messaging(sms/bale), backup, upload, install, mysql-sync)
```

## ۴. نقشه ماژول‌های فرانت‌اند

```
src/
├── main.tsx / App.tsx         ← شل برنامه: لاگین، سوییچ نقش، روتینگ تب‌محور (بدون react-router)
├── services/db.ts             ← ★★★ هسته سیستم: کلاس StorageEngine تک‌نمونه (3969 خط!)
│                                 - کل Entityها به‌صورت آرایه درون حافظه
│                                 - syncWithBackendMySql / loadFromBackendMySql
│                                 - pendingLocalMutations (ضد overwrite پولینگ)
│                                 - offlineQueue + flushOfflineQueue
│                                 - منطق تجاری همه دامنه‌ها (مالی، ثبت‌نام، حضور...)
├── types.ts                   ← مدل‌های داده و INITIAL_ROLES/SYSTEM_PERMISSIONS
├── components/                ← ~۴۰ ویو/مودال (بزرگ‌ترین: UserPortalCoursesView 224KB!)
└── utils/                     ← jalaliDate, nationalIdValidator, theme, imageCompressor,
                                  excelTemplateGenerator, fileUploader
```

## ۵. ورودی/خروجی و فایل‌های runtime

| مسیر | نقش |
|---|---|
| `config.json` | اعتبار DB (از git مستثنی؛ env روی آن اولویت دارد) |
| `.env` | DB_* ، JWT_SECRET، BACKUP_* ، SMS_API_KEY |
| `uploads/` | فایل‌های آپلودی (+`profile_img/`) — سرو عمومی `/uploads` |
| `backups/auto/` | بکاپ خودکار JSON (+`BACKUP_REMOTE_DIR` اختیاری) |
| `dist/` | خروجی production (SPA + server.cjs) |
