import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { dbStore } from '../services/db';
import {
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Users,
  ShieldCheck,
  DollarSign,
  Calendar,
  CheckSquare as CheckSquareIcon,
  ShieldAlert,
  Sparkles,
  Database,
  HardDrive,
  UploadCloud,
  RefreshCw,
  Trash2,
  FileJson,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { MySqlTablesTestModal } from './MySqlTablesTestModal';

interface HostBackupFile {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  createdAtJalali: string;
}

export const DataExportView: React.FC = () => {
  const [exportUsers, setExportUsers] = useState(true);
  const [exportInsurance, setExportInsurance] = useState(true);
  const [exportTransactions, setExportTransactions] = useState(true);
  const [exportSessions, setExportSessions] = useState(true);
  const [exportAttendance, setExportAttendance] = useState(true);
  const [exportAuditLogs, setExportAuditLogs] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'excel' | 'backup'>('excel');

  // Host Backups State
  const [hostBackups, setHostBackups] = useState<HostBackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSavingHostBackup, setIsSavingHostBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDbTestModalOpen, setIsDbTestModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHostBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setHostBackups(data.files);
      }
    } catch {
      // Ignore background fetch errors
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchHostBackups();
    }
  }, [activeTab]);

  const handleExportAllSelected = () => {
    setIsExporting(true);

    setTimeout(() => {
      const wb = XLSX.utils.book_new();

      const addSheet = (sheetName: string, titleBanner: string, headers: string[], rows: (string | number)[][]) => {
        const sheetData = [
          [titleBanner],
          ['تاریخ دریافت خروجی:', new Date().toLocaleDateString('fa-IR')],
          [''],
          headers,
          ...rows,
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = headers.map(() => ({ wch: 24 }));
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      // 1. Users / Athletes (ALL identity fields)
      if (exportUsers) {
        const users = dbStore.getUsers();
        const headers = [
          'شناسه یکتا',
          'نام و نام خانوادگی',
          'نام',
          'نام خانوادگی',
          'نام پدر',
          'شماره شناسنامه',
          'کد ملی',
          'شماره همراه',
          'نام کاربری',
          'جنسیت',
          'تاریخ تولد',
          'گروه خونی',
          'سایز کفش',
          'سایز لباس',
          'آدرس محل سکونت',
          'تماس اضطراری (نام)',
          'نسبت تماس اضطراری',
          'شماره تماس اضطراری',
          'ملاحظات / حساسیت پزشکی',
          'شغل / تحصیلات',
          'سطح سنگ‌نوردی',
          'نام معرفی‌کننده',
          'شماره معرفی‌کننده',
          'نقش‌های کاربر',
          'نقش فعال',
          'وضعیت حساب',
          'شماره بیمه‌نامه',
          'تاریخ انقضاء بیمه',
          'وضعیت اعتبار بیمه',
          'تاریخ ثبت‌نام',
        ];

        const rows = users.map((u) => [
          u.id,
          u.fullName || '-',
          u.firstName || '-',
          u.lastName || '-',
          u.fatherName || '-',
          toPersianDigits(u.shenasnamehNo || '-'),
          toPersianDigits(u.nationalId || '-'),
          toPersianDigits(u.phone || '-'),
          u.username || '-',
          u.gender === 'male' ? 'آقا' : u.gender === 'female' ? 'خانم' : '-',
          u.birthDate || '-',
          u.bloodType || '-',
          u.shoeSize || '-',
          u.clothingSize || '-',
          u.address || '-',
          u.emergencyContactName || '-',
          u.emergencyContactRelation || '-',
          toPersianDigits(u.emergencyContactPhone || '-'),
          u.medicalConditions || 'ندارد',
          u.educationOrJob || '-',
          u.climbingExperienceLevel === 'beginner' ? 'مبتدی' : u.climbingExperienceLevel === 'intermediate' ? 'متوسط' : u.climbingExperienceLevel === 'advanced' ? 'پیشرفته' : '-',
          u.referrerName || '-',
          toPersianDigits(u.referrerPhone || '-'),
          u.roles.join(' - '),
          u.activeRole || '-',
          u.isActive ? 'فعال' : 'غیرفعال',
          toPersianDigits(u.insuranceNumber || '-'),
          u.insuranceExpiryDate || '-',
          u.isInsuranceValid ? 'معتبر' : 'نیازمند استعلام / منقضی',
          u.createdAt || '-',
        ]);

        addSheet('اعضا و ورزشکاران', 'بانک جامع اعضا و ورزشکاران باشگاه سنگ‌نوردی موج', headers, rows);
      }

      // 2. Insurance Requests
      if (exportInsurance) {
        const insuranceList = dbStore.getInsuranceRequests();
        const headers = ['شناسه', 'نام ورزشکار', 'کد ملی', 'شماره بیمه', 'تاریخ شروع', 'تاریخ انقضاء', 'وضعیت بررسی', 'بررسی توسط', 'نام فایل پیوست'];
        const rows = insuranceList.map((i) => [
          i.id,
          i.userName,
          toPersianDigits(i.userNationalId || ''),
          toPersianDigits(i.insuranceNumber || ''),
          i.startDate || '-',
          i.expiryDate || '-',
          i.status === 'approved' ? 'تأیید شده' : i.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی',
          i.reviewedBy || '-',
          i.fileName || '-',
        ]);
        addSheet('بیمه‌نامه‌های ورزشی', 'گزارش و مدارک کارت‌های بیمه ورزشی فدراسیون', headers, rows);
      }

      // 3. Transactions & Accounting
      if (exportTransactions) {
        const txs = dbStore.getTransactions();
        const headers = ['شناسه تراکنش', 'نام کاربر', 'مبلغ (تومان)', 'نوع تراکنش', 'دسته بابت', 'وضعیت پرداخت', 'تاریخ ثبت', 'توضیحات / کد پیگیری'];
        const rows = txs.map((t) => [
          t.id,
          t.userName,
          toPersianDigits((t.amount || 0).toLocaleString()),
          t.type === 'tuition' ? 'شهریه دوره' : t.type === 'single_session' ? 'ورودی تک‌جلسه' : t.type === 'charge' ? 'شارژ حساب' : 'سایر',
          (t as any).category || t.type,
          t.status === 'completed' ? 'تأییدشده و موفق' : t.status === 'rejected' ? 'ردشده' : 'در انتظار بررسی',
          t.createdAt || '-',
          t.description || '-',
        ]);
        addSheet('تراکنش‌های مالی', 'دفتر کل و ریز کلیه تراکنش‌های مالی باشگاه', headers, rows);
      }

      // 4. Courses & Sessions
      if (exportSessions) {
        const sessions = dbStore.getSessions();
        const headers = ['شناسه دوره', 'عنوان دوره / سانس', 'نام مربی', 'روزهای برگزاری', 'ساعات برگزاری', 'شهریه (تومان)', 'ظرفیت کل', 'تعداد ثبت‌نام شده'];
        const rows = sessions.map((s) => [
          s.id,
          s.title,
          s.coachName,
          s.daysOfWeek.join(' - '),
          `${s.startTime} تا ${s.endTime}`,
          toPersianDigits((s.monthlyFee || 0).toLocaleString()),
          toPersianDigits(s.capacity),
          toPersianDigits(dbStore.getEnrollments().filter((e) => e.sessionId === s.id && e.status === 'active').length),
        ]);
        addSheet('دوره‌های آموزشی', 'فهرست دوره‌ها و سانس‌های فعال آموزشی باشگاه', headers, rows);
      }

      // 5. Attendance Logs
      if (exportAttendance) {
        const attendanceList = dbStore.getAttendanceRecords();
        const headers = ['شناسه رکورد', 'نام ورزشکار', 'عنوان دوره / سانس', 'تاریخ حضور', 'وضعیت حضور', 'ثبت‌کننده'];
        const rows = attendanceList.map((a) => [
          a.id,
          a.userName || a.userId,
          (dbStore.getSessions().find((s) => s.id === a.sessionId)?.title) || a.sessionId,
          a.date,
          a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غایب' : 'تأخیر / مرخصی',
          a.recordedBy || '-',
        ]);
        addSheet('حضور و غیاب', 'گزارش کامل سوابق حضور و غیاب ورزشکاران', headers, rows);
      }

      // 6. Audit Logs
      if (exportAuditLogs) {
        const auditLogs = dbStore.getAuditLogs();
        const headers = ['شناسه لاگ', 'شناسه کاربر', 'نام کاربر', 'عنوان اقدام', 'ماژول', 'شناسه هدف', 'جزئیات تغییرات', 'زمان ثبت دقیق'];
        const rows = auditLogs.map((log) => [
          log.id,
          log.userId,
          log.userName,
          log.action,
          log.targetEntity,
          log.targetId || '-',
          log.details || '-',
          log.timestamp,
        ]);
        addSheet('سوابق امنیتی (Audit Log)', 'تاریخچه تغییرات و لاگ‌های امنیتی سیستم', headers, rows);
      }

      const fileName = `بک_آپ_جامع_بانک_اطلاعات_باشگاه_موج_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setIsExporting(false);
    }, 400);
  };

  // Direct Browser JSON Download
  const handleDownloadDirectJsonBackup = () => {
    try {
      const backupObj = dbStore.exportFullBackupJSON();
      const jsonString = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `پشتیبان_کامل_دیتابیس_موج_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage({ type: 'success', text: 'فایل پشتیبان JSON با موفقیت تولید و روی سیستم دانلود شد.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'خطا در ایجاد فایل پشتیبان JSON' });
    }
  };

  // Direct Browser SQL Dump (.sql) Download
  const handleDownloadDirectSqlBackup = () => {
    try {
      const sqlString = dbStore.exportFullBackupSQL();
      const blob = new Blob([sqlString], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mouj_mysql_dump_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage({ type: 'success', text: 'فایل پشتیبان دیتابیس MySQL (.sql) با موفقیت تولید و روی سیستم دانلود شد.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'خطا در ایجاد فایل پشتیبان SQL' });
    }
  };

  // Save Backup File on Server Host
  const handleSaveBackupToHost = async () => {
    setIsSavingHostBackup(true);
    setStatusMessage(null);
    try {
      const backupData = dbStore.exportFullBackupJSON();
      const res = await fetch('/api/backup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'پشتیبان_کامل_باشگاه_موج',
          backupData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'فایل پشتیبان دیتابیس با موفقیت در هاست ذخیره گردید.' });
        fetchHostBackups();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'خطا در ذخیره بک‌آپ روی هاست' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ارتباط با سرور جهت ذخیره بک‌آپ برقرار نشد.' });
    } finally {
      setIsSavingHostBackup(false);
    }
  };

  // Download Host Backup File
  const handleDownloadHostBackup = (filename: string) => {
    window.open(`/api/backup/download/${encodeURIComponent(filename)}`, '_blank');
  };

  // Delete Host Backup File
  const handleDeleteHostBackup = async (filename: string) => {
    if (!window.confirm(`آیا از حذف فایل پشتیبان "${filename}" از روی هاست اطمینان دارید؟`)) {
      return;
    }
    try {
      const res = await fetch(`/api/backup/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'فایل پشتیبان از روی هاست حذف شد.' });
        fetchHostBackups();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'خطا در حذف فایل پشتیبان' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در برقراری ارتباط با سرور' });
    }
  };

  // Restore Database from Host Backup
  const handleRestoreFromHostFile = async (filename: string) => {
    if (!window.confirm(`هشدار مهم: با بازگردانی دیتابیس از فایل "${filename}"، تمام اطلاعات جاری جایگزین خواهند شد. آیا ادامه می‌دهید؟`)) {
      return;
    }
    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (data.success) {
        await dbStore.loadFromBackendMySql();
        setStatusMessage({ type: 'success', text: 'دیتابیس سیستم با موفقیت از نسخه هاست بازیابی شد.' });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'خطا در بازگردانی دیتابیس' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در بازگردانی دیتابیس' });
    } finally {
      setIsRestoring(false);
    }
  };

  // Restore Database from Local File Upload
  const handleFileUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`هشدار: با بارگذاری این فایل پشتیبان، اطلاعات دیتابیس بازنویسی خواهند شد. آیا مطمئن هستید؟`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backupObj = JSON.parse(text);

        // 1. Restore local memory store
        const restoredOk = await dbStore.restoreFullBackupJSON(backupObj, 'مدیر ارشد');

        // 2. Sync to backend API
        await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupData: backupObj }),
        });

        if (restoredOk) {
          setStatusMessage({ type: 'success', text: 'اطلاعات دیتابیس با موفقیت از فایل آپلود شده بازیابی و همگام گردید.' });
        } else {
          setStatusMessage({ type: 'error', text: 'ساختار فایل پشتیبان انتخاب شده معتبر نمی‌باشد.' });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `فرمت فایل پشتیبان نامعتبر است: ${err.message}` });
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const toggleSelectAll = () => {
    const allSelected = exportUsers && exportInsurance && exportTransactions && exportSessions && exportAttendance && exportAuditLogs;
    setExportUsers(!allSelected);
    setExportInsurance(!allSelected);
    setExportTransactions(!allSelected);
    setExportSessions(!allSelected);
    setExportAttendance(!allSelected);
    setExportAuditLogs(!allSelected);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Database className="w-7 h-7 text-emerald-400" />
            <h1 className="text-2xl font-black">مرکز استخراج داده‌ها و پشتیبان‌گیری کامل (Database Backup)</h1>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm font-medium">
            مدیریت محترم می‌تواند گزارش‌های اکسل دریافت نموده یا از تمام جدول‌های دیتابیس فایل پشتیبان JSON ایجاد، دانلود و بازیابی کند.
          </p>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex flex-wrap items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10 shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'excel'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>خروجی Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'backup'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>پشتیبان‌گیری دیتابیس (JSON/Host)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDbTestModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-500/20"
          >
            <Database className="w-4 h-4" />
            <span>استعلام جداول MySQL</span>
            <span className="w-2 h-2 rounded-full bg-slate-900 animate-pulse"></span>
          </button>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold flex-1">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            بستن
          </button>
        </div>
      )}

      {/* TAB 1: EXCEL REPORT EXPORT */}
      {activeTab === 'excel' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">انتخاب مجموعه‌های داده جهت خروجی اکسل</h2>
              <p className="text-xs text-slate-500 mt-0.5">تیک آیتم‌های مورد نیاز خود را برای دریافت خروجی فعال کنید</p>
            </div>

            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>انتخاب / لغو همه</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Users */}
            <div
              onClick={() => setExportUsers(!exportUsers)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                exportUsers
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${exportUsers ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">لیست اعضا و ورزشکاران</h3>
                  {exportUsers ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">مشخصات فردی، کدملی، شماره همراه، نقش‌ها و وضعیت بیمه ورزشی</p>
              </div>
            </div>

            {/* Card 2: Insurance */}
            <div
              onClick={() => setExportInsurance(!exportInsurance)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                exportInsurance
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${exportInsurance ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">مدارک و کارت‌های بیمه ورزشی</h3>
                  {exportInsurance ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">شماره بیمه‌نامه، تاریخ صدور و انقضا، وضعیت بررسی و تأییدکننده</p>
              </div>
            </div>

            {/* Card 3: Financial Transactions */}
            <div
              onClick={() => setExportTransactions(!exportTransactions)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                exportTransactions
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${exportTransactions ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">تراکنش‌ها و حسابداری مالی</h3>
                  {exportTransactions ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">شهریه‌ها، بوفه، بدهی‌ها، واریزی‌ها و فیش‌های ثبت شده در سیستم</p>
              </div>
            </div>

            {/* Card 4: Courses & Sessions */}
            <div
              onClick={() => setExportSessions(!exportSessions)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                exportSessions
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${exportSessions ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">دوره‌ها و سانس‌های آموزشی</h3>
                  {exportSessions ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">عنوان دوره، مربی مربوطه، ظرفیت، روزهای هفته و تعداد ثبت‌نامی‌ها</p>
              </div>
            </div>

            {/* Card 5: Attendance */}
            <div
              onClick={() => setExportAttendance(!exportAttendance)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                exportAttendance
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${exportAttendance ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <CheckSquareIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">گزارش حضور و غیاب</h3>
                  {exportAttendance ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">حضور، غیاب و تأخیرهای ثبت شده توسط مربیان و منشی</p>
              </div>
            </div>

            {/* Card 6: Audit Logs */}
            <div
              onClick={() => setExportAuditLogs(!exportAuditLogs)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                exportAuditLogs
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${exportAuditLogs ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">سوابق امنیتی و تغییرات (Audit Log)</h3>
                  {exportAuditLogs ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">کلیه ثبت‌ها، ویرایش‌ها، تأییدات و ورود‌های کاربران مدیریت</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleExportAllSelected}
              disabled={isExporting}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-md transition-all text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isExporting ? 'در حال ایجاد فایل...' : 'دانلود جداول انتخاب شده در قالب اکسل'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: DATABASE BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Action Cards: Export, Host Backup, Restore */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Action 1: Direct JSON & SQL Download */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="font-black text-slate-900 text-base mb-1">دانلود فایل پشتیبان (JSON / SQL)</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  استخراج کامل تمام ۱۴ جدول دیتابیس در قالب فایل استاندارد JSON یا اسکریپت مستقیم MySQL (.sql) جهت نگهداری روی رایانه شخصی.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleDownloadDirectJsonBackup}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-200" />
                  <span>دانلود فایل پشتیبان JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadDirectSqlBackup}
                  className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-200" />
                  <span>دانلود دمپ مستقیم MySQL (.sql)</span>
                </button>
              </div>
            </div>

            {/* Action 2: Save Backup on Server Host */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <HardDrive className="w-6 h-6" />
                </div>
                <h3 className="font-black text-slate-900 text-base mb-1">ذخیره پشتیبان روی هاست سرور</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  ایجاد یک نسخه پشتیبان تاریخ‌دار در پوشه اختصاصی backups روی سرور هاست جهت بازیابی سریع در آینده.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBackupToHost}
                disabled={isSavingHostBackup}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <HardDrive className="w-4 h-4 text-indigo-200" />
                <span>{isSavingHostBackup ? 'در حال ذخیره روی هاست...' : 'ذخیره نسخه پشتیبان جدید روی هاست'}</span>
              </button>
            </div>

            {/* Action 3: Restore Backup File */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="font-black text-slate-900 text-base mb-1">بازیابی دیتابیس از فایل</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  انتخاب فایل پشتیبان `.json` از سیستم شخصی و جایگزینی کامل اطلاعات دیتابیس سرور با اطلاعات فایل.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUploadRestore}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4 text-amber-200" />
                  <span>{isRestoring ? 'در حال بازگردانی دیتابیس...' : 'انتخاب و بازیابی فایل JSON'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table of Server Host Backups */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-indigo-600" />
                  <span>لیست نسخه‌های پشتیبان موجود در هاست سرور</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  مدیریت فایل‌های بک‌آپ ذخیره شده روی دیسک سرور با امکان دانلود مستقیم، بازیابی دیتابیس و یا حذف فایل.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchHostBackups}
                disabled={isLoadingBackups}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin text-indigo-600' : ''}`} />
                <span>بروزرسانی لیست</span>
              </button>
            </div>

            {isLoadingBackups ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <span>در حال دریافت لیست بک‌آپ‌های هاست...</span>
              </div>
            ) : hostBackups.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <p className="text-slate-600 font-bold">هنوز هیچ فایل پشتیبانی روی هاست سرور ایجاد نشده است.</p>
                <p className="text-slate-400 font-normal">
                  جهت ایجاد اولین نسخه پشتیبان روی دیسک هاست، از دکمه فوقانی "ذخیره نسخه پشتیبان جدید روی هاست" استفاده نمایید.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-4">نام فایل پشتیبان</th>
                      <th className="py-3 px-4">حجم فایل</th>
                      <th className="py-3 px-4">تاریخ و زمان ایجاد</th>
                      <th className="py-3 px-4 text-center">عملیات مدیریت هاست</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hostBackups.map((b) => (
                      <tr key={b.filename} className="hover:bg-slate-50/70 transition-all">
                        <td className="py-3.5 px-4 font-mono dir-ltr text-right text-slate-800 font-bold">
                          {b.filename}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-600">{toPersianDigits(b.sizeFormatted)}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">{toPersianDigits(b.createdAtJalali)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadHostBackup(b.filename)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition flex items-center gap-1 border border-emerald-200"
                              title="دانلود این فایل روی رایانه"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              <span>دانلود</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRestoreFromHostFile(b.filename)}
                              disabled={isRestoring}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold transition flex items-center gap-1 border border-amber-200 disabled:opacity-50"
                              title="بازیابی دیتابیس از این بک‌آپ"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                              <span>بازیابی دیتابیس</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteHostBackup(b.filename)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition border border-rose-200"
                              title="حذف از روی هاست"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MySQL Tables Status & Test Modal */}
      <MySqlTablesTestModal
        isOpen={isDbTestModalOpen}
        onClose={() => setIsDbTestModalOpen(false)}
      />
    </div>
  );
};
