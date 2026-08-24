-- ============================================================================
-- Migration 005 — Foreign Keys + Performance Indexes (2026-08-24)
-- ----------------------------------------------------------------------------
-- Idempotent: re-running tolerates duplicate object errors.
-- Pre-checked against live data: all referenced relations have 0 orphan rows
-- except shop_invoice_items.productId (products are intentionally hard-deleted,
-- so NO FK is added there by design).
-- ============================================================================

-- ---------- FOREIGN KEYS ----------
ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollments_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `debtors`
  ADD CONSTRAINT `fk_debtors_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `shop_invoice_items`
  ADD CONSTRAINT `fk_items_invoice` FOREIGN KEY (`invoiceId`) REFERENCES `shop_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `parent_athlete_links`
  ADD CONSTRAINT `fk_links_parent` FOREIGN KEY (`parentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `parent_athlete_links`
  ADD CONSTRAINT `fk_links_athlete` FOREIGN KEY (`athleteId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `insurance_requests`
  ADD CONSTRAINT `fk_insurance_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `app_notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------- PERFORMANCE INDEXES ----------
ALTER TABLE `audit_logs`          ADD INDEX `idx_audit_timestamp` (`timestamp`);
ALTER TABLE `audit_logs`          ADD INDEX `idx_audit_userid` (`userId`);
ALTER TABLE `transactions`        ADD INDEX `idx_tx_createdat` (`createdAt`);
ALTER TABLE `transactions`        ADD INDEX `idx_tx_status` (`status`);
ALTER TABLE `transactions`        ADD INDEX `idx_tx_userid` (`userId`);
ALTER TABLE `enrollments`         ADD INDEX `idx_enr_session` (`sessionId`);
ALTER TABLE `enrollments`         ADD INDEX `idx_enr_user_status` (`userId`, `status`);
ALTER TABLE `app_notifications`   ADD INDEX `idx_notif_user_read` (`userId`, `isRead`);
ALTER TABLE `sms_logs`            ADD INDEX `idx_sms_sentat` (`sentAt`);
ALTER TABLE `attendance_records`  ADD INDEX `idx_att_session_date` (`sessionId`, `date`);
ALTER TABLE `attendance_records`  ADD INDEX `idx_att_userid` (`userId`);
ALTER TABLE `shop_invoices`       ADD INDEX `idx_inv_createdat` (`createdAt`);
ALTER TABLE `shop_invoices`       ADD INDEX `idx_inv_athlete` (`athleteId`);
ALTER TABLE `products`            ADD INDEX `idx_products_code` (`code`);
ALTER TABLE `users`               ADD INDEX `idx_users_fullname` (`fullName`);
