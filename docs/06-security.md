# ۰۶ — امنیت

## ۱. کنترل‌های پیاده‌سازی‌شده ✅

| حوزه | کنترل |
|---|---|
| هدرهای HTTP | helmet با CSP سفارشی، COOP/CORP، no-sniff |
| Rate Limit | عمومی 1500 req/15m · ورود 50/15m (ضد brute-force) |
| رمز عبور | bcryptjs (cost=8)، auto-upgrade legacy plaintext در login، hash-all-passwords ادمین‌پذیر |
| JWT_SECRET | الزام env ≥16 کاراکتر؛ fallback تصادفی ephemeral + هشدار (بدون secret ثابت هاردکد) |
| SQL Injection | کوئری‌های پارامتری سراسری؛ multipleStatements خاموش |
| آپلود | whitelist MIME + magic bytes + سقف 5MB + sanitize نام فایل + path.basename ضد traversal در backup |
| PII Filtering | full-data سه‌سطحی؛ حذف nationalId/phone/address/medicalConditions برای غیرمجاز |
| Audit Trail | writeAudit با oldValue/newValue/ip/userAgent + حذف password از payload |
| اعتبار مالی | Idempotency-Key UNIQUE + soft-void + تراکنش اتمیک + 409 قفل خوشبینانه |
| Shutdown | graceful close pool؛ readiness gate جلوگیری از race بوت |
| Secrets | config.json و .env خارج از git |

## ۲. شکاف‌ها و ریسک‌های امنیتی (خلاصه — شرح کامل در گزارش ممیزی)

| # | شدت | شکاف |
|---|---|---|
| S1 | 🔴 Critical | `POST /api/mysql/sync` فقط JWT می‌خواهد؛ **هر کاربر عادی می‌تواند کل State شامل users/roles را upsert کند** → ارتقای نقش خودش به super_admin |
| S2 | 🟠 High | توکن JWT در `sessionStorage` + CSP با `unsafe-inline/unsafe-eval` ⇒ XSS = سرقت توکن |
| S3 | 🟠 High | `frameAncestors 'self' *` ⇒ صفحه توسط هر سایتی iframe می‌شود (clickjacking) |
| S4 | 🟠 High | دامپ SQL پروڈاکشن (۵۷MB، شامل احتمالاً PII واقعی) داخل مخزن |
| S5 | 🟠 High | انقضای JWT سی روزه بدون refresh/revoke؛ logout سمت سرور وجود ندارد |
| S6 | 🟡 Medium | bcrypt cost=8 (پیشنهاد OWASP ≥10) + کش plaintext→hash در RAM بدون تخلیه |
| S7 | 🟡 Medium | `/api/upload` multipart با optionalJwt (بدون توکن هم آپلود ممکن است) |
| S8 | 🟡 Medium | `filename` آزاد در POST /api/backup/save ⇒ امکان path traversal نوشتن (adminGuard دارد) |
| S9 | 🟡 Medium | install/test-db و save-config تا قبل از «نصب» عمومی‌اند؛ database name در CREATE DATABASE interpolate می‌شود |
| S10 | 🟡 Medium | JSON body 50mb + full-data بدون pagination ⇒ سطح DoS و نشت حجمی |
| S11 | 🟢 Low | errorHandler پیام خطای داخلی را به کلاینت می‌فرستد؛ stack در development |
| S12 | 🟢 Low | /api/health حتی با MySQL قطع `status:'ok'` برمی‌گرداند (مانیتورینگ گمراه می‌شود) |
