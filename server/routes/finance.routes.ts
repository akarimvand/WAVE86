import { Router } from 'express';
import { getMySqlPool, withTransaction } from '../db';
import { SyncRepository } from '../repository';
import { validateRequestBody, authenticateJwt, requireRoles, AuthenticatedRequest } from '../middleware';

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

    // Idempotency (Phase 3): a client-provided key guarantees that retrying a
    // timed-out request never creates a duplicate financial transaction.
    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      t.idempotencyKey ||
      '';

    if (idempotencyKey) {
      const [existing]: any = await pool.query(
        'SELECT id FROM transactions WHERE idempotencyKey = ? LIMIT 1',
        [idempotencyKey]
      );
      if (existing && existing.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'تراکنش قبلاً با همین کلید ثبت شده است.',
          id: existing[0].id,
          duplicate: true,
        });
      }
    }

    try {
      await pool.query(
        `INSERT INTO transactions (id, userId, userName, userNationalId, amount, type, method, trackingNumber, receiptUrl, receiptFileName, description, status, idempotencyKey, createdAt, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          idempotencyKey || null,
          t.createdAt || new Date().toISOString(),
          t.createdBy || 'مدیر سیستم',
        ]
      );
    } catch (err: any) {
      // Unique index race: two concurrent requests with the same key.
      if (err?.code === 'ER_DUP_ENTRY' && idempotencyKey) {
        const [existing]: any = await pool.query(
          'SELECT id FROM transactions WHERE idempotencyKey = ? LIMIT 1',
          [idempotencyKey]
        );
        if (existing && existing.length > 0) {
          return res.status(200).json({
            success: true,
            message: 'تراکنش قبلاً با همین کلید ثبت شده است.',
            id: existing[0].id,
            duplicate: true,
          });
        }
      }
      throw err;
    }

    res.status(201).json({ success: true, message: 'تراکنش با موفقیت ثبت شد.', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در ثبت تراکنش: ${err.message || err}` });
  }
});

/**
 * DELETE /api/finance/transactions/:id
 * Financial transactions are NEVER hard-deleted. They are soft-voided so the
 * audit trail (who/when/why) is preserved for accounting integrity.
 */
router.delete('/transactions/:id', ...financeGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const pool = getMySqlPool();
    const actor = req.user?.username || req.user?.fullName || req.user?.id || 'سیستم';
    const voidReason = req.body?.voidReason || `باطل‌سازی توسط ${actor}`;

    await pool.query(
      `UPDATE transactions
         SET status='cancelled', voidedAt=?, voidedBy=?, voidReason=?
       WHERE id = ? AND status != 'cancelled'`,
      [new Date().toISOString(), actor, voidReason, req.params.id]
    );

    res.json({ success: true, message: 'تراکنش با موفقیت باطل شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در باطل‌سازی تراکنش: ${err.message || err}` });
  }
});

/**
 * DELETE /api/finance/debtors/:id
 */
router.delete('/debtors/:id', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('DELETE FROM debtors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'بدهکار با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در حذف بدهکار: ${err.message || err}` });
  }
});

/**
 * DELETE /api/finance/creditors/:id
 */
router.delete('/creditors/:id', ...financeGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('DELETE FROM creditors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'بستانکار با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در حذف بستانکار: ${err.message || err}` });
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
 * POST /api/finance/invoices
 * Independent atomic endpoint for shop checkout (no full-state sync needed).
 * Inside ONE transaction: conditional stock decrement -> insert invoice+items
 * (prices read FROM THE DB, never trusted from client) -> ledger entries.
 */
router.post('/invoices', ...financeGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = req.body || {};
    const actor = req.user?.username || data.creatorName || 'مسئول فروشگاه';

    if (!data.athleteId) {
      return res.status(400).json({ success: false, error: 'شناسه ورزشکار الزامی است.' });
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return res.status(400).json({ success: false, error: 'سبد خرید خالی است.' });
    }

    const pool = getMySqlPool();
    const invoiceId = data.id || `shop-inv-${Date.now()}`;

    const invoice = await withTransaction(pool, async (conn) => {
      // 1) Atomic conditional stock decrement — prevents oversell & negative stock
      const quantities: Record<string, number> = {};
      for (const item of data.items) {
        const qty = Math.max(1, Number(item.quantity) || 1);
        quantities[item.productId] = (quantities[item.productId] || 0) + qty;
      }

      for (const [productId, qty] of Object.entries(quantities)) {
        const [upd]: any = await conn.query(
          'UPDATE products SET stock = stock - ?, updatedAt = ? WHERE id = ? AND stock >= ?',
          [qty, new Date().toISOString(), productId, qty]
        );
        if (!upd || upd.affectedRows === 0) {
          const err: any = new Error(`موجودی کالا کافی نیست (productId: ${productId}، درخواستی: ${qty}).`);
          err.status = 422;
          throw err;
        }
      }

      // 2) Read authoritative product data from DB (never trust client prices)
      const productIds = Object.keys(quantities);
      const placeholders = productIds.map(() => '?').join(', ');
      const [prodRows]: any = await conn.query(
        `SELECT id, name, category, price, buyPrice FROM products WHERE id IN (${placeholders})`,
        productIds
      );
      const prodMap = new Map<string, any>((prodRows || []).map((p: any) => [p.id, p]));

      let totalAmount = 0;
      const invoiceItems = data.items.map((item: any, i: number) => {
        const prod = prodMap.get(item.productId);
        if (!prod) {
          const err: any = new Error(`کالای موردنظر یافت نشد (productId: ${item.productId}).`);
          err.status = 404;
          throw err;
        }
        const unitPrice = Number(prod.price) || 0;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const totalPrice = unitPrice * quantity;
        totalAmount += totalPrice;
        return {
          id: `${invoiceId}-item-${i}`,
          productId: item.productId,
          productName: prod.name || '',
          category: prod.category || '',
          unitPrice,
          buyPrice: Number(prod.buyPrice) || 0,
          quantity,
          totalPrice,
        };
      });

      // 3) Athlete info from DB
      const [athleteRows]: any = await conn.query('SELECT * FROM users WHERE id = ?', [data.athleteId]);
      const athlete = athleteRows && athleteRows[0];
      if (!athlete) {
        const err: any = new Error('ورزشکار مورد نظر یافت نشد.');
        err.status = 404;
        throw err;
      }

      const invDate =
        data.date && typeof data.date === 'string' && data.date.trim() !== ''
          ? data.date
          : new Date().toISOString();
      const invNumber = data.invoiceNumber || `INV-${Date.now() % 10000000}`;

      const newInvoice = {
        id: invoiceId,
        invoiceNumber: invNumber,
        athleteId: data.athleteId,
        athleteName: data.athleteName || athlete.fullName || '',
        creatorId: data.creatorId || (req.user?.id ?? ''),
        creatorName: data.creatorName || actor,
        date: invDate,
        items: invoiceItems,
        totalAmount,
        paymentMethod: String(data.paymentMethod || 'cash'),
        paymentStatus: data.paymentMethod === 'credit' ? 'unpaid' : 'paid',
        notes: data.notes || '',
        createdAt: invDate,
      };

      await SyncRepository.syncShopInvoices(conn, [newInvoice]);

      // 4) Ledger: charge always; cash settles now, credit creates a debtor record
      const chargeTx = {
        id: `${invoiceId}-charge`,
        userId: athlete.id,
        userName: athlete.fullName || '',
        userNationalId: athlete.nationalId || '',
        type: 'charge',
        amount: totalAmount,
        method: newInvoice.paymentMethod === 'cash' ? 'pos' : 'cash',
        description: `بابت فاکتور ${invNumber}`,
        status: 'completed',
        createdAt: invDate,
        createdBy: actor,
      };
      await SyncRepository.syncTransactions(conn, [chargeTx], (url: string) => url);

      if (newInvoice.paymentMethod !== 'credit') {
        const payTx = {
          id: `${invoiceId}-pay`,
          userId: athlete.id,
          userName: athlete.fullName || '',
          userNationalId: athlete.nationalId || '',
          type: 'equipment',
          amount: totalAmount,
          method: 'pos',
          description: `بابت تسویه فاکتور ${invNumber}`,
          status: 'completed',
          createdAt: invDate,
          createdBy: actor,
        };
        await SyncRepository.syncTransactions(conn, [payTx], (url: string) => url);
      } else {
        const debtorRecord = {
          id: `debt-${invoiceId}`,
          userId: athlete.id,
          fullName: athlete.fullName || '',
          nationalId: athlete.nationalId || '',
          phone: athlete.phone || '',
          category: 'equipment',
          categoryTitle: `فاکتور فروشگاه ${invNumber}`,
          amount: totalAmount,
          dueDate: invDate,
          status: 'overdue',
          notes: `بابت فاکتور ${invNumber}`,
        };
        await SyncRepository.syncDebtors(conn, [debtorRecord]);
      }

      return newInvoice;
    });

    res.status(201).json({ success: true, message: 'فاکتور با موفقیت ثبت شد.', invoice });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: `خطا در ثبت فاکتور: ${err.message || err}` });
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
