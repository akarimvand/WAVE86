import React, { useState } from 'react';
import {
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Scale,
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PhoneCall,
  Send,
  Building,
  DollarSign,
  Filter,
  CreditCard,
  FileSpreadsheet,
  X,
  Receipt,
  Sparkles,
  ShieldAlert,
  Trash2,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { dbStore } from '../services/db';
import { JalaliDatePicker } from './JalaliDatePicker';
import { DebtorRecord, CreditorRecord } from '../types';
import { toPersianDigits, formatToman } from '../utils/nationalIdValidator';

const DEBTOR_CATEGORY_COLORS: Record<string, string> = {
  tuition: '#0d9488', // فیروزه‌ای
  insurance: '#2563eb', // آبی
  equipment: '#d97706', // طلایی
  pending_receipt: '#dc2626', // قرمز
  other: '#8b5cf6', // بنفش
};

const CREDITOR_CATEGORY_COLORS: Record<string, string> = {
  coach_salary: '#e11d48', // یاقوتی
  rent: '#ea580c', // نارنجی
  equipment_vendor: '#d97706', // کهربایی
  maintenance: '#7c3aed', // نیلی
  member_deposit: '#0284c7', // آبی
};

interface GroupedCategoryItem {
  categoryTitle: string;
  category: string;
  value: number;
  count: number;
}

export const FinancialDashboardView: React.FC = () => {
  const [debtors, setDebtors] = useState<DebtorRecord[]>(() => dbStore.getDebtors());
  const [creditors, setCreditors] = useState<CreditorRecord[]>(() => dbStore.getCreditors());

  // View state
  const [activeTab, setActiveTab] = useState<'overview' | 'debtors' | 'creditors'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDebtorCategory, setSelectedDebtorCategory] = useState<string>('all');
  const [selectedCreditorCategory, setSelectedCreditorCategory] = useState<string>('all');
  const [selectedDebtorChartCategory, setSelectedDebtorChartCategory] = useState<string | null>(null);
  const [selectedCreditorChartCategory, setSelectedCreditorChartCategory] = useState<string | null>(null);

  // Modals
  const [isAddDebtorModalOpen, setIsAddDebtorModalOpen] = useState(false);
  const [isAddCreditorModalOpen, setIsAddCreditorModalOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('success');

  // Settlement & Payment Modal States
  const [settleDebtorTarget, setSettleDebtorTarget] = useState<DebtorRecord | null>(null);
  const [payCreditorTarget, setPayCreditorTarget] = useState<CreditorRecord | null>(null);

  // SMS Confirmation Modal State for Debtors
  const [smsDebtorTarget, setSmsDebtorTarget] = useState<DebtorRecord | null>(null);
  const [smsMessageText, setSmsMessageText] = useState<string>('');
  const [isSendingSms, setIsSendingSms] = useState<boolean>(false);

  // Add Debtor Form State
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDebtorNationalId, setNewDebtorNationalId] = useState('');
  const [newDebtorPhone, setNewDebtorPhone] = useState('');
  const [newDebtorCategory, setNewDebtorCategory] = useState<DebtorRecord['category']>('tuition');
  const [newDebtorCategoryTitle, setNewDebtorCategoryTitle] = useState('شهریه معوقه');
  const [newDebtorAmount, setNewDebtorAmount] = useState('1500000');
  const [newDebtorDueDate, setNewDebtorDueDate] = useState('1403/06/01');
  const [newDebtorNotes, setNewDebtorNotes] = useState('');

  // Add Creditor Form State
  const [newCreditorName, setNewCreditorName] = useState('');
  const [newCreditorCategory, setNewCreditorCategory] = useState<CreditorRecord['category']>('coach_salary');
  const [newCreditorCategoryTitle, setNewCreditorCategoryTitle] = useState('حق‌الزحمه مربیگری');
  const [newCreditorPhone, setNewCreditorPhone] = useState('');
  const [newCreditorIban, setNewCreditorIban] = useState('');
  const [newCreditorAmount, setNewCreditorAmount] = useState('5000000');
  const [newCreditorDueDate, setNewCreditorDueDate] = useState('1403/06/01');
  const [newCreditorNotes, setNewCreditorNotes] = useState('');

  const refreshData = () => {
    setDebtors(dbStore.getDebtors());
    setCreditors(dbStore.getCreditors());
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationMessage(msg);
    setNotificationType(type);
    setTimeout(() => {
      setNotificationMessage(null);
    }, 5000);
  };

  // Calculations
  const totalDebtorsAmount = debtors.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalCreditorsAmount = creditors.reduce((sum, c) => sum + (c.amount || 0), 0);
  const netFinancialBalance = totalDebtorsAmount - totalCreditorsAmount;

  // Debtors Chart Data Grouping
  const debtorGrouped: Record<string, GroupedCategoryItem> = {};
  debtors.forEach((d) => {
    const key = d.category;
    if (!debtorGrouped[key]) {
      debtorGrouped[key] = {
        categoryTitle: d.categoryTitle,
        category: d.category,
        value: 0,
        count: 0,
      };
    }
    debtorGrouped[key].value += d.amount;
    debtorGrouped[key].count += 1;
  });

  const debtorChartData = Object.values(debtorGrouped).map((item) => ({
    name: item.categoryTitle,
    categoryKey: item.category,
    value: item.value,
    count: item.count,
    percentage: totalDebtorsAmount > 0 ? ((item.value / totalDebtorsAmount) * 100).toFixed(1) : '0',
    color: DEBTOR_CATEGORY_COLORS[item.category] || '#64748b',
  }));

  // Creditors Chart Data Grouping
  const creditorGrouped: Record<string, GroupedCategoryItem> = {};
  creditors.forEach((c) => {
    const key = c.category;
    if (!creditorGrouped[key]) {
      creditorGrouped[key] = {
        categoryTitle: c.categoryTitle,
        category: c.category,
        value: 0,
        count: 0,
      };
    }
    creditorGrouped[key].value += c.amount;
    creditorGrouped[key].count += 1;
  });

  const creditorChartData = Object.values(creditorGrouped).map((item) => ({
    name: item.categoryTitle,
    categoryKey: item.category,
    value: item.value,
    count: item.count,
    percentage: totalCreditorsAmount > 0 ? ((item.value / totalCreditorsAmount) * 100).toFixed(1) : '0',
    color: CREDITOR_CATEGORY_COLORS[item.category] || '#64748b',
  }));

  // Debtors Handlers
  const handleAddDebtorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtorName.trim() || !newDebtorAmount) return;

    dbStore.addDebtor({
      fullName: newDebtorName,
      nationalId: newDebtorNationalId || '0000000000',
      phone: newDebtorPhone || '09120000000',
      category: newDebtorCategory,
      categoryTitle: newDebtorCategoryTitle,
      amount: parseInt(newDebtorAmount, 10) || 0,
      dueDate: newDebtorDueDate,
      status: 'overdue',
      notes: newDebtorNotes,
    });

    refreshData();
    setIsAddDebtorModalOpen(false);
    setNewDebtorName('');
    setNewDebtorPhone('');
    setNewDebtorNotes('');
    showToast('بدهکار جدید با موفقیت به دفتر حسابداری اضافه شد.');
  };

  const handleSettleDebtor = (debtor: DebtorRecord) => {
    setSettleDebtorTarget(debtor);
  };

  const confirmSettleDebtor = () => {
    if (!settleDebtorTarget) return;
    dbStore.settleDebtor(settleDebtorTarget.id);
    refreshData();
    showToast(`بدهی ${settleDebtorTarget.fullName} تسویه شد و به عنوان درآمد در دفتر روزنامه ثبت گردید.`);
    setSettleDebtorTarget(null);
  };

  const generatePoliteReminderSms = (debtor: DebtorRecord) => {
    const clubSettings = dbStore.getClubSettings();
    const clubName = clubSettings.name || 'باشگاه سنگ‌نوردی موج';
    const amountStr = toPersianDigits((debtor.amount ?? 0).toLocaleString('fa-IR'));
    const categoryStr = debtor.categoryTitle || 'شهریه و خدمات باشگاه';

    let text = `جناب آقای/سرکار خانم ${debtor.fullName}\nبا سلام، مبلغ ${amountStr} تومان بابت ${categoryStr} در ${clubName} سررسید شده است. لطفاً جهت تسویه حساب اقدام فرمایید.\nبا تشکر - ${clubName}`;

    if (clubSettings.smsSignature) {
      text += `\n${clubSettings.smsSignature}`;
    }

    return text;
  };

  const handleSendReminderSMS = (debtor: DebtorRecord) => {
    setSmsDebtorTarget(debtor);
    setSmsMessageText(generatePoliteReminderSms(debtor));
  };

  const confirmSendDebtorSMS = async () => {
    if (!smsDebtorTarget) return;

    if (!smsDebtorTarget.phone || !smsDebtorTarget.phone.trim()) {
      showToast('شماره همراه بدهکار در سامانه ثبت نشده است.', 'error');
      return;
    }

    if (!smsMessageText.trim()) {
      showToast('متن پیامک نمی‌تواند خالی باشد.', 'error');
      return;
    }

    const clubSettings = dbStore.getClubSettings();
    if (!clubSettings.smsApiKey) {
      showToast('کلید API پنل پیامک در تنظیمات باشگاه ثبت نشده است. لطفاً ابتدا در بخش تنظیمات/مدیریت پیامک کلید API را وارد نمایید.', 'error');
      return;
    }

    setIsSendingSms(true);
    try {
      const res = await dbStore.sendBulkSms({
        apiKey: clubSettings.smsApiKey,
        lineNumber: clubSettings.smsLineNumber || '30007732',
        messageText: smsMessageText.trim(),
        mobiles: [smsDebtorTarget.phone],
        recipientNames: [smsDebtorTarget.fullName],
        targetGroup: 'debtor_reminder',
        sentBy: 'مدیریت مالی',
      });

      if (res.success) {
        showToast(`پیامک یادآوری بدهی با موفقیت به ${smsDebtorTarget.fullName} (${toPersianDigits(smsDebtorTarget.phone)}) ارسال گردید.`, 'success');
        setSmsDebtorTarget(null);
      } else {
        showToast(`خطا در ارسال پیامک: ${res.error || 'ارسال ناموفق بود'}`, 'error');
      }
    } catch (err: any) {
      showToast(`خطا در ارتباط با سامانه پیامک: ${err.message || 'خطای شبکه'}`, 'error');
    } finally {
      setIsSendingSms(false);
    }
  };

  // Creditors Handlers
  const handleAddCreditorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreditorName.trim() || !newCreditorAmount) return;

    dbStore.addCreditor({
      creditorName: newCreditorName,
      category: newCreditorCategory,
      categoryTitle: newCreditorCategoryTitle,
      contactPhone: newCreditorPhone,
      ibanNumber: newCreditorIban,
      amount: parseInt(newCreditorAmount, 10) || 0,
      dueDate: newCreditorDueDate,
      status: 'unpaid',
      notes: newCreditorNotes,
    });

    refreshData();
    setIsAddCreditorModalOpen(false);
    setNewCreditorName('');
    setNewCreditorPhone('');
    setNewCreditorIban('');
    setNewCreditorNotes('');
    showToast('طلبکار جدید با موفقیت ثبت شد.');
  };

  const handlePayCreditor = (creditor: CreditorRecord) => {
    setPayCreditorTarget(creditor);
  };

  const confirmPayCreditor = () => {
    if (!payCreditorTarget) return;
    dbStore.payCreditor(payCreditorTarget.id);
    refreshData();
    showToast(`طلب ${payCreditorTarget.creditorName} تسویه شد و در حسابداری ثبت گردید.`);
    setPayCreditorTarget(null);
  };

  // Filters
  const filteredDebtors = debtors.filter((d) => {
    const fName = d?.fullName || '';
    const nId = d?.nationalId || '';
    const ph = d?.phone || '';
    const matchesSearch =
      fName.includes(searchTerm) ||
      nId.includes(searchTerm) ||
      ph.includes(searchTerm);
    const matchesCategory = selectedDebtorCategory === 'all' || d.category === selectedDebtorCategory;
    const matchesChart = !selectedDebtorChartCategory || d.category === selectedDebtorChartCategory;
    return matchesSearch && matchesCategory && matchesChart;
  });

  const filteredCreditors = creditors.filter((c) => {
    const cName = c?.creditorName || '';
    const cPhone = c?.contactPhone || '';
    const cIban = c?.ibanNumber || '';
    const matchesSearch =
      cName.includes(searchTerm) ||
      (cPhone && cPhone.includes(searchTerm)) ||
      (cIban && cIban.includes(searchTerm));
    const matchesCategory = selectedCreditorCategory === 'all' || c.category === selectedCreditorCategory;
    const matchesChart = !selectedCreditorChartCategory || c.category === selectedCreditorChartCategory;
    return matchesSearch && matchesCategory && matchesChart;
  });

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs dir-rtl space-y-1">
          <div className="flex items-center gap-2 font-black text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <span>{data.name}</span>
          </div>
          <div className="text-slate-200">
            مبلغ کل: <strong className="text-emerald-400 font-mono text-sm font-black">{toPersianDigits(data.value.toLocaleString('fa-IR'))}</strong> تومان
          </div>
          <div className="text-slate-400 text-[11px]">
            سهم از مجموع: <strong className="text-white">{toPersianDigits(data.percentage)}٪</strong> ({toPersianDigits(data.count)} مورد)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Toast Notification */}
      {notificationMessage && (
        <div className={`fixed bottom-6 left-6 z-50 text-white px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fade-in text-xs font-bold max-w-md ${
          notificationType === 'error'
            ? 'bg-rose-900 border-rose-500/50'
            : notificationType === 'info'
            ? 'bg-blue-900 border-blue-500/50'
            : 'bg-slate-900 border-teal-500/30'
        }`}>
          {notificationType === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          )}
          <span className="leading-relaxed">{notificationMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm shrink-0">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              داشبورد مدیریت مالی - بدهکاران و طلبکاران باشگاه
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              تحلیل بصری مطالبات، بدهی‌های جاری، تراز مالی و نمودارهای تفکیکی ساختار مالی باشگاه سنگ‌نوردی
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddDebtorModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-all text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت بدهکار جدید</span>
          </button>
          <button
            onClick={() => setIsAddCreditorModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت طلبکار جدید</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Debtors Metric */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مطالبات باشگاه (بدهکاران)</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(totalDebtorsAmount.toLocaleString('fa-IR'))}{' '}
              <span className="text-xs font-bold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] text-teal-700 font-bold mt-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{toPersianDigits(debtors.length)} بدهکار در سامانه</span>
            </p>
          </div>
          <div className="h-1 bg-teal-500 rounded-full w-full" />
        </div>

        {/* Total Creditors Metric */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">بدهی‌های باشگاه (طلبکاران)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-rose-700">
              {toPersianDigits(totalCreditorsAmount.toLocaleString('fa-IR'))}{' '}
              <span className="text-xs font-bold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              <span>{toPersianDigits(creditors.length)} مربی / تامین‌کننده طلبکار</span>
            </p>
          </div>
          <div className="h-1 bg-rose-500 rounded-full w-full" />
        </div>

        {/* Net Financial Balance Metric */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تراز خالص مالی باشگاه</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              netFinancialBalance >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className={`text-2xl font-black ${netFinancialBalance >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {toPersianDigits(Math.abs(netFinancialBalance).toLocaleString('fa-IR'))}{' '}
              <span className="text-xs font-bold text-slate-500">تومان</span>
            </p>
            <p className="text-[11px] font-bold mt-1">
              {netFinancialBalance >= 0 ? (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  تراز مثبت (مطالبات بیش از بدهی‌ها)
                </span>
              ) : (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  تراز منفی (بدهی‌ها بیش از مطالبات)
                </span>
              )}
            </p>
          </div>
          <div className={`h-1 rounded-full w-full ${netFinancialBalance >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        </div>

        {/* Debt Recovery Efficiency Metric */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نرخ مطالبات معوقه شدید</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(debtors.filter((d) => d.status === 'overdue').length)}{' '}
              <span className="text-xs font-bold text-slate-500">مورد</span>
            </p>
            <p className="text-[11px] text-amber-700 font-bold mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>نیاز به پیگیری و ارسال پیامک تسویه</span>
            </p>
          </div>
          <div className="h-1 bg-amber-500 rounded-full w-full" />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>تحلیل یکپارچه و نمودارهای دایره‌ای</span>
          </button>
          <button
            onClick={() => setActiveTab('debtors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'debtors'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>جدول بدهکاران باشگاه ({toPersianDigits(debtors.length)})</span>
          </button>
          <button
            onClick={() => setActiveTab('creditors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'creditors'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>جدول طلبکاران باشگاه ({toPersianDigits(creditors.length)})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-bold px-2">
          مجموع کل تراکنش‌ها: <span className="text-slate-900 font-black">{toPersianDigits(debtors.length + creditors.length)}</span> پرونده مالی
        </div>
      </div>

      {/* VIEW 1: OVERVIEW & RECHARTS PIE CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PIE CHART 1: DEBTORS BREAKDOWN */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">نمودار دایره‌ای تفکیکی بدهکاران (مطالبات)</h3>
                    <p className="text-[11px] text-slate-500">تفکیک بر اساس نوع شهریه، بیمه، تجهیزات و فیش‌ها</p>
                  </div>
                </div>
                {selectedDebtorChartCategory && (
                  <button
                    onClick={() => setSelectedDebtorChartCategory(null)}
                    className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-bold hover:bg-teal-100 transition-all flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>حذف فیلتر نمودار</span>
                  </button>
                )}
              </div>

              {debtorChartData.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={debtorChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                          onClick={(entry: any) => {
                            const catKey = entry?.categoryKey || entry?.payload?.categoryKey;
                            if (catKey) {
                              if (selectedDebtorChartCategory === catKey) {
                                setSelectedDebtorChartCategory(null);
                              } else {
                                setSelectedDebtorChartCategory(catKey);
                              }
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {debtorChartData.map((entry, index) => (
                            <Cell
                              key={`cell-deb-${entry.categoryKey || index}`}
                              fill={entry.color}
                              stroke={selectedDebtorChartCategory === entry.categoryKey ? '#0f172a' : '#ffffff'}
                              strokeWidth={selectedDebtorChartCategory === entry.categoryKey ? 3 : 2}
                              opacity={selectedDebtorChartCategory && selectedDebtorChartCategory !== entry.categoryKey ? 0.35 : 1}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Interactive Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {debtorChartData.map((item, index) => (
                      <div
                        key={`deb-leg-${item.categoryKey || index}`}
                        onClick={() => {
                          if (selectedDebtorChartCategory === item.categoryKey) {
                            setSelectedDebtorChartCategory(null);
                          } else {
                            setSelectedDebtorChartCategory(item.categoryKey);
                          }
                        }}
                        className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedDebtorChartCategory === item.categoryKey
                            ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20 shadow-xs'
                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold text-slate-800 truncate">{item.name}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="font-black text-slate-900">{toPersianDigits(item.percentage)}٪</span>
                          <span className="text-[10px] text-slate-500 block">
                            {toPersianDigits(item.value.toLocaleString('fa-IR'))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  هیچ داده‌ای برای نمایش بدهکاران وجود ندارد.
                </div>
              )}
            </div>

            {/* PIE CHART 2: CREDITORS BREAKDOWN */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">نمودار دایره‌ای تفکیکی طلبکاران (بدهی‌ها)</h3>
                    <p className="text-[11px] text-slate-500">تفکیک حقوق مربیان، اجاره سالن، تجهیزات و خدمات</p>
                  </div>
                </div>
                {selectedCreditorChartCategory && (
                  <button
                    onClick={() => setSelectedCreditorChartCategory(null)}
                    className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-bold hover:bg-rose-100 transition-all flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>حذف فیلتر نمودار</span>
                  </button>
                )}
              </div>

              {creditorChartData.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={creditorChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                          onClick={(entry: any) => {
                            const catKey = entry?.categoryKey || entry?.payload?.categoryKey;
                            if (catKey) {
                              if (selectedCreditorChartCategory === catKey) {
                                setSelectedCreditorChartCategory(null);
                              } else {
                                setSelectedCreditorChartCategory(catKey);
                              }
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {creditorChartData.map((entry, index) => (
                            <Cell
                              key={`cell-cred-${entry.categoryKey || index}`}
                              fill={entry.color}
                              stroke={selectedCreditorChartCategory === entry.categoryKey ? '#0f172a' : '#ffffff'}
                              strokeWidth={selectedCreditorChartCategory === entry.categoryKey ? 3 : 2}
                              opacity={selectedCreditorChartCategory && selectedCreditorChartCategory !== entry.categoryKey ? 0.35 : 1}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Interactive Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {creditorChartData.map((item, index) => (
                      <div
                        key={`cred-leg-${item.categoryKey || index}`}
                        onClick={() => {
                          if (selectedCreditorChartCategory === item.categoryKey) {
                            setSelectedCreditorChartCategory(null);
                          } else {
                            setSelectedCreditorChartCategory(item.categoryKey);
                          }
                        }}
                        className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedCreditorChartCategory === item.categoryKey
                            ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold text-slate-800 truncate">{item.name}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="font-black text-rose-900">{toPersianDigits(item.percentage)}٪</span>
                          <span className="text-[10px] text-slate-500 block">
                            {toPersianDigits(item.value.toLocaleString('fa-IR'))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  هیچ داده‌ای برای نمایش طلبکاران وجود ندارد.
                </div>
              )}
            </div>
          </div>

          {/* Quick Summary Comparative Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600" />
                <span>تحلیل مقایسه‌ای سهم‌های مالی باشگاه</span>
              </h3>
              <button
                onClick={() => setActiveTab('debtors')}
                className="text-xs text-teal-700 font-bold hover:underline flex items-center gap-1"
              >
                <span>مشاهده لیست کامل جزییات بدهکاران</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="font-black text-slate-800 border-b border-slate-200 pb-2">
                  خلاصه وضعیت بدهکاران (مطالبات باشگاه)
                </div>
                {debtorChartData.map((d, index) => (
                  <div key={`deb-sum-${d.categoryKey || index}`} className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                      {d.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {toPersianDigits(d.value.toLocaleString('fa-IR'))} تومان ({toPersianDigits(d.percentage)}٪)
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="font-black text-slate-800 border-b border-slate-200 pb-2">
                  خلاصه وضعیت طلبکاران (بدهی‌های جاری)
                </div>
                {creditorChartData.map((c, index) => (
                  <div key={`cred-sum-${c.categoryKey || index}`} className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></span>
                      {c.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {toPersianDigits(c.value.toLocaleString('fa-IR'))} تومان ({toPersianDigits(c.percentage)}٪)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEBTORS TABLE VIEW */}
      {(activeTab === 'debtors' || activeTab === 'overview') && activeTab === 'debtors' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">لیست بدهکاران باشگاه (مطالبات معوقه)</h3>
                <p className="text-xs text-slate-500">امکان ثبت تسویه حساب، ارسال پیامک یادآوری و بررسی سوابق بدهی اعضا</p>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی نام یا کد ملی..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-teal-500 outline-none w-48 sm:w-64"
                />
              </div>

              <select
                value={selectedDebtorCategory}
                onChange={(e) => setSelectedDebtorCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                <option value="tuition">شهریه معوقه</option>
                <option value="insurance">بیمه ورزشی</option>
                <option value="equipment">خرید تجهیزات</option>
                <option value="pending_receipt">فیش در انتظار</option>
                <option value="other">متفرقه</option>
              </select>

              <button
                onClick={() => setIsAddDebtorModalOpen(true)}
                className="px-3.5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت بدهکار جدید</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 rounded-r-xl">نام بدهکار (عضو)</th>
                  <th className="p-3.5">کد ملی / تماس</th>
                  <th className="p-3.5">بابت (عنوان بدهی)</th>
                  <th className="p-3.5">مبلغ بدهی (تومان)</th>
                  <th className="p-3.5">سررسید</th>
                  <th className="p-3.5 text-center">وضعیت</th>
                  <th className="p-3.5 rounded-l-xl text-center">عملیات تسویه و پیگیری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDebtors.map((deb, index) => (
                  <tr key={deb.id || `deb-row-${index}`} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3.5 font-bold text-slate-900">{deb.fullName}</td>
                    <td className="p-3.5 font-mono text-slate-600">
                      <div>{toPersianDigits(deb.nationalId)}</div>
                      <div className="text-[11px] text-slate-400">{toPersianDigits(deb.phone)}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                        {deb.categoryTitle}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-teal-700 font-mono text-sm">
                      {toPersianDigits((deb.amount ?? 0).toLocaleString('fa-IR'))}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{toPersianDigits(deb.dueDate)}</td>
                    <td className="p-3.5 text-center">
                      {deb.status === 'overdue' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center gap-1 mx-auto w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>معوقه شدید</span>
                        </span>
                      )}
                      {deb.status === 'due_soon' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-1 mx-auto w-fit">
                          <Clock className="w-3 h-3" />
                          <span>نزدیک سررسید</span>
                        </span>
                      )}
                      {deb.status === 'pending_approval' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center gap-1 mx-auto w-fit">
                          <Clock className="w-3 h-3" />
                          <span>فیش در انتظار</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSettleDebtor(deb)}
                          className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white border border-teal-200 transition-all font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ثبت تسویه</span>
                        </button>
                        <button
                          onClick={() => handleSendReminderSMS(deb)}
                          className="px-2 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-bold text-[11px] flex items-center gap-1"
                          title="ارسال پیامک یادآوری"
                        >
                          <Send className="w-3 h-3 text-teal-600" />
                          <span>ارسال پیامک</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`آیا از حذف دائم این بدهی (${deb.fullName} - ${deb.categoryTitle}) اطمینان دارید؟`)) {
                              dbStore.deleteDebtor(deb.id, 'مدیریت مالی');
                              setDebtors(dbStore.getDebtors());
                            }
                          }}
                          className="px-2 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all font-bold text-[11px] flex items-center gap-1"
                          title="حذف بدهی"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredDebtors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      هیچ بدهکاری با مشخصات درخواستی یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: CREDITORS TABLE VIEW */}
      {activeTab === 'creditors' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">لیست طلبکاران باشگاه (بدهی‌های جاری)</h3>
                <p className="text-xs text-slate-500">حق‌الزحمه مربیان، اجاره سالن، فاکتورهای خریدهای تجهیزات و شماره حساب‌ها</p>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی عنوان طلبکار یا شماره حساب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-rose-500 outline-none w-48 sm:w-64"
                />
              </div>

              <select
                value={selectedCreditorCategory}
                onChange={(e) => setSelectedCreditorCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                <option value="coach_salary">حق‌الزحمه مربی</option>
                <option value="rent">اجاره سالن</option>
                <option value="equipment_vendor">تامین تجهیزات</option>
                <option value="maintenance">خدمات و نگهداری</option>
                <option value="member_deposit">ودیعه اعضا</option>
              </select>

              <button
                onClick={() => setIsAddCreditorModalOpen(true)}
                className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت طلبکار جدید</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 rounded-r-xl">عنوان طلبکار</th>
                  <th className="p-3.5">دسته‌بندی بدهی</th>
                  <th className="p-3.5">شماره تماس / شبا</th>
                  <th className="p-3.5">مبلغ بدهی (تومان)</th>
                  <th className="p-3.5">تاریخ سررسید</th>
                  <th className="p-3.5 text-center">وضعیت</th>
                  <th className="p-3.5 rounded-l-xl text-center">عملیات تسویه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCreditors.map((cred, index) => (
                  <tr key={cred.id || `cred-row-${index}`} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3.5 font-bold text-slate-900">{cred.creditorName}</td>
                    <td className="p-3.5 font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">
                        {cred.categoryTitle}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dir-ltr text-right">
                      <div>{cred.contactPhone ? toPersianDigits(cred.contactPhone) : '—'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{cred.ibanNumber}</div>
                    </td>
                    <td className="p-3.5 font-black text-rose-700 font-mono text-sm">
                      {toPersianDigits((cred.amount ?? 0).toLocaleString('fa-IR'))}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{toPersianDigits(cred.dueDate)}</td>
                    <td className="p-3.5 text-center">
                      {cred.status === 'unpaid' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center gap-1 mx-auto w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>پرداخت نشده</span>
                        </span>
                      )}
                      {cred.status === 'partially_paid' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-1 mx-auto w-fit">
                          <Clock className="w-3 h-3" />
                          <span>پرداخت جزئی</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handlePayCreditor(cred)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all font-bold text-[11px] flex items-center gap-1 mx-auto shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>پرداخت و تسویه</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCreditors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      هیچ طلبکاری با مشخصات درخواستی یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW DEBTOR */}
      {isAddDebtorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>ثبت بدهکار جدید (مطالبات باشگاه)</span>
              </h3>
              <button
                onClick={() => setIsAddDebtorModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDebtorSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نام و نام خانوادگی بدهکار *</label>
                  <input
                    type="text"
                    required
                    value={newDebtorName}
                    onChange={(e) => setNewDebtorName(e.target.value)}
                    placeholder="مثال: علی حسینی"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره تماس *</label>
                  <input
                    type="text"
                    required
                    value={newDebtorPhone}
                    onChange={(e) => setNewDebtorPhone(e.target.value)}
                    placeholder="09121112233"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد ملی</label>
                  <input
                    type="text"
                    value={newDebtorNationalId}
                    onChange={(e) => setNewDebtorNationalId(e.target.value)}
                    placeholder="0012345678"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع بدهی</label>
                  <select
                    value={newDebtorCategory}
                    onChange={(e) => {
                      const cat = e.target.value as DebtorRecord['category'];
                      setNewDebtorCategory(cat);
                      if (cat === 'tuition') setNewDebtorCategoryTitle('شهریه معوقه');
                      else if (cat === 'insurance') setNewDebtorCategoryTitle('بیمه ورزشی');
                      else if (cat === 'equipment') setNewDebtorCategoryTitle('خرید اعتباری تجهیزات');
                      else if (cat === 'pending_receipt') setNewDebtorCategoryTitle('فیش در انتظار بررسی');
                      else setNewDebtorCategoryTitle('متفرقه');
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none font-bold"
                  >
                    <option value="tuition">شهریه معوقه سانس</option>
                    <option value="insurance">بیمه ورزشی</option>
                    <option value="equipment">خرید اعتباری تجهیزات</option>
                    <option value="pending_receipt">فیش واریزی در انتظار</option>
                    <option value="other">متفرقه</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مبلغ بدهی (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={newDebtorAmount}
                    onChange={(e) => setNewDebtorAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 outline-none font-mono font-bold text-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاریخ سررسید (شمسی)</label>
                  <JalaliDatePicker
                    value={newDebtorDueDate}
                    onChange={(val) => setNewDebtorDueDate(val)}
                    placeholder="انتخاب سررسید..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و بابت</label>
                <textarea
                  rows={2}
                  value={newDebtorNotes}
                  onChange={(e) => setNewDebtorNotes(e.target.value)}
                  placeholder="جزئیات توافق یا علت تأخیر در پرداخت..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDebtorModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-sm"
                >
                  ثبت پرونده بدهکار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW CREDITOR */}
      {isAddCreditorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-rose-600" />
                <span>ثبت طلبکار جدید (بدهی‌های باشگاه)</span>
              </h3>
              <button
                onClick={() => setIsAddCreditorModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCreditorSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عنوان طلبکار (مربی/فروشگاه) *</label>
                  <input
                    type="text"
                    required
                    value={newCreditorName}
                    onChange={(e) => setNewCreditorName(e.target.value)}
                    placeholder="مثال: شرکت موج‌سازه / مربی کریمی"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع بدهی باشگاه</label>
                  <select
                    value={newCreditorCategory}
                    onChange={(e) => {
                      const cat = e.target.value as CreditorRecord['category'];
                      setNewCreditorCategory(cat);
                      if (cat === 'coach_salary') setNewCreditorCategoryTitle('حق‌الزحمه مربیگری');
                      else if (cat === 'rent') setNewCreditorCategoryTitle('اجاره دیواره و سالن');
                      else if (cat === 'equipment_vendor') setNewCreditorCategoryTitle('تامین‌کننده تجهیزات');
                      else if (cat === 'maintenance') setNewCreditorCategoryTitle('سرویس و نگهداری');
                      else setNewCreditorCategoryTitle('ودیعه و بستانکاری اعضا');
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none font-bold"
                  >
                    <option value="coach_salary">حق‌الزحمه مربیگری</option>
                    <option value="rent">اجاره سالن و دیواره</option>
                    <option value="equipment_vendor">خرید تجهیزات و گیره‌ها</option>
                    <option value="maintenance">سرویس و ایمنی تشک‌ها</option>
                    <option value="member_deposit">ودیعه اعضا</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره تماس</label>
                  <input
                    type="text"
                    value={newCreditorPhone}
                    onChange={(e) => setNewCreditorPhone(e.target.value)}
                    placeholder="09122223344"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره شبا یا کارت</label>
                  <input
                    type="text"
                    value={newCreditorIban}
                    onChange={(e) => setNewCreditorIban(e.target.value)}
                    placeholder="IR62017..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مبلغ طلبکار (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={newCreditorAmount}
                    onChange={(e) => setNewCreditorAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 outline-none font-mono font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاریخ سررسید پرداخت</label>
                  <JalaliDatePicker
                    value={newCreditorDueDate}
                    onChange={(val) => setNewCreditorDueDate(val)}
                    placeholder="انتخاب سررسید..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و بابت</label>
                <textarea
                  rows={2}
                  value={newCreditorNotes}
                  onChange={(e) => setNewCreditorNotes(e.target.value)}
                  placeholder="جزئیات فاکتور، سفارش یا حق‌الزحمه..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCreditorModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-sm"
                >
                  ثبت پرونده طلبکار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DEBTOR SETTLEMENT */}
      {settleDebtorTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-teal-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-teal-700 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-teal-50 rounded-2xl border border-teal-200">
                <CheckCircle2 className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تایید تسویه کامل بدهی</h3>
                <p className="text-xs text-slate-500">ثبت سند واریزی و انتقال به دفتر روزنامه</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">بدهکار:</span>
                <span className="text-slate-900 font-black">{settleDebtorTarget.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">بابت بدهی:</span>
                <span className="text-slate-800 font-bold">{settleDebtorTarget.categoryTitle}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-600 font-bold">مبلغ بدهی جهت تسویه:</span>
                <span className="text-teal-700 font-black text-sm">
                  {toPersianDigits((settleDebtorTarget.amount ?? 0).toLocaleString('fa-IR'))} تومان
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              با تایید این فرم، این بدهی به عنوان «تراکنش موفق» در دفتر روزنامه ثبت شده و رکورد بدهکار از دفتر مطالبات جاری خارج می‌گردد.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleDebtorTarget(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmSettleDebtor}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تایید و ثبت تسویه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM CREDITOR PAYMENT */}
      {payCreditorTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-700 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-200">
                <Building className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تایید پرداخت وجه طلبکار</h3>
                <p className="text-xs text-slate-500">ثبت پرداخت بدهی باشگاه</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">طلبکار:</span>
                <span className="text-slate-900 font-black">{payCreditorTarget.creditorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">دسته‌بندی:</span>
                <span className="text-slate-800 font-bold">{payCreditorTarget.categoryTitle}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-600 font-bold">مبلغ پرداختی:</span>
                <span className="text-rose-700 font-black text-sm">
                  {toPersianDigits((payCreditorTarget.amount ?? 0).toLocaleString('fa-IR'))} تومان
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              با تایید این مرحله، وضعیت این طلبکار به «تسویه‌شده» تغییر می‌یابد.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayCreditorTarget(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmPayCreditor}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تایید و پرداخت</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM SEND SMS TO DEBTOR */}
      {smsDebtorTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-teal-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3 text-teal-700">
                <div className="p-2.5 bg-teal-50 rounded-2xl border border-teal-200">
                  <Send className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">تایید ارسال پیامک یادآوری بدهی</h3>
                  <p className="text-xs text-slate-500">ارسال پیامک اطلاع‌رسانی با استفاده از تنظیمات پنل پیامکی باشگاه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmsDebtorTarget(null)}
                disabled={isSendingSms}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Debtor info card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">نام و نام خانوادگی بدهکار:</span>
                <span className="text-slate-900 font-black">{smsDebtorTarget.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">شماره تلفن همراه:</span>
                <span className="text-slate-900 font-mono font-bold">
                  {smsDebtorTarget.phone ? toPersianDigits(smsDebtorTarget.phone) : <span className="text-rose-600">ثبت نشده</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">عنوان بدهی:</span>
                <span className="text-slate-800 font-bold">{smsDebtorTarget.categoryTitle}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/80">
                <span className="text-slate-600 font-bold">مبلغ بدهی جهت پیگیری:</span>
                <span className="text-teal-700 font-black text-sm">
                  {toPersianDigits((smsDebtorTarget.amount ?? 0).toLocaleString('fa-IR'))} تومان
                </span>
              </div>
            </div>

            {/* Check API Key Status */}
            {!dbStore.getClubSettings().smsApiKey && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>هشدار:</strong> کلید API پنل پیامک در تنظیمات باشگاه ثبت نشده است. لطفاً ابتدا در بخش مدیریت پیامک کلید API را ثبت کنید.
                </span>
              </div>
            )}

            {/* Editable message textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>متن پیامک محترمانه (قابل ویرایش):</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {toPersianDigits(smsMessageText.length)} کاراکتر
                </span>
              </label>
              <textarea
                rows={5}
                value={smsMessageText}
                onChange={(e) => setSmsMessageText(e.target.value)}
                placeholder="متن پیامک یادآوری..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 leading-relaxed focus:bg-white focus:border-teal-500 outline-none transition-all resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSmsDebtorTarget(null)}
                disabled={isSendingSms}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmSendDebtorSMS}
                disabled={isSendingSms || !smsDebtorTarget.phone}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {isSendingSms ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ارسال...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>تایید و ارسال پیامک</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
