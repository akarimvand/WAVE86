import { Router } from 'express';
import { getMySqlPool } from '../db';
import { validateRequestBody, authenticateJwt, requireRoles, AuthenticatedRequest } from '../middleware';

const router = Router();
const staffGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary'])];
const coachGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'coach'])];

/**
 * GET /api/club/announcements
 */
router.get('/announcements', async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM club_announcements ORDER BY id DESC');
    res.json({ success: true, announcements: rows || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت اطلاعیه‌ها: ${err.message || err}` });
  }
});

/**
 * GET /api/club/notifications
 */
router.get('/notifications', authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const pool = getMySqlPool();
    const userId = req.user?.id || (req.query.userId as string);
    const userRole = req.user?.activeRole || (req.user?.roles && req.user.roles[0]) || (req.query.userRole as string) || 'athlete';
    const isAdminOrStaff = ['super_admin', 'admin', 'secretary', 'accountant'].includes(userRole);

    let query = '';
    let params: any[] = [];

    if (isAdminOrStaff) {
      query = 'SELECT * FROM app_notifications WHERE userId = ? OR targetAudience IN ("all", "admin", "staff", ?) ORDER BY id DESC LIMIT 100';
      params = [userId, userRole || 'admin'];
    } else if (userRole === 'coach') {
      query = 'SELECT * FROM app_notifications WHERE userId = ? OR targetAudience IN ("all", "coach", "coaches") ORDER BY id DESC LIMIT 100';
      params = [userId];
    } else if (userRole === 'parent') {
      query = 'SELECT * FROM app_notifications WHERE userId = ? OR targetAudience IN ("all", "parent", "parents") ORDER BY id DESC LIMIT 100';
      params = [userId];
    } else {
      // Regular athlete / member
      query = 'SELECT * FROM app_notifications WHERE userId = ? OR (targetAudience IN ("all", "athlete", "athletes") AND title NOT LIKE "%انقضای خودکار%" AND title NOT LIKE "%فیش واریزی%" AND title NOT LIKE "%پیش‌ثبت‌نام%") ORDER BY id DESC LIMIT 100';
      params = [userId];
    }

    const [rows]: any = await pool.query(query, params);
    const notifs = (rows || []).map((n: any) => ({
      ...n,
      isRead: Boolean(n.isRead),
    }));
    res.json({ success: true, notifications: notifs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت اعلان‌ها: ${err.message || err}` });
  }
});

/**
 * PUT /api/club/notifications/:id/read
 */
router.put('/notifications/:id/read', authenticateJwt, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    await pool.query('UPDATE app_notifications SET isRead = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'اعلان به عنوان خوانده شده علامت‌گذاری شد.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در علامت‌گذاری اعلان: ${err.message || err}` });
  }
});

/**
 * GET /api/club/tickets
 */
router.get('/tickets', authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const pool = getMySqlPool();
    const currentUser = req.user;
    const isStaff = currentUser?.roles?.some((r: string) => ['super_admin', 'admin', 'secretary'].includes(r));

    let query = 'SELECT * FROM support_tickets';
    const params: any[] = [];

    if (!isStaff) {
      query += ' WHERE userId = ?';
      params.push(currentUser?.id);
    }
    query += ' ORDER BY id DESC';

    const [rows]: any = await pool.query(query, params);
    const tickets = (rows || []).map((t: any) => ({
      ...t,
      messages: typeof t.messages === 'string' ? JSON.parse(t.messages) : t.messages,
      hasUnreadAdminMessage: Boolean(t.hasUnreadAdminMessage),
      hasUnreadUserMessage: Boolean(t.hasUnreadUserMessage),
    }));
    res.json({ success: true, tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت تیکت‌ها: ${err.message || err}` });
  }
});

/**
 * GET /api/club/insurance
 */
router.get('/insurance', ...staffGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query('SELECT * FROM insurance_requests ORDER BY id DESC');
    res.json({ success: true, insuranceRequests: rows || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت بیمه‌ها: ${err.message || err}` });
  }
});

/**
 * GET /api/club/attendance
 */
router.get('/attendance', ...coachGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const sessionId = req.query.sessionId as string;
    let query = 'SELECT * FROM attendance_records';
    const params: any[] = [];

    if (sessionId) {
      query += ' WHERE sessionId = ?';
      params.push(sessionId);
    }
    query += ' ORDER BY id DESC LIMIT 500';

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, attendanceRecords: rows || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت سوابق حضورغیاب: ${err.message || err}` });
  }
});

export default router;
