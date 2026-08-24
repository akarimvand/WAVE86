import { Router } from 'express';
import { getMySqlPool, withTransaction } from '../db';
import { SyncRepository } from '../repository';
import { writeAudit, getRequestInfo } from '../audit';
import { validateRequestBody, authenticateJwt, requireRoles, AuthenticatedRequest } from '../middleware';

const router = Router();
const staffGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'coach'])];
const enrollAdminGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary'])];

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
 * GET /api/enrollments/list
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

/**
 * POST /api/courses/enrollments
 * Independent CRUD endpoint (no full-state sync needed).
 * Capacity + duplicate-active checks run INSIDE a transaction with a row lock
 * (SELECT ... FOR UPDATE) so two concurrent secretaries cannot overbook a session.
 */
router.post('/enrollments', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary']), validateRequestBody(['sessionId', 'userId']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId, userId } = req.body;
    const pool = getMySqlPool();

    const enrollment = await withTransaction(pool, async (conn) => {
      // Lock the course row to serialize concurrent enrollments on this session
      const [courseRows]: any = await conn.query('SELECT * FROM courses WHERE id = ? FOR UPDATE', [sessionId]);
      const course = courseRows && courseRows[0];
      if (!course) {
        const err: any = new Error('سانس مورد نظر یافت نشد.');
        err.status = 404;
        throw err;
      }

      const [userRows]: any = await conn.query('SELECT * FROM users WHERE id = ?', [userId]);
      const user = userRows && userRows[0];
      if (!user) {
        const err: any = new Error('کاربر مورد نظر یافت نشد.');
        err.status = 404;
        throw err;
      }

      const [dupRows]: any = await conn.query(
        "SELECT id FROM enrollments WHERE sessionId = ? AND userId = ? AND status = 'active' LIMIT 1",
        [sessionId, userId]
      );
      if (dupRows && dupRows.length > 0) {
        const err: any = new Error('این ورزشکار در حال حاضر در این سانس ثبت‌نام فعال دارد.');
        err.status = 409;
        throw err;
      }

      const [cntRows]: any = await conn.query(
        "SELECT COUNT(*) AS cnt FROM enrollments WHERE sessionId = ? AND status = 'active'",
        [sessionId]
      );
      const activeCount = Number(cntRows?.[0]?.cnt ?? 0);
      const capacity = Number(course.capacity) || 0;
      if (capacity > 0 && activeCount >= capacity) {
        const err: any = new Error('ظرفیت این سانس تکمیل شده است.');
        err.status = 422;
        throw err;
      }

      const nowIso = new Date().toISOString();
      // Honor the client-generated id when provided so the optimistic local
      // record and the server row share ONE identity. Previously the server
      // generated a fresh id here while the follow-up full-state sync re-inserted
      // the local row under its own id → the SAME athlete appeared TWICE in the
      // course (two rows, same sessionId+userId).
      const clientEnrollmentId =
        typeof req.body.id === 'string' && req.body.id.trim() !== ''
          ? req.body.id.trim()
          : null;
      const [idClash]: any = await conn.query('SELECT id FROM enrollments WHERE id = ?', [
        clientEnrollmentId,
      ]);
      const enrollmentId =
        clientEnrollmentId && (!idClash || idClash.length === 0)
          ? clientEnrollmentId
          : `enr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const enr = {
        id: enrollmentId,
        sessionId,
        userId,
        athleteName: user.fullName || '',
        athletePhone: user.phone || '',
        athleteNationalId: user.nationalId || '',
        status: 'active',
        paymentStatus: 'pending',
        paymentMethod: String(req.body.paymentMethod || 'pos'),
        enrolledAt: nowIso,
        startDate: nowIso,
        endDate: '',
        expireDate: '',
        totalSessionsAllowed: Number(course.sessionsLimit) || 12,
        usedSessionsCount: 0,
        priceAtEnrollment: Number(course.monthlyFee) || 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await SyncRepository.syncEnrollments(conn, [enr], (url: string) => url);
      return enr;
    });

    // Server-side audit trail (Phase 5)
    await writeAudit(pool, {
      userId: req.user?.id,
      userName: req.user?.username || req.user?.fullName,
      action: 'ثبت‌نام سانس',
      entity: 'Enrollment',
      entityId: enrollment.id,
      details: `ثبت‌نام ${enrollment.athleteName} در سانس ${sessionId}`,
      newValue: { sessionId, userId, status: enrollment.status },
      ...getRequestInfo(req),
    });

    res.status(201).json({ success: true, message: 'ثبت‌نام با موفقیت انجام شد.', enrollment });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: `خطا در ثبت‌نام: ${err.message || err}` });
  }
});

/**
 * DELETE /api/courses/enrollments/:id  — soft cancel (never hard delete)
 */
router.delete('/enrollments/:id', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary']), async (req: AuthenticatedRequest, res, next) => {
  const targetId = req.params.id;
  const hard = String(req.query.mode || '').toLowerCase() === 'hard';
  try {
    const pool = getMySqlPool();
    const nowIso = new Date().toISOString();

    if (!hard) {
      // Soft cancel — default
      await pool.query(
        "UPDATE enrollments SET status = 'canceled', updatedAt = ? WHERE id = ? AND status != 'canceled'",
        [nowIso, targetId]
      );
      await writeAudit(pool, {
        userId: req.user?.id,
        userName: req.user?.username || req.user?.fullName,
        action: 'لغو ثبت‌نام سانس',
        entity: 'Enrollment',
        entityId: targetId,
        details: 'لغو ثبت‌نام توسط مدیریت',
        newValue: { status: 'canceled' },
        ...getRequestInfo(req),
      });
      return res.json({ success: true, message: 'ثبت‌نام با موفقیت لغو شد.', mode: 'cancel' });
    }

    // HARD delete with cascading cleanup inside ONE transaction:
    //   attendance of this athlete in this session
    //   + pending tuition debtors & transactions tied to the session title
    //     (financial tx are SOFT-VOIDED, never hard-deleted — mission rule #13)
    //   + the enrollment row itself
    await withTransaction(pool, async (conn) => {
      const [enrRows]: any = await conn.query('SELECT * FROM enrollments WHERE id = ?', [targetId]);
      const enr = enrRows?.[0];
      if (!enr) {
        const err: any = new Error('ثبت‌نام یافت نشد.');
        err.status = 404;
        throw err;
      }

      const [sRows]: any = await conn.query('SELECT title FROM courses WHERE id = ?', [enr.sessionId]);
      const sessionTitle = sRows?.[0]?.title || '';

      await conn.query(
        'DELETE FROM attendance_records WHERE userId = ? AND sessionId = ?',
        [enr.userId, enr.sessionId]
      );

      if (sessionTitle) {
        await conn.query(
          "DELETE FROM debtors WHERE userId = ? AND category = 'tuition' AND categoryTitle LIKE ?",
          [enr.userId, `%${sessionTitle}%`]
        );
        await conn.query(
          "UPDATE transactions SET status='cancelled', voidedAt=?, voidedBy=?, voidReason='حذف ثبت‌نام سانس' WHERE userId = ? AND type = 'tuition' AND status <> 'cancelled' AND description LIKE ?",
          [nowIso, req.user?.username || 'مدیر', enr.userId, `%${sessionTitle}%`]
        );
      }

      await conn.query('DELETE FROM enrollments WHERE id = ?', [targetId]);

      await writeAudit(conn, {
        userId: req.user?.id,
        userName: req.user?.username || req.user?.fullName,
        action: 'حذف کامل ثبت‌نام',
        entity: 'Enrollment',
        entityId: targetId,
        details: `حذف کامل ثبت‌نام ${enr.athleteName} همراه سوابق حضور و اقساط مرتبط`,
        oldValue: enr,
        ...getRequestInfo(req),
      });
    });

    res.json({ success: true, message: 'ثبت‌نام و سوابق مرتبط به‌طور کامل حذف شد.', mode: 'hard' });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: `خطا در حذف ثبت‌نام: ${err.message || err}` });
  }
});

/**
 * POST /api/courses/attendance/batch
 * Atomic upsert of multiple attendance records for one session/date.
 */
router.post('/attendance/batch', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'coach']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId, date, records } = req.body;
    if (!sessionId || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'شناسه سانس، تاریخ و لیست رکوردها الزامی هستند.' });
    }

    const actor = req.user?.username || req.user?.fullName || 'سیستم';
    const nowIso = new Date().toISOString();
    const pool = getMySqlPool();

    // Idempotent upsert (Phase 3): resolve the EXISTING record id per
    // (sessionId, date, userId). Retrying a save — or saving twice — UPDATES
    // the same row instead of creating duplicates.
    const prepared: any[] = [];
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      let recordId = rec.id;
      if (!recordId) {
        const [exRows]: any = await pool.query(
          'SELECT id FROM attendance_records WHERE sessionId = ? AND date = ? AND userId = ? LIMIT 1',
          [sessionId, date, rec.userId]
        );
        recordId = exRows?.[0]?.id || `att-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      }
      prepared.push({
        id: recordId,
        sessionId,
        date,
        userId: rec.userId,
        userName: rec.userName || '',
        status: rec.status,
        reason: rec.reason || '',
        checkInTime: rec.checkInTime || '',
        checkOutTime: rec.checkOutTime || '',
        recordedBy: actor,
        recordedAt: rec.recordedAt || nowIso,
      });
    }

    await withTransaction(pool, async (conn) => {
      await SyncRepository.syncAttendanceRecords(conn, prepared);
    });

    res.json({ success: true, message: `حضور و غیاب ${prepared.length} نفر ثبت شد.`, records: prepared });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در ثبت حضور و غیاب: ${err.message || err}` });
  }
});

/**
 * POST /api/courses/enrollments/dedupe  (Admin)
 * Removes duplicate ACTIVE enrollment rows for the same (sessionId,userId).
 * Legacy data created before the FOR-UPDATE guard may contain doubles; these
 * make a deleted athlete "reappear" while its twin row still exists.
 */
router.post('/enrollments/dedupe', ...enrollAdminGuard, async (req, res, next) => {
  try {
    const pool = getMySqlPool();
    const [rows]: any = await pool.query(
      "SELECT id, sessionId, userId, createdAt FROM enrollments WHERE status = 'active' ORDER BY createdAt ASC, id ASC"
    );
    const seen = new Map<string, string>();
    const dupIds: string[] = [];
    for (const r of rows || []) {
      const key = `${r.sessionId}|${r.userId}`;
      if (seen.has(key)) dupIds.push(r.id);
      else seen.set(key, r.id);
    }
    let removed = 0;
    if (dupIds.length > 0) {
      const placeholders = dupIds.map(() => '?').join(', ');
      await pool.query(`DELETE FROM enrollments WHERE id IN (${placeholders})`, dupIds);
      removed = dupIds.length;
    }
    res.json({ success: true, message: `${removed} رکورد تکراری حذف شد.`, removed, activeKept: seen.size });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در پاکسازی تکراری‌ها: ${err.message || err}` });
  }
});

export default router;
