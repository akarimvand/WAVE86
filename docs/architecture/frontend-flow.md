# 💻 معماری فرانت‌اند و مدیریت وضعیت (Frontend Flow)

## ۱. نمای کلی فرانت‌اند

فرانت‌اند سامانه بر پایه **React 19** و ابزار ساخت سریع **Vite 6** با زبان **TypeScript** طراحی شده و استایل‌دهی آن با استفاده از امکانات نسخه جدید **Tailwind CSS 4** صورت گرفته است.

```mermaid
flowchart TD
    subgraph Root["ریشه برنامه (Root Container)"]
        Main["main.tsx"] --> ErrorBoundary["ErrorBoundary (مدیریت خطاهای غیرمنتظره UI)"]
        ErrorBoundary --> App["App.tsx (کامپوننت والد اصلی)"]
    end

    subgraph StateEngine["موتور وضعیت محلی (Client Store)"]
        App <--> DBStore["dbStore (/src/services/db.ts)"]
        DBStore <--> LocalPersist["ذخیره‌سازی در LocalStorage / Indexed State"]
        DBStore <--> APIClient["سرویس تبادل داده با سرور (/api/*)"]
    end

    subgraph ViewRouting["سیستم ناوبری و تب‌های پنل (Tab Routing)"]
        App --> Header["هدر سیستم + دکمه‌های وضعیت دیتابیس و اعلانات"]
        App --> Sidebar["سایدبار دسترسی سریع بر اساس نقش فعال کاربر"]
        App --> ActiveView{"انتخاب تب فعال (activeTab)"}

        ActiveView --> V1["پیشخوان آماری و نمودارها (AdminAnalyticsDashboard)"]
        ActiveView --> V2["مدیریت اعضا و مربیان (Users / Phase1RolesPermissions)"]
        ActiveView --> V3["برنامه سانس‌ها و کلاس‌ها (SessionsManagementView)"]
        ActiveView --> V4["ثبت تردد و حضورغیاب (AttendanceTrackerView)"]
        ActiveView --> V5["امور مالی و حسابداری (FinancialAccountingView)"]
        ActiveView --> V6["بوفه و فروشگاه (ShopExpensesView)"]
        ActiveView --> V7["پنل پیامک و ربات بله (SmsManagementView)"]
        ActiveView --> V8["بیمه ورزشی و پزشکی (SportsInsuranceView)"]
        ActiveView --> V9["پشتیبانی و تیکتینگ (SupportTicketingView)"]
        ActiveView --> V10["پیش‌ثبت‌نام و بررسی پذیرش (PreRegistrationAdminPanel)"]
        ActiveView --> V11["تنظیمات باشگاه و دیتابیس (ClubSettingsView)"]
        ActiveView --> V12["پنل اختصاصی مربی (CoachPortalView)"]
        ActiveView --> V13["پرتال ورزشکار و کارت عضویت (UserPortalCoursesView)"]
    end
```

---

## ۲. ساختار مدیریت وضعیت (`dbStore`)

فرانت‌اند از یک سرویس مدیریت داده واکنش‌گرا (`dbStore`) استفاده می‌کند که رویدادها را در حافظه مدیریت کرده و لیسنرهای متصل به UI را مطلع می‌سازد:

1. **متدهای خواندن داده (Getters):**
   - `getUsers()`, `getUserById(id)`, `getCurrentUser()`
   - `getSessions()`, `getUserEnrollments(userId)`
   - `getTransactions()`, `getShopProducts()`, `getShopInvoices()`
   - `getAttendanceRecords()`, `getClubSettings()`

2. **متدهای تغییر داده (Mutations):**
   - `saveUser(user)`, `deleteUser(id)`
   - `saveSession(session)`, `saveEnrollment(enrollment)`
   - `saveTransaction(tx)`, `saveProduct(prod)`
   - `markNotificationRead(id)`

3. **الگوی همگام‌سازی (Optimistic UI Update with Server Sync):**
   - به هنگام ایجاد یا تغییر رکورد، داده بلافاصله در حافظه محلی کلاینت به‌روزرسانی شده و رابط کاربری بدون تاخیر پاسخ می‌دهد.
   - همزمان، یک درخواست HTTP غیرهمگام به سرور ارسال می‌شود تا رکورد در دیتابیس MySQL پایدار گردد.

---

## ۳. سلسله‌مراتب مودال‌های تعاملی (Modals)

سامانه از مودال‌های تخصصی بدون تغییر صفحه برای تعاملات عمیق استفاده می‌کند:
- `DigitalMembershipCardModal`: صدور و نمایش کارت عضویت دیجیتال مجهز به بارکد Code128، کد QR و چرخش سه‌بعدی کارت.
- `Member360Modal`: نمایش جامع مشخصات ورزشکار، پرونده پزشکی، سوابق ثبت‌نام، کارت‌های عضویت، تیکت‌ها و تراکنش‌های مالی.
- `EditEnrollmentModal`: ویرایش مهلت اعتبار ثبت‌نام، تعداد جلسات مجاز و تسویه بدهی دوره.
- `ProductDetailModal` و `ShopInvoiceDetailModal`: مشاهده و صدور فاکتور رسمی فروشگاه.
- `SyncDiagnosticsModal`: دیاگ مرحله‌به‌مرحله و آنالیز خط‌به‌خط جداول دیتابیس.
- `MySqlTablesTestModal`: مانیتورینگ سلامت ۲۰ جدول دیتابیس و شمارش زنده رکوردها.
