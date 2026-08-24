-- ============================================================================
-- WAVE86 / باشگاه سنگ‌نوردی موج — اسکیمای کامل و تمیز دیتابیس MySQL
-- ----------------------------------------------------------------------------
-- نسخه: 3.2 (تحت‌الاصلاح 2026-08-24)
-- ★ این فایل تنها Source of Truth نصب تمیز است؛ Migration 005 به‌طور کامل
--   در بخش انتهایی همین فایل ادغام شده است (database/migrations خالی می‌تواند باشد).
--
-- تاریخچه تغییرات نسبت به v3.0:
--   ✔ ستون Optimistic Locking: version INT روی ۸ جدول حساس
--   ✔ پول مالی: DECIMAL(18,2) — از v3.2 شامل courses.monthlyFee هم هست
--   ✔ تراکنش مالی: idempotencyKey UNIQUE + voidedAt/voidedBy/voidReason
--   ✔ Audit Trail غنی: oldValue/newValue/ip/userAgent
--   ✔ users.mustChangePassword (اجبار تغییر رمز اولین ورود)
--   ✔ یک کاربر اولیه: admin / 123  (پسورد به‌صورت bcrypt hash ذخیره میشود)
--
-- تغییرات v3.2 (ادغام و پاکسازی):
--   ✔ ادغام کامل محتوای migrations/005_foreign_keys_indexes.sql در همین فایل
--   ✔ حذف ALTERهای ایندکسِ تکراری (idx_audit_timestamp، idx_sms_sentat که در
--     CREATE TABLE از قبل تعریف شده بودند و باعث ER_DUP_KEYNAME میشدند)
--   ✔ حذف FK تکراری shop_invoice_items (inline کافی است؛ ALTER دوم حذف شد)
--
-- ⚠️ اجرای این فایل، جداول هم‌نام موجود را DROP میکند! فقط برای نصب تمیز.
-- ⚠️ برای سرورهای قدیمی‌تر (قبل از 2026-08): بخش «UPGRADE FROM LEGACY»
--    در انتهای همین فایل، ALTERهای لازم را جداگانه ارائه میکند.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `parent_athlete_links`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `pre_registrations`;
DROP TABLE IF EXISTS `club_settings`;
DROP TABLE IF EXISTS `club_announcements`;
DROP TABLE IF EXISTS `shop_invoice_items`;
DROP TABLE IF EXISTS `shop_invoices`;
DROP TABLE IF EXISTS `sms_logs`;
DROP TABLE IF EXISTS `app_notifications`;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `insurance_requests`;
DROP TABLE IF EXISTS `creditors`;
DROP TABLE IF EXISTS `debtors`;
DROP TABLE IF EXISTS `attendance_records`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `enrollments`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `sports_insurance`;
DROP TABLE IF EXISTS `sports_insurance_requests`;

-- ۱) نقش‌ها
CREATE TABLE `roles` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `key_name` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `permissions` JSON,
  `isSystem` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲) کاربران  ★ version + mustChangePassword (جدید)
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
  `version` INT NOT NULL DEFAULT 1,
  `mustChangePassword` TINYINT(1) NOT NULL DEFAULT 0,
  INDEX `idx_users_phone` (`phone`),
  INDEX `idx_users_status` (`isActive`),
  INDEX `idx_users_activeRole` (`activeRole`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳) پیوند والد و فرزند
CREATE TABLE `parent_athlete_links` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `parentId` VARCHAR(100) NOT NULL,
  `athleteId` VARCHAR(100) NOT NULL,
  `relationType` VARCHAR(50) NOT NULL,
  `createdAt` VARCHAR(100),
  INDEX `idx_parent_link` (`parentId`, `athleteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴) Audit Logs  ★ oldValue/newValue/ip/userAgent (جدید)
CREATE TABLE `audit_logs` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `action` VARCHAR(255),
  `targetEntity` VARCHAR(100),
  `targetId` VARCHAR(100),
  `details` TEXT,
  `timestamp` VARCHAR(100),
  `oldValue` LONGTEXT,
  `newValue` LONGTEXT,
  `ip` VARCHAR(64),
  `userAgent` VARCHAR(255),
  INDEX `idx_audit_user` (`userId`),
  INDEX `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵) پیش‌ثبت‌نام‌ها
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

-- ۶) تنظیمات باشگاه
CREATE TABLE `club_settings` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255),
  `slogan` VARCHAR(255),
  `logoIcon` VARCHAR(100) DEFAULT 'mountain',
  `themePalette` VARCHAR(50) DEFAULT 'teal',
  `smsApiKey` VARCHAR(255),
  `smsLineNumber` VARCHAR(50),
  `smsSignature` VARCHAR(100),
  `baleBotToken` VARCHAR(255),
  `baleChannelOrChatId` VARCHAR(100),
  `settings_json` LONGTEXT,
  `updatedAt` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷) اطلاعیه‌ها و اسلایدرها
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

-- ۸) دوره‌ها و سانس‌ها  ★ version (جدید)
CREATE TABLE `courses` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `sportType` VARCHAR(100),
  `category` VARCHAR(100),
  `maxCapacity` INT DEFAULT 20,
  `coachId` VARCHAR(100),
  `coachName` VARCHAR(255),
  `daysOfWeek` JSON,
  `startTime` VARCHAR(50),
  `endTime` VARCHAR(50),
  `capacity` INT DEFAULT 20,
  `monthlyFee` DECIMAL(18,2) DEFAULT 0,
  `sessionsLimit` INT DEFAULT 12,
  `isActive` TINYINT(1) DEFAULT 1,
  `description` TEXT,
  `startDate` VARCHAR(100),
  `endDate` VARCHAR(100),
  `registrationDeadline` VARCHAR(100),
  `level` VARCHAR(100),
  `locationRoom` VARCHAR(255),
  `createdAt` VARCHAR(100),
  `version` INT NOT NULL DEFAULT 1,
  INDEX `idx_courses_coach` (`coachId`),
  INDEX `idx_courses_status` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۹) ثبت‌نام‌ها  ★ version + فیلدهای تکمیل‌شده (جدید)
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
  `startDate` VARCHAR(100),
  `endDate` VARCHAR(100),
  `totalSessionsAllowed` INT DEFAULT 12,
  `usedSessionsCount` INT DEFAULT 0,
  `priceAtEnrollment` DECIMAL(18,2) DEFAULT 0,
  `createdAt` VARCHAR(100),
  `updatedAt` VARCHAR(100),
  `version` INT NOT NULL DEFAULT 1,
  INDEX `idx_enrollments_user` (`userId`),
  INDEX `idx_enrollments_session` (`sessionId`),
  INDEX `idx_enrollments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۰) تراکنش‌های مالی  ★ DECIMAL + version + Idempotency + Soft-Void (جدید)
CREATE TABLE `transactions` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `userNationalId` VARCHAR(20),
  `amount` DECIMAL(18,2) DEFAULT 0,
  `type` VARCHAR(50),
  `method` VARCHAR(50),
  `trackingNumber` VARCHAR(100),
  `receiptUrl` LONGTEXT,
  `receiptFileName` VARCHAR(255),
  `description` TEXT,
  `status` VARCHAR(50),
  `idempotencyKey` VARCHAR(100) NULL,
  `voidedAt` VARCHAR(100) NULL,
  `voidedBy` VARCHAR(255) NULL,
  `voidReason` TEXT NULL,
  `createdAt` VARCHAR(100),
  `createdBy` VARCHAR(100),
  `version` INT NOT NULL DEFAULT 1,
  UNIQUE INDEX `uq_transactions_idempotencyKey` (`idempotencyKey`),
  INDEX `idx_trans_user` (`userId`),
  INDEX `idx_trans_type` (`type`),
  INDEX `idx_trans_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۱) سوابق حضور و غیاب  ★ version + checkIn/Out (جدید)
CREATE TABLE `attendance_records` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `sessionId` VARCHAR(100),
  `date` VARCHAR(100),
  `userId` VARCHAR(100),
  `userName` VARCHAR(255),
  `status` VARCHAR(50),
  `reason` TEXT,
  `checkInTime` VARCHAR(50),
  `checkOutTime` VARCHAR(50),
  `recordedBy` VARCHAR(255),
  `recordedAt` VARCHAR(100),
  `version` INT NOT NULL DEFAULT 1,
  INDEX `idx_att_user_date` (`userId`, `date`),
  INDEX `idx_att_session` (`sessionId`),
  INDEX `idx_att_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۲) بدهکاران  ★ version + DECIMAL (جدید)
CREATE TABLE `debtors` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `userId` VARCHAR(100),
  `fullName` VARCHAR(255),
  `nationalId` VARCHAR(20),
  `phone` VARCHAR(20),
  `category` VARCHAR(100),
  `categoryTitle` VARCHAR(255),
  `amount` DECIMAL(18,2) DEFAULT 0,
  `dueDate` VARCHAR(100),
  `status` VARCHAR(50),
  `notes` TEXT,
  `createdAt` VARCHAR(100),
  `version` INT NOT NULL DEFAULT 1,
  INDEX `idx_debtors_user` (`userId`),
  INDEX `idx_debtors_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۳) بستانکاران  ★ version + DECIMAL (جدید)
CREATE TABLE `creditors` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `creditorName` VARCHAR(255),
  `category` VARCHAR(100),
  `categoryTitle` VARCHAR(255),
  `contactPhone` VARCHAR(20),
  `ibanNumber` VARCHAR(100),
  `amount` DECIMAL(18,2) DEFAULT 0,
  `dueDate` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'unpaid',
  `notes` TEXT,
  `createdAt` VARCHAR(100),
  `version` INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۴) درخواست‌های بیمه ورزشی
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

-- ۱۵) تیکت‌های پشتیبانی
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

-- ۱۶) اعلان‌های درون‌برنامه‌ای
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

-- ۱۷) محصولات و کالاها  ★ version + DECIMAL (جدید)
CREATE TABLE `products` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `code` VARCHAR(100),
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `price` DECIMAL(18,2) DEFAULT 0,
  `buyPrice` DECIMAL(18,2) DEFAULT 0,
  `stock` INT DEFAULT 0,
  `minStock` INT DEFAULT 5,
  `minStockAlert` INT DEFAULT 5,
  `unit` VARCHAR(50),
  `imageUrl` LONGTEXT,
  `description` TEXT,
  `isActive` TINYINT(1) DEFAULT 1,
  `createdAt` VARCHAR(100),
  `updatedAt` VARCHAR(100),
  `version` INT NOT NULL DEFAULT 1,
  INDEX `idx_prod_code` (`code`),
  INDEX `idx_prod_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۸) فاکتورهای فروشگاه  ★ DECIMAL (جدید)
CREATE TABLE `shop_invoices` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `invoiceNumber` VARCHAR(100),
  `athleteId` VARCHAR(100),
  `athleteName` VARCHAR(255),
  `creatorId` VARCHAR(100),
  `creatorName` VARCHAR(255),
  `date` VARCHAR(100),
  `items` LONGTEXT,
  `totalAmount` DECIMAL(18,2) DEFAULT 0,
  `paymentMethod` VARCHAR(50),
  `paymentStatus` VARCHAR(50),
  `notes` TEXT,
  `createdAt` VARCHAR(100),
  INDEX `idx_invoice_athlete` (`athleteId`),
  INDEX `idx_invoice_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۹) آیتم‌های فاکتور  ★ DECIMAL + FK (جدید)
CREATE TABLE `shop_invoice_items` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `invoiceId` VARCHAR(100) NOT NULL,
  `productId` VARCHAR(100),
  `productName` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `unitPrice` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `buyPrice` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `quantity` INT NOT NULL DEFAULT 1,
  `totalPrice` DECIMAL(18,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (`invoiceId`) REFERENCES `shop_invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲۰) گزارشات پیامک  ★ DECIMAL cost (جدید)
CREATE TABLE `sms_logs` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `recipients` JSON,
  `recipientNames` JSON,
  `message` TEXT,
  `channel` VARCHAR(50) DEFAULT 'sms',
  `type` VARCHAR(50),
  `targetGroup` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'sent',
  `cost` DECIMAL(18,2) DEFAULT 0,
  `packId` VARCHAR(100),
  `messageIds` JSON,
  `sentBy` VARCHAR(255),
  `sentAt` VARCHAR(100),
  `errorMessage` TEXT,
  INDEX `idx_sms_sentAt` (`sentAt`),
  INDEX `idx_sms_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- داده‌های اولیه (Seeds)
-- ============================================================================

INSERT IGNORE INTO `roles` (`id`, `key_name`, `title`, `description`, `isSystem`) VALUES
('role-super-admin', 'super_admin', 'مدیر کل (Super Admin)', 'دسترسی کامل به تمامی بخش‌ها و تنظیمات سیستم', 1),
('role-admin', 'admin', 'مدیر مجموعه', 'مدیریت کاربران، امور ورزشی و مالی', 1),
('role-secretary', 'secretary', 'منشی باشگاه', 'ثبت‌نام، بررسی مدارک، بیمه ورزشی و حضور غیاب', 1),
('role-accountant', 'accountant', 'حسابدار', 'مدیریت فاکتورها، صندوق، بدهکاران و بستانکاران', 1),
('role-coach', 'coach', 'مربی', 'ارزیابی فنی، ثبت حضور غیاب کارآموزان', 1),
('role-athlete', 'athlete', 'ورزشکار', 'صعود، ثبت کلاس، پرداخت شهریه و مشاهده تاریخچه', 1),
('role-parent', 'parent', 'والدین', 'پیگیری و مدیریت کامل فرزندان ثبت‌نام شده', 1);

-- ----------------------------------------------------------------------------
-- کاربر اولیه: admin / 123
-- ⚠️ BOOTSTRAP-ONLY:
--    ۱) پسورد '123' به‌صورت bcrypt (cost=10) ذخیره شده است.
--    ۲) پرچم mustChangePassword = 1 است تا تغییر رمز در نخستین ورود الزامی شود.
--    ۳) بلافاصله پس از نصب Production، رمز را عوض کنید.
-- ----------------------------------------------------------------------------
INSERT INTO `users` (
  `id`, `username`, `password`, `fullName`, `nationalId`, `phone`,
  `roles`, `activeRole`, `isActive`, `mustChangePassword`, `createdAt`, `version`
) VALUES (
  'usr-admin-1',
  'admin',
  '$2b$10$8wVeG1mVI7Al4IFX9swqgeEBmeCvaqgPdIklqsFqjV6hGd3.OuKpi',
  'مدیر کل مجموعه',
  '0012345678',
  '09121111111',
  '["super_admin","athlete","secretary","coach","accountant"]',
  'super_admin',
  1,
  1,
  '1403/01/01',
  1
);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- UPGRADE FROM LEGACY (فقط برای سرورهایی که قبل از 2026-08 نصب شدهاند)
-- ----------------------------------------------------------------------------
-- اگر دیتابیس فعلی شما با اسکیمای قدیمی ساخته شده و نمیخواهید DROP/ساخت مجدد
-- انجام دهید، بهجای اجرای بالای فایل، فقط ALTERهای زیر را یک‌بار اجرا کنید
-- (معادل Migrationهای 001 تا 004):
--
-- ALTER TABLE `users`              ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `enrollments`        ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `transactions`       ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `attendance_records` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `courses`            ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `products`           ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `debtors`            ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `creditors`          ADD COLUMN `version` INT NOT NULL DEFAULT 1;
-- ALTER TABLE `transactions`       ADD COLUMN `idempotencyKey` VARCHAR(100) NULL;
-- ALTER TABLE `transactions`       ADD UNIQUE INDEX `uq_transactions_idempotencyKey` (`idempotencyKey`);
-- ALTER TABLE `transactions`       ADD COLUMN `voidedAt` VARCHAR(100) NULL;
-- ALTER TABLE `transactions`       ADD COLUMN `voidedBy` VARCHAR(255) NULL;
-- ALTER TABLE `transactions`       ADD COLUMN `voidReason` TEXT NULL;
-- ALTER TABLE `audit_logs`         ADD COLUMN `oldValue` LONGTEXT NULL;
-- ALTER TABLE `audit_logs`         ADD COLUMN `newValue` LONGTEXT NULL;
-- ALTER TABLE `audit_logs`         ADD COLUMN `ip` VARCHAR(64) NULL;
-- ALTER TABLE `audit_logs`         ADD COLUMN `userAgent` VARCHAR(255) NULL;
-- ALTER TABLE `users`              ADD COLUMN `mustChangePassword` TINYINT(1) NOT NULL DEFAULT 0;
-- UPDATE `users` SET `mustChangePassword` = 1 WHERE `id` = 'usr-admin-1';
-- ALTER TABLE `transactions`       MODIFY `amount` DECIMAL(18,2) DEFAULT 0;
-- ALTER TABLE `products`           MODIFY `price` DECIMAL(18,2) DEFAULT 0;
-- ALTER TABLE `products`           MODIFY `buyPrice` DECIMAL(18,2) DEFAULT 0;
-- ALTER TABLE `shop_invoices`      MODIFY `totalAmount` DECIMAL(18,2) DEFAULT 0;
-- ALTER TABLE `shop_invoice_items` MODIFY `unitPrice` DECIMAL(18,2) NOT NULL DEFAULT 0;
-- ALTER TABLE `shop_invoice_items` MODIFY `buyPrice` DECIMAL(18,2) NOT NULL DEFAULT 0;
-- ALTER TABLE `shop_invoice_items` MODIFY `totalPrice` DECIMAL(18,2) NOT NULL DEFAULT 0;
-- ALTER TABLE `debtors`            MODIFY `amount` DECIMAL(18,2) DEFAULT 0;
-- ALTER TABLE `creditors`          MODIFY `amount` DECIMAL(18,2) DEFAULT 0;
-- ALTER TABLE `sms_logs`           MODIFY `cost` DECIMAL(18,2) DEFAULT 0;
-- ============================================================================

-- ============================================================================
-- v3.1 — Foreign Keys + Performance Indexes + user_roles (معادل Migration 005)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_roles`;

CREATE TABLE `user_roles` (
  `user_id` VARCHAR(100) NOT NULL,
  `role_key` VARCHAR(100) NOT NULL,
  `assigned_at` VARCHAR(100),
  PRIMARY KEY (`user_id`, `role_key`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOTE: user_roles rows are populated at server startup by the self-healing
-- routine in server/mysql.ts (works on every MySQL/MariaDB version —
-- JSON_TABLE requires MariaDB >= 10.6 and cannot be relied upon here).

ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollments_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `debtors`
  ADD CONSTRAINT `fk_debtors_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `parent_athlete_links`
  ADD CONSTRAINT `fk_links_parent` FOREIGN KEY (`parentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `parent_athlete_links`
  ADD CONSTRAINT `fk_links_athlete` FOREIGN KEY (`athleteId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `insurance_requests`
  ADD CONSTRAINT `fk_insurance_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `app_notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `audit_logs`          ADD INDEX `idx_audit_userid` (`userId`);
ALTER TABLE `transactions`        ADD INDEX `idx_tx_createdat` (`createdAt`);
ALTER TABLE `transactions`        ADD INDEX `idx_tx_status` (`status`);
ALTER TABLE `transactions`        ADD INDEX `idx_tx_userid` (`userId`);
ALTER TABLE `enrollments`         ADD INDEX `idx_enr_session` (`sessionId`);
ALTER TABLE `enrollments`         ADD INDEX `idx_enr_user_status` (`userId`, `status`);
ALTER TABLE `app_notifications`   ADD INDEX `idx_notif_user_read` (`userId`, `isRead`);
ALTER TABLE `attendance_records`  ADD INDEX `idx_att_session_date` (`sessionId`, `date`);
ALTER TABLE `attendance_records`  ADD INDEX `idx_att_userid` (`userId`);
ALTER TABLE `shop_invoices`       ADD INDEX `idx_inv_createdat` (`createdAt`);
ALTER TABLE `shop_invoices`       ADD INDEX `idx_inv_athlete` (`athleteId`);
ALTER TABLE `products`            ADD INDEX `idx_products_code` (`code`);
ALTER TABLE `users`               ADD INDEX `idx_users_fullname` (`fullName`);
-- ============================ END OF v3.1 ==================================
