-- ============================================================
-- اسکریپت جامع دیتابیس MySQL برای «باشگاه سنگ‌نوردی موج»
-- قابل ایمپورت مستقیم در phpMyAdmin هاست cPanel یا هر دیتابیس MySQL دیگر
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ۱. حذف تمامی جدول‌ها برای جلوگیری از تداخل فیلدها و کدهای قدیمی
DROP TABLE IF EXISTS `parent_athlete_links`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `pre_registrations`;
DROP TABLE IF EXISTS `club_settings`;
DROP TABLE IF EXISTS `club_announcements`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `enrollments`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `attendance_records`;
DROP TABLE IF EXISTS `debtors`;
DROP TABLE IF EXISTS `creditors`;
DROP TABLE IF EXISTS `insurance_requests`;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `app_notifications`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `shop_invoice_items`;
DROP TABLE IF EXISTS `shop_invoices`;
DROP TABLE IF EXISTS `sms_logs`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

-- حذف جدول‌های قدیمی احتمالی از نسخه‌های قبل جهت سازگاری کامل دیتابیس
DROP TABLE IF EXISTS `sports_insurance`;
DROP TABLE IF EXISTS `sports_insurance_requests`;

-- ۲. ساخت جدول نقش‌ها (Roles)
CREATE TABLE `roles` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `key_name` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `permissions` JSON,
  `isSystem` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. ساخت جدول کاربران (Users)
CREATE TABLE `users` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(255),
  `lastName` VARCHAR(255),
  `fullName` VARCHAR(255) NOT NULL,
  `fatherName` VARCHAR(255),
  `shenasnamehNo` VARCHAR(50),
  `nationalId` VARCHAR(20) UNIQUE,
  `birthDate` VARCHAR(50),
  `gender` VARCHAR(20),
  `phone` VARCHAR(20),
  `emergencyContactName` VARCHAR(255),
  `emergencyContactRelation` VARCHAR(100),
  `emergencyContactPhone` VARCHAR(20),
  `bloodType` VARCHAR(20),
  `shoeSize` VARCHAR(20),
  `clothingSize` VARCHAR(20),
  `address` TEXT,
  `medicalConditions` TEXT,
  `referrerName` VARCHAR(255),
  `referrerPhone` VARCHAR(20),
  `educationOrJob` VARCHAR(255),
  `climbingExperienceLevel` VARCHAR(50),
  `roles` JSON,
  `activeRole` VARCHAR(50) DEFAULT 'athlete',
  `isActive` TINYINT(1) DEFAULT 1,
  `insuranceNumber` VARCHAR(100),
  `insuranceExpiryDate` VARCHAR(50),
  `isInsuranceValid` TINYINT(1) DEFAULT 0,
  `baleChatId` VARCHAR(100),
  `avatarUrl` LONGTEXT,
  `createdAt` VARCHAR(100),
  `updatedAt` VARCHAR(100),
  INDEX `idx_users_phone` (`phone`),
  INDEX `idx_users_status` (`isActive`),
  INDEX `idx_users_activeRole` (`activeRole`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. ساخت جدول پیوند والد و فرزند (Parent Athlete Links)
CREATE TABLE `parent_athlete_links` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `parentId` VARCHAR(100) NOT NULL,
  `athleteId` VARCHAR(100) NOT NULL,
  `relationType` VARCHAR(50) NOT NULL,
  `createdAt` VARCHAR(100),
  INDEX `idx_parent_link` (`parentId`, `athleteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. ساخت جدول ردگیری تغییرات و عملیات کاربر (Audit Logs)
CREATE TABLE `audit_logs` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `action` VARCHAR(255),
  `targetEntity` VARCHAR(100),
  `targetId` VARCHAR(100),
  `details` TEXT,
  `timestamp` VARCHAR(100),
  INDEX `idx_audit_user` (`userId`),
  INDEX `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. ساخت جدول پیش‌ثبت‌نام‌ها (Pre-Registrations)
CREATE TABLE `pre_registrations` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `firstName` VARCHAR(255),
  `lastName` VARCHAR(255),
  `fullName` VARCHAR(255) NOT NULL,
  `fatherName` VARCHAR(255),
  `shenasnamehNo` VARCHAR(50),
  `nationalId` VARCHAR(20) NOT NULL,
  `birthDate` VARCHAR(50),
  `gender` VARCHAR(20),
  `isUnder18` TINYINT(1) DEFAULT 0,
  `phone` VARCHAR(20) NOT NULL,
  `emergencyContactName` VARCHAR(255),
  `emergencyContactRelation` VARCHAR(100),
  `emergencyContactPhone` VARCHAR(20),
  `bloodType` VARCHAR(20),
  `shoeSize` VARCHAR(20),
  `clothingSize` VARCHAR(20),
  `address` TEXT,
  `medicalConditions` TEXT,
  `educationOrJob` VARCHAR(255),
  `referrerName` VARCHAR(255),
  `referrerPhone` VARCHAR(20),
  `climbingExperienceLevel` VARCHAR(50),
  `insuranceNumber` VARCHAR(100),
  `parentFullName` VARCHAR(255),
  `parentNationalId` VARCHAR(20),
  `parentPhone` VARCHAR(20),
  `avatarUrl` LONGTEXT,
  `status` VARCHAR(50) DEFAULT 'pending',
  `rejectionReason` TEXT,
  `assignedRoles` JSON,
  `createdUserId` VARCHAR(100),
  `createdAt` VARCHAR(100),
  `reviewedAt` VARCHAR(100),
  `reviewedBy` VARCHAR(255),
  INDEX `idx_pre_nationalId` (`nationalId`),
  INDEX `idx_pre_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. ساخت جدول تنظیمات باشگاه (Club Settings)
CREATE TABLE `club_settings` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255),
  `slogan` VARCHAR(255),
  `logo_Icon` VARCHAR(100) DEFAULT 'mountain',
  `theme_Palette` VARCHAR(50) DEFAULT 'teal',
  `smsApiKey` VARCHAR(255),
  `smsLineNumber` VARCHAR(50),
  `smsSignature` VARCHAR(100),
  `baleBotToken` VARCHAR(255),
  `baleChannelOrChatId` VARCHAR(100),
  `settings_json` LONGTEXT,
  `updatedAt` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. ساخت جدول اطلاعیه‌ها و اسلایدرها (Club Announcements)
CREATE TABLE `club_announcements` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` TEXT,
  `imageUrl` LONGTEXT,
  `discountTag` VARCHAR(100),
  `startDate` VARCHAR(100),
  `endDate` VARCHAR(100),
  `isActive` TINYINT(1) DEFAULT 1,
  `targetAudience` VARCHAR(50) DEFAULT 'all',
  `createdAt` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۹. ساخت جدول دوره‌ها و سانس‌ها (Courses)
CREATE TABLE `courses` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `sportType` VARCHAR(100),
  `coachId` VARCHAR(100),
  `coachName` VARCHAR(255),
  `daysOfWeek` JSON,
  `startTime` VARCHAR(50),
  `endTime` VARCHAR(50),
  `capacity` INT DEFAULT 20,
  `monthlyFee` DOUBLE,
  `isActive` TINYINT(1) DEFAULT 1,
  `description` TEXT,
  `startDate` VARCHAR(100),
  `endDate` VARCHAR(100),
  `registrationDeadline` VARCHAR(100),
  `level` VARCHAR(100),
  `locationRoom` VARCHAR(255),
  `createdAt` VARCHAR(100),
  INDEX `idx_courses_coach` (`coachId`),
  INDEX `idx_courses_status` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۰. ساخت جدول ثبت‌نام‌ها (Enrollments)
CREATE TABLE `enrollments` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `sessionId` VARCHAR(100),
  `userId` VARCHAR(100),
  `athleteName` VARCHAR(255),
  `athletePhone` VARCHAR(20),
  `athleteNationalId` VARCHAR(20),
  `status` VARCHAR(50) DEFAULT 'active',
  `paymentStatus` VARCHAR(50) DEFAULT 'paid',
  `trackingNumber` VARCHAR(100),
  `receiptUrl` LONGTEXT,
  `receiptFileName` VARCHAR(255),
  `paymentMethod` VARCHAR(50),
  `enrolledAt` VARCHAR(100),
  `expireDate` VARCHAR(100),
  INDEX `idx_enrollments_user` (`userId`),
  INDEX `idx_enrollments_session` (`sessionId`),
  INDEX `idx_enrollments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۱. ساخت جدول تراکنش‌های مالی (Transactions)
CREATE TABLE `transactions` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `userNationalId` VARCHAR(20),
  `amount` DOUBLE,
  `type` VARCHAR(50),
  `method` VARCHAR(50),
  `trackingNumber` VARCHAR(100),
  `receiptUrl` LONGTEXT,
  `receiptFileName` VARCHAR(255),
  `description` TEXT,
  `status` VARCHAR(50),
  `createdAt` VARCHAR(100),
  `createdBy` VARCHAR(100),
  INDEX `idx_trans_user` (`userId`),
  INDEX `idx_trans_type` (`type`),
  INDEX `idx_trans_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۲. ساخت جدول سوابق حضور غیاب (Attendance Records)
CREATE TABLE `attendance_records` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `sessionId` VARCHAR(100),
  `date` VARCHAR(100),
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `status` VARCHAR(50),
  `reason` TEXT,
  `recordedBy` VARCHAR(255),
  `recordedAt` VARCHAR(100),
  INDEX `idx_att_user_date` (`userId`, `date`),
  INDEX `idx_att_session` (`sessionId`),
  INDEX `idx_att_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۳. ساخت جدول بدهکاران (Debtors)
CREATE TABLE `debtors` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `fullName` VARCHAR(255),
  `nationalId` VARCHAR(20),
  `phone` VARCHAR(20),
  `category` VARCHAR(100),
  `categoryTitle` VARCHAR(255),
  `amount` DOUBLE,
  `dueDate` VARCHAR(100),
  `status` VARCHAR(50),
  `notes` TEXT,
  `createdAt` VARCHAR(100),
  INDEX `idx_debtors_user` (`userId`),
  INDEX `idx_debtors_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۴. ساخت جدول بستانکاران (Creditors)
CREATE TABLE `creditors` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `creditorName` VARCHAR(255),
  `category` VARCHAR(100),
  `categoryTitle` VARCHAR(255),
  `contactPhone` VARCHAR(20),
  `ibanNumber` VARCHAR(100),
  `amount` DOUBLE,
  `dueDate` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'unpaid',
  `notes` TEXT,
  `createdAt` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۵. ساخت جدول درخواست‌های بیمه ورزشی (Insurance Requests)
CREATE TABLE `insurance_requests` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `userNationalId` VARCHAR(20),
  `insuranceNumber` VARCHAR(100),
  `startDate` VARCHAR(100),
  `expiryDate` VARCHAR(100),
  `documentUrl` LONGTEXT,
  `fileName` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'pending',
  `rejectionReason` TEXT,
  `createdAt` VARCHAR(100),
  `reviewedAt` VARCHAR(100),
  `reviewedBy` VARCHAR(255),
  INDEX `idx_ins_user` (`userId`),
  INDEX `idx_ins_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۶. ساخت جدول تیکت‌های پشتیبانی (Support Tickets)
CREATE TABLE `support_tickets` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `ticketNumber` VARCHAR(100),
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `userNationalId` VARCHAR(20),
  `userRole` VARCHAR(50),
  `userPhone` VARCHAR(20),
  `subject` VARCHAR(255),
  `department` VARCHAR(100),
  `priority` VARCHAR(50),
  `status` VARCHAR(50),
  `lastResponseAt` VARCHAR(100),
  `hasUnreadAdminMessage` TINYINT(1) DEFAULT 0,
  `hasUnreadUserMessage` TINYINT(1) DEFAULT 0,
  `createdAt` VARCHAR(100),
  `messages` JSON,
  INDEX `idx_tickets_user` (`userId`),
  INDEX `idx_tickets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۷. ساخت جدول اعلان‌های درون برنامه‌ای (App Notifications)
CREATE TABLE `app_notifications` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `targetAudience` VARCHAR(50),
  `title` VARCHAR(255),
  `message` TEXT,
  `category` VARCHAR(50),
  `isRead` TINYINT(1) DEFAULT 0,
  `actionLink` TEXT,
  `createdAt` VARCHAR(100),
  INDEX `idx_notif_user` (`userId`),
  INDEX `idx_notif_read` (`isRead`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۸. ساخت جدول محصولات و کالاها (Products)
CREATE TABLE `products` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `code` VARCHAR(100),
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `price` DOUBLE DEFAULT 0,
  `buyPrice` DOUBLE DEFAULT 0,
  `stock` INT DEFAULT 0,
  `minStock` INT DEFAULT 5,
  `minStockAlert` INT DEFAULT 5,
  `unit` VARCHAR(50),
  `imageUrl` LONGTEXT,
  `description` TEXT,
  `isActive` TINYINT(1) DEFAULT 1,
  `createdAt` VARCHAR(100),
  `updatedAt` VARCHAR(100),
  INDEX `idx_prod_code` (`code`),
  INDEX `idx_prod_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۹. ساخت جدول فاکتورهای فروشگاه (Shop Invoices)
CREATE TABLE `shop_invoices` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `invoiceNumber` VARCHAR(100),
  `athleteId` VARCHAR(100),
  `athleteName` VARCHAR(255),
  `creatorId` VARCHAR(100),
  `creatorName` VARCHAR(255),
  `date` VARCHAR(100),
  `items` LONGTEXT,
  `totalAmount` DOUBLE DEFAULT 0,
  `paymentMethod` VARCHAR(50),
  `paymentStatus` VARCHAR(50),
  `notes` TEXT,
  `createdAt` VARCHAR(100),
  INDEX `idx_invoice_athlete` (`athleteId`),
  INDEX `idx_invoice_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲۰. ساخت جدول آیتم‌های فاکتور (Shop Invoice Items)
CREATE TABLE `shop_invoice_items` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `invoiceId` VARCHAR(100) NOT NULL,
  `productId` VARCHAR(100),
  `productName` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `unitPrice` DOUBLE NOT NULL DEFAULT 0,
  `buyPrice` DOUBLE NOT NULL DEFAULT 0,
  `quantity` INT NOT NULL DEFAULT 1,
  `totalPrice` DOUBLE NOT NULL DEFAULT 0,
  FOREIGN KEY (`invoiceId`) REFERENCES `shop_invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲۱. ساخت جدول گزارشات پیامک و پیام‌رسان (SMS & Bale Logs)
CREATE TABLE `sms_logs` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `recipients` JSON,
  `recipientNames` JSON,
  `message` TEXT,
  `channel` VARCHAR(50) DEFAULT 'sms',
  `type` VARCHAR(50),
  `targetGroup` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'sent',
  `cost` DOUBLE DEFAULT 0,
  `packId` VARCHAR(100),
  `messageIds` JSON,
  `sentBy` VARCHAR(255),
  `sentAt` VARCHAR(100),
  `errorMessage` TEXT,
  INDEX `idx_sms_sentAt` (`sentAt`),
  INDEX `idx_sms_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- درج داده‌های سیستمی و پایه
-- ============================================================

INSERT IGNORE INTO `roles` (`id`, `key_name`, `title`, `description`, `isSystem`) VALUES
('role-super-admin', 'super_admin', 'مدیر کل (Super Admin)', 'دسترسی کامل به تمامی بخش‌ها و تنظیمات سیستم', 1),
('role-admin', 'admin', 'مدیر مجموعه', 'مدیریت کاربران، امور ورزشی و مالی', 1),
('role-secretary', 'secretary', 'منشی باشگاه', 'ثبت‌نام، بررسی مدارک، بیمه ورزشی و حضور غیاب', 1),
('role-accountant', 'accountant', 'حسابدار', 'مدیریت فاکتورها، صندوق، بدهکاران و بستانکاران', 1),
('role-coach', 'coach', 'مربی', 'ارزیابی فنی، ثبت حضور غیاب کارآموزان', 1),
('role-athlete', 'athlete', 'ورزشکار', 'صعود، ثبت کلاس، پرداخت شهریه و مشاهده تاریخچه', 1),
('role-parent', 'parent', 'والدین', 'پیگیری و مدیریت کامل فرزندان ثبت‌نام شده', 1);

-- فقط یک مدیر با پسورد ۱۲۳ در دیتابیس ساخته می‌شود.
INSERT INTO `users` (
  `id`, 
  `username`, 
  `password`, 
  `fullName`, 
  `nationalId`, 
  `phone`, 
  `roles`, 
  `activeRole`, 
  `isActive`, 
  `createdAt`
) VALUES (
  'usr-admin-1', 
  'admin', 
  '123', 
  'مدیر کل مجموعه', 
  '0012345678', 
  '09121111111', 
  '["super_admin","athlete","secretary","coach","accountant"]', 
  'super_admin', 
  1, 
  '1403/01/01'
);

SET FOREIGN_KEY_CHECKS = 1;

