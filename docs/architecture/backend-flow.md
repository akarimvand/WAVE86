# ⚙️ جریان پردازش و پایپ‌لاین بک‌اند (Backend Flow)

## ۱. پایپ‌لاین پردازش درخواست در Express

نقطه ورود سرور در فایل `/server.ts` تعریف شده است. درخواست‌های ورودی یک خط لوله (Pipeline) ترتیبی از میدل‌ورها را طی می‌کنند:

```mermaid
flowchart TD
    Req([درخواست ورودی کلاینت]) --> Helmet[۱. میدل‌ور Helmet\nاعمال هدرهای امنیتی و CSP]
    Helmet --> RateLimiter[۲. میدل‌ور Rate Limiter\nکنترل سقف ۱۰۰۰ درخواست در ۱۵ دقیقه به ازای IP]
    RateLimiter --> StaticUploads[۳. سرو فایل‌های استاتیک\n/uploads -> express.static]
    StaticUploads --> BodyParsers[۴. پردازش بدنه درخواست\nexpress.json limit:50mb + express.urlencoded]
    BodyParsers --> RequestLogger[۵. ثبت لاگ درخواست\nتاریخ، متد، مسیر و IP کلاینت]
    
    RequestLogger --> RouteCheck{بررسی مسیر درخواست}
    RouteCheck -- "مسیر /api/auth/*" --> AuthRoutes["روتر احراز هویت"]
    RouteCheck -- "مسیر /api/users/*" --> UserRoutes["روتر کاربران"]
    RouteCheck -- "مسیر /api/courses/*" --> CourseRoutes["روتر دوره‌ها و سانس‌ها"]
    RouteCheck -- "مسیر /api/finance/*" --> FinanceRoutes["روتر مالی و حسابداری"]
    RouteCheck -- "مسیر /api/products/*" --> ProductRoutes["روتر فروشگاه و انبار"]
    RouteCheck -- "مسیر /api/club/*" --> ClubRoutes["روتر اعلانات و باشگاه"]
    RouteCheck -- "مسیر /api/sms/* یا /api/bale/*" --> MsgRoutes["روتر پیام‌رسانی"]
    RouteCheck -- "مسیر /api/backup/*" --> BackupRoutes["روتر پشتیبان‌گیری"]
    RouteCheck -- "مسیر /api/upload/*" --> UploadRoutes["روتر آپلود فایل"]
    RouteCheck -- "مسیر /api/install/*" --> InstallRoutes["روتر نصب و تنظیمات DB"]
    RouteCheck -- "مسیر /api/mysql/*" --> SyncRoutes["روتر همگام‌سازی جامع"]
    RouteCheck -- "سایر مسیرها (SPA Fallback)" --> SPAServer["سرو فایل index.html کلاینت"]

    AuthRoutes --> GlobalErrorHandler["۶. میدل‌ور مرکزی مدیریت خطا (Global Error Handler)"]
    UserRoutes --> GlobalErrorHandler
    CourseRoutes --> GlobalErrorHandler
    FinanceRoutes --> GlobalErrorHandler
    ProductRoutes --> GlobalErrorHandler
    ClubRoutes --> GlobalErrorHandler
    MsgRoutes --> GlobalErrorHandler
    BackupRoutes --> GlobalErrorHandler
    UploadRoutes --> GlobalErrorHandler
    InstallRoutes --> GlobalErrorHandler
    SyncRoutes --> GlobalErrorHandler

    GlobalErrorHandler --> ResponseOut([پاسخ نهایی به کلاینت JSON / File])
```

---

## ۲. زنجیره میدل‌ورهای امنیتی و احراز هویت

کنترل دسترسی‌ها بر پایه JWT و کنترل دسترسی مبتنی بر نقش (RBAC) انجام می‌شود:

```mermaid
flowchart LR
    subgraph Guards["زنجیره گاردها (Guards Chain)"]
        A["درخواست به مسیر محافظت‌شده"] --> B["authenticateJwt"]
        B -- "فاقد هدر یا توکن نامعتبر" --> B_Fail["پاسخ ۴۰۱ Unauthorized"]
        B -- "توکن معتبر" --> C["افزودن req.user به شیء Request"]
        C --> D["requireRoles(['role1', 'role2'])"]
        D -- "نقش کاربر در لیست مجاز نیست" --> D_Fail["پاسخ ۴۰۳ Forbidden"]
        D -- "کاربر دارای دسترسی است" --> E["اجرای کنترلر اصلی Endpoint"]
    end
```

---

## ۳. چرخه حیات راه‌اندازی سرور (Server Bootstrap Lifecycle)

هنگام استارت سرور با دستور `node dist/server.cjs` یا `tsx server.ts`، مراحل زیر اجرا می‌گردد:

```mermaid
sequenceDiagram
    autonumber
    participant Server as سرور Express (server.ts)
    participant FS as سیستم‌فایل (uploads, backups)
    participant DBConfig as ماژول تنظیمات DB (db.ts)
    participant MySQLMigrate as خودترمیمی مایگریشن (mysql.ts)
    participant AdminSeed as بذر داده اولیه (Seed Admin)
    participant ViteStatic as هندلر محیط (Dev/Prod)

    Server->>FS: اطمینان از وجود پوشه‌های uploads/ و backups/
    Server->>DBConfig: خواندن config.json یا متغیرهای محیطی .env
    Server->>DBConfig: ساخت استخر اتصالات MySQL (Connection Pool)
    
    alt دیتابیس در دسترس و کانفیگ موجود است
        Server->>MySQLMigrate: فراخوانی initializeTables(pool)
        MySQLMigrate->>MySQLMigrate: اجرای CREATE TABLE IF NOT EXISTS برای ۲۰ جدول
        MySQLMigrate->>MySQLMigrate: بررسی و اجرای خودکار ALTER TABLE (ستون‌ها و ایندکس‌ها)
        Server->>AdminSeed: بررسی وجود کاربر super_admin و ساخت در صورت عدم وجود
    else دیتابیس آفلاین یا کانفیگ نشده است
        Server->>Server: ثبت اخطار در کنسول و آماده‌باش جهت تنظیمات نصب از طریق UI
    end

    Server->>ViteStatic: تنظیم میدل‌ورهای Vite (در محیط Dev) یا express.static (در محیط Prod)
    Server->>Server: گوش فرا دادن به پورت ۳۰۰۰ (Host: 0.0.0.0)
```

---

## ۴. استراتژی مدیریت خطای سرور

تمام خطاها در کنترلرها از طریق بلوک‌های `try/catch` مهار شده و به میدل‌ور متمرکز مدیریت خطا ارسال می‌شوند. فرمت استاندارد پاسخ خطا در سرور:

```json
{
  "success": false,
  "error": "پیام خطای فارسی و قابل فهم برای کاربر",
  "details": "اطلاعات تکمیلی در حالت غیرتولیدی (اختیاری)"
}
```
کدهای وضعیت استاندارد مورد استفاده:
- `200 OK`: انجام موفق عملیات
- `201 Created`: ثبت موفقیت‌آمیز منبع جدید (کاربر، محصول، تراکنش، ...)
- `400 Bad Request`: نقص در پارامترهای اجباری یا اعتبارسنجی ورودی
- `401 Unauthorized`: عدم ارائه توکن معتبر
- `403 Forbidden`: عدم کفایت سطح دسترسی یا تلاش برای دسترسی به رکورد غیرمجاز (IDOR)
- `404 Not Found`: عدم یافتن رکورد مورد تقاضا
- `500 Internal Server Error`: خطای سیستمی دیتابیس یا سرور
