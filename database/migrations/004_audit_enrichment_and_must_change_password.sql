-- ============================================================
-- 004_audit_enrichment_and_must_change_password.sql
-- غنیسازی Audit Trail (oldValue/newValue/ip/userAgent)
-- پرچم اجبار تغییر رمز در اولین ورود
-- ============================================================

ALTER TABLE `audit_logs` ADD COLUMN `oldValue` LONGTEXT NULL;
ALTER TABLE `audit_logs` ADD COLUMN `newValue` LONGTEXT NULL;
ALTER TABLE `audit_logs` ADD COLUMN `ip` VARCHAR(64) NULL;
ALTER TABLE `audit_logs` ADD COLUMN `userAgent` VARCHAR(255) NULL;

ALTER TABLE `users` ADD COLUMN `mustChangePassword` TINYINT(1) NOT NULL DEFAULT 0;