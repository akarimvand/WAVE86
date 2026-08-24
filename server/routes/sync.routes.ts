import { Router } from 'express';
import { getMySqlPool, withTransaction, getClubSettings, loadSavedConfig } from '../db';
import { SyncRepository } from '../repository';
import { convertBase64ToLocalFile } from './upload.routes';
import { authenticateJwt, requireRoles, optionalJwt } from '../middleware';

const router = Router();

/**
 * POST /api/mysql/sync
 * Atomic batch synchronization from the frontend store into MySQL (single source of truth).
 */
router.post('/sync', authenticateJwt, async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'داده‌های همگام‌سازی نامعتبر است.' });
  }

  try {
    const pool = getMySqlPool();
    await withTransaction(pool, async (conn) => {
      if (data.roles) await SyncRepository.syncRoles(conn, data.roles);
      if (data.users) await SyncRepository.syncUsers(conn, data.users, convertBase64ToLocalFile);
      if (data.links) await SyncRepository.syncLinks(conn, data.links);
      if (data.preRegistrations) await SyncRepository.syncPreRegistrations(conn, data.preRegistrations, convertBase64ToLocalFile);
      if (data.clubSettings) await SyncRepository.syncClubSettings(conn, data.clubSettings);
      if (data.announcements) await SyncRepository.syncAnnouncements(conn, data.announcements);
      if (data.sessions || data.courses) await SyncRepository.syncCourses(conn, data.sessions || data.courses);
      if (data.enrollments) await SyncRepository.syncEnrollments(conn, data.enrollments, convertBase64ToLocalFile);
      if (data.transactions) await SyncRepository.syncTransactions(conn, data.transactions, convertBase64ToLocalFile);
      if (data.attendanceRecords) await SyncRepository.syncAttendanceRecords(conn, data.attendanceRecords);
      if (data.debtors) await SyncRepository.syncDebtors(conn, data.debtors);
      if (data.creditors) await SyncRepository.syncCreditors(conn, data.creditors);
      if (data.insuranceRequests) await SyncRepository.syncInsuranceRequests(conn, data.insuranceRequests, convertBase64ToLocalFile);
      if (data.supportTickets) await SyncRepository.syncSupportTickets(conn, data.supportTickets);
      if (data.notifications) await SyncRepository.syncNotifications(conn, data.notifications);
      if (data.products) await SyncRepository.syncProducts(conn, data.products, convertBase64ToLocalFile);
      if (data.shopInvoices) await SyncRepository.syncShopInvoices(conn, data.shopInvoices);
      if (data.smsLogs) await SyncRepository.syncSmsLogs(conn, data.smsLogs);
      if (data.auditLogs) await SyncRepository.syncAuditLogs(conn, data.auditLogs);
    });

    return res.json({
      success: true,
      dbConnected: true,
      message: 'همگام‌سازی با پایگاه داده MySQL با موفقیت انجام شد.',
    });
  } catch (err: any) {
    console.error('[Sync MySQL Error]', err.message || err);
    return res.status(500).json({
      success: false,
      dbConnected: false,
      error: 'همگام‌سازی با MySQL ناموفق بود؛ هیچ تغییری ذخیره نشد (Rollback کامل). لطفاً خطا را بررسی کنید.',
    });
  }
});

/**
 * POST /api/mysql/sync-detailed
 * Detailed step-by-step diagnostic sync with granular logs for the SyncDiagnosticsModal
 */
router.post('/sync-detailed', authenticateJwt, requireRoles(['super_admin', 'admin']), async (req, res) => {
  const data = req.body || {};
  const config = loadSavedConfig();
  const startTime = Date.now();

  const logs: any[] = [];
  const steps: any[] = [];

  const addLog = (level: 'info' | 'success' | 'warn' | 'error', message: string, table?: string, details?: any) => {
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour12: false }),
      level,
      table,
      message,
      details,
    });
  };

  addLog('info', '🚀 شروع فرآیند همگام‌سازی و تحلیل خط‌به‌خط...');
  addLog('info', `📡 تلاش برای اتصال به پایگاه داده ${config.database} بر روی ${config.host}:${config.port}...`);

  let dbConnected = false;
  let pool: any = null;

  try {
    pool = getMySqlPool();
    const [testRows]: any = await pool.query('SELECT 1 as ping');
    if (testRows && testRows.length > 0) {
      dbConnected = true;
      addLog('success', '✅ ارتباط با سرور MySQL با موفقیت برقرار شد.');
    }
  } catch (connErr: any) {
    addLog('error', `❌ خطا در برقراری اتصال به MySQL: ${connErr.message || connErr}`);
    addLog('error', '❌ دیتابیس MySQL در دسترس نیست؛ داده‌ها ذخیره نمی‌شوند.');
    return res.status(503).json({
      success: false,
      dbConnected: false,
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
      },
      steps: [],
      logs,
      summary: {
        totalTables: 0,
        successTables: 0,
        failedTables: 0,
        durationMs: Date.now() - startTime,
      },
    });
  }

  // Execute sync on each collection individually to catch detailed table-by-table feedback
  const syncEntities: {
    key: string;
    table: string;
    title: string;
    items: any[];
    syncFn: (conn: any, items: any) => Promise<any>;
  }[] = [
    { key: 'roles', table: 'roles', title: 'نقش‌ها و دسترسی‌های سیستم', items: data.roles || [], syncFn: (c, items) => SyncRepository.syncRoles(c, items) },
    { key: 'users', table: 'users', title: 'کاربران و اعضای باشگاه', items: data.users || [], syncFn: (c, items) => SyncRepository.syncUsers(c, items, convertBase64ToLocalFile) },
    { key: 'links', table: 'parent_athlete_links', title: 'پیوند والد و فرزند', items: data.links || [], syncFn: (c, items) => SyncRepository.syncLinks(c, items) },
    { key: 'preRegistrations', table: 'pre_registrations', title: 'پیش‌ثبت‌نام‌ها', items: data.preRegistrations || [], syncFn: (c, items) => SyncRepository.syncPreRegistrations(c, items, convertBase64ToLocalFile) },
    { key: 'clubSettings', table: 'club_settings', title: 'تنظیمات و هویت باشگاه', items: data.clubSettings ? [data.clubSettings] : [], syncFn: (c) => SyncRepository.syncClubSettings(c, data.clubSettings) },
    { key: 'announcements', table: 'club_announcements', title: 'اطلاعیه‌ها و بنرها', items: data.announcements || [], syncFn: (c, items) => SyncRepository.syncAnnouncements(c, items) },
    { key: 'sessions', table: 'courses', title: 'دوره‌ها و سانس‌های ورزشی', items: data.sessions || data.courses || [], syncFn: (c, items) => SyncRepository.syncCourses(c, items) },
    { key: 'enrollments', table: 'enrollments', title: 'ثبت‌نام‌های کلاسی', items: data.enrollments || [], syncFn: (c, items) => SyncRepository.syncEnrollments(c, items, convertBase64ToLocalFile) },
    { key: 'transactions', table: 'transactions', title: 'تراکنش‌های مالی', items: data.transactions || [], syncFn: (c, items) => SyncRepository.syncTransactions(c, items, convertBase64ToLocalFile) },
    { key: 'attendanceRecords', table: 'attendance_records', title: 'سوابق حضور و غیاب', items: data.attendanceRecords || [], syncFn: (c, items) => SyncRepository.syncAttendanceRecords(c, items) },
    { key: 'debtors', table: 'debtors', title: 'لیست بدهکاران', items: data.debtors || [], syncFn: (c, items) => SyncRepository.syncDebtors(c, items) },
    { key: 'creditors', table: 'creditors', title: 'لیست بستانکاران', items: data.creditors || [], syncFn: (c, items) => SyncRepository.syncCreditors(c, items) },
    { key: 'insuranceRequests', table: 'insurance_requests', title: 'درخواست‌های بیمه ورزشی', items: data.insuranceRequests || [], syncFn: (c, items) => SyncRepository.syncInsuranceRequests(c, items, convertBase64ToLocalFile) },
    { key: 'supportTickets', table: 'support_tickets', title: 'تیکت‌های پشتیبانی', items: data.supportTickets || [], syncFn: (c, items) => SyncRepository.syncSupportTickets(c, items) },
    { key: 'notifications', table: 'app_notifications', title: 'اعلان‌های درون‌برنامه‌ای', items: data.notifications || [], syncFn: (c, items) => SyncRepository.syncNotifications(c, items) },
    { key: 'products', table: 'products', title: 'محصولات و انبار فروشگاه', items: data.products || [], syncFn: (c, items) => SyncRepository.syncProducts(c, items, convertBase64ToLocalFile) },
    { key: 'shopInvoices', table: 'shop_invoices', title: 'فاکتورهای فروشگاهی', items: data.shopInvoices || [], syncFn: (c, items) => SyncRepository.syncShopInvoices(c, items) },
    { key: 'smsLogs', table: 'sms_logs', title: 'سوابق پیامک‌های ارسالی', items: data.smsLogs || [], syncFn: (c, items) => SyncRepository.syncSmsLogs(c, items) },
    { key: 'auditLogs', table: 'audit_logs', title: 'ردگیری و لاگ سیستم', items: data.auditLogs || [], syncFn: (c, items) => SyncRepository.syncAuditLogs(c, items) },
  ];

  let successCount = 0;
  let failedCount = 0;

  for (const entity of syncEntities) {
    const stepStart = Date.now();
    try {
      const count = Array.isArray(entity.items) ? entity.items.length : 1;
      await withTransaction(pool, async (conn) => {
        await entity.syncFn(conn, entity.items);
      });
      const stepDuration = Date.now() - stepStart;
      successCount++;

      steps.push({
        step: entity.key,
        table: entity.table,
        title: entity.title,
        count,
        status: 'success',
        durationMs: stepDuration,
        message: `${count} رکورد با موفقیت همگام‌سازی شد.`,
      });

      addLog('success', `جدول ${entity.table} (${entity.title}): همگام‌سازی ${count} رکورد در ${stepDuration} میلی‌ثانیه`, entity.table);
    } catch (stepErr: any) {
      failedCount++;
      const stepDuration = Date.now() - stepStart;

      steps.push({
        step: entity.key,
        table: entity.table,
        title: entity.title,
        count: Array.isArray(entity.items) ? entity.items.length : 0,
        status: 'error',
        durationMs: stepDuration,
        message: stepErr.message || 'خطا در ثبت اطلاعات جدول',
        error: stepErr.message || String(stepErr),
      });

      addLog('error', `❌ خطا در جدول ${entity.table}: ${stepErr.message || stepErr}`, entity.table, stepErr);
    }
  }

  const totalDuration = Date.now() - startTime;
  addLog(
    failedCount === 0 ? 'success' : 'warn',
    `🏁 پایان تحلیل و همگام‌سازی: ${successCount} جدول موفق، ${failedCount} جدول ناموفق (زمان کل: ${totalDuration}ms)`
  );

  return res.json({
    success: failedCount === 0,
    dbConnected: true,
    config: {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
    },
    steps,
    logs,
    summary: {
      totalTables: syncEntities.length,
      successTables: successCount,
      failedTables: failedCount,
      durationMs: totalDuration,
    },
  });
});

/**
 * GET /api/mysql/test-tables
 * Returns live status and record counts for all MySQL tables
 */
router.get('/test-tables', authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary']), async (req, res) => {
  const config = loadSavedConfig();
  const tableDefinitions = [
    { name: 'roles', faName: 'نقش‌ها و دسترسی‌ها' },
    { name: 'users', faName: 'کاربران و اعضا' },
    { name: 'parent_athlete_links', faName: 'پیوند والد و فرزند' },
    { name: 'audit_logs', faName: 'لاگ‌های امنیتی' },
    { name: 'pre_registrations', faName: 'پیش‌ثبت‌نام‌ها' },
    { name: 'club_settings', faName: 'تنظیمات باشگاه' },
    { name: 'club_announcements', faName: 'اطلاعیه‌ها' },
    { name: 'courses', faName: 'دوره‌ها و سانس‌ها' },
    { name: 'enrollments', faName: 'ثبت‌نام‌ها' },
    { name: 'transactions', faName: 'تراکنش‌های مالی' },
    { name: 'attendance_records', faName: 'حضور و غیاب' },
    { name: 'debtors', faName: 'بدهکاران' },
    { name: 'creditors', faName: 'بستانکاران' },
    { name: 'insurance_requests', faName: 'بیمه ورزشی' },
    { name: 'support_tickets', faName: 'تیکت‌های پشتیبانی' },
    { name: 'app_notifications', faName: 'اعلان‌ها' },
    { name: 'products', faName: 'محصولات و کالاها' },
    { name: 'shop_invoices', faName: 'فاکتورهای فروشگاه' },
    { name: 'shop_invoice_items', faName: 'آیتم‌های فاکتور' },
    { name: 'sms_logs', faName: 'لاگ پیامک‌ها' },
  ];

  try {
    const pool = getMySqlPool();
    const [existingRows]: any = await pool.query('SHOW TABLES');
    const existingTableNames = new Set(
      (existingRows || []).map((r: any) => Object.values(r)[0])
    );

    let totalRecords = 0;
    const tables = await Promise.all(
      tableDefinitions.map(async (def) => {
        const exists = existingTableNames.has(def.name);
        if (!exists) {
          return {
            name: def.name,
            faName: def.faName,
            exists: false,
            count: 0,
            status: 'جدول در دیتابیس موجود نیست',
          };
        }

        try {
          const [countResult]: any = await pool.query(`SELECT COUNT(*) as cnt FROM \`${def.name}\``);
          const count = countResult?.[0]?.cnt || 0;
          totalRecords += Number(count);
          return {
            name: def.name,
            faName: def.faName,
            exists: true,
            count: Number(count),
            status: 'فعال و در دسترس',
          };
        } catch (e: any) {
          return {
            name: def.name,
            faName: def.faName,
            exists: true,
            count: 0,
            status: 'خطا در شمارش رکوردها',
            error: e.message || String(e),
          };
        }
      })
    );

    return res.json({
      connected: true,
      message: 'اتصال زنده به پایگاه داده با موفقیت برقرار شد.',
      host: config.host,
      user: config.user,
      databaseName: config.database,
      tables,
      totalRecords,
    });
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      message: `عدم امکان برقراری ارتباط با MySQL: ${err.message || err}`,
      host: config.host,
      user: config.user,
      databaseName: config.database,
      tables: tableDefinitions.map((d) => ({
        name: d.name,
        faName: d.faName,
        exists: false,
        count: 0,
        status: 'عدم ارتباط با دیتابیس',
      })),
      totalRecords: 0,
    });
  }
});

/**
 * GET /api/mysql/full-data
 * Returns the entire synced state from MySQL
 */
router.get('/full-data', optionalJwt, async (req, res) => {
  try {
    const pool = getMySqlPool();

    const [
      [roles],
      [users],
      [links],
      [preRegs],
      [settingsRows],
      [announcements],
      [courses],
      [enrollments],
      [transactions],
      [attendance],
      [debtors],
      [creditors],
      [insuranceRequests],
      [tickets],
      [notifications],
      [products],
      [invoices],
      [smsLogs],
    ]: any[] = await Promise.all([
      pool.query('SELECT * FROM roles'),
      pool.query('SELECT * FROM users'),
      pool.query('SELECT * FROM parent_athlete_links'),
      pool.query('SELECT * FROM pre_registrations'),
      pool.query('SELECT * FROM club_settings WHERE id = "1" LIMIT 1'),
      pool.query('SELECT * FROM club_announcements'),
      pool.query('SELECT * FROM courses'),
      pool.query('SELECT * FROM enrollments'),
      pool.query('SELECT * FROM transactions'),
      pool.query('SELECT * FROM attendance_records'),
      pool.query('SELECT * FROM debtors'),
      pool.query('SELECT * FROM creditors'),
      pool.query('SELECT * FROM insurance_requests'),
      pool.query('SELECT * FROM support_tickets'),
      pool.query('SELECT * FROM app_notifications'),
      pool.query('SELECT * FROM products'),
      pool.query('SELECT * FROM shop_invoices'),
      pool.query('SELECT * FROM sms_logs'),
    ]);

    // Parse JSON columns and strip passwords
    const parsedUsers = (users || []).map((u: any) => {
      const { password, ...safeUser } = u;
      return {
        ...safeUser,
        roles: typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles,
        isActive: Boolean(u.isActive),
        isInsuranceValid: Boolean(u.isInsuranceValid),
      };
    });

    const parsedPreRegs = (preRegs || []).map((p: any) => ({
      ...p,
      assignedRoles: typeof p.assignedRoles === 'string' ? JSON.parse(p.assignedRoles) : p.assignedRoles,
      isUnder18: Boolean(p.isUnder18),
    }));

    const parsedCourses = (courses || []).map((c: any) => ({
      ...c,
      daysOfWeek: typeof c.daysOfWeek === 'string' ? JSON.parse(c.daysOfWeek) : c.daysOfWeek,
      isActive: Boolean(c.isActive),
    }));

    const parsedTickets = (tickets || []).map((t: any) => ({
      ...t,
      messages: typeof t.messages === 'string' ? JSON.parse(t.messages) : t.messages,
      hasUnreadAdminMessage: Boolean(t.hasUnreadAdminMessage),
      hasUnreadUserMessage: Boolean(t.hasUnreadUserMessage),
    }));

    const parsedInvoices = (invoices || []).map((inv: any) => ({
      ...inv,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
    }));

    const parsedSmsLogs = (smsLogs || []).map((l: any) => ({
      ...l,
      recipients: typeof l.recipients === 'string' ? JSON.parse(l.recipients) : l.recipients,
      recipientNames: typeof l.recipientNames === 'string' ? JSON.parse(l.recipientNames) : l.recipientNames,
      messageIds: typeof l.messageIds === 'string' ? JSON.parse(l.messageIds) : l.messageIds,
    }));

    let clubSettings = getClubSettings();
    if (settingsRows && settingsRows.length > 0) {
      const s = settingsRows[0];
      const extra = s.settings_json ? (typeof s.settings_json === 'string' ? JSON.parse(s.settings_json) : s.settings_json) : {};
      clubSettings = {
        ...clubSettings,
        ...extra,
        name: s.name || clubSettings.name,
        slogan: s.slogan || clubSettings.slogan,
        logoIcon: s.logo_Icon || s.logo_icon || s.logoIcon || 'mountain',
        themePalette: s.theme_Palette || s.theme_palette || s.themePalette || 'teal',
        smsApiKey: s.smsApiKey || clubSettings.smsApiKey,
        smsLineNumber: s.smsLineNumber || clubSettings.smsLineNumber,
        smsSignature: s.smsSignature || clubSettings.smsSignature,
        baleBotToken: s.baleBotToken || clubSettings.baleBotToken,
        baleChannelOrChatId: s.baleChannelOrChatId || clubSettings.baleChannelOrChatId,
      };
    }

    const parsedEnrollments = (enrollments || []).map((e: any) => ({
      ...e,
      startDate: e.startDate || e.enrolledAt || '',
      endDate: e.endDate || e.expireDate || '',
      totalSessionsAllowed: Number(e.totalSessionsAllowed) || 12,
      usedSessionsCount: Number(e.usedSessionsCount) || 0,
    }));

    const responseData = {
      roles: roles || [],
      users: parsedUsers,
      links: links || [],
      preRegistrations: parsedPreRegs,
      clubSettings,
      announcements: announcements || [],
      sessions: parsedCourses,
      enrollments: parsedEnrollments,
      transactions: transactions || [],
      attendanceRecords: attendance || [],
      debtors: debtors || [],
      creditors: creditors || [],
      insuranceRequests: insuranceRequests || [],
      supportTickets: parsedTickets,
      notifications: notifications || [],
      products: products || [],
      shopInvoices: parsedInvoices,
      smsLogs: parsedSmsLogs,
    };

    const isPrivileged =
      !!req.user &&
      (req.user.roles || []).some((r) =>
        ['super_admin', 'admin', 'secretary', 'accountant', 'coach'].includes(r)
      );

    // PII minimization (Phase 5): never send sensitive data to non-privileged clients.
    const SENSITIVE = [
      'nationalId', 'phone', 'emergencyContactName', 'emergencyContactPhone', 'address',
      'medicalConditions', 'insuranceNumber', 'insuranceExpiryDate', 'baleChatId',
      'discountPercent', 'debtAmount', 'creditAmount', 'allowCreditPurchase',
    ];

    if (!isPrivileged) {
      const stripSensitive = (row: any) => {
        const out: any = { ...row };
        SENSITIVE.forEach((f) => { delete out[f]; });
        return out;
      };

      if (req.user) {
        const myId = (req.user as any).id;
        responseData.users = ((responseData.users as any[]) || []).map((u: any) =>
          u && u.id === myId ? u : stripSensitive(u)
        );
        responseData.preRegistrations = ((responseData.preRegistrations as any[]) || []).map(stripSensitive);
        responseData.transactions = ((responseData.transactions as any[]) || []).filter((t: any) => t.userId === myId);
        responseData.insuranceRequests = ((responseData.insuranceRequests as any[]) || []).filter((i: any) => i.userId === myId);
        responseData.shopInvoices = ((responseData.shopInvoices as any[]) || []).filter((i: any) => i.athleteId === myId);
        responseData.debtors = ((responseData.debtors as any[]) || []).filter((d: any) => d.userId === myId);
        responseData.creditors = [];
      } else {
        // Fully anonymous visitor (pre-login public pages): strip all users' PII & financial data
        responseData.users = ((responseData.users as any[]) || []).map(stripSensitive);
        responseData.preRegistrations = ((responseData.preRegistrations as any[]) || []).map(stripSensitive);
        responseData.transactions = [];
        responseData.debtors = [];
        responseData.creditors = [];
        responseData.insuranceRequests = [];
        responseData.shopInvoices = [];
      }
    }

    return res.json({
      success: true,
      dbConnected: true,
      data: responseData,
    });
  } catch (err: any) {
    console.error('[Full Data MySQL Error]', err.message || err);
    return res.status(503).json({
      success: false,
      dbConnected: false,
      error: `خطا در دریافت داده‌ها از MySQL: ${err.message || err}`,
    });
  }
});

export default router;
