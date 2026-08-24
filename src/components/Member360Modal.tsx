import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  User as UserIcon,
  Shield,
  Phone,
  CreditCard,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Heart,
  Activity,
  Users,
  DollarSign,
  History,
  Edit3,
  Save,
  Link as LinkIcon,
  AlertTriangle,
  Award,
  Sparkles,
  MapPin,
  Briefcase,
  Layers,
  Check,
  Key,
  FileSpreadsheet,
  Download,
  Camera,
  Trash2,
  Receipt,
} from 'lucide-react';
import { User, SessionEnrollment, FinancialTransaction, AttendanceRecord, DebtorRecord, UserRoleKey, ShopInvoice } from '../types';
import { dbStore } from '../services/db';
import { ShopInvoiceDetailModal } from './ShopInvoiceDetailModal';
import { EditEnrollmentModal } from './EditEnrollmentModal';
import { DigitalMembershipCardModal } from './DigitalMembershipCardModal';
import { toPersianDigits, formatToman } from '../utils/nationalIdValidator';
import { THEME_PALETTES } from '../utils/theme';
import { uploadFileToServer } from '../utils/fileUploader';

interface Member360ModalProps {
  user: User;
  onClose: () => void;
  onDataChanged?: () => void;
  onSelectMember?: (member: User) => void;
}

export const Member360Modal: React.FC<Member360ModalProps> = ({
  user: initialUser,
  onClose,
  onDataChanged,
  onSelectMember,
}) => {
  const currentClub = dbStore.getClubSettings();
  const activePal = THEME_PALETTES[currentClub.themePalette] || THEME_PALETTES.wave;

  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [allUsers, setAllUsers] = useState<User[]>(() => dbStore.getUsers());
  const [isMembershipCardOpen, setIsMembershipCardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'basic' | 'insurance' | 'courses' | 'finance' | 'attendance' | 'family' | 'audit'
  >('basic');

  // React to initialUser prop updates
  React.useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
      setFormData({ ...initialUser });
      setIsEditing(false);
    }
  }, [initialUser]);

  // Real-time synchronization when MySQL DB or local data updates
  React.useEffect(() => {
    const handleDbUpdate = () => {
      const freshUsers = dbStore.getUsers();
      setAllUsers(freshUsers);
      if (currentUser?.id) {
        const freshCurrent = freshUsers.find((u) => u.id === currentUser.id);
        if (freshCurrent) {
          setCurrentUser(freshCurrent);
        }
      }
    };

    window.addEventListener('dbStoreUpdated', handleDbUpdate);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleDbUpdate);
    };
  }, [currentUser?.id]);

  const handleSelectMemberInternal = (targetUser: User) => {
    setCurrentUser(targetUser);
    setFormData({ ...targetUser });
    setIsEditing(false);
    if (onSelectMember) {
      onSelectMember(targetUser);
    }
  };

  // Inline editing state for basic info & insurance
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ ...initialUser });
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [selectedShopInvoice, setSelectedShopInvoice] = useState<ShopInvoice | null>(null);

  // Edit Enrollment Dates & Details Modal State
  const [selectedEnrollmentForEdit, setSelectedEnrollmentForEdit] = useState<SessionEnrollment | null>(null);
  const [isEditEnrollModalOpen, setIsEditEnrollModalOpen] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setAvatarError(
        `خطا در آپلود: حجم تصویر انتخاب‌شده (${toPersianDigits(fileSizeMB)} مگابایت) بیشتر از سقف مجاز ۵ مگابایت است. لطفاً فایل کم‌حجم‌تری انتخاب کنید.`
      );
      e.target.value = '';
      return;
    }

    setAvatarError(null);
    try {
      const res = await uploadFileToServer(file, {
        prefix: 'profile',
        customName: currentUser?.nationalId || currentUser?.id,
        subDir: 'profile_img',
      });
      if (res.success && res.url) {
        setFormData((prev) => ({ ...prev, avatarUrl: res.url }));
      } else {
        setAvatarError(res.error || 'خطا در بارگذاری تصویر روی سرور');
      }
    } catch {
      setAvatarError('خطا در ارتباط با سرور جهت بارگذاری تصویر');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarError(null);
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
  };

  // Data queries
  const enrollments: SessionEnrollment[] = dbStore.getEnrollments().filter(
    (e) => e.userId === currentUser.id || e.athleteName === currentUser.fullName
  );
  
  const transactions: FinancialTransaction[] = dbStore.getUserTransactions(currentUser.id);
  
  const attendanceRecords: AttendanceRecord[] = dbStore.getUserAttendanceHistory(currentUser.id);

  const debtorRecords: DebtorRecord[] = dbStore
    .getDebtors()
    .filter((d) => d.userId === currentUser.id || d.nationalId === currentUser.nationalId || d.fullName === currentUser.fullName);

  const auditLogs = dbStore
    .getAuditLogs()
    .filter((l) => l.targetId === currentUser.id || l.userId === currentUser.id);

  const linkedParents = dbStore.getParentsForAthlete(currentUser.id);
  const linkedChildren = dbStore.getChildrenForParent(currentUser.id);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleSaveBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = dbStore.updateUser(currentUser.id, formData, 'مدیر ارشد');
    if (updated) {
      setCurrentUser({ ...updated });
      setFormData({ ...updated });
      setIsEditing(false);
      showToast('اطلاعات عضو با موفقیت به‌روزرسانی و در پرونده ذخیره شد.');
      if (onDataChanged) onDataChanged();
    }
  };

  const handleQuickExtendInsurance = () => {
    const today = new Date();
    // approximate Jalali next year
    const updated = dbStore.updateUser(
      currentUser.id,
      {
        insuranceExpiryDate: '1404/05/01',
        isInsuranceValid: true,
      },
      'مدیر ارشد'
    );
    if (updated) {
      setCurrentUser({ ...updated });
      setFormData((prev) => ({ ...prev, insuranceExpiryDate: '1404/05/01', isInsuranceValid: true }));
      showToast('اعتبار کارت بیمه ورزشی عضو به مدت ۱ سال تمدید شد.');
      if (onDataChanged) onDataChanged();
    }
  };

  const [resetPasswordModal, setResetPasswordModal] = useState(false);
  const [customNewPass, setCustomNewPass] = useState('');

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = dbStore.resetUserPassword(currentUser.id, customNewPass, 'مدیر ارشد');
    if (res.success) {
      setCurrentUser({ ...res.user! });
      setResetPasswordModal(false);
      setCustomNewPass('');
      showToast(`رمز عبور کاربر با موفقیت به «${res.passwordUsed}» ریست شد.`);
      if (onDataChanged) onDataChanged();
    }
  };

  const handleToggleActiveStatus = () => {
    const updated = dbStore.updateUser(
      currentUser.id,
      { isActive: !currentUser.isActive },
      'مدیر ارشد'
    );
    if (updated) {
      setCurrentUser({ ...updated });
      showToast(`وضعیت حساب کاربر به ${!currentUser.isActive ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
      if (onDataChanged) onDataChanged();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await uploadFileToServer(file, {
        prefix: 'profile',
        customName: currentUser.nationalId || currentUser.id,
        subDir: 'profile_img',
      });
      if (res.success && res.url) {
        const updated = dbStore.updateUser(currentUser.id, { avatarUrl: res.url }, 'مدیر ارشد');
        if (updated) {
          setCurrentUser({ ...updated });
          showToast('تصویر پروفایل کاربر با موفقیت بر روی سرور بارگذاری و ذخیره شد.');
          if (onDataChanged) onDataChanged();
        }
      } else {
        showToast(res.error || 'خطا در بارگذاری تصویر کاربر بر روی سرور');
      }
    } catch (err: any) {
      console.error('Error updating avatar:', err);
      showToast('خطا در ارتباط با سرور جهت بارگذاری تصویر');
    }
  };

  // Attendance stats
  const totalAttendanceCount = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
  const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length;
  const excusedCount = attendanceRecords.filter((a) => a.status === 'excused').length;
  const attendanceRate = totalAttendanceCount > 0 ? Math.round((presentCount / totalAttendanceCount) * 100) : 0;

  // Financial stats
  const totalPaid = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDebt = debtorRecords.reduce((sum, d) => sum + (d.amount || 0), 0);

  const getRoleLabel = (r: UserRoleKey) => {
    switch (r) {
      case 'admin':
        return 'مدیر ارشد';
      case 'secretary':
        return 'منشی باشگاه';
      case 'accountant':
        return 'حسابدار';
      case 'coach':
        return 'مربی';
      case 'athlete':
        return 'ورزشکار';
      case 'parent':
        return 'ولی / سرپرست';
      default:
        return r;
    }
  };

  const exportFullPersonDataToExcel = () => {
    const wb = XLSX.utils.book_new();

    const addSheetWithCols = (sheetData: (string | number)[][], sheetName: string) => {
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [
        { wch: 28 },
        { wch: 35 },
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
        { wch: 20 },
        { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    // Sheet 1: Identity & Personal Details
    const sheet1Data = [
      ['باشگاه ورزشی سنگ‌نوردی موج - پرونده جامع ۳۶۰ درجه اعضاء'],
      ['اطلاعات هویتی و پرسنلی کامل کاربر (استخراج شده از دیتابیس)'],
      [''],
      ['عنوان مشخصه', 'مقدار / توضیحات'],
      ['شناسه یکتای سیستم', currentUser.id],
      ['نام و نام خانوادگی', currentUser.fullName || '-'],
      ['نام', currentUser.firstName || '-'],
      ['نام خانوادگی', currentUser.lastName || '-'],
      ['نام پدر', currentUser.fatherName || '-'],
      ['شماره شناسنامه', toPersianDigits(currentUser.shenasnamehNo || '-')],
      ['کد ملی', toPersianDigits(currentUser.nationalId || '-')],
      ['شماره همراه', toPersianDigits(currentUser.phone || '-')],
      ['نام کاربری', currentUser.username || '-'],
      ['جنسیت', currentUser.gender === 'male' ? 'آقا' : currentUser.gender === 'female' ? 'خانم' : '-'],
      ['تاریخ تولد', currentUser.birthDate || '-'],
      ['گروه خونی', currentUser.bloodType || '-'],
      ['سایز کفش', currentUser.shoeSize || '-'],
      ['سایز لباس', currentUser.clothingSize || '-'],
      ['آدرس محل سکونت', currentUser.address || '-'],
      ['نام فرد تماس اضطراری', currentUser.emergencyContactName || '-'],
      ['نسبت فرد اضطراری', currentUser.emergencyContactRelation || '-'],
      ['شماره تماس اضطراری', toPersianDigits(currentUser.emergencyContactPhone || '-')],
      ['بیماری / حساسیت دارویی و پزشکی', currentUser.medicalConditions || 'ندارد'],
      ['شغل / تحصیلات', currentUser.educationOrJob || '-'],
      ['سطح تجربه سنگ‌نوردی', currentUser.climbingExperienceLevel === 'beginner' ? 'مبتدی' : currentUser.climbingExperienceLevel === 'intermediate' ? 'متوسط' : currentUser.climbingExperienceLevel === 'advanced' ? 'پیشرفته' : '-'],
      ['نام معرفی‌کننده', currentUser.referrerName || '-'],
      ['شماره تماس معرفی‌کننده', toPersianDigits(currentUser.referrerPhone || '-')],
      ['نقش‌های اختصاص یافته', currentUser.roles.map(getRoleLabel).join(' - ')],
      ['نقش فعال جاری', getRoleLabel(currentUser.activeRole)],
      ['وضعیت حساب کاربری', currentUser.isActive ? 'فعال' : 'غیرفعال'],
      ['شماره کارت بیمه ورزشی', toPersianDigits(currentUser.insuranceNumber || '-')],
      ['تاریخ انقضاء بیمه‌نامه', currentUser.insuranceExpiryDate || '-'],
      ['وضعیت اعتبار بیمه', currentUser.isInsuranceValid ? 'معتبر' : 'نیازمند استعلام / منقضی'],
      ['تاریخ ثبت‌نام در سیستم', currentUser.createdAt || '-'],
      ['تاریخ آخرین بروزرسانی', currentUser.updatedAt || '-'],
    ];

    // Sheet 2: Insurance
    const sheet2Data = [
      ['کارت و وضعیت بیمه‌نامه ورزشی فدراسیون پزشکی ورزشی'],
      [''],
      ['عنوان مشخصه بیمه', 'مقدار'],
      ['شماره کارت بیمه ورزشی', toPersianDigits(currentUser.insuranceNumber || '-')],
      ['تاریخ انقضاء بیمه‌نامه', currentUser.insuranceExpiryDate || '-'],
      ['وضعیت اعتبار بیمه', currentUser.isInsuranceValid ? 'معتبر' : 'نیازمند استعلام / منقضی'],
    ];

    // Sheet 3: Financial Transactions
    const sheet3Data = [
      ['خلاصه و ریز کلیه تراکنش‌های مالی'],
      [
        `کل پرداختی موفق: ${toPersianDigits(totalPaid.toLocaleString())} تومان`,
        `کل بدهی معوق: ${toPersianDigits(totalDebt.toLocaleString())} تومان`,
        `تراز کل: ${toPersianDigits((totalPaid - totalDebt).toLocaleString())} تومان`,
      ],
      [''],
      ['شناسه تراکنش', 'مبلغ (تومان)', 'نوع تراکنش', 'دسته‌بندی بابت', 'وضعیت تراکنش', 'تاریخ ثبت', 'توضیحات / کد پیگیری'],
      ...transactions.map((t) => [
        t.id,
        toPersianDigits((t.amount || 0).toLocaleString()),
        t.type === 'tuition' ? 'شهریه' : t.type === 'single_session' ? 'تک‌جلسه' : t.type === 'charge' ? 'شارژ' : 'سایر',
        (t as any).category || t.type,
        t.status === 'completed' ? 'موفق' : t.status === 'pending' ? 'در انتظار بررسی' : 'ناموفق',
        t.createdAt || '-',
        t.description || '-',
      ]),
    ];

    // Sheet 4: Debts & Bills
    const sheet4Data = [
      ['صورت‌حساب‌ها و بدهکاری‌های معوق'],
      [''],
      ['شناسه بدهی', 'عنوان بدهی', 'مبلغ (تومان)', 'دسته‌بندی', 'وضعیت تسویه', 'تاریخ موعد', 'توضیحات'],
      ...debtorRecords.map((d) => [
        d.id,
        d.categoryTitle || 'بدهی',
        toPersianDigits((d.amount || 0).toLocaleString()),
        d.category || '-',
        d.status === 'overdue' ? 'معوق' : d.status === 'due_soon' ? 'موعد نزدیک' : 'در انتظار بررسی',
        d.dueDate || '-',
        d.notes || '-',
      ]),
    ];

    // Sheet 5: Enrollments
    const sheet5Data = [
      ['دوره‌ها و سانس‌های آموزشی ثبت‌نام شده'],
      [''],
      ['شناسه ثبت‌نام', 'عنوان دوره / سانس', 'نام مربی', 'شهریه (تومان)', 'تاریخ ثبت‌نام', 'وضعیت دوره'],
      ...enrollments.map((e) => {
        const session = dbStore.getSessions().find((s) => s.id === e.sessionId);
        return [
          e.id,
          session?.title || e.sessionId,
          session?.coachName || '-',
          toPersianDigits((session?.monthlyFee || 0).toLocaleString()),
          e.enrolledAt || '-',
          e.status === 'active' ? 'فعال' : 'پایان یافته',
        ];
      }),
    ];

    // Sheet 6: Attendance
    const sheet6Data = [
      ['سوابق کامل حضور و غیاب در سانس‌ها'],
      [''],
      ['تاریخ', 'عنوان سانس', 'وضعیت حضور'],
      ...attendanceRecords.map((a) => {
        const session = dbStore.getSessions().find((s) => s.id === a.sessionId);
        return [
          a.date || '-',
          session?.title || a.sessionId,
          a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غایب' : 'مرخصی / تاخیر',
        ];
      }),
    ];

    // Sheet 7: Family Relations
    const sheet7Data = [
      ['پیوندهای خانوادگی و سرپرستان قانونی'],
      [''],
      ['نوع پیوند', 'نام و نام خانوادگی', 'کد ملی', 'شماره تماس'],
      ...linkedParents.map((p) => [
        'سرپرست / ولی قانونی',
        p.fullName,
        toPersianDigits(p.nationalId || ''),
        toPersianDigits(p.phone || ''),
      ]),
      ...linkedChildren.map((c) => [
        'فرزند تحت سرپرستی',
        c.fullName,
        toPersianDigits(c.nationalId || ''),
        toPersianDigits(c.phone || ''),
      ]),
    ];

    // Sheet 8: Audit Logs
    const sheet8Data = [
      ['تاریخچه تغییرات و لاگ‌های سیستم'],
      [''],
      ['تاریخ و زمان', 'عنوان اقدام', 'انجام‌دهنده', 'توضیحات و جزئیات'],
      ...auditLogs.map((l) => [
        l.timestamp || '-',
        l.action || '-',
        l.userName || l.userId || '-',
        l.details || '-',
      ]),
    ];

    addSheetWithCols(sheet1Data, 'مشخصات هویتی');
    addSheetWithCols(sheet2Data, 'بیمه ورزشی');
    addSheetWithCols(sheet3Data, 'تراکنش‌های مالی');
    addSheetWithCols(sheet4Data, 'بدهی‌ها');
    addSheetWithCols(sheet5Data, 'دوره‌های آموزشی');
    addSheetWithCols(sheet6Data, 'حضور و غیاب');
    addSheetWithCols(sheet7Data, 'پیوندهای خانوادگی');
    addSheetWithCols(sheet8Data, 'لاگ‌های سیستم');

    const fileName = `پرونده_جامع_${currentUser.fullName.replace(/\s+/g, '_')}_${currentUser.nationalId || currentUser.id}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('فایل اکسل با ۸ شیت تفکیک شده با موفقیت ایجاد و دانلود شد.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 dir-rtl overflow-y-auto animate-fade-in">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 text-xs font-bold animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Banner - Dynamic Theme Color */}
        <div
          className="text-white p-5 sm:p-6 relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-white/10 shadow-md transition-all"
          style={{
            background: `linear-gradient(135deg, ${activePal.shades?.[900] || activePal.sidebarBgHex || '#0f172a'} 0%, ${activePal.primaryHex} 100%)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/10"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pl-12 sm:pl-0">
            {/* Avatar Circle with quick change button */}
            <div className="relative group w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-600 to-emerald-400 flex items-center justify-center text-white text-2xl font-black shadow-xl border-2 border-white/20 shrink-0 overflow-hidden ring-4 ring-emerald-500/20">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
              ) : (
                currentUser.fullName.charAt(0)
              )}
              <label
                className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
                title="تغییر عکس پروفایل (ذخیره با کد ملی)"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[8px] font-bold mt-0.5">تغییر</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">{currentUser.fullName}</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    currentUser.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {currentUser.isActive ? '✓ حساب فعال' : '⚠️ حساب غیرفعال'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                <span>کد ملی: <strong className="text-white">{toPersianDigits(currentUser.nationalId)}</strong></span>
                <span>•</span>
                <span>همراه: <strong className="text-white">{toPersianDigits(currentUser.phone)}</strong></span>
                <span>•</span>
                <span>نام کاربری: <strong className="text-teal-300">{currentUser.username}</strong></span>
              </div>

              {/* Roles Badges */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {currentUser.roles.map((r) => (
                  <span
                    key={r}
                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800/90 text-teal-300 border border-teal-500/30 shadow-xs"
                  >
                    {getRoleLabel(r)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center pl-0 sm:pl-10">
            {/* Quick Member Switcher Selector */}
            {allUsers && allUsers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-inner">
                <Users className="w-4 h-4 text-teal-300 shrink-0" />
                <span className="text-[10px] font-bold text-slate-300 hidden md:inline whitespace-nowrap">انتخاب عضو:</span>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const found = allUsers.find((u) => u.id === e.target.value);
                    if (found) handleSelectMemberInternal(found);
                  }}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer max-w-[170px] sm:max-w-[210px] truncate"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                      {u.fullName || u.username} {u.nationalId ? `(${toPersianDigits(u.nationalId)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsMembershipCardOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border-teal-500/40 flex items-center gap-1.5 shadow-sm backdrop-blur-xs"
              title="مشاهده، صدور و چاپ کارت عضویت هوشمند دیجیتال عضو"
            >
              <CreditCard className="w-4 h-4 text-teal-300" />
              <span>کارت عضویت دیجیتال</span>
            </button>

            <button
              onClick={exportFullPersonDataToExcel}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-1.5 shadow-sm backdrop-blur-xs"
              title="دانلود فایل اکسل کامل پرونده با شیت‌های تفکیک شده"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>خروجی اکسل پرونده</span>
            </button>
            <button
              onClick={() => setResetPasswordModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>ریست کلمه عبور</span>
            </button>
            <button
              onClick={handleToggleActiveStatus}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                currentUser.isActive
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {currentUser.isActive ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی حساب'}
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-3 flex items-center gap-1.5 shrink-0 overflow-x-auto max-w-full pb-2 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 touch-pan-x">
          <button
            onClick={() => setActiveTab('basic')}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'basic'
                ? 'bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>اطلاعات فردی و پزشکی</span>
          </button>

          <button
            onClick={() => setActiveTab('insurance')}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'insurance'
                ? 'bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>بیمه‌نامه ورزشی</span>
            {!currentUser.isInsuranceValid && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'courses'
                ? 'bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>دوره‌ها و سانس‌ها ({toPersianDigits(enrollments.length)})</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'finance'
                ? 'bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>مالی و بدهی‌ها</span>
            {debtorRecords.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black shrink-0">
                {toPersianDigits(debtorRecords.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>حضور و غیاب ({toPersianDigits(attendanceRate)}٪)</span>
          </button>

          <button
            onClick={() => setActiveTab('family')}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'family'
                ? 'bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>خانواده و بستگان ({toPersianDigits(linkedParents.length + linkedChildren.length)})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white text-teal-700 border-t-2 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>سوابق سیستم ({toPersianDigits(auditLogs.length)})</span>
          </button>
        </div>

        {/* Modal Body Scroll Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: BASIC & MEDICAL INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-teal-600" />
                  <span>اطلاعات پرونده عضو و مشخصات فردی</span>
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setFormData({ ...currentUser });
                      setIsEditing(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ویرایش اطلاعات پرونده</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all"
                  >
                    انصراف از ویرایش
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Card 1: Identity */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="font-black text-slate-900 border-b border-slate-200 pb-2 text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>مشخصات شناسنامه‌ای</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">نام کامل:</span>
                      <strong className="text-slate-900">{currentUser.fullName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">نام پدر:</span>
                      <strong className="text-slate-900">{currentUser.fatherName || '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">کد ملی:</span>
                      <strong className="text-slate-900 font-mono">{toPersianDigits(currentUser.nationalId)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">شماره شناسنامه:</span>
                      <strong className="text-slate-900 font-mono">{currentUser.shenasnamehNo ? toPersianDigits(currentUser.shenasnamehNo) : '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">تاریخ تولد:</span>
                      <strong className="text-slate-900 font-mono">{currentUser.birthDate ? toPersianDigits(currentUser.birthDate) : '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">جنسیت:</span>
                      <strong className="text-slate-900">{currentUser.gender === 'female' ? 'خانم' : 'آقا'}</strong>
                    </div>
                  </div>

                  {/* Card 2: Contact & Emergency */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="font-black text-slate-900 border-b border-slate-200 pb-2 text-xs flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-teal-600" />
                      <span>تماس و اضطراری</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">تلفن همراه:</span>
                      <strong className="text-slate-900 font-mono">{toPersianDigits(currentUser.phone)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">تماس اضطراری:</span>
                      <strong className="text-slate-900">{currentUser.emergencyContactName || '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">نسبت اضطراری:</span>
                      <strong className="text-slate-900">{currentUser.emergencyContactRelation || '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">شماره اضطراری:</span>
                      <strong className="text-slate-900 font-mono">{currentUser.emergencyContactPhone ? toPersianDigits(currentUser.emergencyContactPhone) : '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">آدرس سکونت:</span>
                      <strong className="text-slate-900 truncate max-w-[150px]">{currentUser.address || '—'}</strong>
                    </div>
                  </div>

                  {/* Card 3: Sizes & Medical */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="font-black text-slate-900 border-b border-slate-200 pb-2 text-xs flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <span>تجهیزات و وضعیت پزشکی</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">گروه خونی:</span>
                      <strong className="text-rose-600 font-bold font-mono">{currentUser.bloodType || 'نامشخص'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">سایز کفش سنگ‌نوردی:</span>
                      <strong className="text-slate-900 font-mono">{currentUser.shoeSize ? toPersianDigits(currentUser.shoeSize) : '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">سایز پوشاک:</span>
                      <strong className="text-slate-900">{currentUser.clothingSize || '—'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">سطح تجربه صعود:</span>
                      <strong className="text-teal-700">
                        {currentUser.climbingExperienceLevel === 'beginner' && 'مبتدی'}
                        {currentUser.climbingExperienceLevel === 'intermediate' && 'متوسط'}
                        {currentUser.climbingExperienceLevel === 'advanced' && 'پیشرفته'}
                        {!currentUser.climbingExperienceLevel && 'تعیین‌نشده'}
                      </strong>
                    </div>
                    <div className="pt-1 border-t border-slate-200">
                      <span className="text-slate-500 block mb-1">حساسیت/ملاحظات پزشکی:</span>
                      <p className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                        {currentUser.medicalConditions || 'بدون حساسیت خاص پزشکی'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Form */
                <form onSubmit={handleSaveBasicInfo} className="space-y-4">
                  {/* Photo Upload Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 mb-4">
                    <div className="relative w-24 h-24 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center overflow-hidden shrink-0 group">
                      {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="پیش‌نمایش تصویر" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-slate-400">
                          <UserIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                          <span className="text-[9px] block">فاقد عکس</span>
                        </div>
                      )}
                      
                      {formData.avatarUrl && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">پیش‌نمایش</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-1.5 text-center sm:text-right">
                      <h4 className="text-xs font-black text-slate-800">عکس پرسنلی / تصویر عضو</h4>
                      <p className="text-[10px] text-slate-500">
                        یک تصویر پرسنلی واضح با فرمت JPG یا PNG انتخاب کنید. حداکثر حجم مجاز: ۵ مگابایت.
                      </p>
                      
                      {avatarError && (
                        <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                          {avatarError}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <label
                          htmlFor="admin-member-avatar-upload"
                          className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-[10px] font-black cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{formData.avatarUrl ? 'تغییر عکس' : 'انتخاب و آپلود عکس'}</span>
                        </label>
                        <input
                          type="file"
                          id="admin-member-avatar-upload"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        
                        {formData.avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[10px] font-black transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف عکس</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">نام کامل</label>
                      <input
                        type="text"
                        value={formData.fullName || ''}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">نام پدر</label>
                      <input
                        type="text"
                        value={formData.fatherName || ''}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">کد ملی</label>
                      <input
                        type="text"
                        value={formData.nationalId || ''}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">شماره تماس</label>
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">نام فرد اضطراری</label>
                      <input
                        type="text"
                        value={formData.emergencyContactName || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تلفن اضطراری</label>
                      <input
                        type="text"
                        value={formData.emergencyContactPhone || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">گروه خونی</label>
                      <input
                        type="text"
                        value={formData.bloodType || ''}
                        onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white font-mono"
                        placeholder="O+, A-, B+..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">سایز کفش سنگ‌نوردی</label>
                      <input
                        type="text"
                        value={formData.shoeSize || ''}
                        onChange={(e) => setFormData({ ...formData, shoeSize: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">ملاحظات و حساسیت‌های پزشکی</label>
                      <input
                        type="text"
                        value={formData.medicalConditions || ''}
                        onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                        className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white text-amber-800 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      <span>ذخیره تغییرات پرونده</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: SPORTS INSURANCE */}
          {activeTab === 'insurance' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                    currentUser.isInsuranceValid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">وضعیت کارت بیمه ورزشی فدراسیون</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      شماره کارت: <strong className="text-slate-900 font-mono">{currentUser.insuranceNumber ? toPersianDigits(currentUser.insuranceNumber) : 'ثبت نشده'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {currentUser.isInsuranceValid ? (
                    <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>بیمه‌نامه معتبر است</span>
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>بیمه‌نامه منقضی یا فاقد اعتبار</span>
                    </span>
                  )}

                  <button
                    onClick={handleQuickExtendInsurance}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-xs flex items-center gap-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>تمدید سریع بیمه (یک‌ساله)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                  <span className="text-slate-500 font-bold block">تاریخ انقضای فعلی:</span>
                  <p className="text-base font-black text-slate-900 font-mono">
                    {currentUser.insuranceExpiryDate ? toPersianDigits(currentUser.insuranceExpiryDate) : 'تعیین‌نشده'}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                  <span className="text-slate-500 font-bold block">وضعیت دسترسی صعود:</span>
                  <p className={`text-base font-black ${currentUser.isInsuranceValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currentUser.isInsuranceValid ? 'مجاز به تمرین و صعود روی دیواره' : 'ممنوعیت تمرین بدون کارت بیمه'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENROLLMENTS & COURSES */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>سوابق و وضعیت ثبت‌نام در سانس‌ها و دوره‌های ورزشی</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  مدیران و منشی باشگاه می‌توانند تاریخ شروع و پایان دوره‌ها را ویرایش نمایند.
                </span>
              </div>

              {enrollments.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">عنوان سانس/دوره</th>
                        <th className="p-3">مربی مسئول</th>
                        <th className="p-3">تاریخ شروع دوره</th>
                        <th className="p-3">تاریخ پایان و انقضا</th>
                        <th className="p-3 text-center">جلسات (مصرفی/مجاز)</th>
                        <th className="p-3 text-center">وضعیت</th>
                        <th className="p-3 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enrollments.map((en) => {
                        const session = dbStore.getSessions().find((s) => s.id === en.sessionId);
                        return (
                          <tr key={en.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">
                              <div>{session?.title || en.sessionId}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {session?.daysOfWeek ? session.daysOfWeek.join('، ') : 'برنامه منظم'} ({session?.startTime || '—'} الی {session?.endTime || '—'})
                              </div>
                            </td>
                            <td className="p-3 font-bold text-teal-700">{session?.coachName || 'مربی باشگاه'}</td>
                            <td className="p-3 font-mono font-bold text-slate-800">
                              {toPersianDigits(en.startDate || en.enrolledAt)}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800">
                              {toPersianDigits(en.endDate || en.expireDate)}
                            </td>
                            <td className="p-3 text-center font-mono text-xs">
                              <span className="font-bold text-teal-700">{toPersianDigits(en.usedSessionsCount || 0)}</span>
                              <span className="text-slate-400"> / </span>
                              <span className="text-slate-600">{toPersianDigits(en.totalSessionsAllowed || 12)}</span>
                            </td>
                            <td className="p-3 text-center">
                              {en.status === 'active' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ثبت‌نام فعال
                                </span>
                              ) : en.status === 'expired' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  منقضی شده
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  لغو / انصراف
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedEnrollmentForEdit(en);
                                  setIsEditEnrollModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs border border-teal-200 transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                                title="ویرایش تاریخ شروع، تاریخ پایان، سقف جلسات و وضعیت"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>ویرایش تاریخ و دوره</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  هیچ دوره یا ثبتی برای این عضو وجود ندارد.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FINANCE & DEBTS */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {/* Financial Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-600 font-bold block">مجموع پرداختی‌های تاییدشده:</span>
                    <p className="text-xl font-black text-emerald-800 font-mono mt-1">
                      {toPersianDigits((totalPaid || 0).toLocaleString('fa-IR'))} تومان
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-600 font-bold block">مجموع بدهی‌های جاری (مطالبات معوقه):</span>
                    <p className="text-xl font-black text-rose-800 font-mono mt-1">
                      {toPersianDigits((totalDebt || 0).toLocaleString('fa-IR'))} تومان
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-rose-600" />
                </div>
              </div>

              {/* Outstanding Debts Table */}
              {debtorRecords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>فهرست بدهی‌های ثبت‌شده به نام این کاربر</span>
                  </h4>
                  <div className="overflow-x-auto border border-rose-200 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-rose-50/80 text-rose-900 font-bold border-b border-rose-200">
                        <tr>
                          <th className="p-3">عنوان بدهی</th>
                          <th className="p-3">مبلغ (تومان)</th>
                          <th className="p-3">تاریخ سررسید</th>
                          <th className="p-3">یادداشت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {debtorRecords.map((deb) => (
                          <tr key={deb.id} className="hover:bg-rose-50/40">
                            <td className="p-3 font-bold text-slate-900">{deb.categoryTitle}</td>
                            <td className="p-3 font-black text-rose-700 font-mono">{toPersianDigits((deb.amount || 0).toLocaleString('fa-IR'))}</td>
                            <td className="p-3 font-mono text-slate-600">{toPersianDigits(deb.dueDate)}</td>
                            <td className="p-3 text-slate-500">{deb.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transactions History */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  <span>ریز تراکنش‌های مالی کاربر</span>
                </h4>
                {transactions.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">توضیحات تراکنش / بابت</th>
                          <th className="p-3">ماهیت مالی</th>
                          <th className="p-3">روش پرداخت</th>
                          <th className="p-3">مبلغ (تومان)</th>
                          <th className="p-3">تاریخ ثبت</th>
                          <th className="p-3 text-center">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((trx) => {
                          const isDebit =
                            trx.type === 'charge' ||
                            (trx.description?.includes('بابت فاکتور') && !trx.description?.includes('تسویه')) ||
                            trx.description?.includes('منظور به حساب') ||
                            trx.description?.includes('بدهی');

                          return (
                            <tr key={trx.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{trx.description}</td>
                              <td className="p-3">
                                {isDebit ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                                    بدهکار (بدهی)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                                    بستانکار (پرداخت)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">
                                {trx.method === 'pos' && 'کارت‌خوان سالن'}
                                {trx.method === 'online' && 'درگاه آنلاین'}
                                {trx.method === 'cash' && 'نقدی'}
                                {trx.method === 'card_to_card' && 'کارت‌به‌کارت'}
                              </td>
                              <td className="p-3 font-black text-teal-700 font-mono">{toPersianDigits((trx.amount || 0).toLocaleString('fa-IR'))}</td>
                              <td className="p-3 font-mono text-slate-500">{toPersianDigits(trx.createdAt)}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {(() => {
                                  const inv = dbStore.findShopInvoiceFromDescription(trx.description);
                                  if (!inv) return null;
                                  return (
                                    <button
                                      onClick={() => setSelectedShopInvoice(inv)}
                                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 inline-flex items-center gap-1"
                                      title="مشاهده و پرینت فاکتور"
                                    >
                                      <Receipt className="w-3 h-3 text-teal-600" />
                                      فاکتور
                                    </button>
                                  );
                                })()}
                                {trx.status === 'completed' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    تکمیل‌شده
                                  </span>
                                )}
                                {trx.status === 'pending' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    در انتظار
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    هیچ تراکنش مالی برای این کاربر ثبت نشده است.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {/* Attendance Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
                  <span className="text-slate-500 font-bold block">مجموع جلسات</span>
                  <span className="text-lg font-black text-slate-900 font-mono mt-1 block">
                    {toPersianDigits(totalAttendanceCount)}
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center">
                  <span className="text-emerald-700 font-bold block">حاضر</span>
                  <span className="text-lg font-black text-emerald-800 font-mono mt-1 block">
                    {toPersianDigits(presentCount)}
                  </span>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-center">
                  <span className="text-rose-700 font-bold block">غایب</span>
                  <span className="text-lg font-black text-rose-800 font-mono mt-1 block">
                    {toPersianDigits(absentCount)}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-center">
                  <span className="text-amber-700 font-bold block">غیبت موجه</span>
                  <span className="text-lg font-black text-amber-800 font-mono mt-1 block">
                    {toPersianDigits(excusedCount)}
                  </span>
                </div>
              </div>

              {/* Attendance Records Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>تاریخچه ریز حضور و غیاب در جلسات</span>
                </h4>
                {attendanceRecords.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">تاریخ جلسه</th>
                          <th className="p-3">کد / شناسه سانس</th>
                          <th className="p-3 text-center">وضعیت حضور</th>
                          <th className="p-3">ثبت‌کننده</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceRecords.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-900">{toPersianDigits(att.date)}</td>
                            <td className="p-3 font-mono text-slate-600">{att.sessionId}</td>
                            <td className="p-3 text-center">
                              {att.status === 'present' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  حاضر
                                </span>
                              )}
                              {att.status === 'absent' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  غایب
                                </span>
                              )}
                              {att.status === 'excused' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  غیبت موجه
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-500">{att.recordedBy || 'مربی'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    هنوز رکوردی برای حضور و غیاب این ورزشکار ثبت نشده است.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: FAMILY LINKS */}
          {activeTab === 'family' && (
            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>پیوند خانوادگی (والدین و فرزندان مرتبط)</span>
              </h3>

              {/* Linked Parents */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">اولیاء و سرپرستان مرتبط:</h4>
                {linkedParents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {linkedParents.map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:bg-teal-50/50 transition-all"
                      >
                        <div>
                          <p className="font-black text-slate-900 text-xs">{p.fullName}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            تماس: {toPersianDigits(p.phone)} • کد ملی: {toPersianDigits(p.nationalId)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSelectMemberInternal(p)}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-[11px] font-bold hover:bg-teal-700 cursor-pointer"
                        >
                          مشاهده پرونده
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-bold bg-slate-50 p-4 rounded-xl">
                    هیچ ولی یا سرپرستی به این پرونده متصل نشده است.
                  </p>
                )}
              </div>

              {/* Linked Children */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700">فرزندان / ورزشکاران زیرمجموعه:</h4>
                {linkedChildren.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {linkedChildren.map((ch) => (
                      <div
                        key={ch.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:bg-teal-50/50 transition-all"
                      >
                        <div>
                          <p className="font-black text-slate-900 text-xs">{ch.fullName}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            کد ملی: {toPersianDigits(ch.nationalId)} • همراه: {toPersianDigits(ch.phone)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSelectMemberInternal(ch)}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-[11px] font-bold hover:bg-teal-700 cursor-pointer"
                        >
                          مشاهده پرونده
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-bold bg-slate-50 p-4 rounded-xl">
                    فرزندی به این حساب متصل نیست.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>تاریخچه تغییرات سیستم و لاگ‌های پرونده</span>
              </h3>

              {auditLogs.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">عنوان اقدام</th>
                        <th className="p-3">توضیحات و جزییات</th>
                        <th className="p-3">انجام‌دهنده</th>
                        <th className="p-3">زمان ثبت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900 font-sans">{log.action}</td>
                          <td className="p-3 text-slate-600 font-sans">{log.details}</td>
                          <td className="p-3 font-sans font-bold text-teal-700">{log.userName}</td>
                          <td className="p-3 text-slate-400">{toPersianDigits(log.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لاگ سیستمی برای این پرونده وجود ندارد.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500 font-bold flex items-center gap-2">
            <span>شناسه پرونده:</span>
            <span className="font-mono text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded-lg">{currentUser.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportFullPersonDataToExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>دانلود کامل اکسل پرونده</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xs"
            >
              بستن پرونده
            </button>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <Key className="w-5 h-5" />
                <h3 className="text-base text-slate-900">ریست کلمه عبور کاربر</h3>
              </div>
              <button
                onClick={() => setResetPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
              شما در حال تغییر یا ریست کلمه عبور برای <strong>«{currentUser.fullName}»</strong> هستید.
              در صورت خالی گذاشتن فیلد جدید، کلمه عبور به‌صورت خودکار به <strong>کد ملی ({toPersianDigits(currentUser.nationalId)})</strong> ریست خواهد شد.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  کلمه عبور جدید (اختیاری - یا پیش‌فرض کد ملی):
                </label>
                <input
                  type="text"
                  value={customNewPass}
                  onChange={(e) => setCustomNewPass(e.target.value)}
                  placeholder={`پیش‌فرض: ${currentUser.nationalId}`}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  تایید و تغییر رمز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop Invoice Detail & Thermal Receipt Modal */}
      {selectedShopInvoice && (
        <ShopInvoiceDetailModal
          invoice={selectedShopInvoice}
          onClose={() => setSelectedShopInvoice(null)}
        />
      )}

      {/* Edit Enrollment Dates Modal */}
      <EditEnrollmentModal
        isOpen={isEditEnrollModalOpen}
        enrollment={selectedEnrollmentForEdit}
        session={dbStore.getSessions().find((s) => s.id === selectedEnrollmentForEdit?.sessionId)}
        onClose={() => {
          setIsEditEnrollModalOpen(false);
          setSelectedEnrollmentForEdit(null);
        }}
        onSaved={() => {
          showToast('تاریخ و مشخصات دوره ورزشکار با موفقیت ویرایش و ذخیره شد.');
          if (onDataChanged) onDataChanged();
        }}
      />

      {/* Digital Membership Card Modal */}
      <DigitalMembershipCardModal
        user={currentUser}
        isOpen={isMembershipCardOpen}
        onClose={() => setIsMembershipCardOpen(false)}
        enrollments={enrollments}
      />
    </div>
  );
};
