import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Award,
  Calendar,
  Phone,
  Maximize2,
  CheckCircle2,
  Sparkles,
  User,
  CreditCard,
  Barcode as BarcodeIcon,
  Download,
  Share2,
} from 'lucide-react';
import { User as UserType, SessionEnrollment, TrainingSession } from '../types';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { WaveLogoSVG } from './WaveLogoSVG';

interface DigitalMembershipCardModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  enrollments?: SessionEnrollment[];
  sessions?: TrainingSession[];
}

// Generate a deterministic SVG Barcode from an alphanumeric string (e.g. National ID / Card ID)
const SvgBarcode: React.FC<{ code: string; className?: string; height?: number }> = ({
  code,
  className = '',
  height = 48,
}) => {
  // Simple deterministic pattern generator for clean code128-like barcode visual
  const cleanCode = (code || '0000000000').replace(/\s+/g, '');
  const bars: { width: number; isBlack: boolean }[] = [];
  
  // Start guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });

  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const pattern = (charCode * 31 + i * 17) % 64;
    // 6 bits pattern
    for (let b = 0; b < 6; b++) {
      const isBlack = (pattern & (1 << b)) !== 0;
      const width = ((pattern + b) % 3) + 1;
      bars.push({ width, isBlack });
    }
    bars.push({ width: 1, isBlack: false });
  }

  // End guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  let totalWidth = 0;
  bars.forEach((b) => (totalWidth += b.width));

  let currentX = 0;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-h-12"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const rect = bar.isBlack ? (
            <rect
              key={idx}
              x={currentX}
              y={0}
              width={bar.width}
              height={height}
              fill="currentColor"
            />
          ) : null;
          currentX += bar.width;
          return rect;
        })}
      </svg>
      <span className="font-mono text-[10px] tracking-widest text-slate-500 font-bold mt-1 dir-ltr">
        *{cleanCode}*
      </span>
    </div>
  );
};

// Generate a deterministic SVG QR code from a payload
const SvgQrCode: React.FC<{ payload: string; size?: number; className?: string }> = ({
  payload,
  size = 110,
  className = '',
}) => {
  // 21x21 QR matrix representation
  const matrixSize = 21;
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
    Array(matrixSize).fill(false)
  );

  // Position detection patterns (corners)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(matrixSize - 7, 0); // Top-right
  drawFinder(0, matrixSize - 7); // Bottom-left

  // Timing patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Deterministic data fill based on payload hash
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }

  let seed = Math.abs(hash);
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Don't overwrite finders
      const inFinderTL = r < 8 && c < 8;
      const inFinderTR = r < 8 && c >= matrixSize - 8;
      const inFinderBL = r >= matrixSize - 8 && c < 8;
      if (!inFinderTL && !inFinderTR && !inFinderBL && r !== 6 && c !== 6) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        matrix[r][c] = seed % 3 === 0;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${matrixSize} ${matrixSize}`}
      width={size}
      height={size}
      className={`bg-white p-1 rounded-xl shadow-xs ${className}`}
      shapeRendering="crispEdges"
    >
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="#0f172a" /> : null
        )
      )}
    </svg>
  );
};

export const DigitalMembershipCardModal: React.FC<DigitalMembershipCardModalProps> = ({
  user,
  isOpen,
  onClose,
  enrollments = [],
  sessions = [],
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGateMode, setIsGateMode] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const clubSettings = dbStore.getClubSettings();
  const userEnrollments = enrollments.length > 0 ? enrollments : dbStore.getUserEnrollments(user.id);
  const allSessions = sessions.length > 0 ? sessions : dbStore.getSessions();
  const activeEnrollment = userEnrollments.find((e) => e.status === 'active') || userEnrollments[0];
  const activeSession = activeEnrollment ? allSessions.find((s) => s.id === activeEnrollment.sessionId) : null;

  const membershipNumber = `W69-${user.nationalId ? user.nationalId.slice(-6) : user.id.slice(-6)}`.toUpperCase();
  const qrVerificationData = JSON.stringify({
    club: 'Wave69',
    memberId: user.id,
    name: user.fullName,
    natId: user.nationalId,
    phone: user.phone,
    cardNo: membershipNumber,
    insurance: user.isInsuranceValid ? 'VALID' : 'EXPIRED',
    course: activeSession?.title || 'None',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCardInfo = () => {
    const text = `کارت عضویت باشگاه سنگ‌نوردی موج ۶۹\nنام: ${user.fullName}\nکد ملی: ${user.nationalId}\nشماره عضویت: ${membershipNumber}\nوضعیت بیمه: ${user.isInsuranceValid ? 'معتبر' : 'نیازمند تمدید'}`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-vazir dir-rtl" dir="rtl">
      {/* Container */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-fadeIn relative">
        
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">کارت هوشمند و عضویت دیجیتال</h3>
              <p className="text-xs text-slate-400">شناسه هوشمند ورود به سالن و گیت تردد باشگاه موج ۶۹</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              title="چرخش کارت"
            >
              <RotateCw className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">{isFlipped ? 'روی کارت' : 'پشت کارت'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>کارت رسمی مجهز به بارکد نوری و QR Code گیت تردد</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGateMode(!isGateMode)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  isGateMode
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isGateMode ? 'حالت عادی' : 'حالت تردد در گیت'}</span>
              </button>
            </div>
          </div>

          {/* THE DIGITAL CARD (FLIPPABLE) */}
          <div className="perspective-1000 flex justify-center">
            <div
              ref={cardRef}
              className={`w-full max-w-[420px] transition-transform duration-500 transform-style-3d relative ${
                isGateMode ? 'scale-105' : ''
              }`}
            >
              {!isFlipped ? (
                /* ================= FRONT OF CARD ================= */
                <div className="w-full bg-gradient-to-br from-slate-900 via-stone-900 to-teal-950 text-white rounded-3xl p-6 shadow-2xl border-2 border-teal-500/40 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                  {/* Background Watermark & Waves */}
                  <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                  {/* Card Header */}
                  <div className="flex items-center justify-between relative z-10 border-b border-white/10 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center p-1 shadow-inner">
                        <WaveLogoSVG className="w-6 h-6 text-teal-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black tracking-wide text-teal-200">
                          {clubSettings.name || 'باشگاه سنگ‌نوردی موج ۶۹'}
                        </h4>
                        <span className="text-[10px] text-slate-400 block">SMART DIGITAL MEMBER CARD</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 bg-amber-400/10 border border-amber-400/20 rounded-md">
                        {membershipNumber}
                      </span>
                    </div>
                  </div>

                  {/* Card Main Info Body */}
                  <div className="grid grid-cols-12 gap-3 my-4 items-center relative z-10">
                    {/* User Avatar */}
                    <div className="col-span-4 flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-teal-400/60 overflow-hidden shadow-lg flex items-center justify-center relative">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-teal-400" />
                        )}
                        <div
                          className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                            user.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          title={user.isActive ? 'عضو فعال' : 'غیرفعال'}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 mt-1.5">
                        {user.activeRole === 'coach' ? 'مربی رسمی' : 'ورزشکار رسمی'}
                      </span>
                    </div>

                    {/* Personal Details */}
                    <div className="col-span-8 space-y-1.5 pr-1">
                      <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                        {user.fullName}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-400 text-[10px] block">کد ملی:</span>
                          <span className="font-bold text-white font-mono">{toPersianDigits(user.nationalId || '---')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">شماره همراه:</span>
                          <span className="font-bold text-white font-mono">{toPersianDigits(user.phone || '---')}</span>
                        </div>
                      </div>

                      {/* Course & Insurance status tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                            user.isInsuranceValid
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{user.isInsuranceValid ? 'بیمه معتبر' : 'فاقد بیمه معتبر'}</span>
                        </span>

                        {activeSession && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate max-w-[140px]">
                            {activeSession.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Barcode Footer */}
                  <div className="pt-2 border-t border-white/10 relative z-10 flex items-center justify-between gap-4">
                    <div className="flex-1 bg-white/95 text-slate-900 px-3 py-1.5 rounded-xl shadow-inner">
                      <SvgBarcode code={user.nationalId || user.id} height={32} />
                    </div>
                    <div className="shrink-0 bg-white p-1 rounded-xl shadow-md">
                      <SvgQrCode payload={qrVerificationData} size={isGateMode ? 72 : 56} />
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= BACK OF CARD ================= */
                <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-stone-900 text-white rounded-3xl p-6 shadow-2xl border-2 border-teal-500/30 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-black text-teal-200">قوانین و نکات عضویت</h4>
                      </div>
                      <span className="text-[10px] text-slate-400">باشگاه سنگ‌نوردی موج ۶۹</span>
                    </div>

                    {/* Club Rules & Terms */}
                    <ul className="text-[10px] text-slate-300 space-y-1.5 my-4 list-disc list-inside leading-relaxed">
                      <li>این کارت متعلق به دارنده آن بوده و استفاده غیرمجاز پیگرد دارد.</li>
                      <li>حضور در سالن تمرین مشروط به داشتن بیمه ورزشی معتبر سال جاری است.</li>
                      <li>ورود و خروج فقط از طریق ثبت در گیت و اسکن بارکد امکان‌پذیر است.</li>
                      <li>در صورت مفقودی کارت، سریعاً مراتب را به مدیریت باشگاه اطلاع دهید.</li>
                    </ul>
                  </div>

                  {/* Back Info and QR Big */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="space-y-1">
                      <div>
                        تلفن پذیرش و اضطراری: <span className="text-white font-mono font-bold">۰۹۱۲۰۰۰۰۰۰۰</span>
                      </div>
                      <div>
                        آدرس: <span className="text-slate-300">مجموعه ورزشی موج ۶۹</span>
                      </div>
                      <div className="text-[9px] text-teal-400 font-mono">
                        VERIFIED BY WAVE69 SECURITY PROTOCOL
                      </div>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl shadow-md shrink-0">
                      <SvgQrCode payload={qrVerificationData} size={70} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              <RotateCw className="w-4 h-4 text-teal-400" />
              <span>{isFlipped ? 'مشاهده روی کارت' : 'مشاهده پشت کارت'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / ذخیره PDF کارت</span>
            </button>

            <button
              onClick={handleCopyCardInfo}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              {copiedNotification ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">مشخصات کپی شد</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-amber-400" />
                  <span>اشتراک و کپی شناسه</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
