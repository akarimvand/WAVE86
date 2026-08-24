# 🔗 روابط جداول و نمودار ERD پایگاه داده (Relationships & ERD)

## ۱. نمودار جامع ارتباط موجودیت‌ها (Entity Relationship Diagram)

در طراحی پایگاه داده سامانه موج ۶۹، روابط بین موجودیت‌ها بر اساس شناسه‌های یکتا (`id` از نوع `VARCHAR(64)`) پیاده‌سازی شده‌اند. نمودار زیر روابط کلیدی بین جداول را نشان می‌دهد:

```mermaid
erDiagram
    users ||--o{ enrollments : "دارد"
    users ||--o{ transactions : "انجام می‌دهد"
    users ||--o{ attendance_records : "ثبت تردد"
    users ||--o{ support_tickets : "ارسال تیکت"
    users ||--o{ insurance_requests : "درخواست بیمه"
    users ||--o{ debtors : "وضعیت بدهی"
    users ||--o{ creditors : "وضعیت بستانکاری"
    users ||--o{ shop_invoices : "خریدار"
    users ||--o{ parent_athlete_links : "والد یا فرزند"
    users ||--o{ audit_logs : "رخدادنگاری"

    courses ||--o{ enrollments : "شامل ثبت‌نام‌ها"
    courses ||--o{ attendance_records : "شامل جلسات تردد"
    users ||--o{ courses : "مربی دوره (coachId)"

    shop_invoices ||--o{ shop_invoice_items : "شامل اقلام فاکتور"
    products ||--o{ shop_invoice_items : "محصول خریداری شده"

    pre_registrations ||--o| users : "تبدیل به کاربر پس از تایید"

    users {
        string id PK
        string nationalId UK
        string username UK
        string password
        string fullName
        json roles
        string activeRole
        boolean isActive
        boolean isInsuranceValid
    }

    courses {
        string id PK
        string title
        string coachId FK
        string coachName
        json daysOfWeek
        int capacity
        bigint monthlyFee
    }

    enrollments {
        string id PK
        string userId FK
        string sessionId FK
        string status
        int totalSessionsAllowed
        int usedSessionsCount
        bigint tuitionFee
        bigint paidAmount
    }

    attendance_records {
        string id PK
        string userId FK
        string sessionId FK
        string date
        string status
        string method
    }

    transactions {
        string id PK
        string userId FK
        bigint amount
        string type
        string method
        string status
    }

    shop_invoices {
        string id PK
        string invoiceNumber
        string buyerId FK
        bigint totalAmount
        bigint finalAmount
        string status
    }

    shop_invoice_items {
        string id PK
        string invoiceId FK
        string productId FK
        int quantity
        bigint unitPrice
        bigint totalPrice
    }

    parent_athlete_links {
        string id PK
        string parentId FK
        string athleteId FK
        string relation
    }

    insurance_requests {
        string id PK
        string userId FK
        string packageType
        string insuranceNumber
        string status
    }

    support_tickets {
        string id PK
        string userId FK
        string subject
        string status
        json messages
    }
```

---

## ۲. مشخصات اتصالات و وابستگی‌های کلیدی

### ۲.۱. رابطه کاربر و دوره‌ها (`users` <-> `enrollments` <-> `courses`)
- **نوع رابطه:** Many-to-Many از طریق جدول میانی `enrollments`.
- **کلیدها:** فیلد `enrollments.userId` به `users.id` و فیلد `enrollments.sessionId` به `courses.id` اشاره دارد.
- **منطق کنترلی:** هر ثبت‌نام دارای فیلدهای `totalSessionsAllowed` و `usedSessionsCount` است که به ازای هر بار ثبت حضور در `attendance_records`، شمارنده `usedSessionsCount` افزایش می‌یابد.

### ۲.۲. رابطه والد و فرزند (`parent_athlete_links`)
- **نوع رابطه:** یک والد می‌تواند به چند فرزند (ورزشکار زیر ۱۸ سال) متصل باشد و بالعکس.
- **کلیدها:** `parentId` اشاره به کاربر با نقش `parent` و `athleteId` اشاره به کاربر با نقش `athlete`.

### ۲.۳. رابطه فاکتور فروشگاه و اقلام (`shop_invoices` <-> `shop_invoice_items` <-> `products`)
- **نوع رابطه:** One-to-Many بین فاکتور و ردیف‌های اقلام.
- **کلیدها:** `shop_invoice_items.invoiceId` به `shop_invoices.id` و `shop_invoice_items.productId` به `products.id`.
- **ثبت دوگانه:** برای کارایی حداکثری و جلوگیری از Joinهای سنگین در خواندن، اقلام فاکتور به صورت JSON در ستون `shop_invoices.items` نیز ذخیره می‌شوند.

### ۲.۴. تراکنش‌ها و حسابداری (`transactions`, `debtors`, `creditors`)
- هر تراکنش از طریق `userId` به کاربر مربوطه متصل است.
- نوع تراکنش (`type`) شامل مقادیر `tuition` (شهریه)، `shop` (فروشگاه)، `insurance` (بیمه)، `income` (سایر درآمدها) و `expense` (هزینه‌ها) می‌باشد.
