# 🏗️ معماری کلان سیستم (System Overview)

## ۱. نمای کلی و معماری سه‌لایه (Three-Tier Architecture)

سامانه باشگاه سنگ‌نوردی موج ۶۹ بر پایه یک معماری ماژولار و یکپارچه Full-Stack توسعه یافته است. در این مدل، کلاینت به عنوان یک Single Page Application (SPA) در React 19 اجرا شده و با بک‌اند مبتنی بر Express 4 و پایگاه داده MySQL در تعامل دائم است.

```mermaid
flowchart TD
    subgraph ClientLayer["🖥️ لایه فرانت‌اند (Client - React 19 + Vite 6)"]
        UI["رابط کاربری و کامپوننت‌های پنل (Tailwind CSS 4)"]
        State["مدیریت وضعیت محلی (dbStore / Reactive State)"]
        SyncEngineClient["موتور همگام‌سازی کلاینت (Sync Engine)"]
        UI --> State
        State --> SyncEngineClient
    end

    subgraph SecurityLayer["🛡️ لایه میانی و امنیت (Middleware & Security)"]
        Helmet["Helmet (امنیت هدرهای HTTP)"]
        RateLimiter["Rate Limiter (محدودسازی نرخ تراکنش)"]
        JWTMiddleware["احراز هویت JWT و بررسی نقش‌ها (RBAC)"]
        FileValidator["اعتبارسنجی جادویی فایل (Magic Bytes)"]
    end

    subgraph BackendLayer["⚙️ لایه پردازش و منطق سرور (Express 4 API)"]
        Router["مسیریاب‌های ماژولار (/api/*)"]
        Repo["لایه مخزن داده (SyncRepository)"]
        DBHandler["مدیریت تراکنش و استخر اتصالات MySQL"]
        FileStoreHandler["ذخیره‌ساز نسخه پشتیبان محلی (FileStore)"]
        Router --> Repo
        Repo --> DBHandler
        Repo --> FileStoreHandler
    end

    subgraph StorageLayer["💾 لایه ذخیره‌سازی داده و فایل‌ها (Storage & Persistence)"]
        MySQL[("پایگاه داده MySQL 8.x\n(۲۰ جدول رابطه‌ای)")]
        DiskStorage[("فایل‌سیستم محلی سرور\n(/uploads, /backups)")]
        FileStoreFallback[("حافظه پایدار سرور\n(server_db_store.json)")]
    end

    SyncEngineClient -- "درخواست‌های HTTP / JSON (Bearer Token)" --> SecurityLayer
    SecurityLayer --> Router
    DBHandler --> MySQL
    Router --> DiskStorage
    FileStoreHandler --> FileStoreFallback
```

---

## ۲. جریان گردش داده‌ها در کل سامانه (End-to-End Data Flow)

سامانه از یک الگوی **«ذخیره‌سازی پیشگیرانه دوگانه» (Dual-Storage Durability Pattern)** پیروی می‌کند:

```mermaid
sequenceDiagram
    autonumber
    actor User as کاربر / اپراتور باشگاه
    participant Frontend as کلاینت (React SPA)
    participant Middleware as میدل‌ورهای امنیت و توکن
    participant ExpressAPI as کنترلرهای Express API
    participant FileStore as حافظه سرور (server_db_store.json)
    participant MySQLPool as استخر MySQL (Connection Pool)
    participant Disk as ذخیره‌ساز دیسک (/uploads)

    User->>Frontend: انجام عملیات (مثلاً ثبت‌نام در کلاس / ثبت تراکنش)
    Frontend->>Frontend: به‌روزرسانی آنی وضعیت محلی (dbStore)
    Frontend->>Middleware: ارسال درخواست HTTP POST / PUT با هدر Authorization
    Middleware->>Middleware: بررسی Rate Limit + اعتبارسنجی امضای JWT + نقش کاربر
    Middleware->>ExpressAPI: پاس دادن درخواست معتبر به Route Handler
    
    rect rgb(240, 248, 255)
        note right of ExpressAPI: فاز ۱: پایداری سریع (Immediate Fallback)
        ExpressAPI->>FileStore: ذخیره یا به‌روزرسانی رکورد در server_db_store.json
    end

    alt داده حاوی فایل / تصویر Base64 باشد
        ExpressAPI->>ExpressAPI: بررسی Magic Bytes برای تایید نوع امن فایل
        ExpressAPI->>Disk: ذخیره فایل در /uploads/ یا /uploads/profile_img/
        ExpressAPI->>ExpressAPI: تبدیل فیلد به آدرس نسبی (مثلاً /uploads/file_123.jpg)
    end

    rect rgb(245, 255, 245)
        note right of ExpressAPI: فاز ۲: همگام‌سازی پایگاه داده رابطه ای
        ExpressAPI->>MySQLPool: دریافت کانکشن از استخر و اجرای کوئری پارامتری
        MySQLPool-->>ExpressAPI: تایید اجرای کوئری (INSERT / UPDATE)
    end

    ExpressAPI-->>Frontend: بازگرداندن پاسخ JSON { success: true, dbConnected: true, ... }
    Frontend->>User: نمایش پیام موفقیت‌آمیز و به‌روزرسانی UI
```

---

## ۳. اجزای اصلی معماری و وظایف آن‌ها

### ۳.۱. لایه کلاینت (Frontend)
- **کامپوننت‌های ماژولار:** تفکیک کامل بخش‌های عملیاتی به کامپوننت‌های تخصصی مانند `DigitalMembershipCardModal`, `AttendanceTrackerView`, `FinancialAccountingView` و `PreRegistrationAdminPanel`.
- **موتور محلی `dbStore`:** نگه‌داری وضعیت فعال سیستم در حافظه کلاینت و هماهنگ‌سازی آنی رویدادها.
- **تبدیل تاریخ جلالی/میلادی:** اعتبارسنجی و تبدیل استانداردهای تاریخ و ارقام فارسی.

### ۳.۲. لایه وب‌سرویس و میدل‌ورها (Backend API)
- **مسیریاب‌های تفکیک‌شده:** تفکیک ۱۱ ماژول در پوشه `/server/routes/` شامل auth, users, products, courses, finance, club, messaging, backup, upload, install, sync.
- **تراکنش‌های امن (ACID):** استفاده از تابع `withTransaction` جهت اجرای دسته‌ای چند کوئری وابسته در قالب یک تراکنش واحد با `COMMIT` و `ROLLBACK` خودکار.

### ۳.۳. لایه پایداری داده‌ها (Persistence Layer)
- **پایگاه داده MySQL:** منبع داده اصلی سیستم شامل ۲۰ جدول رابطه ای با انواع ستون‌های مناسب، ایندکس‌های کلیدی و کلیدهای اصلی یکتا.
- **فایل JSON پایدار (`server_db_store.json`):** لایه حفاظتی ضد قطعی (Fault-Tolerant) جهت اطمینان از حفظ اطلاعات حتی در شرایط داون‌بودن موقت دیتابیس در هاست‌های اشتراکی.
- **مخزن رسانه (`/uploads/`):** فایل‌های باینری تصاویر پروفایل، فیش‌های بانکی و عکس‌های کالا.
