-- ============================================================
-- 003_convert_money_to_decimal.sql
-- تبدیل ستون‌های مالی از DOUBLE به DECIMAL(18,2)
-- برای محاسبات دقیق مالی (پرهیز از خطای گرد کردن اعشاری)
-- ============================================================

ALTER TABLE `transactions` MODIFY `amount` DECIMAL(18,2) DEFAULT 0;
ALTER TABLE `products` MODIFY `price` DECIMAL(18,2) DEFAULT 0;
ALTER TABLE `products` MODIFY `buyPrice` DECIMAL(18,2) DEFAULT 0;
ALTER TABLE `shop_invoices` MODIFY `totalAmount` DECIMAL(18,2) DEFAULT 0;
ALTER TABLE `shop_invoice_items` MODIFY `unitPrice` DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE `shop_invoice_items` MODIFY `buyPrice` DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE `shop_invoice_items` MODIFY `totalPrice` DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE `debtors` MODIFY `amount` DECIMAL(18,2) DEFAULT 0;
ALTER TABLE `creditors` MODIFY `amount` DECIMAL(18,2) DEFAULT 0;
ALTER TABLE `sms_logs` MODIFY `cost` DECIMAL(18,2) DEFAULT 0;