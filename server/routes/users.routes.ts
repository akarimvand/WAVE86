import { Router } from 'express';
import { getMySqlPool, hashPassword } from '../db';
import { SyncRepository } from '../repository';
import { validateRequestBody, authenticateJwt, requireRoles, AuthenticatedRequest } from '../middleware';
import { writeAudit, getRequestInfo } from '../audit';

const router = Router();
const staffGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'coach', 'accountant'])];
const adminGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary'])];

/**
 * GET /api/users (Staff Only)
 */
router.get('/', ...staffGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();

    // Optional pagination / search / filters (Phase 5).
    // Backward compatible: without query params the FULL list is returned.
    const page = Math.max(1, Number(req.query.page) || 1);
    const rawLimit = Number(req.query.limit);
    const limit = rawLimit > 0 ? Math.min(500, rawLimit) : 0; // 0 = no limit (legacy)
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const isActiveParam = String(req.query.isActive || '').trim();

    const where: string[] = [];
    const params: any[] = [];
    if (search) {
      const like = `%${search}%`;
      where.push('(fullName LIKE ? OR username LIKE ? OR nationalId LIKE ? OR phone LIKE ?)');
      params.push(like, like, like, like);
    }
    if (role) {
      where.push('activeRole = ?');
      params.push(role);
    }
    if (isActiveParam === 'true' || isActiveParam === 'false') {
      where.push('isActive = ?');
      params.push(isActiveParam === 'true' ? 1 : 0);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    let total = 0;
    if (limit > 0) {
      const [cntRows]: any = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);
      total = Number(cntRows?.[0]?.total ?? 0);
    }

    const sql = limit > 0
      ? `SELECT * FROM users ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
      : `SELECT * FROM users ${whereSql} ORDER BY id DESC`;
    const execParams = limit > 0 ? [...params, limit, (page - 1) * limit] : params;

    const [rows]: any = await pool.query(sql, execParams);
    const users = (rows || []).map((u: any) => {
      const sanitized = { ...u };
      delete sanitized.password;
      return {
        ...sanitized,
        roles: typeof sanitized.roles === 'string' ? JSON.parse(sanitized.roles) : sanitized.roles,
        isActive: Boolean(sanitized.isActive),
        isInsuranceValid: Boolean(sanitized.isInsuranceValid),
      };
    });

    if (limit > 0) {
      return res.json({ success: true, dbConnected: true, users, total, page, limit });
    }
    res.json({ success: true, dbConnected: true, users });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      dbConnected: false,
      error: `خطا در دریافت لیست کاربران: ${err.message || err}`,
    });
  }
});

/**
 * GET /api/users/:id (Self or Staff)
 */
router.get('/:id', authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetId = req.params.id;
    const currentUser = req.user;
    const isStaff = currentUser?.roles?.some((r: string) => ['super_admin', 'admin', 'secretary', 'coach', 'accountant'].includes(r));
    
    // Prevent IDOR: Regular athletes can only view their own user profile
    if (!isStaff && currentUser?.id !== targetId) {
      return res.status(403).json({ success: false, error: 'شما دسترسی به مشاهده اطلاعات سایر کاربران را ندارید.' });
    }

    const pool = getMySqlPool();
    const user = await SyncRepository.findUserById(pool, targetId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد.' });
    }
    const sanitized = { ...user };
    delete sanitized.password;
    res.json({ success: true, user: sanitized });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در دریافت کاربر: ${err.message || err}`,
    });
  }
});

/**
 * POST /api/users (Staff Only)
 */
router.post('/', ...adminGuard, validateRequestBody(['nationalId']), async (req, res, next) => {
  try {
    const u = { ...req.body };
    if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
      u.password = await hashPassword(u.password);
    }

    const pool = getMySqlPool();
    await SyncRepository.saveUser(pool, u);

    res.status(201).json({ success: true, message: 'کاربر با موفقیت ذخیره شد.', user: u });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در ذخیره کاربر: ${err.message || err}`,
    });
  }
});

/**
 * PUT /api/users/:id (Self or Staff)
 */
router.put('/:id', authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetId = req.params.id;
    const currentUser = req.user;
    const isStaff = currentUser?.roles?.some((r: string) => ['super_admin', 'admin', 'secretary'].includes(r)) || false;

    if (currentUser && !isStaff && currentUser?.id !== targetId) {
      return res.status(403).json({ success: false, error: 'شما دسترسی به ویرایش اطلاعات این کاربر را ندارید.' });
    }

    const u = { ...req.body, id: targetId };
    // If not staff, prevent self-elevation of roles or balance
    if (!isStaff && currentUser?.id === targetId) {
      delete u.roles;
      delete u.activeRole;
      delete u.debtAmount;
      delete u.discountPercent;
    }
    if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
      u.password = await hashPassword(u.password);
    }

    // Update MySQL database only (single source of truth) with Optimistic Locking
    const pool = getMySqlPool();
    const [oldRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
    const oldUser = oldRows?.[0] || null;
    const expectedVersion = Number(u.version);
    if (Number.isInteger(expectedVersion) && expectedVersion > 0) {
      const affected = await SyncRepository.updateUserVersioned(pool, u, expectedVersion);
      if (affected === 0) {
        const exists = await SyncRepository.userExists(pool, targetId);
        if (!exists) {
          return res.status(404).json({ success: false, error: 'کاربر یافت نشد.' });
        }
        return res.status(409).json({
          success: false,
          conflict: true,
          error: 'این اطلاعات توسط کاربر دیگری تغییر کرده است. ابتدا اطلاعات جدید را دریافت کنید.',
        });
      }

      // Server-side audit trail (Phase 5): detects role changes explicitly
      let action = 'ویرایش کاربر';
      try {
        const oldRoles = typeof oldUser?.roles === 'string' ? JSON.parse(oldUser.roles) : oldUser?.roles;
        if (oldUser && JSON.stringify(oldRoles ?? []) !== JSON.stringify(u.roles || [])) {
          action = 'تغییر نقش کاربر';
        }
      } catch {}
      await writeAudit(pool, {
        userId: currentUser?.id,
        userName: currentUser?.username || currentUser?.fullName,
        action,
        entity: 'User',
        entityId: targetId,
        details: isStaff ? 'ویرایش توسط مدیریت' : 'ویرایش پروفایل توسط خود کاربر',
        oldValue: oldUser ? { roles: oldUser.roles, activeRole: oldUser.activeRole } : undefined,
        newValue: { roles: u.roles, activeRole: u.activeRole },
        ...getRequestInfo(req),
      });

      return res.json({
        success: true,
        message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.',
        user: { ...u, version: expectedVersion + 1 },
      });
    }

    // Fallback when no version provided (legacy clients / bulk flows)
    await SyncRepository.saveUser(pool, u);
    await writeAudit(pool, {
      userId: currentUser?.id,
      userName: currentUser?.username || currentUser?.fullName,
      action: 'ویرایش کاربر',
      entity: 'User',
      entityId: targetId,
      details: 'بهروزرسانی بدون version (مسیر سازگاری)',
      oldValue: oldUser ? { roles: oldUser.roles, activeRole: oldUser.activeRole } : undefined,
      newValue: { roles: u.roles, activeRole: u.activeRole },
      ...getRequestInfo(req),
    });
    res.json({ success: true, message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.', user: u });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در ویرایش کاربر: ${err.message || err}`,
    });
  }
});

/**
 * PATCH /api/users/:id
 */
router.patch('/:id', authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetId = req.params.id;
    const currentUser = req.user;
    const isStaff = currentUser?.roles?.some((r: string) => ['super_admin', 'admin', 'secretary'].includes(r)) || false;

    if (currentUser && !isStaff && currentUser?.id !== targetId) {
      return res.status(403).json({ success: false, error: 'شما دسترسی به ویرایش اطلاعات این کاربر را ندارید.' });
    }

    const u = { ...req.body, id: targetId };
    // If not staff, prevent self-elevation of roles or balance
    if (!isStaff && currentUser?.id === targetId) {
      delete u.roles;
      delete u.activeRole;
      delete u.debtAmount;
      delete u.discountPercent;
    }
    if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
      u.password = await hashPassword(u.password);
    }

    // Update MySQL database only (single source of truth) with Optimistic Locking
    const pool = getMySqlPool();
    const [oldRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [targetId]);
    const oldUser = oldRows?.[0] || null;
    const expectedVersion = Number(u.version);
    if (Number.isInteger(expectedVersion) && expectedVersion > 0) {
      const affected = await SyncRepository.updateUserVersioned(pool, u, expectedVersion);
      if (affected === 0) {
        const exists = await SyncRepository.userExists(pool, targetId);
        if (!exists) {
          return res.status(404).json({ success: false, error: 'کاربر یافت نشد.' });
        }
        return res.status(409).json({
          success: false,
          conflict: true,
          error: 'این اطلاعات توسط کاربر دیگری تغییر کرده است. ابتدا اطلاعات جدید را دریافت کنید.',
        });
      }

      let action = 'ویرایش کاربر';
      try {
        const oldRoles = typeof oldUser?.roles === 'string' ? JSON.parse(oldUser.roles) : oldUser?.roles;
        if (oldUser && JSON.stringify(oldRoles ?? []) !== JSON.stringify(u.roles || [])) {
          action = 'تغییر نقش کاربر';
        }
      } catch {}
      await writeAudit(pool, {
        userId: currentUser?.id,
        userName: currentUser?.username || currentUser?.fullName,
        action,
        entity: 'User',
        entityId: targetId,
        details: isStaff ? 'ویرایش توسط مدیریت' : 'ویرایش پروفایل توسط خود کاربر',
        oldValue: oldUser ? { roles: oldUser.roles, activeRole: oldUser.activeRole } : undefined,
        newValue: { roles: u.roles, activeRole: u.activeRole },
        ...getRequestInfo(req),
      });

      return res.json({
        success: true,
        message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.',
        user: { ...u, version: expectedVersion + 1 },
      });
    }

    // Fallback when no version provided (legacy clients / bulk flows)
    await SyncRepository.saveUser(pool, u);
    res.json({ success: true, message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.', user: u });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در ویرایش کاربر: ${err.message || err}`,
    });
  }
});

/**
 * DELETE /api/users/:id (Admin Only)
 */
router.delete('/:id', ...adminGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const pool = getMySqlPool();
    const [oldRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    await SyncRepository.deleteUser(pool, req.params.id);

    // Server-side audit trail with full old record (Phase 5)
    await writeAudit(pool, {
      userId: req.user?.id,
      userName: req.user?.username || req.user?.fullName,
      action: 'حذف کاربر',
      entity: 'User',
      entityId: req.params.id,
      details: `حذف کاربر ${oldRows?.[0]?.fullName || req.params.id} توسط مدیریت`,
      oldValue: oldRows?.[0] || undefined,
      ...getRequestInfo(req),
    });

    res.json({ success: true, message: 'کاربر با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در حذف کاربر: ${err.message || err}` });
  }
});

/**
 * POST /api/users/hash-all-passwords (Admin Only)
 * Batch hashes all plaintext passwords in MySQL database
 */
router.post('/hash-all-passwords', ...adminGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const result = await SyncRepository.hashAllLegacyPasswords(pool);
    res.json({
      success: true,
      message: `تعداد ${result.updated} رمز عبور غیرهش‌شده از مجموع ${result.total} کاربر با موفقیت به هش امن bcrypt تبدیل شدند.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در هش‌سازی همگانی رمزهای عبور: ${err.message || err}`,
    });
  }
});

/**
 * POST /api/users/pre-register (Public)
 */
router.post('/pre-register', validateRequestBody(['nationalId', 'fullName', 'phone']), async (req, res, next) => {
  try {
    const pr = req.body;
    const pool = getMySqlPool();
    const id = pr.id || `prereg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await pool.query(
      `INSERT INTO pre_registrations (
        id, firstName, lastName, fullName, fatherName, shenasnamehNo, nationalId, birthDate, gender,
        isUnder18, phone, emergencyContactName, emergencyContactRelation, emergencyContactPhone,
        bloodType, shoeSize, clothingSize, address, medicalConditions, educationOrJob, referrerName,
        referrerPhone, climbingExperienceLevel, insuranceNumber, parentFullName, parentNationalId,
        parentPhone, avatarUrl, status, rejectionReason, assignedRoles, createdUserId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        status=VALUES(status), rejectionReason=VALUES(rejectionReason);`,
      [
        id,
        pr.firstName || '',
        pr.lastName || '',
        pr.fullName || `${pr.firstName || ''} ${pr.lastName || ''}`.trim() || 'پیش‌ثبت‌نام',
        pr.fatherName || '',
        pr.shenasnamehNo || '',
        pr.nationalId || '',
        pr.birthDate || '',
        pr.gender || '',
        pr.isUnder18 ? 1 : 0,
        pr.phone || '',
        pr.emergencyContactName || '',
        pr.emergencyContactRelation || '',
        pr.emergencyContactPhone || '',
        pr.bloodType || '',
        pr.shoeSize || '',
        pr.clothingSize || '',
        pr.address || '',
        pr.medicalConditions || '',
        pr.educationOrJob || '',
        pr.referrerName || '',
        pr.referrerPhone || '',
        pr.climbingExperienceLevel || '',
        pr.insuranceNumber || '',
        pr.parentFullName || '',
        pr.parentNationalId || '',
        pr.parentPhone || '',
        pr.avatarUrl || '',
        pr.status || 'pending',
        pr.rejectionReason || '',
        JSON.stringify(pr.assignedRoles || ['athlete']),
        pr.createdUserId || '',
        pr.createdAt || new Date().toISOString(),
      ]
    );

    res.status(201).json({ success: true, message: 'درخواست پیش‌ثبت‌نام با موفقیت ثبت شد.', id });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در ثبت پیش‌ثبت‌نام: ${err.message || err}`,
    });
  }
});

export default router;
