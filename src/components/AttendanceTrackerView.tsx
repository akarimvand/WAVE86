import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  Save,
  CheckCircle2,
  Calendar as CalendarIcon,
  Search,
  Check,
  History,
  Edit2,
  Trash2,
  User,
  FileText,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { JalaliDatePicker } from './JalaliDatePicker';
import { TrainingSession, SessionEnrollment, AttendanceRecord, User as UserType } from '../types';
import { getCurrentJalaliDate, formatJalaliDate } from '../utils/jalaliDate';
import { toPersianDigits } from '../utils/nationalIdValidator';

export const AttendanceTrackerView: React.FC = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>(() => dbStore.getSessions());
  const [allUsers, setAllUsers] = useState<UserType[]>(() => dbStore.getUsers());
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => (sessions.length > 0 ? sessions[0].id : ''));
  const [selectedDate, setSelectedDate] = useState<string>(() => formatJalaliDate(getCurrentJalaliDate()));

  const [enrollments, setEnrollments] = useState<SessionEnrollment[]>([]);
  const [attendanceStates, setAttendanceStates] = useState<Record<string, { status: 'present' | 'absent' | 'excused' | 'club_closed', reason?: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // View mode: 'register' | 'history' | 'cardex'
  const [viewMode, setViewMode] = useState<'register' | 'history' | 'cardex'>('register');

  // History state
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);

  // Individual Cardex State
  const [cardexUserId, setCardexUserId] = useState<string>(() => (allUsers.length > 0 ? allUsers[0].id : ''));

  React.useEffect(() => {
    const handleDbUpdate = () => {
      setSessions([...dbStore.getSessions()]);
      setAllUsers([...dbStore.getUsers()]);
      if (selectedSessionId) {
        setHistoryRecords([...dbStore.getAttendanceRecords(selectedSessionId)]);
      } else {
        setHistoryRecords([...dbStore.getAttendanceRecords()]);
      }
    };

    window.addEventListener('dbStoreUpdated', handleDbUpdate);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleDbUpdate);
    };
  }, [selectedSessionId]);

  const refreshHistory = () => {
    if (selectedSessionId) {
      setHistoryRecords(dbStore.getAttendanceRecords(selectedSessionId));
    } else {
      setHistoryRecords(dbStore.getAttendanceRecords());
    }
  };

  useEffect(() => {
    if (!selectedSessionId) return;

    // Get enrolled athletes who are active on selectedDate
    const validEnr = dbStore.getEnrollmentsForSession(selectedSessionId, selectedDate);
    setEnrollments(validEnr);

    // Get existing recorded attendance for this session and date
    const existingRecords = dbStore.getAttendanceRecords(selectedSessionId, selectedDate);
    const initialMap: Record<string, { status: 'present' | 'absent' | 'excused' | 'club_closed', reason?: string }> = {};

    validEnr.forEach((enr) => {
      const match = existingRecords.find((r) => r.userId === enr.userId);
      if (match) {
        initialMap[enr.userId] = { status: match.status, reason: match.reason };
      } else {
        initialMap[enr.userId] = { status: 'present' }; // Default
      }
    });

    setAttendanceStates(initialMap);
    setSaveSuccess(false);
  }, [selectedSessionId, selectedDate]);

  useEffect(() => {
    if (viewMode === 'history') {
      refreshHistory();
    }
  }, [selectedSessionId, viewMode]);

  const handleStatusChange = (userId: string, status: 'present' | 'absent' | 'excused' | 'club_closed') => {
    setAttendanceStates((prev) => ({ ...prev, [userId]: { ...prev[userId], status } }));
  };

  const handleReasonChange = (userId: string, reason: string) => {
    setAttendanceStates((prev) => ({ ...prev, [userId]: { ...prev[userId], reason } }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: 'present' | 'absent' | 'excused' | 'club_closed', reason?: string }> = {};
    enrollments.forEach((e) => {
      updated[e.userId] = { status: 'present' };
    });
    setAttendanceStates(updated);
  };

  const handleMarkAllClubClosed = () => {
    const reason = prompt('لطفاً دلیل تعطیلی باشگاه را وارد کنید (مثلاً: تعمیرات، تعطیلات رسمی، ...):\n\nتذکر: ثبت تعطیلی از سهمیه جلسات تمامی ورزشکاران این سانس کسر خواهد کرد.');
    if (reason === null) return;
    const updated: Record<string, { status: 'present' | 'absent' | 'excused' | 'club_closed', reason?: string }> = {};
    enrollments.forEach((e) => {
      updated[e.userId] = { status: 'club_closed', reason };
    });
    setAttendanceStates(updated);
  };

  const handleSaveAttendance = () => {
    if (!selectedSessionId) return;

    if (!selectedDate || selectedDate.trim() === '') {
      alert('لطفاً تاریخ جلسه را وارد کنید.');
      return;
    }

    // Validate that future dates are not selected
    const today = formatJalaliDate(getCurrentJalaliDate());
    if (selectedDate > today) {
      alert('امکان ثبت حضور و غیاب برای تاریخ‌های آینده وجود ندارد.');
      return;
    }

    // Check if attendance for this session and date is ALREADY recorded
    const existing = dbStore.getAttendanceRecords(selectedSessionId, selectedDate);
    if (existing && existing.length > 0) {
      const confirmUpdate = confirm(
        `توجه: حضور و غیاب این سانس در تاریخ ${toPersianDigits(selectedDate)} قبلاً ثبت شده است (${toPersianDigits(existing.length)} نفر).\n\nثبت مجدد، اطلاعات این تاریخ را به‌روزرسانی می‌کند. آیا ادامه می‌دهید؟`
      );
      if (!confirmUpdate) return;
    }

    const payload = enrollments.map((enr) => ({
      userId: enr.userId,
      userName: enr.athleteName,
      status: attendanceStates[enr.userId]?.status || 'present',
      reason: attendanceStates[enr.userId]?.reason,
    }));

    dbStore.recordAttendance(selectedSessionId, selectedDate, payload, 'مربی / منشی');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Editing Past Attendance
  const handleEditPastRecord = (recId: string, newStatus: 'present' | 'absent' | 'excused' | 'club_closed', reason?: string) => {
    dbStore.updateSingleAttendanceRecord(recId, newStatus, 'مربی / مدیر', reason);
    refreshHistory();
  };

  const handleDeletePastRecord = (recId: string) => {
    if (confirm('آیا از حذف این رکورد حضور و غیاب اطمینان دارید؟')) {
      dbStore.deleteAttendanceRecord(recId, 'مدیر سیستم');
      refreshHistory();
    }
  };

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const filteredEnrollments = enrollments.filter((e) => {
    const athName = e?.athleteName || '';
    const athNatId = e?.athleteNationalId || '';
    return athName.includes(searchTerm) || athNatId.includes(searchTerm);
  });

  const totalCount = enrollments.length;
  const statesValues = Object.values(attendanceStates) as { status: string }[];
  const presentCount = statesValues.filter((s) => s.status === 'present').length;
  const absentCount = statesValues.filter((s) => s.status === 'absent').length;
  const excusedCount = statesValues.filter((s) => s.status === 'excused' || s.status === 'club_closed').length;
  const presencePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Selected Cardex User
  const cardexUser = allUsers.find((u) => u.id === cardexUserId);
  const userAttendanceRecords = cardexUserId ? dbStore.getUserAttendanceHistory(cardexUserId) : [];
  const cardexPresentCount = userAttendanceRecords.filter((r) => r.status === 'present').length;
  const cardexAbsentCount = userAttendanceRecords.filter((r) => r.status === 'absent').length;
  const cardexExcusedCount = userAttendanceRecords.filter((r) => r.status === 'excused').length;
  const cardexTotal = userAttendanceRecords.length;
  const cardexScore = cardexTotal > 0 ? Math.round((cardexPresentCount / cardexTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">ثبت، ویرایش و کاردکس حضور و غیاب (فاز ۲)</h2>
            <p className="text-xs text-slate-500 mt-1">
              ثبت الکترونیکی، امکان ویرایش سوابق گذشته و کاردکس تخصصی انفرادی برای هر ورزشکار
            </p>
          </div>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode('register')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ثبت جلسه جاری
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              viewMode === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            ویرایش سوابق گذشته
          </button>
          <button
            onClick={() => setViewMode('cardex')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              viewMode === 'cardex' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            کاردکس فردی
          </button>
        </div>
      </div>

      {/* REGISTER VIEW MODE */}
      {viewMode === 'register' && (
        <>
          {/* Selectors Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب سانس یا کلاس آموزشی</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.coachName} - {s.daysOfWeek.join('، ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ جلسه (جلالی)</label>
              <JalaliDatePicker
                value={selectedDate}
                onChange={(val) => setSelectedDate(val)}
                placeholder="انتخاب تاریخ..."
              />
              <p className="text-[10px] text-slate-500 mt-1.5 font-bold">
                محدوده دوره: از {toPersianDigits(currentSession?.startDate || '1403/01/01')} تا {toPersianDigits(currentSession?.endDate || '1405/12/29')}
              </p>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                همه حاضر
              </button>
              <button
                onClick={handleMarkAllClubClosed}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                title="ثبت تعطیلی باشگاه و کسر ۱ جلسه از سهمیه تمامی ورزشکاران"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                تعطیلی (کسر از سهمیه)
              </button>
            </div>
          </div>

          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-slate-500 text-[11px] font-bold">کل ورزشکاران سانس</span>
              <p className="text-xl font-black text-slate-900 mt-1">{toPersianDigits(totalCount)} نفر</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                حاضرین
              </span>
              <p className="text-xl font-black text-emerald-700 mt-1">{toPersianDigits(presentCount)} نفر</p>
            </div>

            <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-rose-800 text-[11px] font-bold flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-rose-600" />
                غایبین
              </span>
              <p className="text-xl font-black text-rose-700 mt-1">{toPersianDigits(absentCount)} نفر</p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-amber-800 text-[11px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                درصد حضور جلسه
              </span>
              <p className="text-xl font-black text-amber-700 mt-1">{toPersianDigits(presencePercentage)}٪</p>
            </div>
          </div>

          {/* Duplicate Attendance Warning Banner */}
          {dbStore.getAttendanceRecords(selectedSessionId, selectedDate).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-amber-900 text-xs font-bold">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  حضور و غیاب سانس <strong>{currentSession?.title}</strong> در تاریخ <strong>{toPersianDigits(selectedDate)}</strong> قبلاً در سامانه ثبت شده است. ثبت مجدد، اطلاعات این تاریخ را به‌روزرسانی می‌کند.
                </span>
              </div>
              <span className="px-2.5 py-1 bg-amber-200/60 rounded-lg text-[11px] font-mono shrink-0">
                قبلاً ثبت شده
              </span>
            </div>
          )}

          {/* Attendance Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی ورزشکار..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {saveSuccess && (
                <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  حضور و غیاب با موفقیت ذخیره شد.
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                  <tr>
                    <th className="p-3.5">نام و نام خانوادگی</th>
                    <th className="p-3.5">کد ملی</th>
                    <th className="p-3.5">شماره تماس</th>
                    <th className="p-3.5 text-center">وضعیت حضور در جلسه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        هیچ ورزشکاری برای این سانس ثبت‌نام نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map((enr) => {
                      const record = attendanceStates[enr.userId] || { status: 'present' };
                      const status = record.status;

                      return (
                        <tr key={enr.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">{enr.athleteName}</td>
                          <td className="p-3.5 font-mono text-slate-600">{toPersianDigits(enr.athleteNationalId)}</td>
                          <td className="p-3.5 font-mono text-slate-600">{toPersianDigits(enr.athletePhone)}</td>
                          <td className="p-3.5">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                  onClick={() => handleStatusChange(enr.userId, 'present')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                                    status === 'present'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  حاضر
                                </button>

                                <button
                                  onClick={() => handleStatusChange(enr.userId, 'absent')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                                    status === 'absent'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  غایب
                                </button>

                                <button
                                  onClick={() => handleStatusChange(enr.userId, 'excused')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                                    status === 'excused'
                                      ? 'bg-amber-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  موجه
                                </button>
                                
                                <button
                                  onClick={() => handleStatusChange(enr.userId, 'club_closed')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                                    status === 'club_closed'
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  تعطیلی
                                </button>
                              </div>
                              
                              {(status === 'excused' || status === 'club_closed') && (
                                <input
                                  type="text"
                                  placeholder="دلیل (مثلاً بیماری، تعطیلی رسمی، عدم اطلاع رسانی)"
                                  value={record.reason || ''}
                                  onChange={(e) => handleReasonChange(enr.userId, e.target.value)}
                                  className="w-full mt-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">
                سانس انتخاب‌شده: {currentSession?.title}
              </span>
              <button
                onClick={handleSaveAttendance}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl text-xs transition-all shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                ذخیره نهایی حضور و غیاب
              </button>
            </div>
          </div>
        </>
      )}

      {/* HISTORY & EDIT PAST VIEW MODE */}
      {viewMode === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                ویرایش سوابق و حضور و غیاب‌های ثبت‌شده گذشته
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                میتوانید وضعیت هر رکورد ثبت‌شده در گذشته را ویرایش کرده یا رکورد اشتباه را حذف کنید.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                <option value="">همه سانس‌ها</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black">
                <tr>
                  <th className="p-3">تاریخ جلسه</th>
                  <th className="p-3">نام ورزشکار</th>
                  <th className="p-3">وضعیت فعلی</th>
                  <th className="p-3">تغییر وضعیت (ویرایش مستقیم)</th>
                  <th className="p-3">ثبت‌کننده</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      هیچ سابقه‌ای برای این فیلتر ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{toPersianDigits(rec.date)}</td>
                      <td className="p-3 font-bold text-slate-800">{rec.userName}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            rec.status === 'present'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : rec.status === 'absent'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : rec.status === 'excused'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {rec.status === 'present' ? 'حاضر' : rec.status === 'absent' ? 'غایب' : rec.status === 'excused' ? 'موجه' : 'تعطیلی'}
                        </span>
                        {rec.reason && (
                          <div className="text-[9px] text-slate-500 mt-1 mr-1">دلیل: {rec.reason}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              onClick={() => handleEditPastRecord(rec.id, 'present')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                rec.status === 'present'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                            >
                              حاضر
                            </button>
                            <button
                              onClick={() => handleEditPastRecord(rec.id, 'absent')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                rec.status === 'absent'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                              }`}
                            >
                              غایب
                            </button>
                            <button
                              onClick={() => {
                                const r = prompt('لطفاً دلیل غیبت موجه را وارد کنید:', rec.reason || '');
                                if (r !== null) handleEditPastRecord(rec.id, 'excused', r);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                rec.status === 'excused'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                              }`}
                            >
                              موجه
                            </button>
                            <button
                              onClick={() => {
                                const r = prompt('لطفاً دلیل تعطیلی باشگاه را وارد کنید:', rec.reason || '');
                                if (r !== null) handleEditPastRecord(rec.id, 'club_closed', r);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                rec.status === 'club_closed'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-800'
                              }`}
                            >
                              تعطیلی
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">{rec.recordedBy}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeletePastRecord(rec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف این رکورد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INDIVIDUAL CARDEX VIEW MODE */}
      {viewMode === 'cardex' && (
        <div className="space-y-6">
          {/* Select User Selector */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">انتخاب ورزشکار جهت مشاهده کاردکس</label>
                <p className="text-[11px] text-slate-500">مشاهده آمار کامل حضور، غیاب و مرخصی‌های عضو در طول فصل</p>
              </div>
            </div>

            <div className="w-full sm:w-80">
              <select
                value={cardexUserId}
                onChange={(e) => setCardexUserId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} (کد ملی: {toPersianDigits(u.nationalId)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cardexUser && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Cardex User Info Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-right">
                  <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                    کاردکس انضباطی ورزشکار
                  </span>
                  <h3 className="text-lg font-black">{cardexUser.fullName}</h3>
                  <p className="text-xs text-slate-300 font-mono">
                    کد ملی: {toPersianDigits(cardexUser.nationalId)} | تلفن: {toPersianDigits(cardexUser.phone)}
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  چاپ کاردکس
                </button>
              </div>

              {/* Cardex Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-slate-500 text-[11px] font-bold">کل جلسات ثبت‌شده</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{toPersianDigits(cardexTotal)} جلسه</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4">
                  <span className="text-emerald-800 text-[11px] font-bold">تعداد حضور</span>
                  <p className="text-xl font-black text-emerald-700 mt-1">{toPersianDigits(cardexPresentCount)} جلسه</p>
                </div>

                <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4">
                  <span className="text-rose-800 text-[11px] font-bold">تعداد غیبت</span>
                  <p className="text-xl font-black text-rose-700 mt-1">{toPersianDigits(cardexAbsentCount)} جلسه</p>
                </div>

                <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-4">
                  <span className="text-teal-800 text-[11px] font-bold">امتیاز منظم بودن</span>
                  <p className="text-xl font-black text-teal-700 mt-1">{toPersianDigits(cardexScore)}٪</p>
                </div>
              </div>

              {/* Attendance Log Table for Athlete */}
              <div>
                <h4 className="text-xs font-black text-slate-900 mb-3">ریز سوابق حضور در سانس‌ها</h4>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-100">
                      <tr>
                        <th className="p-3">تاریخ جلسه</th>
                        <th className="p-3">عنوان سانس</th>
                        <th className="p-3 text-center">وضعیت</th>
                        <th className="p-3">ثبت توسط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userAttendanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-400">
                            هیچ رکورد حضور یا غیابی برای این ورزشکار ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        userAttendanceRecords.map((r) => {
                          const sess = sessions.find((s) => s.id === r.sessionId);
                          return (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-900">{toPersianDigits(r.date)}</td>
                              <td className="p-3 font-bold text-slate-800">{sess?.title || 'سانس عمومی'}</td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                    r.status === 'present'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : r.status === 'absent'
                                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {r.status === 'present' ? 'حاضر' : r.status === 'absent' ? 'غایب' : 'مرخصی/موجه'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500">{r.recordedBy}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
