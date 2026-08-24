-- ============================================================
-- 002_add_transaction_integrity.sql
-- یکتایی Idempotency و Soft-Delete برای تراکنش‌های مالی
-- ============================================================

ALTER TABLE `transactions` ADD COLUMN `idempotencyKey` VARCHAR(100) NULL;
ALTER TABLE `transactions` ADD UNIQUE INDEX `uq_transactions_idempotencyKey` (`idempotencyKey`);
ALTER TABLE `transactions` ADD COLUMN `voidedAt` VARCHAR(100) NULL;
ALTER TABLE `transactions` ADD COLUMN `voidedBy` VARCHAR(255) NULL;
ALTER TABLE `transactions` ADD COLUMN `voidReason` TEXT NULL;