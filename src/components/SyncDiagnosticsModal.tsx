import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Server,
  Table,
  Layers,
  Activity,
  Check,
  Info,
  Terminal,
  Copy,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowDownCircle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { dbStore } from '../services/db';

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  table?: string;
  message: string;
  details?: any;
}

export interface DiagnosticStep {
  step: string;
  table: string;
  title: string;
  count: number;
  status: 'pending' | 'success' | 'warning' | 'error';
  durationMs: number;
  message: string;
  error?: string;
  sqlError?: any;
}

export interface DiagnosticResponse {
  success: boolean;
  dbConnected: boolean;
  config: {
    host: string;
    port: number;
    database: string;
    user: string;
  };
  steps: DiagnosticStep[];
  logs: DiagnosticLog[];
  summary: {
    totalTables: number;
    successTables: number;
    failedTables: number;
    durationMs: number;
  };
}

interface SyncDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoRunOnOpen?: boolean;
}

export const SyncDiagnosticsModal: React.FC<SyncDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  autoRunOnOpen = true,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<DiagnosticResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'error' | 'success' | 'info'>('all');
  const [activeTab, setActiveTab] = useState<'terminal' | 'steps' | 'config'>('terminal');
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const runDetailedSync = async () => {
    setIsRunning(true);
    setErrorMsg(null);

    // Initial dummy state for immediate feedback
    const startTimestamp = new Date().toLocaleTimeString('fa-IR', { hour12: false });
    setData({
      success: false,
      dbConnected: false,
      config: { host: 'localhost', port: 3306, database: '...', user: '...' },
      steps: [],
      logs: [
        {
          id: '1',
          timestamp: startTimestamp,
          level: 'info',
          message: '🚀 شروع فرآیند همگام‌سازی و تحلیل خط‌به‌خط...',
        },
        {
          id: '2',
          timestamp: startTimestamp,
          level: 'info',
          message: '📡 ارسال بسته کامل اطلاعات به سرور و تست تراکنش‌های پایگاه‌داده...',
        },
      ],
      summary: { totalTables: 0, successTables: 0, failedTables: 0, durationMs: 0 },
    });

    try {
      // Gather full client-side state safely
      const payload = {
        roles: typeof dbStore.getRoles === 'function' ? dbStore.getRoles() : (dbStore as any).roles || [],
        users: typeof dbStore.getUsers === 'function' ? dbStore.getUsers() : (dbStore as any).users || [],
        links: typeof dbStore.getParentAthleteLinks === 'function' ? dbStore.getParentAthleteLinks() : (dbStore as any).links || [],
        preRegistrations: typeof dbStore.getPreRegistrations === 'function' ? dbStore.getPreRegistrations() : (dbStore as any).preRegistrations || [],
        auditLogs: typeof dbStore.getAuditLogs === 'function' ? dbStore.getAuditLogs() : (dbStore as any).auditLogs || [],
        clubSettings: typeof dbStore.getClubSettings === 'function' ? dbStore.getClubSettings() : (dbStore as any).clubSettings || null,
        announcements: typeof dbStore.getAnnouncements === 'function' ? dbStore.getAnnouncements() : (dbStore as any).announcements || [],
        sessions: typeof dbStore.getSessions === 'function' ? dbStore.getSessions() : (dbStore as any).sessions || [],
        enrollments: typeof dbStore.getEnrollments === 'function' ? dbStore.getEnrollments() : (dbStore as any).enrollments || [],
        transactions: typeof dbStore.getTransactions === 'function' ? dbStore.getTransactions() : (dbStore as any).transactions || [],
        attendanceRecords: typeof dbStore.getAttendanceRecords === 'function' ? dbStore.getAttendanceRecords() : (dbStore as any).attendanceRecords || [],
        debtors: typeof dbStore.getDebtors === 'function' ? dbStore.getDebtors() : (dbStore as any).debtors || [],
        creditors: typeof dbStore.getCreditors === 'function' ? dbStore.getCreditors() : (dbStore as any).creditors || [],
        insuranceRequests: typeof dbStore.getInsuranceRequests === 'function' ? dbStore.getInsuranceRequests() : (dbStore as any).insuranceRequests || [],
        supportTickets: typeof dbStore.getSupportTickets === 'function' ? dbStore.getSupportTickets() : (dbStore as any).supportTickets || [],
        notifications: typeof (dbStore as any).getNotifications === 'function' ? (dbStore as any).getNotifications() : (dbStore as any).notifications || [],
        products: typeof dbStore.getProducts === 'function' ? dbStore.getProducts() : (dbStore as any).products || [],
        shopInvoices: typeof dbStore.getShopInvoices === 'function' ? dbStore.getShopInvoices() : (dbStore as any).shopInvoices || [],
        smsLogs: typeof dbStore.getSmsLogs === 'function' ? dbStore.getSmsLogs() : (dbStore as any).smsLogs || [],
      };

      const res = await fetch('/api/mysql/sync-detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`پاسخ سرور نامعتبر است: ${text.slice(0, 150)}`);
      }

      const json: DiagnosticResponse = await res.json();
      setData(json);

      if (typeof dbStore.setDbConnected === 'function') {
        dbStore.setDbConnected(json.dbConnected === true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در برقراری ارتباط با سرور');
      setData((prev) =>
        prev
          ? {
              ...prev,
              logs: [
                ...prev.logs,
                {
                  id: 'err-' + Date.now(),
                  timestamp: new Date().toLocaleTimeString('fa-IR', { hour12: false }),
                  level: 'error',
                  message: `❌ خطای درخواست: ${err.message}`,
                },
              ],
            }
          : null
      );
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && autoRunOnOpen) {
      runDetailedSync();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'terminal' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.logs, activeTab]);

  const copyFullReport = () => {
    if (!data) return;
    const report = `
========================================
گزارش جامع خطایابی همگام‌سازی پایگاه داده MySQL
باشگاه سنگ‌نوردی موج
تاریخ: ${new Date().toLocaleString('fa-IR')}
وضعیت اتصال: ${data.dbConnected ? 'متصل 🟢' : 'قطع 🔴'}
هاست: ${data.config?.host}:${data.config?.port} | دیتابیس: ${data.config?.database} | کاربر: ${data.config?.user}
کل مراحل: ${data.summary?.totalTables} | موفق: ${data.summary?.successTables} | ناموفق: ${data.summary?.failedTables}
زمان کل: ${data.summary?.durationMs} میلی‌ثانیه
========================================

--- لاگ‌های خط‌به‌خط ---
${data.logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.table ? `(${l.table}) ` : ''}${l.message}`).join('\n')}

--- وضعیت هر جدول ---
${data.steps.map((s) => `• ${s.title} (${s.table}): وضعیت [${s.status}] - ${s.message} (${s.durationMs}ms)${s.error ? `\n   ❌ خطا: ${s.error}` : ''}`).join('\n')}
========================================
    `.trim();

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  const filteredLogs = (data?.logs || []).filter((l) => {
    if (activeFilter === 'all') return true;
    return l.level === activeFilter;
  });

  const errorCount = (data?.logs || []).filter((l) => l.level === 'error').length;
  const warnCount = (data?.logs || []).filter((l) => l.level === 'warn').length;
  const successCount = (data?.logs || []).filter((l) => l.level === 'success').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fadeIn dir-rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  مانیتورینگ و خطایابی زنده همگام‌سازی MySQL
                </h3>
                {isRunning ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    در حال بررسی...
                  </span>
                ) : data?.dbConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    اتصال پایدار 🟢
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    خطا در اتصال 🔴
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مشاهده فرآیند ذخیره‌سازی خط‌به‌خط، ثبت در جداول، زمان پاسخ‌دهی و شناسایی گلوگاه‌ها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runDetailedSync}
              disabled={isRunning}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="اجرای مجدد بررسی و همگام‌سازی"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">همگام‌سازی و تست مجدد</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Config Banner */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-teal-400" />
              <span>میزبان:</span>
              <span className="font-mono font-bold text-white dir-ltr">{data?.config?.host || 'localhost'}:{data?.config?.port || 3306}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span>دیتابیس:</span>
              <span className="font-mono font-bold text-teal-300 dir-ltr">{data?.config?.database || '---'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">کاربر:</span>
              <span className="font-mono font-bold text-slate-200 dir-ltr">{data?.config?.user || '---'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data?.summary && (
              <span className="text-[11px] font-bold text-slate-400">
                مدت‌زمان: <span className="text-teal-400 font-mono font-bold">{toPersianDigits(data.summary.durationMs)} ms</span>
              </span>
            )}
            <button
              onClick={copyFullReport}
              disabled={!data}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'کپی شد!' : 'کپی گزارش'}</span>
            </button>
          </div>
        </div>

        {/* Tab Selection & Filter Bar */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>کنسول لاگ زنده</span>
              {data?.logs && (
                <span className="px-1.5 py-0.2 bg-slate-900/80 rounded-md text-[10px] font-mono">
                  {toPersianDigits(data.logs.length)}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('steps')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'steps'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تفکیک جداول</span>
              {data?.steps && (
                <span className="px-1.5 py-0.2 bg-slate-900/80 rounded-md text-[10px] font-mono">
                  {toPersianDigits(data.steps.length)}
                </span>
              )}
            </button>
          </div>

          {/* Log Filters */}
          {activeTab === 'terminal' && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400 ml-1 text-xs">فیلتر:</span>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                همه ({toPersianDigits((data?.logs || []).length)})
              </button>
              <button
                onClick={() => setActiveFilter('error')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-rose-400 hover:bg-slate-800'
                }`}
              >
                خطاها ({toPersianDigits(errorCount)})
              </button>
              <button
                onClick={() => setActiveFilter('success')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                موفقیت‌ها ({toPersianDigits(successCount)})
              </button>
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-950/40 font-sans">
          
          {/* Top Error Alert if connection failed */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-rose-200 mb-1">خطا در ارسال یا دریافت اطلاعات:</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* TAB 1: Real-time Terminal Log Console */}
          {activeTab === 'terminal' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-x-auto shadow-inner min-h-[320px] max-h-[500px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="mr-2 text-slate-400 font-sans">خروجی زنده کنسول همگام‌سازی سرور</span>
                </span>
                <span className="text-slate-500 font-sans">{toPersianDigits(filteredLogs.length)} رکورد</span>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-sans">
                  {isRunning ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                      <span>در حال دریافت لاگ‌ها از سرور...</span>
                    </div>
                  ) : (
                    <span>هیچ لاگی در این فیلتر وجود ندارد.</span>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map((log) => {
                    let badgeClass = 'text-slate-400 bg-slate-800/80 border-slate-700';
                    let textClass = 'text-slate-300';
                    let icon = 'ℹ️';

                    if (log.level === 'success') {
                      badgeClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
                      textClass = 'text-emerald-200';
                      icon = '✅';
                    } else if (log.level === 'warn') {
                      badgeClass = 'text-amber-400 bg-amber-950/60 border-amber-800/60';
                      textClass = 'text-amber-200';
                      icon = '⚠️';
                    } else if (log.level === 'error') {
                      badgeClass = 'text-rose-400 bg-rose-950/80 border-rose-800/80';
                      textClass = 'text-rose-200 font-bold';
                      icon = '❌';
                    }

                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-2.5 py-1 px-2 rounded-lg hover:bg-slate-900/60 transition-colors leading-relaxed"
                      >
                        <span className="text-slate-500 text-[10px] shrink-0 select-none dir-ltr font-mono mt-0.5">
                          [{toPersianDigits(log.timestamp)}]
                        </span>
                        <span className="shrink-0 text-xs">{icon}</span>
                        <div className="flex-1 min-w-0">
                          {log.table && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-teal-300 border border-slate-700 ml-1.5 font-mono">
                              {log.table}
                            </span>
                          )}
                          <span className={`${textClass} font-sans text-xs`}>{log.message}</span>
                          {log.details && (
                            <pre className="mt-1 p-2 bg-black/60 rounded-lg text-[10px] text-slate-400 overflow-x-auto dir-ltr font-mono border border-slate-800">
                              {typeof log.details === 'string'
                                ? log.details
                                : JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Step-by-Step Table Breakdown */}
          {activeTab === 'steps' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(data?.steps || []).map((step, idx) => {
                  let border = 'border-slate-800 bg-slate-900/80';
                  let icon = <Info className="w-4 h-4 text-slate-400" />;
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                      نامشخص
                    </span>
                  );

                  if (step.status === 'success') {
                    border = 'border-emerald-900/60 bg-emerald-950/20';
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        موفق
                      </span>
                    );
                  } else if (step.status === 'warning') {
                    border = 'border-amber-900/60 bg-amber-950/20';
                    icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        اخطار
                      </span>
                    );
                  } else if (step.status === 'error') {
                    border = 'border-rose-900/80 bg-rose-950/30 ring-1 ring-rose-500/30';
                    icon = <XCircle className="w-4 h-4 text-rose-400" />;
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        خطا
                      </span>
                    );
                  }

                  return (
                    <div
                      key={step.step || idx}
                      className={`p-3.5 rounded-2xl border ${border} flex flex-col justify-between transition-all hover:scale-[1.01]`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {icon}
                            <h4 className="text-xs font-black text-white truncate" title={step.title}>
                              {step.title}
                            </h4>
                          </div>
                          {statusBadge}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                          <span className="text-teal-300">{step.table}</span>
                          <span>{toPersianDigits(step.count)} رکورد</span>
                        </div>

                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {step.message}
                        </p>
                      </div>

                      {step.durationMs > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                          <span>زمان اجرا:</span>
                          <span className="font-mono text-teal-400">{toPersianDigits(step.durationMs)} ms</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expert AI Recommendation Card if Errors Detected */}
          {errorCount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-black">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>راهنمای رفع سریع خطای شناسایی شده:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                <li>
                  اگر خطای <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">ER_ACCESS_DENIED_ERROR</code> دریافت کردید: نام کاربری یا رمز دیتابیس در فایل <code className="bg-slate-900 px-1 py-0.5 rounded text-white font-mono">config.json</code> نادرست است یا یوزر به دیتابیس با تمام دسترسی‌ها (ALL PRIVILEGES) اضافه نشده است.
                </li>
                <li>
                  اگر خطای <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">ER_NO_SUCH_TABLE</code> یا <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">ER_BAD_FIELD_ERROR</code> دریافت کردید: جدول‌های دیتابیس شما نیاز به بررسی ساختار دارند که با زدن دکمه «همگام‌سازی و تست مجدد» سیستم به صورت خودکار آنها را ایجاد و فیلدهای لازم را اضافه خواهد کرد.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              مجموع جداول بررسی شده:{' '}
              <strong className="text-white font-mono">{toPersianDigits(data?.summary?.totalTables || 0)}</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-400">
              موفق: <strong className="font-mono">{toPersianDigits(data?.summary?.successTables || 0)}</strong>
            </span>
            <span>•</span>
            <span className="text-rose-400">
              ناموفق: <strong className="font-mono">{toPersianDigits(data?.summary?.failedTables || 0)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyFullReport}
              disabled={!data}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>کپی کامل گزارش</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              بستن پنجره
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
