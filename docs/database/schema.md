# 🗄️ ساختار جداول پایگاه داده (Database Schema)

این سند دربرگیرنده مشخصات دقیق و موشکافانه تمامی ۲۰ جدول موجود در پایگاه داده MySQL سامانه موج ۶۹ می‌باشد که مستقیماً از فایل‌های `/server/mysql.ts` و `/server/repository.ts` استخراج شده است.

---

## ۱. فهرست جداول سیستم

| # | نام جدول | نام فارسی / کاربرد | فیلد کلید اصلی (PK) |
| :--- | :--- | :--- | :--- |
| ۱ | `roles` | نقش‌ها و سطوح دسترسی | `id` (VARCHAR) |
| ۲ | `users` | کاربران، ورزشکاران و کادر باشگاه | `id` (VARCHAR) |
| ۳ | `parent_athlete_links` | پیوندهای والد و فرزند | `id` (VARCHAR) |
| ۴ | `audit_logs` | لاگ‌های امنیتی و رخدادنگاری سیستم | `id` (VARCHAR) |
| ۵ | `pre_registrations` | فرم‌ها و درخواست‌های پیش‌ثبت‌نام آنلاین | `id` (VARCHAR) |
| ۶ | `club_settings` | تنظیمات اصلی، ظاهر و وب‌سرویس‌های باشگاه | `id` (VARCHAR) |
| ۷ | `club_announcements` | اطلاعیه‌ها، بخشنامه‌ها و بنرهای باشگاه | `id` (VARCHAR) |
| ۸ | `courses` | سانس‌ها، دوره‌ها و کلاس‌های ورزشی | `id` (VARCHAR) |
| ۹ | `enrollments` | ثبت‌نام اعضا در دوره‌ها و کلاس‌ها | `id` (VARCHAR) |
| ۱۰ | `transactions` | تراکنش‌های مالی، واریزها و فیش‌های بانکی | `id` (VARCHAR) |
| ۱۱ | `debtors` | لیست اشخاص و اعضای بدهکار باشگاه | `id` (VARCHAR) |
| ۱۲ | `creditors` | لیست اشخاص و طرف‌حساب‌های بستانکار | `id` (VARCHAR) |
| ۱۳ | `insurance_requests` | درخواست‌ها و تمدید بیمه ورزشی | `id` (VARCHAR) |
| ۱۴ | `support_tickets` | تیکت‌های پشتیبانی و پیام‌های گفت‌وگو | `id` (VARCHAR) |
| ۱۵ | `app_notifications` | اعلان‌ها و هشدارهای درون‌برنامه‌ای | `id` (VARCHAR) |
| ۱۶ | `products` | کالاها، مکمل‌ها و تجهیزات فروشگاه/بوفه | `id` (VARCHAR) |
| ۱۷ | `shop_invoices` | فاکتورهای فروش و سفارش‌های فروشگاهی | `id` (VARCHAR) |
| ۱۸ | `shop_invoice_items` | ردیف‌های اقلام فاکتور فروشگاه | `id` (VARCHAR) |
| ۱۹ | `sms_logs` | سوابق و لاگ پیامک‌های ارسالی | `id` (VARCHAR) |
| ۲۰ | `attendance_records` | سوابق حضور، غیاب و تردد در گیت | `id` (VARCHAR) |

---

## ۲. مشخصات تفصیلی ساختار جداول

### ۱. جدول `roles` (نقش‌ها و مجوزها)
```sql
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSON,
  createdAt VARCHAR(64),
  updatedAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۲. جدول `users` (کاربران و اعضا)
```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  nationalId VARCHAR(32),
  username VARCHAR(64),
  password VARCHAR(255),
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  fullName VARCHAR(200),
  fatherName VARCHAR(100),
  shenasnamehNo VARCHAR(32),
  birthDate VARCHAR(32),
  gender VARCHAR(16),
  phone VARCHAR(32),
  emergencyPhone VARCHAR(32),
  emergencyContactName VARCHAR(100),
  emergencyContactRelation VARCHAR(50),
  address TEXT,
  bloodType VARCHAR(16),
  medicalConditions TEXT,
  educationOrJob VARCHAR(100),
  roles JSON,
  activeRole VARCHAR(32),
  isActive TINYINT(1) DEFAULT 1,
  avatarUrl TEXT,
  insuranceNumber VARCHAR(64),
  isInsuranceValid TINYINT(1) DEFAULT 0,
  insuranceExpireDate VARCHAR(32),
  climbingExperienceLevel VARCHAR(64),
  shoeSize VARCHAR(16),
  clothingSize VARCHAR(16),
  debtAmount BIGINT DEFAULT 0,
  discountPercent INT DEFAULT 0,
  createdAt VARCHAR(64),
  updatedAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۳. جدول `parent_athlete_links` (پیوند والد و فرزند)
```sql
CREATE TABLE IF NOT EXISTS parent_athlete_links (
  id VARCHAR(64) PRIMARY KEY,
  parentId VARCHAR(64) NOT NULL,
  athleteId VARCHAR(64) NOT NULL,
  relation VARCHAR(64),
  isApproved TINYINT(1) DEFAULT 1,
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۴. جدول `audit_logs` (لاگ‌های امنیتی)
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64),
  userName VARCHAR(200),
  userNationalId VARCHAR(32),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ipAddress VARCHAR(64),
  userAgent TEXT,
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۵. جدول `pre_registrations` (پیش‌ثبت‌نام‌های ورودی)
```sql
CREATE TABLE IF NOT EXISTS pre_registrations (
  id VARCHAR(64) PRIMARY KEY,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  fullName VARCHAR(200),
  fatherName VARCHAR(100),
  shenasnamehNo VARCHAR(32),
  nationalId VARCHAR(32),
  birthDate VARCHAR(32),
  gender VARCHAR(16),
  isUnder18 TINYINT(1) DEFAULT 0,
  phone VARCHAR(32),
  emergencyContactName VARCHAR(100),
  emergencyContactRelation VARCHAR(50),
  emergencyContactPhone VARCHAR(32),
  bloodType VARCHAR(16),
  shoeSize VARCHAR(16),
  clothingSize VARCHAR(16),
  address TEXT,
  medicalConditions TEXT,
  educationOrJob VARCHAR(100),
  referrerName VARCHAR(100),
  referrerPhone VARCHAR(32),
  climbingExperienceLevel VARCHAR(64),
  insuranceNumber VARCHAR(64),
  parentFullName VARCHAR(100),
  parentNationalId VARCHAR(32),
  parentPhone VARCHAR(32),
  avatarUrl TEXT,
  status VARCHAR(32) DEFAULT 'pending',
  rejectionReason TEXT,
  assignedRoles JSON,
  createdUserId VARCHAR(64),
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۶. جدول `club_settings` (تنظیمات باشگاه)
```sql
CREATE TABLE IF NOT EXISTS club_settings (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200),
  slogan VARCHAR(255),
  logo_icon VARCHAR(64),
  theme_palette VARCHAR(64),
  smsApiKey VARCHAR(255),
  smsLineNumber VARCHAR(64),
  smsSignature VARCHAR(255),
  baleBotToken VARCHAR(255),
  baleChannelOrChatId VARCHAR(100),
  settings_json JSON,
  updatedAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۷. جدول `club_announcements` (اطلاعیه‌ها)
```sql
CREATE TABLE IF NOT EXISTS club_announcements (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64),
  importance VARCHAR(32) DEFAULT 'normal',
  imageUrl TEXT,
  authorName VARCHAR(100),
  authorId VARCHAR(64),
  targetAudience VARCHAR(64) DEFAULT 'all',
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۸. جدول `courses` (دوره‌ها و سانس‌های تمرینی)
```sql
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  sportType VARCHAR(100),
  coachId VARCHAR(64),
  coachName VARCHAR(200),
  daysOfWeek JSON,
  startTime VARCHAR(16),
  endTime VARCHAR(16),
  capacity INT DEFAULT 20,
  monthlyFee BIGINT DEFAULT 0,
  isActive TINYINT(1) DEFAULT 1,
  description TEXT,
  startDate VARCHAR(32),
  endDate VARCHAR(32),
  registrationDeadline VARCHAR(32),
  level VARCHAR(64),
  locationRoom VARCHAR(100),
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۹. جدول `enrollments` (ثبت‌نام‌های کلاسی)
```sql
CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  userName VARCHAR(200),
  userNationalId VARCHAR(32),
  sessionId VARCHAR(64) NOT NULL,
  sessionTitle VARCHAR(200),
  enrolledAt VARCHAR(64),
  startDate VARCHAR(32),
  endDate VARCHAR(32),
  expireDate VARCHAR(32),
  status VARCHAR(32) DEFAULT 'active',
  tuitionFee BIGINT DEFAULT 0,
  paidAmount BIGINT DEFAULT 0,
  remainingAmount BIGINT DEFAULT 0,
  receiptUrl TEXT,
  receiptFileName VARCHAR(255),
  notes TEXT,
  totalSessionsAllowed INT DEFAULT 12,
  usedSessionsCount INT DEFAULT 0,
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۰. جدول `transactions` (تراکنش‌های مالی)
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64),
  userName VARCHAR(200),
  userNationalId VARCHAR(32),
  amount BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  method VARCHAR(32) DEFAULT 'cash',
  trackingNumber VARCHAR(100),
  receiptUrl TEXT,
  receiptFileName VARCHAR(255),
  description TEXT,
  status VARCHAR(32) DEFAULT 'completed',
  createdAt VARCHAR(64),
  createdBy VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۱. جدول `debtors` (بدهکاران)
```sql
CREATE TABLE IF NOT EXISTS debtors (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64),
  userName VARCHAR(200),
  userNationalId VARCHAR(32),
  userPhone VARCHAR(32),
  debtAmount BIGINT DEFAULT 0,
  dueDate VARCHAR(32),
  reason TEXT,
  status VARCHAR(32) DEFAULT 'pending',
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۲. جدول `creditors` (بستانکاران)
```sql
CREATE TABLE IF NOT EXISTS creditors (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64),
  userName VARCHAR(200),
  userNationalId VARCHAR(32),
  userPhone VARCHAR(32),
  creditAmount BIGINT DEFAULT 0,
  dueDate VARCHAR(32),
  reason TEXT,
  status VARCHAR(32) DEFAULT 'pending',
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۳. جدول `insurance_requests` (درخواست‌های بیمه ورزشی)
```sql
CREATE TABLE IF NOT EXISTS insurance_requests (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  userName VARCHAR(200),
  userNationalId VARCHAR(32),
  userPhone VARCHAR(32),
  userBirthDate VARCHAR(32),
  packageType VARCHAR(64),
  amount BIGINT DEFAULT 0,
  receiptUrl TEXT,
  insuranceNumber VARCHAR(64),
  expireDate VARCHAR(32),
  status VARCHAR(32) DEFAULT 'pending',
  rejectionReason TEXT,
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۴. جدول `support_tickets` (تیکت‌های پشتیبانی)
```sql
CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  userName VARCHAR(200),
  userRole VARCHAR(32),
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(64),
  priority VARCHAR(32) DEFAULT 'medium',
  status VARCHAR(32) DEFAULT 'open',
  hasUnreadAdminMessage TINYINT(1) DEFAULT 0,
  hasUnreadUserMessage TINYINT(1) DEFAULT 0,
  messages JSON,
  createdAt VARCHAR(64),
  updatedAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۵. جدول `app_notifications` (اعلان‌ها)
```sql
CREATE TABLE IF NOT EXISTS app_notifications (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64),
  targetAudience VARCHAR(64) DEFAULT 'all',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) DEFAULT 'info',
  link VARCHAR(255),
  isRead TINYINT(1) DEFAULT 0,
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۶. جدول `products` (فروشگاه و انبار کالا)
```sql
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  price BIGINT DEFAULT 0,
  buyPrice BIGINT DEFAULT 0,
  stock INT DEFAULT 0,
  minStock INT DEFAULT 5,
  minStockAlert INT DEFAULT 5,
  unit VARCHAR(32) DEFAULT 'عدد',
  imageUrl TEXT,
  description TEXT,
  isActive TINYINT(1) DEFAULT 1,
  createdAt VARCHAR(64),
  updatedAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۷. جدول `shop_invoices` (فاکتورهای فروش)
```sql
CREATE TABLE IF NOT EXISTS shop_invoices (
  id VARCHAR(64) PRIMARY KEY,
  invoiceNumber VARCHAR(64),
  buyerId VARCHAR(64),
  buyerName VARCHAR(200),
  buyerNationalId VARCHAR(32),
  totalAmount BIGINT DEFAULT 0,
  discountAmount BIGINT DEFAULT 0,
  finalAmount BIGINT DEFAULT 0,
  paymentMethod VARCHAR(32) DEFAULT 'cash',
  status VARCHAR(32) DEFAULT 'paid',
  items JSON,
  notes TEXT,
  createdBy VARCHAR(100),
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۸. جدول `shop_invoice_items` (اقلام تفکیکی فاکتور)
```sql
CREATE TABLE IF NOT EXISTS shop_invoice_items (
  id VARCHAR(64) PRIMARY KEY,
  invoiceId VARCHAR(64) NOT NULL,
  productId VARCHAR(64) NOT NULL,
  productName VARCHAR(200),
  productCode VARCHAR(64),
  quantity INT DEFAULT 1,
  unitPrice BIGINT DEFAULT 0,
  buyPrice BIGINT DEFAULT 0,
  totalPrice BIGINT DEFAULT 0,
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۱۹. جدول `sms_logs` (لاگ‌های پیامک)
```sql
CREATE TABLE IF NOT EXISTS sms_logs (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(64),
  recipients JSON,
  recipientNames JSON,
  recipientCount INT DEFAULT 0,
  messageText TEXT,
  status VARCHAR(32),
  cost BIGINT DEFAULT 0,
  packId VARCHAR(64),
  messageIds JSON,
  createdAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ۲۰. جدول `attendance_records` (سوابق حضور و غیاب)
```sql
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(64) PRIMARY KEY,
  sessionId VARCHAR(64),
  userId VARCHAR(64),
  userName VARCHAR(200),
  userNationalId VARCHAR(32),
  date VARCHAR(32),
  status VARCHAR(32) DEFAULT 'present',
  method VARCHAR(32) DEFAULT 'manual',
  note TEXT,
  recordedBy VARCHAR(100),
  recordedAt VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
