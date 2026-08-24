import { Router } from 'express';
import { getMySqlPool, comparePassword, hashPassword } from '../db';
import { SyncRepository } from '../repository';
import { generateToken, authenticateJwt, AuthenticatedRequest, validateRequestBody } from '../middleware';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticates user via nationalId or username and password, returns JWT token & user info.
 */
router.post('/login', validateRequestBody(['username', 'password']), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    let user: any = null;
    let pool: any = null;

    try {
      pool = getMySqlPool();
      user = await SyncRepository.findUserByUsername(pool, String(username).trim());
    } catch (dbErr: any) {
      console.error('[Auth MySQL Error]', dbErr.message || dbErr);
      return res.status(503).json({
        success: false,
        dbConnected: false,
        error: 'عدم امکان ارتباط با دیتابیس MySQL؛ ورود در حال حاضر در دسترس نیست.',
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'نام کاربری یا کلمه عبور اشتباه است.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'حساب کاربری شما غیرفعال شده است. لطفاً با مدیریت باشگاه تماس بگیرید.',
      });
    }

    const isMatch = await comparePassword(String(password), user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'نام کاربری یا کلمه عبور اشتباه است.',
      });
    }

    // Auto-upgrade unhashed legacy password to bcrypt hash
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      try {
        const hashed = await hashPassword(String(password));
        if (pool) {
          await pool.query('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [
            hashed,
            new Date().toISOString(),
            user.id,
          ]);
        }

        user.password = hashed;
        console.log(`[Auth] Auto-upgraded password hash for user: ${user.username || user.id}`);
      } catch (err) {
        console.error('Failed to auto-upgrade password hash:', err);
      }
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      nationalId: user.nationalId,
      fullName: user.fullName,
      roles: user.roles,
      activeRole: user.activeRole,
    });

    const sanitizedUser = { ...user };
    delete sanitizedUser.password;

    res.json({
      success: true,
      message: 'ورود با موفقیت انجام شد.',
      token,
      user: sanitizedUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const pool = getMySqlPool();
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'کاربر احراز هویت نشده است.' });
    }

    const user = await SyncRepository.findUserById(pool, req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر در سیستم یافت نشد.' });
    }

    const sanitizedUser = { ...user };
    delete sanitizedUser.password;

    res.json({
      success: true,
      user: sanitizedUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/change-password
 * Changes the authenticated user's password
 */
router.post('/change-password', authenticateJwt, validateRequestBody(['oldPassword', 'newPassword']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const pool = getMySqlPool();

    const user = await SyncRepository.findUserById(pool, req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد.' });
    }

    const isMatch = await comparePassword(String(oldPassword), user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'کلمه عبور فعلی نادرست است.' });
    }

    const newHashed = await hashPassword(String(newPassword));
    await pool.query('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [
      newHashed,
      new Date().toISOString(),
      user.id,
    ]);

    res.json({
      success: true,
      message: 'کلمه عبور با موفقیت تغییر یافت.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
