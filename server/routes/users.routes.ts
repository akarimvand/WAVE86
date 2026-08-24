import { Router } from 'express';
import { getMySqlPool, hashPassword } from '../db';
import { SyncRepository } from '../repository';
import { validateRequestBody, authenticateJwt, optionalJwt, requireRoles, AuthenticatedRequest } from '../middleware';

const router = Router();
const staffGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'coach', 'accountant'])];
const adminGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary'])];

/**
 * GET /api/users (Staff Only)
 */
router.get('/', ...staffGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM users ORDER BY id DESC');
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
router.put('/:id', optionalJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetId = req.params.id;
    const currentUser = req.user;
    const isStaff = !currentUser || currentUser?.roles?.some((r: string) => ['super_admin', 'admin', 'secretary'].includes(r));

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

    // Update MySQL database only (single source of truth)
    const pool = getMySqlPool();
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
 * PATCH /api/users/:id
 */
router.patch('/:id', optionalJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetId = req.params.id;
    const currentUser = req.user;
    const isStaff = !currentUser || currentUser?.roles?.some((r: string) => ['super_admin', 'admin', 'secretary'].includes(r));

    if (currentUser && !isStaff && currentUser?.id !== targetId) {
      return res.status(403).json({ success: false, error: 'شما دسترسی به ویرایش اطلاعات این کاربر را ندارید.' });
    }

    const u = { ...req.body, id: targetId };
    if (!isStaff && currentUser?.id === targetId) {
      delete u.roles;
      delete u.activeRole;
      delete u.debtAmount;
      delete u.discountPercent;
    }
    if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
      u.password = await hashPassword(u.password);
    }

    // Update MySQL database only (single source of truth)
    const pool = getMySqlPool();
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
router.delete('/:id', ...adminGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await SyncRepository.deleteUser(pool, req.params.id);
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
