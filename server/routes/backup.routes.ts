import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getMySqlPool, withTransaction } from '../db';
import { SyncRepository } from '../repository';
import { convertBase64ToLocalFile } from './upload.routes';
import { authenticateJwt, requireRoles } from '../middleware';

const router = Router();
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const adminGuard = [authenticateJwt, requireRoles(['super_admin', 'admin'])];

function handleSaveBackup(req: any, res: any) {
  try {
    const rawData = req.body.data || req.body.backupData || req.body;
    const { filename, tag, title } = req.body;
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const safeTag = (tag || title || 'manual').replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
    const actualFilename = filename || `moj_climbing_backup_${safeTag}_${dateStr}.json`;
    const filePath = path.join(BACKUP_DIR, actualFilename);

    const payload = {
      backupDate: now.toISOString(),
      backupTag: safeTag,
      version: '2.0.0',
      data: rawData,
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      message: 'پشتیبان با موفقیت بر روی هاست ذخیره گردید.',
      filename: actualFilename,
      size: stats.size,
      createdAt: now.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در ایجاد بک‌آپ: ${err.message || err}` });
  }
}

function handleListBackups(req: any, res: any) {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(BACKUP_DIR, f);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          name: f,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
          date: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      backups,
      files: backups,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دریافت لیست بک‌آپ‌ها: ${err.message || err}` });
  }
}

function handleDownloadBackup(req: any, res: any) {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'فایل بک‌آپ یافت نشد.' });
    }

    res.download(filePath, filename);
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در دانلود فایل: ${err.message || err}` });
  }
}

async function handleRestoreBackup(req: any, res: any) {
  try {
    let data: any = null;

    if (req.body.backupData) {
      data = req.body.backupData;
    } else if (req.body.filename) {
      const filename = path.basename(req.body.filename);
      const filePath = path.join(BACKUP_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'فایل پشتیبان مورد نظر یافت نشد.' });
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      data = parsed.data || parsed;
    } else if (req.body.data) {
      data = req.body.data;
    } else {
      return res.status(400).json({ success: false, error: 'هیچ داده یا فایلی برای بازیابی ارسال نشده است.' });
    }

    const pool = getMySqlPool();
    await withTransaction(pool, async (conn) => {
      if (data.roles) await SyncRepository.syncRoles(conn, data.roles);
      if (data.users) await SyncRepository.syncUsers(conn, data.users, convertBase64ToLocalFile);
      if (data.links) await SyncRepository.syncLinks(conn, data.links);
      if (data.preRegistrations) await SyncRepository.syncPreRegistrations(conn, data.preRegistrations, convertBase64ToLocalFile);
      if (data.clubSettings) await SyncRepository.syncClubSettings(conn, data.clubSettings);
      if (data.sessions || data.courses) await SyncRepository.syncCourses(conn, data.sessions || data.courses);
      if (data.enrollments) await SyncRepository.syncEnrollments(conn, data.enrollments, convertBase64ToLocalFile);
      if (data.transactions) await SyncRepository.syncTransactions(conn, data.transactions, convertBase64ToLocalFile);
      if (data.debtors) await SyncRepository.syncDebtors(conn, data.debtors);
      if (data.creditors) await SyncRepository.syncCreditors(conn, data.creditors);
      if (data.insuranceRequests) await SyncRepository.syncInsuranceRequests(conn, data.insuranceRequests, convertBase64ToLocalFile);
      if (data.supportTickets) await SyncRepository.syncSupportTickets(conn, data.supportTickets);
      if (data.announcements) await SyncRepository.syncAnnouncements(conn, data.announcements);
      if (data.notifications) await SyncRepository.syncNotifications(conn, data.notifications);
      if (data.products) await SyncRepository.syncProducts(conn, data.products, convertBase64ToLocalFile);
      if (data.shopInvoices) await SyncRepository.syncShopInvoices(conn, data.shopInvoices);
      if (data.smsLogs) await SyncRepository.syncSmsLogs(conn, data.smsLogs);
      if (data.attendanceRecords) await SyncRepository.syncAttendanceRecords(conn, data.attendanceRecords);
    });

    res.json({
      success: true,
      message: 'بازیابی دیتابیس با موفقیت انجام گردید.',
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در بازیابی اطلاعات: ${err.message || err}` });
  }
}

function handleDeleteBackup(req: any, res: any) {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'فایل بک‌آپ یافت نشد.' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'فایل پشتیبان با موفقیت حذف گردید.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در حذف فایل: ${err.message || err}` });
  }
}

// Register all endpoints with adminGuard
router.post('/save', ...adminGuard, handleSaveBackup);
router.post('/save-to-host', ...adminGuard, handleSaveBackup);

router.get('/list', ...adminGuard, handleListBackups);
router.get('/list-host', ...adminGuard, handleListBackups);

router.get('/download/:filename', ...adminGuard, handleDownloadBackup);
router.get('/download-host/:filename', ...adminGuard, handleDownloadBackup);

router.post('/restore', ...adminGuard, handleRestoreBackup);
router.post('/restore-host', ...adminGuard, handleRestoreBackup);

router.delete('/delete/:filename', ...adminGuard, handleDeleteBackup);
router.delete('/delete-host/:filename', ...adminGuard, handleDeleteBackup);

export default router;
