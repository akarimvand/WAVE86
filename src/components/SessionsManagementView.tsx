import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  Edit,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  CreditCard,
  X,
  XCircle,
  Eye,
  FileText,
  UserCheck,
  UserX,
  Check,
  Phone,
  User,
  Edit3,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { JalaliDatePicker } from './JalaliDatePicker';
import { EditEnrollmentModal } from './EditEnrollmentModal';
import { TrainingSession, SessionEnrollment, User as UserType } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { formatJalaliDate, getCurrentJalaliDate, addMonthsToJalali } from '../utils/jalaliDate';

interface SessionsManagementViewProps {
  currentUserRole?: string;
}

export const SessionsManagementView: React.FC<SessionsManagementViewProps> = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>(() => dbStore.getSessions());
  const [enrollments, setEnrollments] = useState<SessionEnrollment[]>(() => dbStore.getEnrollments());
  const [users, setUsers] = useState<UserType[]>(() => dbStore.getUsers().filter((u) => u.isActive));

  React.useEffect(() => {
    const handleDbUpdate = () => {
      setSessions([...dbStore.getSessions()]);
      setEnrollments([...dbStore.getEnrollments()]);
      setUsers([...dbStore.getUsers().filter((u) => u.isActive)]);
    };

    window.addEventListener('dbStoreUpdated', handleDbUpdate);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleDbUpdate);
    };
  }, []);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');

  // Modals
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedSessionForEnroll, setSelectedSessionForEnroll] = useState<TrainingSession | null>(null);
  const [selectedUserIdForEnroll, setSelectedUserIdForEnroll] = useState('');
  const [selectedUserIdsForEnroll, setSelectedUserIdsForEnroll] = useState<string[]>([]);
  const [enrollSearchQuery, setEnrollSearchQuery] = useState('');
  const [enrollStartDate, setEnrollStartDate] = useState('');
  const [enrollEndDate, setEnrollEndDate] = useState('');
  const [enrollTotalSessions, setEnrollTotalSessions] = useState('12');
  const [paymentMethodForEnroll, setPaymentMethodForEnroll] = useState<'pos' | 'card_to_card' | 'cash' | 'online'>('pos');
  const [enrollMessage, setEnrollMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);

  // Edit Enrollment Dates & Info Modal State
  const [editingEnrollment, setEditingEnrollment] = useState<SessionEnrollment | null>(null);
  const [isEditEnrollmentModalOpen, setIsEditEnrollmentModalOpen] = useState(false);

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedSessionForMembers, setSelectedSessionForMembers] = useState<TrainingSession | null>(null);

  // Inspector & Cardex Modal State
  const [inspectorSession, setInspectorSession] = useState<TrainingSession | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'athletes' | 'cardex'>('athletes');
  const [inspectorSearch, setInspectorSearch] = useState('');
  const [selectedCardexDate, setSelectedCardexDate] = useState<string>('1403/05/20');

  const openInspectorModal = (sess: TrainingSession, tab: 'athletes' | 'cardex' = 'athletes') => {
    setInspectorSession(sess);
    setInspectorTab(tab);
    setInspectorSearch('');

    const sessionAttendance = dbStore.getAttendanceRecords(sess.id);
    const uniqueDates = Array.from(new Set(sessionAttendance.map((a) => a.date)));
    if (!uniqueDates.includes('1403/05/20')) {
      uniqueDates.unshift('1403/05/20');
    }
    if (!uniqueDates.includes('1403/05/18')) {
      uniqueDates.unshift('1403/05/18');
    }
    setSelectedCardexDate(uniqueDates[0]);
  };

  const handleQuickAttendanceToggle = (
    sessionId: string,
    date: string,
    userId: string,
    userName: string,
    newStatus: 'present' | 'absent' | 'excused'
  ) => {
    dbStore.recordAttendance(sessionId, date, [{ userId, userName, status: newStatus }], 'مدیر سیستم');
    refreshData();
  };

  // Form State for Add/Edit Session
  const [formTitle, setFormTitle] = useState('');
  const [formSportType, setFormSportType] = useState<TrainingSession['sportType']>('سنگ‌نوردی عمومی');
  const [formCoachId, setFormCoachId] = useState('');
  const [formDays, setFormDays] = useState<('شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنج‌شنبه' | 'جمعه')[]>(['شنبه', 'دوشنبه', 'چهارشنبه']);
  const [formStartTime, setFormStartTime] = useState('17:00');
  const [formEndTime, setFormEndTime] = useState('19:00');
  const [formCapacity, setFormCapacity] = useState('15');
  const [formSessionsLimit, setFormSessionsLimit] = useState('12');
  const [formMonthlyFee, setFormMonthlyFee] = useState('1500000');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formError, setFormError] = useState('');

  const coaches = users.filter((u) => (u?.roles || []).includes('coach'));

  const refreshData = () => {
    setSessions(dbStore.getSessions());
    setEnrollments(dbStore.getEnrollments());
  };

  const resetForm = () => {
    setFormTitle('');
    setFormSportType('سنگ‌نوردی عمومی');
    setFormCoachId('');
    setFormDays(['شنبه', 'دوشنبه', 'چهارشنبه']);
    setFormStartTime('17:00');
    setFormEndTime('19:00');
    setFormCapacity('15');
    setFormSessionsLimit('12');
    setFormMonthlyFee('1500000');
    setFormDescription('');
    setFormStartDate('');
    setFormEndDate('');
    setFormError('');
    setEditingSession(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddSessionModalOpen(true);
  };

  const openEditModal = (sess: TrainingSession) => {
    setEditingSession(sess);
    setFormTitle(sess.title);
    setFormSportType(sess.sportType);
    setFormCoachId(sess.coachId);
    setFormDays(sess.daysOfWeek);
    setFormStartTime(sess.startTime);
    setFormEndTime(sess.endTime);
    setFormCapacity(sess.capacity.toString());
    setFormSessionsLimit((sess.sessionsLimit ?? 12).toString());
    setFormMonthlyFee(sess.monthlyFee.toString());
    setFormDescription(sess.description || '');
    setFormStartDate(sess.startDate || '');
    setFormEndDate(sess.endDate || '');
    setFormError('');
    setIsAddSessionModalOpen(true);
  };

  const checkCoachAvailability = (coachId: string, days: string[], start: string, end: string, excludeSessionId?: string) => {
    const coachSessions = sessions.filter(s => s.coachId === coachId && s.id !== excludeSessionId && s.isActive);
    for (const s of coachSessions) {
      const sharedDays = s.daysOfWeek.filter(d => days.includes(d));
      if (sharedDays.length > 0) {
        if (start < s.endTime && s.startTime < end) {
          return { isAvailable: false, conflictSession: s.title };
        }
      }
    }
    return { isAvailable: true };
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formTitle.trim()) return;
    if (!formCoachId) {
      setFormError('لطفاً یک مربی انتخاب کنید.');
      return;
    }
    if (formDays.length === 0) {
      setFormError('لطفاً حداقل یک روز را انتخاب کنید.');
      return;
    }

    const availability = checkCoachAvailability(formCoachId, formDays, formStartTime, formEndTime, editingSession?.id);
    if (!availability.isAvailable) {
      setFormError(`مربی انتخاب شده در این روزها و ساعات در سانس «${availability.conflictSession}» کلاس دارد و آزاد نیست.`);
      return;
    }

    const selectedCoach = coaches.find((c) => c.id === formCoachId);
    const coachName = selectedCoach ? selectedCoach.fullName : 'نامشخص';

    const payload = {
      title: formTitle,
      sportType: formSportType,
      coachId: formCoachId,
      coachName: coachName,
      daysOfWeek: formDays,
      startTime: formStartTime,
      endTime: formEndTime,
      capacity: parseInt(formCapacity, 10) || 10,
      sessionsLimit: parseInt(formSessionsLimit, 10) || 12,
      monthlyFee: parseInt(formMonthlyFee, 10) || 1000000,
      isActive: true,
      description: formDescription,
      startDate: formStartDate || undefined,
      endDate: formEndDate || undefined,
    };

    if (editingSession) {
      dbStore.updateSession(editingSession.id, payload, 'مدیر سیستم');
    } else {
      dbStore.addSession(payload, 'مدیر سیستم');
    }

    refreshData();
    setIsAddSessionModalOpen(false);
    resetForm();
  };

  const handleDeleteSession = (id: string, title: string) => {
    if (confirm(`آیا از حذف سانس «${title}» اطمینان دارید؟`)) {
      dbStore.deleteSession(id, 'مدیر سیستم');
      refreshData();
    }
  };

  const handleDayToggle = (day: 'شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنج‌شنبه' | 'جمعه') => {
    if (formDays.includes(day)) {
      setFormDays(formDays.filter((d) => d !== day));
    } else {
      setFormDays([...formDays, day]);
    }
  };

  // Enrollment handling
  const openEnrollModal = (sess: TrainingSession) => {
    const today = formatJalaliDate(getCurrentJalaliDate());
    const defaultEnd = addMonthsToJalali(today, 1);
    const finalEnd = (sess.endDate && sess.endDate < defaultEnd) ? sess.endDate : defaultEnd;

    setSelectedSessionForEnroll(sess);
    setSelectedUserIdForEnroll('');
    setSelectedUserIdsForEnroll([]);
    setEnrollSearchQuery('');
    setEnrollStartDate(sess.startDate || today);
    setEnrollEndDate(finalEnd);
    setEnrollTotalSessions((sess.sessionsLimit ?? 12).toString());
    setPaymentMethodForEnroll('pos');
    setEnrollMessage(null);
    setIsSubmittingEnroll(false);
    setIsEnrollModalOpen(true);
  };

  const handleConfirmEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingEnroll) return;

    if (!selectedSessionForEnroll) {
      setEnrollMessage({ type: 'error', text: 'سانس مشخص نشده است.' });
      return;
    }

    if (selectedUserIdsForEnroll.length === 0) {
      setEnrollMessage({ type: 'error', text: 'لطفاً حداقل یک ورزشکار را جهت ثبت‌نام انتخاب کنید.' });
      return;
    }

    if (!enrollStartDate.trim()) {
      setEnrollMessage({ type: 'error', text: 'لطفاً تاریخ شروع دوره را تعیین نمایید.' });
      return;
    }

    if (!enrollEndDate.trim()) {
      setEnrollMessage({ type: 'error', text: 'لطفاً تاریخ پایان دوره را تعیین نمایید.' });
      return;
    }

    setIsSubmittingEnroll(true);
    let successCount = 0;
    let failureCount = 0;
    let lastError = '';

    for (const userId of selectedUserIdsForEnroll) {
      const res = dbStore.enrollAthlete(
        selectedSessionForEnroll.id,
        userId,
        'منشی/مدیر',
        paymentMethodForEnroll,
        {
          startDate: enrollStartDate.trim(),
          endDate: enrollEndDate.trim(),
          totalSessionsAllowed: parseInt(enrollTotalSessions, 10) || selectedSessionForEnroll.sessionsLimit || 12,
        }
      );
      if (res && 'error' in res) {
        failureCount++;
        lastError = res.error;
      } else {
        successCount++;
      }
    }

    setIsSubmittingEnroll(false);

    if (successCount > 0) {
      const msg = failureCount > 0
        ? `ثبت‌نام برای ${toPersianDigits(successCount)} ورزشکار با موفقیت انجام شد. اما برای ${toPersianDigits(failureCount)} ورزشکار با خطا مواجه شد: ${lastError}`
        : `ثبت‌نام برای ${toPersianDigits(successCount)} ورزشکار با بازه ${toPersianDigits(enrollStartDate)} تا ${toPersianDigits(enrollEndDate)} با موفقیت انجام شد.`;

      setEnrollMessage({ type: 'success', text: msg });
      refreshData();
      setTimeout(() => {
        setIsEnrollModalOpen(false);
      }, 2000);
    } else {
      setEnrollMessage({ type: 'error', text: `ثبت‌نام ناموفق بود: ${lastError}` });
    }
  };

  const handleCancelEnrollment = (enrId: string) => {
    const enr = enrollments.find((e) => e.id === enrId);
    if (!enr) return;

    const athleteAttendance = dbStore.getAttendanceRecordsForUser(enr.userId).filter((a) => a.sessionId === enr.sessionId);
    const hasAttendance = athleteAttendance.length > 0;

    let confirmMsg = `آیا از حذف ورزشکار "${enr.athleteName}" از این سانس اطمینان دارید؟`;
    if (hasAttendance) {
      confirmMsg = `⚠️ هشدار مهم:\nورزشکار "${enr.athleteName}" دارای ${toPersianDigits(athleteAttendance.length)} سابقه حضور و غیاب در این سانس است.\n\nدر صورت حذف، طبق استانداردهای بانک‌های اطلاعاتی، تمامی اطلاعات ثبت‌نام و کلیه سوابق حضور و غیاب او در این سانس به صورت کامل و دائمی (Cascade Delete) پاک خواهند شد.\n\nآیا همچنان مایل به حذف کامل این ورزشکار و پاکسازی سوابق او هستید؟`;
    }

    if (confirm(confirmMsg)) {
      setIsSubmittingEnroll(true);
      void (async () => {
        const result = await dbStore.deleteEnrollment(enrId, 'مدیر سیستم');
        if (!result.ok) {
          // Server rejected definitively — state untouched, show the reason.
          window.alert(`حذف انجام نشد: ${result.error}`);
        } else if (result.queued) {
          window.alert('اتصال برقرار نیست یا نشست منقضی شده است؛ حذف پس از بازگشت اتصال به‌صورت خودکار اعمال می‌شود.');
        }
        refreshData();
        setIsSubmittingEnroll(false);
      })();
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.title.includes(searchTerm) || s.coachName.includes(searchTerm);
    const matchesSport = sportFilter === 'all' || s.sportType === sportFilter;
    return matchesSearch && matchesSport;
  });

  const enrolledUserIdsForSelected = selectedSessionForEnroll
    ? enrollments
        .filter((e) => e.sessionId === selectedSessionForEnroll.id && e.status === 'active')
        .map((e) => e.userId)
    : [];

  const unregisteredUsers = users.filter((u) => !enrolledUserIdsForSelected.includes(u.id));

  const filteredUnregisteredUsers = unregisteredUsers.filter((u) => {
    if (!enrollSearchQuery) return true;
    const q = enrollSearchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.nationalId.includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">مدیریت سانس‌ها و دوره‌های آموزشی (فاز ۲)</h2>
            <p className="text-xs text-slate-500 mt-1">
              تعریف ظرفیت کلاس‌ها، برنامه هفتگی، شهریه ماهیانه و ثبت‌نام سریع ورزشکاران
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-teal-600/20"
        >
          <Plus className="w-4 h-4" />
          تعریف سانس جدید
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی نام سانس یا مربی..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'همه سانس‌ها' },
            { key: 'بولدرینگ تخصصی', label: 'بولدرینگ' },
            { key: 'سنگ‌نوردی عمومی', label: 'عمومی' },
            { key: 'سنگ‌نوردی کودکان', label: 'کودکان' },
            { key: 'دیواره و سرطناب', label: 'دیواره' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSportFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                sportFilter === item.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSessions.map((sess) => {
          const activeEnrolledCount = enrollments.filter((e) => e.sessionId === sess.id && e.status === 'active').length;
          const isFull = activeEnrolledCount >= sess.capacity;
          const fillPercentage = Math.min(Math.round((activeEnrolledCount / sess.capacity) * 100), 100);

          let badgeColorClass = "bg-teal-50 text-teal-700 border-teal-200";
          let gradientTop = "from-teal-500 to-emerald-500";
          if (sess.sportType === 'بولدرینگ تخصصی') {
            badgeColorClass = "bg-amber-50 text-amber-700 border-amber-200";
            gradientTop = "from-amber-500 to-orange-500";
          } else if (sess.sportType === 'دیواره و سرطناب') {
            badgeColorClass = "bg-sky-50 text-sky-700 border-sky-200";
            gradientTop = "from-sky-500 to-indigo-500";
          } else if (sess.sportType === 'سنگ‌نوردی کودکان') {
            badgeColorClass = "bg-rose-50 text-rose-700 border-rose-200";
            gradientTop = "from-rose-500 to-pink-500";
          } else if (sess.sportType === 'آمادگی جسمانی') {
            badgeColorClass = "bg-purple-50 text-purple-700 border-purple-200";
            gradientTop = "from-purple-500 to-fuchsia-500";
          }

          return (
            <div
              key={sess.id}
              className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group"
            >
              {/* Highlight top border line with elegant gradient */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradientTop}`} />

              <div className="space-y-3.5">
                {/* Header Tag & Sport Type */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${badgeColorClass}`}>
                    {sess.sportType}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(sess)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                      title="ویرایش سانس"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(sess.id, sess.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف سانس"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => openInspectorModal(sess)}
                  className="text-sm font-black text-slate-800 leading-snug cursor-pointer group-hover:text-teal-600 transition-colors flex items-center justify-between"
                >
                  <span className="truncate pr-1">{sess.title}</span>
                  <Eye className="w-4 h-4 text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </h3>

                {/* Details list */}
                <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>مربی مسئول: <strong className="text-slate-800">{sess.coachName}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>روزهای برگزاری: <strong className="text-slate-800">{sess.daysOfWeek.join('، ')}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>زمان کلاس: <strong className="text-slate-800" dir="ltr">{toPersianDigits(sess.startTime)} - {toPersianDigits(sess.endTime)}</strong></span>
                  </div>

                  {/* Date Range (دوره تاریخی) Display */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0 animate-pulse" />
                    <span>دوره زمانی: <strong className="text-sky-700 font-bold">{sess.startDate ? toPersianDigits(sess.startDate) : 'بدون محدودیت'} الی {sess.endDate ? toPersianDigits(sess.endDate) : 'بدون محدودیت'}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>شهریه ماهیانه: <strong className="text-emerald-700 font-black">{toPersianDigits(((sess.monthlyFee ?? (sess as any).fee) || 0).toLocaleString('fa-IR'))} تومان</strong></span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      ظرفیت ثبت‌نام:
                    </span>
                    <span className={isFull ? 'text-rose-600 font-black' : 'text-slate-800 font-black'}>
                      {toPersianDigits(activeEnrolledCount)} از {toPersianDigits(sess.capacity)} نفر
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                    <div
                      className={`h-full transition-all rounded-full ${
                        isFull ? 'bg-rose-500' : fillPercentage > 75 ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => openEnrollModal(sess)}
                  disabled={isFull}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isFull
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/60 active:scale-[0.98]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isFull ? 'ظرفیت تکمیل' : 'ثبت‌نام ورزشکار'}
                </button>

                <button
                  onClick={() => openInspectorModal(sess, 'athletes')}
                  className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  title="لیست ورزشکاران، مربی و کارتکس روزانه"
                >
                  <Eye className="w-3.5 h-3.5 text-teal-400" />
                  <span>لیست و کارتکس ({toPersianDigits(activeEnrolledCount)})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Session Modal */}
      {isAddSessionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                {editingSession ? 'ویرایش اطلاعات سانس' : 'تعریف سانس آموزشی جدید'}
              </h3>
              <button onClick={() => setIsAddSessionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان سانس</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: سانس تخصصی بولدرینگ - بزرگسالان"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رشته ورزشی</label>
                  <select
                    value={formSportType}
                    onChange={(e) => setFormSportType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="سنگ‌نوردی عمومی">سنگ‌نوردی عمومی</option>
                    <option value="بولدرینگ تخصصی">بولدرینگ تخصصی</option>
                    <option value="دیواره و سرطناب">دیواره و سرطناب</option>
                    <option value="سنگ‌نوردی کودکان">سنگ‌نوردی کودکان</option>
                    <option value="آمادگی جسمانی">آمادگی جسمانی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مربی مسئول</label>
                  <select
                    value={formCoachId}
                    onChange={(e) => setFormCoachId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="">-- انتخاب مربی --</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Days Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">روزهای برگزاری</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const).map((day) => {
                    const isSelected = formDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Times & Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ساعت شروع</label>
                  <input
                    type="text"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    placeholder="17:00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ساعت پایان</label>
                  <input
                    type="text"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    placeholder="19:00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ظرفیت (نفر)</label>
                  <input
                    type="number"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سقف تعداد جلسات اشتراک</label>
                  <input
                    type="number"
                    value={formSessionsLimit}
                    onChange={(e) => setFormSessionsLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none text-center font-mono"
                  />
                </div>
              </div>

              {/* Monthly Fee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شهریه ماهیانه (تومان)</label>
                <input
                  type="number"
                  value={formMonthlyFee}
                  onChange={(e) => setFormMonthlyFee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Date Range (دوره تاریخی - اختیاری) */}
              <div className="grid grid-cols-2 gap-3 text-right">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ شروع عمومی (اختیاری)
                  </label>
                  <JalaliDatePicker
                    value={formStartDate}
                    onChange={(val) => setFormStartDate(val)}
                    placeholder="اختیاری..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ پایان عمومی (اختیاری)
                  </label>
                  <JalaliDatePicker
                    value={formEndDate}
                    onChange={(val) => setFormEndDate(val)}
                    placeholder="اختیاری..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و نیازمندی‌ها</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20"
                >
                  ذخیره سانس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Athlete Modal */}
      {isEnrollModalOpen && selectedSessionForEnroll && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">ثبت‌نام گروهی یا انفرادی اعضا در سانس</h3>
                <p className="text-[11px] text-teal-700 font-bold mt-0.5">{selectedSessionForEnroll.title}</p>
              </div>
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {enrollMessage && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  enrollMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {enrollMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{enrollMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleConfirmEnroll} className="space-y-4">
              {/* Search unregistered members */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">جستجو در میان اعضای ثبت‌نام‌نشده</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="نام، کد ملی یا شماره تلفن را جستجو کنید..."
                    value={enrollSearchQuery}
                    onChange={(e) => setEnrollSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 animate-pulse" />
                </div>
              </div>

              {/* Selection list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">
                    لیست اعضا ({toPersianDigits(filteredUnregisteredUsers.length)} نفر یافت شد)
                  </span>
                  
                  {filteredUnregisteredUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allFilteredIds = filteredUnregisteredUsers.map((u) => u.id);
                        const isAllSelected = allFilteredIds.every((id) => selectedUserIdsForEnroll.includes(id));
                        if (isAllSelected) {
                          // Uncheck all of them
                          setSelectedUserIdsForEnroll(selectedUserIdsForEnroll.filter((id) => !allFilteredIds.includes(id)));
                        } else {
                          // Check all of them
                          setSelectedUserIdsForEnroll(Array.from(new Set([...selectedUserIdsForEnroll, ...allFilteredIds])));
                        }
                      }}
                      className="text-[11px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100/50 px-2.5 py-1 rounded-lg transition-all"
                    >
                      {filteredUnregisteredUsers.map((u) => u.id).every((id) => selectedUserIdsForEnroll.includes(id)) 
                        ? 'لغو انتخاب همه' 
                        : '✓ انتخاب همه نتایج'}
                    </button>
                  )}
                </div>

                <div className="border border-slate-200/80 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50 p-2 space-y-1">
                  {filteredUnregisteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-bold">
                      عضوی جهت ثبت‌نام یافت نشد یا همگی قبلاً ثبت‌نام شده‌اند.
                    </div>
                  ) : (
                    filteredUnregisteredUsers.map((u) => {
                      const isChecked = selectedUserIdsForEnroll.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                            isChecked ? 'bg-teal-50 border border-teal-100/40' : 'hover:bg-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIdsForEnroll([...selectedUserIdsForEnroll, u.id]);
                                } else {
                                  setSelectedUserIdsForEnroll(selectedUserIdsForEnroll.filter((id) => id !== u.id));
                                }
                              }}
                              className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 accent-teal-600"
                            />
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-800 block">{u.fullName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                کد ملی: {toPersianDigits(u.nationalId)} {u.phone ? `| همراه: ${toPersianDigits(u.phone)}` : ''}
                              </span>
                            </div>
                          </div>
                          
                          {u.roles?.includes('athlete') && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-[9px] font-black text-slate-600">
                              ورزشکار
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedUserIdsForEnroll.length > 0 && (
                <div className="text-right text-[11px] font-bold text-teal-700 bg-teal-50/70 p-2.5 rounded-xl border border-teal-100/50 flex items-center justify-between">
                  <span>تعداد اعضای انتخاب شده برای ثبت‌نام:</span>
                  <span className="font-black text-sm">{toPersianDigits(selectedUserIdsForEnroll.length)} نفر</span>
                </div>
              )}

              {/* Custom Date Range & Sessions Limit for Enrollment */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="text-xs font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200/60 pb-2">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>تعیین بازه زمانی و تاریخ دوره برای ورزشکار(ان)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تاریخ شروع دوره (شمسی) <span className="text-rose-500">*</span>
                    </label>
                    <JalaliDatePicker
                      value={enrollStartDate}
                      onChange={setEnrollStartDate}
                      placeholder="تاریخ شروع..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تاریخ پایان و انقضای دوره (شمسی) <span className="text-rose-500">*</span>
                    </label>
                    <JalaliDatePicker
                      value={enrollEndDate}
                      onChange={setEnrollEndDate}
                      placeholder="تاریخ پایان..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    سقف تعداد جلسات مجاز دوره
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={enrollTotalSessions}
                    onChange={(e) => setEnrollTotalSessions(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="۱۲"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">روش دریافت شهریه (صدور فاکتور خودکار)</label>
                  <select
                    value={paymentMethodForEnroll}
                    onChange={(e) => setPaymentMethodForEnroll(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="pos">دستگاه پوز (کارت‌خوان باشگاه)</option>
                    <option value="card_to_card">کارت به کارت</option>
                    <option value="cash">نقدی</option>
                    <option value="online">درگاه پرداخت آنلاین</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>شهریه قابل پرداخت (به ازای هر نفر):</span>
                  <strong className="text-emerald-700 font-black">{toPersianDigits(((selectedSessionForEnroll?.monthlyFee ?? (selectedSessionForEnroll as any)?.fee) || 0).toLocaleString('fa-IR'))} تومان</strong>
                </div>
                {selectedUserIdsForEnroll.length > 1 && (
                  <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1.5">
                    <span>مجموع شهریه دریافتی:</span>
                    <strong className="text-indigo-700 font-black">
                      {toPersianDigits((((selectedSessionForEnroll?.monthlyFee ?? (selectedSessionForEnroll as any)?.fee) || 0) * selectedUserIdsForEnroll.length).toLocaleString('fa-IR'))} تومان
                    </strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>مدت اعتبار ثبت‌نام:</span>
                  <span className="font-bold text-slate-700 font-mono">
                    از {toPersianDigits(enrollStartDate || '---')} تا {toPersianDigits(enrollEndDate || '---')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnroll || selectedUserIdsForEnroll.length === 0}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5"
                >
                  {isSubmittingEnroll ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>در حال ثبت...</span>
                    </>
                  ) : (
                    <span>تأیید و ثبت‌نام اعضا</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrolled Members List Modal */}
      {isMembersModalOpen && selectedSessionForMembers && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">لیست اعضای ثبت‌نام‌شده</h3>
                <p className="text-[11px] text-teal-700 font-bold mt-0.5">{selectedSessionForMembers.title}</p>
              </div>
              <button onClick={() => setIsMembersModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {enrollments.filter((e) => e.sessionId === selectedSessionForMembers.id && e.status === 'active').length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  هیچ ورزشکاری هنوز در این سانس ثبت‌نام نکرده است.
                </div>
              ) : (
                enrollments
                  .filter((e) => e.sessionId === selectedSessionForMembers.id && e.status === 'active')
                  .map((enr) => (
                    <div key={enr.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 p-2 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-900">{enr.athleteName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          کد ملی: {toPersianDigits(enr.athleteNationalId)} | تلفن: {toPersianDigits(enr.athletePhone)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                            دوره: {toPersianDigits(enr.startDate || enr.enrolledAt)} الی {toPersianDigits(enr.endDate || enr.expireDate)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            جلسات: {toPersianDigits(enr.usedSessionsCount || 0)} از {toPersianDigits(enr.totalSessionsAllowed || 12)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingEnrollment(enr);
                            setIsEditEnrollmentModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="ویرایش تاریخ شروع، پایان و سقف جلسات"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>ویرایش تاریخ و دوره</span>
                        </button>
                        <button
                          onClick={() => handleCancelEnrollment(enr.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="لغو ثبت‌نام"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Quick Inspector & Daily Attendance Cardex Modal */}
      {inspectorSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200">
                    {inspectorSession.sportType}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    ظرفیت: {toPersianDigits(enrollments.filter((e) => e.sessionId === inspectorSession.id && e.status === 'active').length)} از {toPersianDigits(inspectorSession.capacity)} نفر
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">{inspectorSession.title}</h3>
                <p className="text-xs text-slate-500">
                  برنامه: {inspectorSession.daysOfWeek.join('، ')} | ساعت {toPersianDigits(inspectorSession.startTime)} تا {toPersianDigits(inspectorSession.endTime)}
                  { (inspectorSession.startDate || inspectorSession.endDate) && ` | دوره زمانی: ${inspectorSession.startDate ? toPersianDigits(inspectorSession.startDate) : '---'} الی ${inspectorSession.endDate ? toPersianDigits(inspectorSession.endDate) : '---'}` }
                </p>
              </div>

              <button onClick={() => setInspectorSession(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Coach Card Info */}
            <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center font-black text-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-teal-300 font-bold">مربی مسئول و مدرس دوره</span>
                  <h4 className="text-sm font-black text-white">{inspectorSession.coachName}</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    تلفن تماس: {toPersianDigits(users.find((u) => u.id === inspectorSession.coachId)?.phone || 'ثبت نشده')}
                  </p>
                </div>
              </div>

              <div className="text-left">
                <span className="px-3 py-1 rounded-xl bg-white/10 text-emerald-300 text-xs font-bold border border-white/10">
                  شهریه: {toPersianDigits(((inspectorSession.monthlyFee ?? (inspectorSession as any).fee) || 0).toLocaleString('fa-IR'))} تومان
                </span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setInspectorTab('athletes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  inspectorTab === 'athletes'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>لیست ورزشکاران ثبت‌نام‌شده ({toPersianDigits(enrollments.filter((e) => e.sessionId === inspectorSession.id && e.status === 'active').length)})</span>
              </button>

              <button
                onClick={() => setInspectorTab('cardex')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  inspectorTab === 'cardex'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>کارتکس و دفتر حضورغیاب روزانه دوره</span>
              </button>
            </div>

            {/* TAB 1: ATHLETES & COACH */}
            {inspectorTab === 'athletes' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجوی نام، کد ملی یا شماره همراه..."
                    value={inspectorSearch}
                    onChange={(e) => setInspectorSearch(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                  {enrollments.filter((e) => e.sessionId === inspectorSession.id && e.status === 'active').length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      هیچ ورزشکاری هنوز در این دوره ثبت‌نام نکرده است.
                    </div>
                  ) : (
                    enrollments
                      .filter((e) => e.sessionId === inspectorSession.id && e.status === 'active')
                      .filter((e) => e.athleteName.includes(inspectorSearch) || e.athleteNationalId.includes(inspectorSearch) || e.athletePhone.includes(inspectorSearch))
                      .map((enr) => (
                        <div key={enr.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div>
                            <p className="font-bold text-slate-900">{enr.athleteName}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              کد ملی: {toPersianDigits(enr.athleteNationalId)} | تلفن: {toPersianDigits(enr.athletePhone)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-mono border border-teal-100">
                                دوره: {toPersianDigits(enr.startDate || enr.enrolledAt)} تا {toPersianDigits(enr.endDate || enr.expireDate)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                مصرف جلسات: {toPersianDigits(enr.usedSessionsCount || 0)} از {toPersianDigits(enr.totalSessionsAllowed || 12)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingEnrollment(enr);
                                setIsEditEnrollmentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="ویرایش تاریخ و دوره"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>ویرایش تاریخ و دوره</span>
                            </button>
                            <button
                              onClick={() => handleCancelEnrollment(enr.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="لغو ثبت‌نام"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DAILY ATTENDANCE CARDEX */}
            {inspectorTab === 'cardex' && (
              <div className="space-y-4">
                {/* Dates Selector Carousel */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    انتخاب تاریخ جلسه جهت بررسی و ثبت کارتکس روزانه:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {Array.from(new Set(dbStore.getAttendanceRecords(inspectorSession.id).map((a) => a.date)))
                      .concat(['1403/05/20', '1403/05/18', '1403/05/16', '1403/05/14', '1403/05/12'])
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .slice(0, 8)
                      .map((d) => (
                        <button
                          key={d}
                          onClick={() => setSelectedCardexDate(d)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                            selectedCardexDate === d
                              ? 'bg-teal-600 text-white shadow-md'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {toPersianDigits(d)}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Daily Cardex Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>لیست حضور و غیاب روز {toPersianDigits(selectedCardexDate)}</span>
                    <span className="text-[11px] text-teal-700">تغییرات بلافاصله ذخیره می‌شود</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {enrollments.filter((e) => e.sessionId === inspectorSession.id && e.status === 'active').length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        هیچ ورزشکاری در این دوره ثبت‌نام نکرده است.
                      </div>
                    ) : (
                      enrollments
                        .filter((e) => e.sessionId === inspectorSession.id && e.status === 'active')
                        .map((enr) => {
                          const attRecord = dbStore
                            .getAttendanceRecords(inspectorSession.id, selectedCardexDate)
                            .find((a) => a.userId === enr.userId);
                          const currentStatus = attRecord ? attRecord.status : 'present';

                          return (
                            <div key={enr.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                              <div>
                                <p className="font-bold text-slate-900">{enr.athleteName}</p>
                                <p className="text-[10px] text-slate-500 font-mono">کد ملی: {toPersianDigits(enr.athleteNationalId)}</p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    handleQuickAttendanceToggle(
                                      inspectorSession.id,
                                      selectedCardexDate,
                                      enr.userId,
                                      enr.athleteName,
                                      'present'
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  حاضر
                                </button>

                                <button
                                  onClick={() =>
                                    handleQuickAttendanceToggle(
                                      inspectorSession.id,
                                      selectedCardexDate,
                                      enr.userId,
                                      enr.athleteName,
                                      'absent'
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                                    currentStatus === 'absent'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-rose-50'
                                  }`}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  غایب
                                </button>

                                <button
                                  onClick={() =>
                                    handleQuickAttendanceToggle(
                                      inspectorSession.id,
                                      selectedCardexDate,
                                      enr.userId,
                                      enr.athleteName,
                                      'excused'
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                    currentStatus === 'excused'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
                                  }`}
                                >
                                  موجه
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectorSession(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Enrollment Modal */}
      <EditEnrollmentModal
        isOpen={isEditEnrollmentModalOpen}
        enrollment={editingEnrollment}
        session={sessions.find((s) => s.id === editingEnrollment?.sessionId)}
        onClose={() => {
          setIsEditEnrollmentModalOpen(false);
          setEditingEnrollment(null);
        }}
        onSaved={() => {
          refreshData();
        }}
      />
    </div>
  );
};
