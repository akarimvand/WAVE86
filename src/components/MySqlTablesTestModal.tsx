import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface TableStatusItem {
  name: string;
  faName: string;
  exists: boolean;
  count: number;
  status: string;
  error?: string;
}

interface TestTablesResponse {
  connected: boolean;
  message: string;
  host?: string;
  user?: string;
  databaseName?: string;
  tables: TableStatusItem[];
  totalRecords: number;
}

interface MySqlTablesTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MySqlTablesTestModal: React.FC<MySqlTablesTestModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestTablesResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTablesStatus = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/mysql/test-tables');
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (text.includes('<!doctype html>') || text.includes('<html')) {
          throw new Error('پاسخ سرور به صورت HTML دریافت شد. لطفاً مطمئن شوید سرور Express ری‌استارت شده و در دسترس است.');
        }
        throw new Error(`پاسخ نامعتبر سرور: ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `خطای پاسخ سرور (کد ${res.status})`);
      }

      const json: TestTablesResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTablesStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                تست و استعلام جداول دیتابیس MySQL
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تست ارتباط زنده با دیتابیس، شناسایی جداول موجود و شمارش رکوردهای هر جدول
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTablesStatus}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
              title="بررسی مجدد"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
              <span className="hidden sm:inline">بررسی مجدد</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">در حال استعلام جداول و شمارش رکوردها از دیتابیس MySQL...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-bold">خطا در تست اتصال دیتابیس</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Summary Status Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Status Card */}
                <div className={`p-4 rounded-2xl border ${data.connected ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950' : 'bg-rose-50/80 border-rose-200/80 text-rose-950'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">وضعیت اتصال</span>
                    {data.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                  </div>
                  <p className="text-sm font-black mt-2">
                    {data.connected ? 'متصل و فعال' : 'قطع ارتباط'}
                  </p>
                  <p className="text-[10px] mt-1 text-slate-600 truncate" title={data.message}>
                    {data.message}
                  </p>
                </div>

                {/* Database Name Card */}
                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold">نام دیتابیس</span>
                    <Server className="w-4 h-4 text-teal-600" />
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-2 font-mono dir-ltr text-right truncate">
                    {data.databaseName || 'نامشخص'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 truncate" dir="ltr">
                    هاست: {data.host || 'localhost'}
                  </p>
                </div>

                {/* Active Tables Count Card */}
                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold">تعداد جداول شناسایی‌شده</span>
                    <Table className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    {toPersianDigits(data.tables.filter((t) => t.exists).length)} از {toPersianDigits(data.tables.length)} جدول
                  </p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">
                    آماده تبادل داده
                  </p>
                </div>

                {/* Total Records Card */}
                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold">کل رکوردهای موجود</span>
                    <Layers className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-lg font-black text-teal-700 mt-1">
                    {toPersianDigits(data.totalRecords)} رکورد
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    مجموع کل رده‌های ثبت‌شده
                  </p>
                </div>

              </div>

              {/* Table Records List */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    لیست جداول سیستم و شمارش لحظه‌ای رکوردها
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    MySQL Live Query
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.tables.map((t, idx) => (
                    <div
                      key={t.name + idx}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        t.exists
                          ? t.count > 0
                            ? 'bg-slate-50/80 border-slate-200/80 hover:border-teal-300'
                            : 'bg-white border-slate-200/60'
                          : 'bg-rose-50/50 border-rose-200/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            t.exists
                              ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                              : 'bg-rose-100 text-rose-600 border border-rose-200'
                          }`}
                        >
                          <Table className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {t.faName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dir-ltr bg-slate-100 px-1.5 py-0.5 rounded">
                              {t.name}
                            </span>
                          </div>
                          {t.error ? (
                            <p className="text-[10px] text-rose-600 font-bold mt-0.5">{t.error}</p>
                          ) : (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {t.exists ? 'جدول موجود در دیتابیس' : 'جدول ایجاد نشده است'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {t.exists ? (
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                              t.count > 0
                                ? 'bg-teal-600 text-white shadow-xs shadow-teal-600/20'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {toPersianDigits(t.count)} رکورد
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg">
                            ناموجود
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Developer Architecture Clarification Note */}
              <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-xs text-teal-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-teal-900">
                  <Info className="w-4 h-4 text-teal-600" />
                  راهنمای فنی: مسیرهای خواندن اطلاعات از MySQL
                </div>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  فایل‌های مسئول خواندن داده از MySQL در پروژه:
                </p>
                <ul className="list-disc list-inside text-[11px] space-y-1 text-teal-900 font-medium">
                  <li>
                    <strong className="font-bold">فایل سرور (Backend):</strong> <code className="bg-teal-100/80 px-1 py-0.5 rounded font-mono text-[10px]">server.ts</code> (اندپاینت‌های <code className="bg-teal-100/80 px-1 py-0.5 rounded font-mono text-[10px]">/api/products</code> و <code className="bg-teal-100/80 px-1 py-0.5 rounded font-mono text-[10px]">/api/mysql/full-data</code>) مستقیماً با دستورات SQL مانند <code className="bg-teal-100/80 px-1 py-0.5 rounded font-mono text-[10px]">SELECT * FROM products</code> داده‌ها را از دیتابیس MySQL استخراج می‌کنند.
                  </li>
                  <li>
                    <strong className="font-bold">فایل تنظیمات دیتابیس:</strong> <code className="bg-teal-100/80 px-1 py-0.5 rounded font-mono text-[10px]">server/mysql.ts</code> ساختار جداول و خودکارسازی اصلاح ستون‌ها را بر عهده دارد.
                  </li>
                  <li>
                    <strong className="font-bold">فایل فرانت‌اند (Client Store):</strong> <code className="bg-teal-100/80 px-1 py-0.5 rounded font-mono text-[10px]">src/services/db.ts</code> متد <code className="bg-teal-100/80 px-1 py-0.5 rounded font-mono text-[10px]">loadFromBackendMySql()</code> را برای دریافت داده‌های نهایی و ارائه آن به UI بوفه و فروشگاه اجرا می‌کند.
                  </li>
                </ul>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            سیستم مدیریت دیتابیس باشگاه ورزشی موج
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
          >
            بستن پنجره
          </button>
        </div>

      </div>
    </div>
  );
};
