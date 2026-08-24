import { Router } from 'express';
import { getMySqlPool } from '../db';
import { validateRequestBody, authenticateJwt, requireRoles } from '../middleware';

const router = Router();

/**
 * GET /api/courses
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM courses ORDER BY id DESC');
    const courses = (rows || []).map((c: any) => ({
      ...c,
      daysOfWeek: typeof c.daysOfWeek === 'string' ? JSON.parse(c.daysOfWeek) : c.daysOfWeek,
      isActive: Boolean(c.isActive),
    }));
    res.json({ success: true, dbConnected: true, courses });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      dbConnected: false,
      error: `خطا در دریافت لیست کلاس‌ها: ${err.message || err}`,
    });
  }
});

/**
 * POST /api/courses
 */
router.post('/', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary']), validateRequestBody(['title']), async (req, res, next) => {
  try {
    const c = req.body;
    const pool = getMySqlPool();
    const id = c.id || `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await pool.query(
      `INSERT INTO courses (id, title, sportType, coachId, coachName, daysOfWeek, startTime, endTime, capacity, monthlyFee, isActive, description, startDate, endDate, registrationDeadline, level, locationRoom, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         title=VALUES(title), sportType=VALUES(sportType), coachId=VALUES(coachId), coachName=VALUES(coachName), 
         daysOfWeek=VALUES(daysOfWeek), startTime=VALUES(startTime), endTime=VALUES(endTime), capacity=VALUES(capacity), 
         monthlyFee=VALUES(monthlyFee), isActive=VALUES(isActive), description=VALUES(description), startDate=VALUES(startDate), 
         endDate=VALUES(endDate), registrationDeadline=VALUES(registrationDeadline), level=VALUES(level), locationRoom=VALUES(locationRoom);`,
      [
        id,
        c.title,
        c.sportType || c.category || '',
        c.coachId || '',
        c.coachName || '',
        JSON.stringify(c.daysOfWeek || []),
        c.startTime || '',
        c.endTime || '',
        c.capacity || c.maxCapacity || 20,
        c.monthlyFee || 0,
        c.isActive !== false ? 1 : 0,
        c.description || '',
        c.startDate || '',
        c.endDate || '',
        c.registrationDeadline || '',
        c.level || '',
        c.locationRoom || '',
        c.createdAt || new Date().toISOString(),
      ]
    );

    res.status(201).json({ success: true, message: 'کلاس با موفقیت ثبت شد.', id });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در ذخیره سانس آموزشی: ${err.message || err}`,
    });
  }
});

/**
 * DELETE /api/courses/:id
 */
router.delete('/:id', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary']), async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'سانس با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در حذف سانس: ${err.message || err}` });
  }
});

/**
 * DELETE /api/courses/attendance/:id
 */
router.delete('/attendance/:id', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'coach']), async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('DELETE FROM attendance_records WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'رکورد حضور و غیاب با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در حذف حضور و غیاب: ${err.message || err}` });
  }
});

/**
 * GET /api/enrollments
 */
router.get('/enrollments/list', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'accountant', 'coach']), async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM enrollments ORDER BY id DESC');
    res.json({ success: true, enrollments: rows || [] });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `خطا در دریافت لیست ثبت‌نام‌ها: ${err.message || err}`,
    });
  }
});

export default router;
