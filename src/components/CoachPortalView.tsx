import React, { useState, useEffect } from 'react';
import { User, TrainingSession, SessionEnrollment } from '../types';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { Calendar, Users, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { THEME_PALETTES } from '../utils/theme';

interface CoachPortalViewProps {
  currentUser: User;
}

export const CoachPortalView: React.FC<CoachPortalViewProps> = ({ currentUser }) => {
  const currentClub = dbStore.getClubSettings();
  const activePal = THEME_PALETTES[currentClub.themePalette] || THEME_PALETTES.wave;

  const [mySessions, setMySessions] = useState<TrainingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [enrollments, setEnrollments] = useState<SessionEnrollment[]>([]);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = () => {
    const allSessions = dbStore.getSessions();
    const coachSessions = allSessions.filter(s => s.coachId === currentUser.id);
    setMySessions(coachSessions);

    if (selectedSession) {
      const allEnrollments = dbStore.getEnrollments();
      setEnrollments(allEnrollments.filter(e => e.sessionId === selectedSession.id && e.status === 'active' && e.paymentStatus === 'paid'));
    }
  };

  const handleSelectSession = (session: TrainingSession) => {
    setSelectedSession(session);
    const allEnrollments = dbStore.getEnrollments();
    setEnrollments(allEnrollments.filter(e => e.sessionId === session.id && e.status === 'active' && e.paymentStatus === 'paid'));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">پنل اختصاصی مربی</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">خوش آمدید، استاد {currentUser.fullName}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-6 border-l border-slate-200 last:border-0">
            <p className="text-[10px] font-black text-slate-400 mb-1">کلاس‌های من</p>
            <p className="text-lg font-black text-slate-800">{toPersianDigits(mySessions.length)}</p>
          </div>
          <div className="text-center px-6 border-l border-slate-200 last:border-0">
            <p className="text-[10px] font-black text-slate-400 mb-1">شاگردان فعال</p>
            <p className="text-lg font-black text-slate-800">{toPersianDigits(enrollments.length)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-black text-slate-700 px-2">لیست کلاس‌های من</h3>
          {mySessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
              <p className="text-xs text-slate-500 font-bold">شما مربی هیچ کلاسی نیستید.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`w-full text-right p-4 rounded-2xl border transition-all ${
                    selectedSession?.id === session.id
                      ? 'border-transparent shadow-md'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  style={selectedSession?.id === session.id ? { backgroundColor: activePal.primaryLightHex, color: activePal.primaryHex } : {}}
                >
                  <h4 className="font-black mb-2">{session.title}</h4>
                  <div className="flex items-center gap-4 text-[11px] font-bold opacity-80">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {session.daysOfWeek.join('، ')} ({session.startTime} تا {session.endTime})</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {toPersianDigits(session.capacity)} نفر</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Session Details & Students */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedSession.title}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">{selectedSession.daysOfWeek.join('، ')} ({selectedSession.startTime} تا {selectedSession.endTime})</p>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black border border-green-200 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  فعال
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">روزهای برگزاری</p>
                  <p className="text-sm font-black text-slate-700">{toPersianDigits(selectedSession.daysOfWeek.length * 4)} جلسه در ماه</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">شاگردان ثبت‌نامی</p>
                  <p className="text-sm font-black text-slate-700">{toPersianDigits(enrollments.length)} نفر</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">دستمزد هر ماه</p>
                  <p className="text-sm font-black text-slate-700">{toPersianDigits((((selectedSession.monthlyFee ?? (selectedSession as any).fee) || 0) * 0.4).toLocaleString())} ت</p>
                </div>
              </div>

              <h4 className="text-sm font-black text-slate-800 mb-4">لیست شاگردان (ثبت‌نام قطعی)</h4>
              {enrollments.length === 0 ? (
                <p className="text-xs text-slate-500 font-bold bg-slate-50 p-4 rounded-xl text-center">هنوز هیچ شاگردی در این کلاس ثبت‌نام نکرده است.</p>
              ) : (
                <>
                  {/* Mobile Student Cards */}
                  <div className="block sm:hidden space-y-2.5">
                    {enrollments.map((e) => (
                      <div key={e.id} className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-black text-xs text-slate-900">{e.athleteName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">تاریخ: {toPersianDigits(e.enrolledAt ? e.enrolledAt.split('T')[0] : '')}</p>
                        </div>
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black border border-emerald-200">
                          ثبت‌نام قطعی
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-3 font-black text-slate-400">نام ورزشکار</th>
                          <th className="pb-3 font-black text-slate-400">تاریخ ثبت‌نام</th>
                          <th className="pb-3 font-black text-slate-400 text-left">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {enrollments.map(e => (
                          <tr key={e.id}>
                            <td className="py-3 font-bold text-slate-800">{e.athleteName}</td>
                            <td className="py-3 font-bold text-slate-600">{toPersianDigits(e.enrolledAt ? e.enrolledAt.split('T')[0] : '')}</td>
                            <td className="py-3 text-left">
                              <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md text-[10px] font-black border border-green-200">ثبت‌نام قطعی</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center">
              <Calendar className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-sm font-bold text-slate-500">برای مشاهده جزئیات و لیست شاگردان، یک کلاس را انتخاب کنید.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
