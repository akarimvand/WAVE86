# 📚 مستندات فنی و مهندسی معکوس سامانه جامع مدیریت باشگاه ورزشی و سنگ‌نوردی موج ۶۹

این مستندات حاصل مهندسی معکوس جامع و خط‌به‌خط تمامی بخش‌های سورس‌کد پروژه (Frontend، Backend، Database، Security و Storage) می‌باشد. تمامی داده‌ها، ساختارها و رفتارهای ثبت‌شده، منطبق بر پیاده‌سازی واقعی کدهای مخزن بوده و از هرگونه اطلاعات ساختگی یا حدس پرهیز شده است.

---

## 🧭 ماتریس ناوبری مستندات پروژه

| بخش | مسیر سند | شرح محتوا |
| :--- | :--- | :--- |
| **۱. معماری کلان سیستم** | [`/docs/architecture/system-overview.md`](./architecture/system-overview.md) | معماری سه‌لایه، دیاگرام Mermaid جریان داده‌ها و ماژول‌ها |
| **۲. جریان اجرای بک‌اند** | [`/docs/architecture/backend-flow.md`](./architecture/backend-flow.md) | پایپ‌لاین Express، میدل‌ورها، کنترلرها و چرخه درخواست/پاسخ |
| **۳. جریان اجرای فرانت‌اند** | [`/docs/architecture/frontend-flow.md`](./architecture/frontend-flow.md) | کامپوننت‌های React 19، مدیریت وضعیت `dbStore` و سینک |
| **۴. ساختار پایگاه داده** | [`/docs/database/schema.md`](./database/schema.md) | مستند کامل ۲۰ جدول MySQL، نوع فیلدها و پیش‌فرض‌ها |
| **۵. روابط جداول (ERD)** | [`/docs/database/relationships.md`](./database/relationships.md) | کلیدهای اصلی/خارجی، اتصالات و دیاگرام جامع Mermaid ERD |
| **۶. مکانیزم خودترمیمی دیتابیس** | [`/docs/database/migrations-and-self-healing.md`](./database/migrations-and-self-healing.md) | سیستم مایگریشن خودکار، تابع `initializeTables` و Seed اولیه |
| **۷. استانداردهای وب‌سرویس** | [`/docs/api/overview.md`](./api/overview.md) | قراردادهای پاسخ، کدهای وضعیت HTTP و گاردها |
| **۸. کاتالوگ اندپوینت‌ها** | [`/docs/api/endpoints.md`](./api/endpoints.md) | مستندات کامل تمامی Routeهای ۱۱ فایل روتر بک‌اند |
| **۹. امنیت و احراز هویت** | [`/docs/security/authentication-and-authorization.md`](./security/authentication-and-authorization.md) | توکن JWT، هشینگ پسورد Bcrypt، سطوح دسترسی RBAC و پیشگیری از IDOR |
| **۱۰. استحکام‌بخشی امنیتی** | [`/docs/security/hardening.md`](./security/hardening.md) | محافظت‌های Helmet، Rate Limiting، اعتبارسنجی Magic Bytes و SQL Injection |
| **۱۱. سیستم فایل و ذخیره‌سازی** | [`/docs/storage/file-and-upload-system.md`](./storage/file-and-upload-system.md) | آپلود دیسک، تبدیل Base64، پوشه‌ها و لایه Fallback فایلی |
| **۱۲. ماژول اعضا و نقش‌ها** | [`/docs/modules/users-and-roles.md`](./modules/users-and-roles.md) | مدیریت کاربران، پیش‌ثبت‌نام، لینک والد-فرزند و پروفایل ۳۶۰ |
| **۱۳. ماژول دوره‌ها و ثبت‌نام** | [`/docs/modules/courses-and-enrollment.md`](./modules/courses-and-enrollment.md) | سانس‌ها، ظرفیت‌ها، ثبت‌نام و کنترل سقف جلسات |
| **۱۴. ماژول تردد و کارت دیجیتال** | [`/docs/modules/attendance.md`](./modules/attendance.md) | کارت عضویت هوشمند، بارکد/QR گیت و سوابق حضور و غیاب |
| **۱۵. ماژول مالی و فروشگاه** | [`/docs/modules/finance-and-shop.md`](./modules/finance-and-shop.md) | حسابداری، تراکنش‌ها، بدهکاران، بستانکاران، کالاها و فاکتورها |
| **۱۶. ماژول پیام‌رسانی و اعلان** | [`/docs/modules/messaging-and-notifications.md`](./modules/messaging-and-notifications.md) | وب‌سرویس SMS.ir، بات پیام‌رسان بله، تیکتینگ و نوتیفیکیشن |
| **۱۷. راهنمای استقرار در سرور** | [`/docs/deployment/cpanel-passenger.md`](./deployment/cpanel-passenger.md) | کانفیگ cPanel، CloudLinux Phusion Passenger و فایل‌های محیطی |
| **۱۸. عیب‌یابی و مانیتورینگ** | [`/docs/troubleshooting/diagnostics-and-sync.md`](./troubleshooting/diagnostics-and-sync.md) | دیاگ خط‌به‌خط همگام‌سازی، بک‌آپ‌گیری و خطایابی پایگاه داده |
| **۱۹. واژه‌نامه تخصصی و کدکس** | [`/docs/dictionary/terminology-and-codex.md`](./dictionary/terminology-and-codex.md) | دیکشنری اصطلاحات فنی، ورزشی، استاتوس‌ها و نقش‌های سیستم |

---

## 🛠️ مشخصات پشته فناوری (Tech Stack)

### لایه فرانت‌اند (Frontend)
- **فریم‌ورک هسته:** React 19.0.0
- **ابزار ساخت و باندلر:** Vite 6.2.0
- **استایل‌دهی و طراحی:** Tailwind CSS 4.0.0
- **کتابخانه آیکون‌ها:** Lucide React
- **مدیریت تقویم و تاریخ:** Jalali Date Picker اختصاصی و فرمت‌های شمسی / میلادی

### لایه بک‌اند (Backend)
- **محیط اجرا:** Node.js (سازگار با نسخه 18 و بالاتر)
- **فریم‌ورک وب:** Express 4.21.2
- **زبان پیاده‌سازی:** TypeScript 5.7.3
- **اجرای سرور و کامپایل:** `tsx` در توسعه، `esbuild` / `tsc` در تولید
- **نقطه ورود:** `/server.ts`

### لایه پایگاه داده (Database)
- **موتور دیتابیس:** MySQL 8.x / MariaDB
- **درایور اتصال:** `mysql2/promise` (نسخه 3.12.0)
- **مدیریت نشست‌ها:** Connection Pool با قابلیت Auto-Reconnect
- **مکانیزم مهاجرت:** سیستم مایگریشن خودکار خودترمیم (Self-Healing Schema)

### امنیت و احراز هویت (Security & Auth)
- **احراز هویت:** JSON Web Tokens (`jsonwebtoken` نسخه 9.0.2) به صورت Bearer Token
- **هشینگ پسورد:** `bcryptjs` (نسخه 2.4.3) با Salt Rounds = 10 و ارتقای خودکار پسوردهای ساده
- **امنیت هدرهای HTTP:** `helmet` (نسخه 8.0.0) با سیاست‌های CSP سازگار با فایل‌های استاتیک
- **محدودسازی نرخ درخواست:** `express-rate-limit` (نسخه 7.5.0) با آستانه ۱۰۰۰ درخواست در ۱۵ دقیقه
- **اعتبارسنجی فایل:** تحلیل هدر و Magic Bytes برای مقابله با آپلود فایل‌های مخرب

### فایل‌ها و ذخیره‌سازی (Storage & Files)
- **مدیریت آپلود چندبخشی:** `multer` (نسخه 1.4.5-lts.1)
- **پوشه‌های استاتیک دیسک:** `/uploads/` و `/uploads/profile_img/`
- **پشتیبان‌گیری:** `/backups/` با فرمت JSON و متادیتا
- **لایه پایداری موازی (High Availability Fallback):** فایل `server_db_store.json` جهت پایداری داده در زمان قطعی احتمالی دیتابیس

---

## 🎯 اهداف کلیدی مهندسی معکوس
1. **شفافیت کامل داده‌ها:** مستندسازی دقیق همه فیلدها و اعتبارسنجی‌های سرور.
2. **پایداری دوگانه (Zero Data Loss):** تحلیل سیستم ذخیره‌سازی همزمان در MySQL و FileStore.
3. **پایداری در محیط‌های هاستینگ اشتراکی:** تضمین سازگاری ۱۰۰٪ با CloudLinux و Passenger.
