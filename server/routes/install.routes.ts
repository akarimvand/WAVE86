import { Router } from 'express';
import mysql from 'mysql2/promise';
import { getMySqlConfig, saveMySqlConfig, testMySqlConfig, reinitializePool, getMySqlPool } from '../db';
import { createAllTablesAndIndexes, ensureAllTablesExist } from '../mysql';
import { authenticateJwt, requireRoles } from '../middleware';

const router = Router();

/**
 * GET /api/install/status
 */
router.get('/status', async (req, res) => {
  const config = getMySqlConfig();
  const isInstalled = Boolean(config.user && config.database);

  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SHOW TABLES');
    const tableNames = (rows || []).map((r: any) => Object.values(r)[0]);
    return res.json({
      success: true,
      isInstalled,
      connected: true,
      tablesCount: tableNames.length,
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
      },
    });
  } catch (err: any) {
    return res.json({
      success: true,
      isInstalled,
      connected: false,
      error: err.message || 'عدم امکان اتصال به پایگاه داده',
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
      },
    });
  }
});

/**
 * Middleware to check install permission
 */
const checkInstallAccess = (req: any, res: any, next: any) => {
  const config = getMySqlConfig();
  const isAlreadyInstalled = Boolean(config.user && config.database);
  if (!isAlreadyInstalled) {
    return next();
  }
  // If system is already installed, require super_admin authentication
  return authenticateJwt(req, res, () => {
    return requireRoles(['super_admin'])(req, res, next);
  });
};

/**
 * POST /api/install/test-db
 */
router.post('/test-db', checkInstallAccess, async (req, res) => {
  const testCfg = {
    host: req.body.host || 'localhost',
    port: Number(req.body.port) || 3306,
    user: req.body.user || '',
    password: req.body.password || '',
    database: req.body.database || '',
  };

  const result = await testMySqlConfig(testCfg);
  if (result.success) {
    return res.json({ success: true, message: 'اتصال به دیتابیس با موفقیت برقرار شد.' });
  } else {
    return res.status(400).json({ success: false, error: result.error });
  }
});

/**
 * POST /api/install/save-config
 */
router.post('/save-config', checkInstallAccess, async (req, res) => {
  const newConfig = {
    host: req.body.host || 'localhost',
    port: Number(req.body.port) || 3306,
    user: req.body.user || '',
    password: req.body.password || '',
    database: req.body.database || '',
  };

  if (!newConfig.user || !newConfig.database) {
    return res.status(400).json({ success: false, error: 'نام کاربری و نام دیتابیس الزامی هستند.' });
  }

  const testRes = await testMySqlConfig(newConfig);
  if (!testRes.success) {
    return res.status(400).json({ success: false, error: `تست اتصال ناموفق بود: ${testRes.error}` });
  }

  saveMySqlConfig(newConfig);
  reinitializePool(newConfig);

  try {
    const pool = getMySqlPool();
    await ensureAllTablesExist(pool);
    return res.json({
      success: true,
      message: 'تنظیمات ذخیره شد و ساختار جداول با موفقیت ایجاد گردید.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `تنظیمات ذخیره شد اما در ایجاد جداول خطایی رخ داد: ${err.message || err}`,
    });
  }
});

export default router;
