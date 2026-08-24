-- ============================================================
-- 001_add_version_columns.sql
-- افزودن ستون Optimistic Locking (version) به جدول‌های حساس
-- اجرای تکراری امن نیست؛ رانر فقط یک‌بار هر فایل را اعمال می‌کند.
-- ============================================================

ALTER TABLE `users` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `enrollments` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `transactions` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `attendance_records` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `courses` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `products` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `debtors` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `creditors` ADD COLUMN `version` INT NOT NULL DEFAULT 1;