import { Router } from 'express';
import { getMySqlPool } from '../db';
import { validateRequestBody, authenticateJwt, requireRoles } from '../middleware';
import { deleteFromFileStore } from '../fileStore';

const router = Router();
const financeGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'accountant', 'secretary'])];
const adminGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'accountant'])];

/**
 * GET /api/finance/transactions
 */
router.get('/transactions', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM transactions ORDER BY id DESC LIMIT 500');
    res.json({ success: true, transactions: rows || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت تراکنش‌ها: ${err.message || err}` });
  }
});

/**
 * POST /api/finance/transactions
 */
router.post('/transactions', ...financeGuard, validateRequestBody(['amount', 'type', 'userId']), async (req, res, next) => {
  try {
    const t = req.body;
    const pool = getMySqlPool();
    const id = t.id || `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await pool.query(
      `INSERT INTO transactions (id, userId, userName, userNationalId, amount, type, method, trackingNumber, receiptUrl, receiptFileName, description, status, createdAt, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount=VALUES(amount), type=VALUES(type), method=VALUES(method), status=VALUES(status), description=VALUES(description);`,
      [
        id,
        t.userId,
        t.userName || '',
        t.userNationalId || '',
        Number(t.amount) || 0,
        t.type,
        t.method || 'cash',
        t.trackingNumber || '',
        t.receiptUrl || '',
        t.receiptFileName || '',
        t.description || '',
        t.status || 'completed',
        t.createdAt || new Date().toISOString(),
        t.createdBy || 'مدیر سیستم',
      ]
    );

    res.status(201).json({ success: true, message: 'تراکنش با موفقیت ثبت شد.', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در ثبت تراکنش: ${err.message || err}` });
  }
});

/**
 * DELETE /api/finance/transactions/:id
 */
router.delete('/transactions/:id', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('DELETE FROM transactions WHERE id = ?', [req.params.id]).catch(() => {});
    deleteFromFileStore('transactions', req.params.id);
    res.json({ success: true, message: 'تراکنش با موفقیت حذف شد.' });
  } catch (err: any) {
    deleteFromFileStore('transactions', req.params.id);
    res.json({ success: true, message: 'تراکنش حذف شد.' });
  }
});

/**
 * DELETE /api/finance/debtors/:id
 */
router.delete('/debtors/:id', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('DELETE FROM debtors WHERE id = ?', [req.params.id]).catch(() => {});
    deleteFromFileStore('debtors', req.params.id);
    res.json({ success: true, message: 'بدهکار با موفقیت حذف شد.' });
  } catch (err: any) {
    deleteFromFileStore('debtors', req.params.id);
    res.json({ success: true, message: 'بدهکار حذف شد.' });
  }
});

/**
 * DELETE /api/finance/creditors/:id
 */
router.delete('/creditors/:id', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('DELETE FROM creditors WHERE id = ?', [req.params.id]).catch(() => {});
    deleteFromFileStore('creditors', req.params.id);
    res.json({ success: true, message: 'بستانکار با موفقیت حذف شد.' });
  } catch (err: any) {
    deleteFromFileStore('creditors', req.params.id);
    res.json({ success: true, message: 'بستانکار حذف شد.' });
  }
});

/**
 * GET /api/finance/invoices
 */
router.get('/invoices', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM shop_invoices ORDER BY id DESC');
    const invoices = (rows || []).map((inv: any) => ({
      ...inv,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
    }));
    res.json({ success: true, invoices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت فاکتورها: ${err.message || err}` });
  }
});

/**
 * GET /api/finance/debtors
 */
router.get('/debtors', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM debtors ORDER BY id DESC');
    res.json({ success: true, debtors: rows || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت بدهکاران: ${err.message || err}` });
  }
});

/**
 * GET /api/finance/creditors
 */
router.get('/creditors', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM creditors ORDER BY id DESC');
    res.json({ success: true, creditors: rows || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت بستانکاران: ${err.message || err}` });
  }
});

export default router;
