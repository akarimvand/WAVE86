import { Router } from 'express';
import { getMySqlPool, withTransaction } from '../db';
import { SyncRepository } from '../repository';
import { authenticateJwt, optionalJwt, requireRoles, validateRequestBody } from '../middleware';
import { readFileStore, writeFileStore, deleteFromFileStore } from '../fileStore';

const router = Router();

export const DEMO_PRODUCTS_SEED = [
  {
    id: 'prod-01',
    code: 'PRD-101',
    name: 'پروتئین بار کاله پرو (شکلاتی) ۷۰ گرمی',
    category: 'نوشیدنی و مکمل',
    price: 45000,
    buyPrice: 35000,
    stock: 50,
    minStock: 10,
    minStockAlert: 10,
    unit: 'عدد',
    imageUrl: 'https://images.unsplash.com/photo-1622484210800-14a0f443e2e0?w=400&auto=format&fit=crop&q=80',
    description: 'بار پروتئینی حاوی ۲۰ گرم پروتئین بدون قند افزوده مناسب بعد از تمرین',
    isActive: true,
    createdAt: '1403/01/01',
    updatedAt: '1403/01/01',
  },
  {
    id: 'prod-02',
    code: 'PRD-102',
    name: 'پودر پروتئین وی کاله پرو ۱۸۰۰ گرمی',
    category: 'نوشیدنی و مکمل',
    price: 1850000,
    buyPrice: 1550000,
    stock: 12,
    minStock: 3,
    minStockAlert: 3,
    unit: 'قوطی',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&auto=format&fit=crop&q=80',
    description: 'مکمل پروتئین وی کنسانتره با خلوص بالا برای رشد و ترمیم عضلات',
    isActive: true,
    createdAt: '1403/01/01',
    updatedAt: '1403/01/01',
  },
  {
    id: 'prod-03',
    code: 'PRD-103',
    name: 'پودر چاک سنگ‌نوردی (پودر منیزیم) ۳۰۰ گرمی',
    category: 'تجهیزات و لوازم جانبی',
    price: 220000,
    buyPrice: 170000,
    stock: 25,
    minStock: 5,
    minStockAlert: 5,
    unit: 'بسته',
    imageUrl: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&auto=format&fit=crop&q=80',
    description: 'پودر کربنات منیزیم خالص برای جلوگیری از تعریق دست هنگام صعود',
    isActive: true,
    createdAt: '1403/01/01',
    updatedAt: '1403/01/01',
  },
  {
    id: 'prod-04',
    code: 'PRD-104',
    name: 'قهوه اسپرسو دبل شات بوفه',
    category: 'نوشیدنی و مکمل',
    price: 40000,
    buyPrice: 15000,
    stock: 100,
    minStock: 20,
    minStockAlert: 20,
    unit: 'فنجان',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
    description: 'قهوه تازه دم ۱۰۰٪ عربیکا افزایش دهنده انرژی پیش از تمرین',
    isActive: true,
    createdAt: '1403/01/01',
    updatedAt: '1403/01/01',
  },
  {
    id: 'prod-05',
    code: 'PRD-105',
    name: 'کفش سنگ‌نوردی اجاره‌ای (روزانه)',
    category: 'خدمات و کرایه',
    price: 120000,
    buyPrice: 0,
    stock: 20,
    minStock: 2,
    minStockAlert: 2,
    unit: 'جفت/روز',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
    description: 'اجاره روزانه کفش مخصوص سنگ‌نوردی سالنی در سایزهای مختلف',
    isActive: true,
    createdAt: '1403/01/01',
    updatedAt: '1403/01/01',
  },
];

/**
 * GET /api/products
 * Fetch all products from MySQL
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM products ORDER BY id DESC');
    const products = (rows || []).map((p: any) => ({
      ...p,
      isActive: Boolean(p.isActive),
    }));
    res.json({ success: true, dbConnected: true, products });
  } catch (err: any) {
    console.warn('[Products MySQL Notice - Serving from File Store]', err.message || err);
    const store = readFileStore();
    const fallbackProducts = Array.isArray(store.products) && store.products.length > 0
      ? store.products
      : DEMO_PRODUCTS_SEED;
    res.json({
      success: true,
      dbConnected: false,
      products: fallbackProducts,
    });
  }
});

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'محصول مورد نظر یافت نشد.' });
    }
    const p = rows[0];
    res.json({
      success: true,
      product: { ...p, isActive: Boolean(p.isActive) },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در دریافت مشخصات محصول: ${err.message || err}`,
    });
  }
});

/**
 * POST /api/products
 * Create new product in MySQL
 */
router.post('/', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'accountant']), validateRequestBody(['name']), async (req, res, next) => {
  try {
    const p = req.body;
    const pool = getMySqlPool();

    const newProd = {
      id: p.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: p.code || '',
      name: p.name,
      category: p.category || '',
      price: Number(p.price) || 0,
      buyPrice: Number(p.buyPrice ?? p.buy_price) || 0,
      stock: Number(p.stock) || 0,
      minStock: Number(p.minStock ?? p.minStockAlert) || 5,
      minStockAlert: Number(p.minStockAlert ?? p.minStock) || 5,
      unit: p.unit || '',
      imageUrl: p.imageUrl || '',
      description: p.description || '',
      isActive: p.isActive !== false ? 1 : 0,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO products (id, code, name, category, price, buyPrice, stock, minStock, minStockAlert, unit, imageUrl, description, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         code=VALUES(code), name=VALUES(name), category=VALUES(category), price=VALUES(price), 
         buyPrice=VALUES(buyPrice), stock=VALUES(stock), minStock=VALUES(minStock), minStockAlert=VALUES(minStockAlert), 
         unit=VALUES(unit), imageUrl=VALUES(imageUrl), description=VALUES(description), 
         isActive=VALUES(isActive), updatedAt=VALUES(updatedAt);`,
      [
        newProd.id,
        newProd.code,
        newProd.name,
        newProd.category,
        newProd.price,
        newProd.buyPrice,
        newProd.stock,
        newProd.minStock,
        newProd.minStockAlert,
        newProd.unit,
        newProd.imageUrl,
        newProd.description,
        newProd.isActive,
        newProd.createdAt,
        newProd.updatedAt,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'محصول با موفقیت ثبت شد.',
      product: { ...newProd, isActive: Boolean(newProd.isActive) },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در ذخیره محصول در دیتابیس: ${err.message || err}`,
    });
  }
});

/**
 * PUT /api/products/:id
 */
router.put('/:id', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'accountant']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const p = req.body;
    const pool = getMySqlPool();

    const [result]: any = await pool.query(
      `UPDATE products SET 
         code=?, name=?, category=?, price=?, buyPrice=?, stock=?, minStock=?, minStockAlert=?, 
         unit=?, imageUrl=?, description=?, isActive=?, updatedAt=?
       WHERE id=?`,
      [
        p.code || '',
        p.name || '',
        p.category || '',
        Number(p.price) || 0,
        Number(p.buyPrice ?? p.buy_price) || 0,
        Number(p.stock) || 0,
        Number(p.minStock ?? p.minStockAlert) || 5,
        Number(p.minStockAlert ?? p.minStock) || 5,
        p.unit || '',
        p.imageUrl || '',
        p.description || '',
        p.isActive !== false ? 1 : 0,
        p.updatedAt || new Date().toISOString(),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'محصول مورد نظر برای ویرایش یافت نشد.' });
    }

    res.json({ success: true, message: 'محصول با موفقیت به‌روزرسانی شد.' });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در ویرایش محصول: ${err.message || err}`,
    });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'accountant']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getMySqlPool();

    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    deleteFromFileStore('products', id);
    res.json({ success: true, message: 'محصول با موفقیت حذف گردید.' });
  } catch (err: any) {
    deleteFromFileStore('products', req.params.id);
    res.status(500).json({ success: false, error: `خطا در حذف محصول: ${err.message || err}` });
  }
});

/**
 * POST /api/products/seed-demo
 */
router.post('/seed-demo', authenticateJwt, requireRoles(['super_admin', 'admin']), async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await withTransaction(pool, async (conn) => {
      await SyncRepository.syncProducts(conn, DEMO_PRODUCTS_SEED, (url: string) => url);
    });
    res.json({ success: true, products: DEMO_PRODUCTS_SEED });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در بازیابی محصولات پیش‌فرض: ${err.message || err}`,
    });
  }
});

export default router;
