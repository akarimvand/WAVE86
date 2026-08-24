import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Activity,
} from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';
import { SessionEnrollment, TrainingSession } from '../types';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface EditEnrollmentModalProps {
  isOpen: boolean;
  enrollment: SessionEnrollment | null;
  session?: TrainingSession | null;
  onClose: () => void;
  onSaved: (updatedEnrollment: SessionEnrollment) => void;
}

export const EditEnrollmentModal: React.FC<EditEnrollmentModalProps> = ({
  isOpen,
  enrollment,
  session,
  onClose,
  onSaved,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalSessions, setTotalSessions] = useState('12');
  const [status, setStatus] = useState<'active' | 'expired' | 'canceled'>('active');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'partially_paid'>('paid');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (enrollment) {
      setStartDate(enrollment.startDate || enrollment.enrolledAt || '');
      setEndDate(enrollment.endDate || enrollment.expireDate || '');
      setTotalSessions((enrollment.totalSessionsAllowed ?? 12).toString());
      setStatus(enrollment.status || 'active');
      setPaymentStatus(enrollment.paymentStatus || 'paid');
      setErrorMsg('');
    }
  }, [enrollment]);

  if (!isOpen || !enrollment) return null;

  const currentSession = session || dbStore.getSessions().find((s) => s.id === enrollment.sessionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!startDate.trim()) {
      setErrorMsg('لطفاً تاریخ شروع دوره را مشخص کنید.');
      return;
    }
    if (!endDate.trim()) {
      setErrorMsg('لطفاً تاریخ پایان و انقضای دوره را مشخص کنید.');
      return;
    }

    if (startDate > endDate) {
      setErrorMsg('تاریخ شروع دوره نمی‌تواند بعد از تاریخ پایان باشد.');
      return;
    }

    const sessionsNum = parseInt(totalSessions, 10);
    if (isNaN(sessionsNum) || sessionsNum <= 0) {
      setErrorMsg('تعداد جلسات مجاز باید یک عدد مثبت باشد.');
      return;
    }

    setIsSaving(true);
    const updated = dbStore.updateEnrollment(
      enrollment.id,
      {
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        totalSessionsAllowed: sessionsNum,
        status,
        paymentStatus,
      },
      'مدیر سیستم'
    );

    setIsSaving(false);
    if (updated) {
      onSaved(updated);
      onClose();
    } else {
      setErrorMsg('خطا در به‌روزرسانی اطلاعات دوره.');
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl font-sans animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-visible animate-scaleUp relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                ویرایش بازه زمانی و مشخصات دوره
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تغییر تاریخ شروع، تاریخ پایان، سقف جلسات و وضعیت دوره
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Athlete & Session Quick Info */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">نام ورزشکار:</span>
              <strong className="text-slate-900 font-bold">{enrollment.athleteName}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">سانس / دوره:</span>
              <strong className="text-teal-700 font-bold">{currentSession?.title || 'سانس ورزشی'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">جلسات مصرف‌شده تاکنون:</span>
              <span className="font-bold text-slate-800 font-mono">
                {toPersianDigits(enrollment.usedSessionsCount || 0)} جلسه حضور
              </span>
            </div>
          </div>

          {/* Date Pickers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-800 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>تاریخ شروع دوره (شمسی)</span>
                <span className="text-rose-500">*</span>
              </label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="مثلاً ۱۴۰۳/۰۵/۰۱"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>تاریخ پایان و انقضا (شمسی)</span>
                <span className="text-rose-500">*</span>
              </label>
              <JalaliDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="مثلاً ۱۴۰۳/۰۶/۰۱"
              />
            </div>
          </div>

          {/* Total Sessions Allowed & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black text-slate-800 block mb-1.5">
                تعداد کل جلسات مجاز
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="۱۲"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 block mb-1.5">
                وضعیت دوره
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="active">فعال و مجاز به حضور</option>
                <option value="expired">منقضی شده</option>
                <option value="canceled">لغو / انصراف</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 block mb-1.5">
                وضعیت پرداخت
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="paid">تسویه کامل (پرداخت شده)</option>
                <option value="pending">در انتظار تسویه / معوق</option>
                <option value="partially_paid">پرداخت علی‌الحساب</option>
              </select>
            </div>
          </div>

          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3 text-[11px] text-teal-900 leading-relaxed font-medium flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span>
              با تغییر تاریخ شروع یا پایان، کارت عضویت و پورتال ورزشکار به‌صورت خودکار به‌روزرسانی شده و سیستم محاسبات انقضای خودکار را بر اساس بازه جدید تطبیق می‌دهد.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات تاریخ و دوره'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
