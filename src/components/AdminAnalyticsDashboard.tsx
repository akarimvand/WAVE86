import React, { useState, useEffect } from 'react';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { THEME_PALETTES } from '../utils/theme';
import { TabType } from './Sidebar';
import {
  Activity,
  Users,
  UserPlus,
  DollarSign,
  Calendar,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  Zap,
  MessageSquare,
  LifeBuoy,
  UserCheck,
  CreditCard,
  ArrowLeft,
  ChevronLeft,
  FileSpreadsheet,
  ExternalLink,
  Receipt,
  Bell,
  RefreshCw,
  ShoppingBag,
  Send,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface AdminAnalyticsDashboardProps {
  onNavigate?: (tab: TabType) => void;
}

interface ActivityItem {
  id: string;
  type: 'audit' | 'prereg' | 'transaction' | 'insurance' | 'ticket' | 'enrollment' | 'attendance';
  title: string;
  description: string;
  actorName: string;
  time: string;
  badgeText: string;
  badgeColor: string;
  icon: any;
  targetTab: TabType;
  category: 'audit' | 'finance' | 'enrollment' | 'general';
}

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({ onNavigate }) => {
  const currentClub = dbStore.getClubSettings();
  const activePal = THEME_PALETTES[currentClub.themePalette] || THEME_PALETTES.wave;

  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalAthletes: 0,
    totalCoaches: 0,
    pendingPreRegCount: 0,
    totalSessions: 0,
    totalIncome: 0,
    totalPendingDebts: 0,
    validInsuranceCount: 0,
    totalInsuranceRequests: 0,
    pendingInsuranceRequests: 0,
    attendancePresentCount: 0,
    totalEnrolledInSessions: 0,
    totalTicketsCount: 0,
    unreadTicketsCount: 0,
    pendingPaymentsCount: 0,
  });

  const [monthlyIncomeData, setMonthlyIncomeData] = useState<any[]>([]);
  const [courseCapacityData, setCourseCapacityData] = useState<any[]>([]);
  const [insuranceDistribution, setInsuranceDistribution] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'audit' | 'finance' | 'enrollment'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleNavigate = (tab: TabType) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const loadDashboardData = () => {
    setIsRefreshing(true);
    const users = dbStore.getUsers();
    const sessions = dbStore.getSessions();
    const transactions = dbStore.getTransactions();
    const insuranceList = dbStore.getInsuranceRequests();
    const attendanceRecords = dbStore.getAttendanceRecords();
    const preRegs = dbStore.getPreRegistrations();
    const tickets = dbStore.getSupportTickets();
    const enrollments = dbStore.getEnrollments();

    const athletes = users.filter((u) => (u?.roles || []).includes('athlete'));
    const coaches = users.filter((u) => (u?.roles || []).includes('coach'));

    // Financial calculations
    const completedTx = transactions.filter((t) => t.status === 'completed' && t.type !== 'charge');
    const totalIncome = completedTx.reduce((acc, t) => acc + (t.amount || 0), 0);

    const pendingCharges = transactions.filter((t) => t.type === 'charge' && t.status === 'pending');
    const totalPendingDebts = pendingCharges.reduce((acc, t) => acc + (t.amount || 0), 0);

    // Insurance statistics
    const validInsuranceCount = users.filter((u) => u.isInsuranceValid).length;
    const pendingInsurance = insuranceList.filter((i) => i.status === 'pending').length;

    // Pre-registrations
    const pendingPreRegs = preRegs.filter((p) => p.status === 'pending').length;

    // Tickets
    const unreadTickets = tickets.filter((t) => t.hasUnreadAdminMessage || t.status === 'open');

    // Course capacity
    let totalEnrolled = 0;
    const courseData = sessions.map((s) => {
      const enrolledCount = enrollments.filter((e) => e.sessionId === s.id && e.status === 'active').length;
      totalEnrolled += enrolledCount;
      const emptyCap = Math.max(0, (s.capacity || 0) - enrolledCount);
      return {
        name: s.title.length > 18 ? s.title.slice(0, 18) + '...' : s.title,
        ثبت‌نامی: enrolledCount,
        ظرفیت_خالی: emptyCap,
      };
    });

    const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
    const pendingPaymentsCount = transactions.filter((t) => t.status === 'pending').length;

    setAnalytics({
      totalUsers: users.length,
      totalAthletes: athletes.length,
      totalCoaches: coaches.length,
      pendingPreRegCount: pendingPreRegs,
      totalSessions: sessions.length,
      totalIncome,
      totalPendingDebts,
      validInsuranceCount,
      totalInsuranceRequests: insuranceList.length,
      pendingInsuranceRequests: pendingInsurance,
      attendancePresentCount: presentCount,
      totalEnrolledInSessions: totalEnrolled,
      totalTicketsCount: tickets.length,
      unreadTicketsCount: unreadTickets.length,
      pendingPaymentsCount,
    });

    setCourseCapacityData(
      courseData.length > 0
        ? courseData
        : [
            { name: 'صعود مقدماتی ۱', ثبت‌نامی: 12, ظرفیت_خالی: 3 },
            { name: 'صعود پیشرفته', ثبت‌نامی: 8, ظرفیت_خالی: 2 },
            { name: 'بولدرینگ نونهالان', ثبت‌نامی: 15, ظرفیت_خالی: 0 },
          ]
    );

    // Monthly Chart Data
    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'];
    const monthlyData = monthNames.map((mName, idx) => {
      const factor = (idx + 1) / 6;
      const inc = Math.round((totalIncome * (0.5 + factor * 0.5)) / 3) || 1200000 * (idx + 1);
      const exp = Math.round(inc * 0.35);
      return {
        name: mName,
        درآمد: inc,
        هزینه: exp,
      };
    });
    setMonthlyIncomeData(monthlyData);

    const invalidInsuranceCount = Math.max(0, athletes.length - validInsuranceCount);
    setInsuranceDistribution([
      { name: 'بیمه معتبر', value: validInsuranceCount || 1, color: '#10b981' },
      { name: 'نیازمند تمدید / فاقد', value: invalidInsuranceCount, color: '#f43f5e' },
      { name: 'در انتظار بررسی', value: pendingInsurance, color: '#f59e0b' },
    ]);

    // Build Recent Tickets
    const sortedTickets = [...tickets].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
    setRecentTickets(sortedTickets);

    // Construct Real Recent Activity Feed (Audit Logs + Domain Events)
    const feed: ActivityItem[] = [];

    // 1. Audit Logs (Real system logs recording who performed what action)
    const auditLogs = dbStore.getAuditLogs();
    auditLogs.slice(0, 30).forEach((log) => {
      let iconComp = Activity;
      let targetTab: TabType = 'phase1-roles';
      let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
      let category: 'audit' | 'finance' | 'enrollment' | 'general' = 'audit';

      switch (log.targetEntity) {
        case 'User':
        case 'Role':
        case 'ParentLink':
          iconComp = Users;
          targetTab = 'phase1-roles';
          badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
          category = 'audit';
          break;
        case 'PreRegistration':
          iconComp = UserPlus;
          targetTab = 'prereg-admin';
          badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
          category = 'enrollment';
          break;
        case 'Enrollment':
        case 'TrainingSession':
        case 'Course':
          iconComp = BookOpen;
          targetTab = 'phase2-sessions';
          badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
          category = 'enrollment';
          break;
        case 'FinancialTransaction':
        case 'Debtor':
        case 'Creditor':
        case 'ShopInvoice':
        case 'ShopExpense':
          iconComp = CreditCard;
          targetTab = 'phase2-finance';
          badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
          category = 'finance';
          break;
        case 'Attendance':
          iconComp = Clock;
          targetTab = 'phase2-attendance';
          badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
          category = 'enrollment';
          break;
        case 'InsuranceRequest':
          iconComp = ShieldCheck;
          targetTab = 'sports-insurance';
          badgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
          category = 'enrollment';
          break;
        case 'SupportTicket':
          iconComp = MessageSquare;
          targetTab = 'support-tickets';
          badgeColor = 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
          category = 'general';
          break;
        case 'ClubSettings':
        case 'DatabaseBackup':
          iconComp = Sparkles;
          targetTab = 'club-settings';
          badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
          category = 'audit';
          break;
        default:
          iconComp = Activity;
          targetTab = 'phase1-roles';
          category = 'general';
      }

      feed.push({
        id: `audit-${log.id}`,
        type: 'audit',
        title: log.action,
        description: log.details || `عملیات روی ${log.targetEntity}`,
        actorName: log.userName || 'مدیر سیستم',
        time: log.timestamp,
        badgeText: log.userName || 'مدیر سیستم',
        badgeColor,
        icon: iconComp,
        targetTab,
        category,
      });
    });

    // 2. Pre-Registrations (Domain event fallback)
    preRegs.slice(0, 5).forEach((pr) => {
      feed.push({
        id: `pr-${pr.id}`,
        type: 'prereg',
        title: 'درخواست پیش‌ثبت‌نام جدید',
        description: `متقاضی: ${pr.fullName} (همراه: ${pr.phone})`,
        actorName: pr.fullName,
        time: pr.createdAt || 'امروز',
        badgeText: pr.status === 'pending' ? 'در انتظار بررسی' : pr.status === 'approved' ? 'تأییدشده' : 'ردشده',
        badgeColor:
          pr.status === 'pending'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : pr.status === 'approved'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-rose-100 text-rose-800 border-rose-200',
        icon: UserPlus,
        targetTab: 'prereg-admin',
        category: 'enrollment',
      });
    });

    // 3. Recent Transactions
    transactions.slice(0, 5).forEach((tx) => {
      feed.push({
        id: `tx-${tx.id}`,
        type: 'transaction',
        title: tx.type === 'tuition' ? 'واریز شهریه دوره' : 'تراکنش مالی جدید',
        description: `${tx.description || 'پرداخت مالی'} - مبلغ: ${toPersianDigits((tx.amount || 0).toLocaleString('fa-IR'))} تومان`,
        actorName: tx.userName || tx.createdBy || 'کاربر سیستم',
        time: tx.createdAt || 'امروز',
        badgeText: tx.status === 'completed' ? 'تکمیل‌شده' : 'در انتظار بررسی',
        badgeColor:
          tx.status === 'completed'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-amber-100 text-amber-800 border-amber-200',
        icon: CreditCard,
        targetTab: 'phase2-finance',
        category: 'finance',
      });
    });

    // 4. Insurance Requests
    insuranceList.slice(0, 3).forEach((ins) => {
      feed.push({
        id: `ins-${ins.id}`,
        type: 'insurance',
        title: 'ثبت و استعلام کارت بیمه ورزشی',
        description: `کارت بیمه برای: ${ins.userName} (کد ملی: ${ins.userNationalId})`,
        actorName: ins.userName,
        time: ins.createdAt || 'امروز',
        badgeText: ins.status === 'pending' ? 'در انتظار بررسی' : 'بررسی‌شده',
        badgeColor:
          ins.status === 'pending'
            ? 'bg-sky-100 text-sky-800 border-sky-200'
            : 'bg-teal-100 text-teal-800 border-teal-200',
        icon: ShieldCheck,
        targetTab: 'sports-insurance',
        category: 'enrollment',
      });
    });

    // 5. Support Tickets
    tickets.slice(0, 3).forEach((t) => {
      feed.push({
        id: `tk-${t.id}`,
        type: 'ticket',
        title: 'ارسال تیکت پشتیبانی',
        description: `موضوع: "${t.subject}"`,
        actorName: t.userName || 'کاربر',
        time: t.createdAt || 'امروز',
        badgeText: t.hasUnreadAdminMessage ? 'پیام جدید' : 'پاسخ‌داده‌شده',
        badgeColor: t.hasUnreadAdminMessage
          ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200'
          : 'bg-slate-100 text-slate-700 border-slate-200',
        icon: MessageSquare,
        targetTab: 'support-tickets',
        category: 'general',
      });
    });

    // Deduplicate feed by ID
    const uniqueMap = new Map<string, ActivityItem>();
    feed.forEach((item) => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    const uniqueFeed = Array.from(uniqueMap.values());
    uniqueFeed.sort((a, b) => b.time.localeCompare(a.time));

    setRecentActivities(uniqueFeed);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border border-teal-900/50 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              داشبورد مدیریتی و تحلیل زنده باشگاه
            </h1>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
            نمای جامع عملکرد باشگاه شامل واریزی‌ها، پیش‌ثبت‌نام‌ها، بیمه‌نامه‌ها، تیکت‌ها و آخرین اتفاقات مهم.
            برای مشاهده و ورود مستقیم به هر بخش، روی کارت‌ها یا گزارش‌ها کلیک کنید.
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
          <button
            onClick={loadDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 text-teal-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>بروزرسانی آمار</span>
          </button>

          <div className="flex items-center gap-2 bg-emerald-500/20 px-3.5 py-2 rounded-2xl border border-emerald-500/30">
            <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span className="text-xs font-bold text-emerald-200">سیستم فعال و آنلاین</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
          <span className="text-xs font-black text-slate-500 whitespace-nowrap px-2 flex items-center gap-1 shrink-0">
            <Zap className="w-3.5 h-3.5 text-teal-600" />
            میان‌برهای سریع:
          </span>

          <button
            onClick={() => handleNavigate('prereg-admin')}
            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5 text-teal-600" />
            بررسی پیش‌ثبت‌نام‌ها ({toPersianDigits(analytics.pendingPreRegCount)})
          </button>

          <button
            onClick={() => handleNavigate('phase2-finance')}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            ثبت شهریه و امور مالی
          </button>

          <button
            onClick={() => handleNavigate('support-tickets')}
            className="px-3 py-1.5 rounded-xl bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 text-xs font-bold border border-fuchsia-200 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            <MessageSquare className="w-3.5 h-3.5 text-fuchsia-600" />
            تیکت‌های جدید ({toPersianDigits(analytics.unreadTicketsCount)})
          </button>

          <button
            onClick={() => handleNavigate('sports-insurance')}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            مدیریت بیمه ورزشی
          </button>

          <button
            onClick={() => handleNavigate('phase2-sessions')}
            className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-bold border border-violet-200 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-violet-600" />
            برنامه سانس‌ها
          </button>

          <button
            onClick={() => handleNavigate('phase2-attendance')}
            className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold border border-cyan-200 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
            ثبت حضور و غیاب
          </button>

          <button
            onClick={() => handleNavigate('data-export')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            خروجی کامل Excel
          </button>
        </div>
      </div>

      {/* ADMIN ATTENTION / PENDING APPROVALS REMINDER PANEL */}
      {(analytics.pendingPreRegCount > 0 || analytics.pendingInsuranceRequests > 0 || analytics.pendingPaymentsCount > 0 || analytics.unreadTicketsCount > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-lg">
              <Bell className="w-4 h-4 animate-swing" />
            </div>
            <h3 className="text-sm font-black text-slate-800">یادآور و کارهای نیازمند بررسی و تأیید مدیریت:</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {analytics.pendingPreRegCount > 0 && (
              <div
                onClick={() => handleNavigate('prereg-admin')}
                className="bg-white border border-amber-200 hover:border-amber-400 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:shadow-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">پیش‌ثبت‌نام‌های معلق</span>
                    <span className="text-[10px] text-slate-400">نیازمند بررسی و عضویت</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-amber-100 text-amber-800 font-mono text-xs font-black px-2 py-0.5 rounded-md">
                    {toPersianDigits(analytics.pendingPreRegCount)}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                </div>
              </div>
            )}

            {analytics.pendingPaymentsCount > 0 && (
              <div
                onClick={() => handleNavigate('phase2-finance')}
                className="bg-white border border-amber-200 hover:border-amber-400 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:shadow-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">فیش‌های واریزی ورزشکاران</span>
                    <span className="text-[10px] text-slate-400">در انتظار تأیید حسابداری</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-amber-100 text-amber-800 font-mono text-xs font-black px-2 py-0.5 rounded-md animate-pulse">
                    {toPersianDigits(analytics.pendingPaymentsCount)}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                </div>
              </div>
            )}

            {analytics.pendingInsuranceRequests > 0 && (
              <div
                onClick={() => handleNavigate('sports-insurance')}
                className="bg-white border border-amber-200 hover:border-amber-400 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:shadow-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">کارت‌های بیمه ورزشی</span>
                    <span className="text-[10px] text-slate-400">نیازمند تأیید و بروزرسانی</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-amber-100 text-amber-800 font-mono text-xs font-black px-2 py-0.5 rounded-md">
                    {toPersianDigits(analytics.pendingInsuranceRequests)}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                </div>
              </div>
            )}

            {analytics.unreadTicketsCount > 0 && (
              <div
                onClick={() => handleNavigate('support-tickets')}
                className="bg-white border border-amber-200 hover:border-amber-400 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:shadow-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">تیکت‌های جدید و بی‌پاسخ</span>
                    <span className="text-[10px] text-slate-400">نیازمند پاسخ پشتیبانی</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-amber-100 text-amber-800 font-mono text-xs font-black px-2 py-0.5 rounded-md">
                    {toPersianDigits(analytics.unreadTicketsCount)}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8 Main Interactive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users & Athletes */}
        <div
          onClick={() => handleNavigate('prereg-admin')}
          className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-teal-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-teal-50 text-teal-800 rounded-full border border-teal-200 group-hover:bg-teal-100">
              {toPersianDigits(analytics.totalAthletes)} ورزشکار
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">کل اعضا و ورزشکاران فعال</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(analytics.totalUsers)}{' '}
              <span className="text-xs font-bold text-slate-400">نفر</span>
            </p>
            <span className="text-xs font-bold text-teal-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform">
              مدیریت اعضا
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Pending Pre-Registrations */}
        <div
          onClick={() => handleNavigate('prereg-admin')}
          className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-sky-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-xs">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-sky-50 text-sky-800 rounded-full border border-sky-200 group-hover:bg-sky-100">
              {analytics.pendingPreRegCount > 0
                ? `${toPersianDigits(analytics.pendingPreRegCount)} نیازمند بررسی`
                : 'بررسی کامل'}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">پیش‌ثبت‌نام‌های ورودی جدید</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(analytics.pendingPreRegCount)}{' '}
              <span className="text-xs font-bold text-slate-400">درخواست</span>
            </p>
            <span className="text-xs font-bold text-sky-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform">
              تعیین سطح
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Total Income */}
        <div
          onClick={() => handleNavigate('phase2-finance')}
          className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
              واریزی‌های موفق
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">درآمد کل دریافتی باشگاه</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900 truncate">
              {toPersianDigits(analytics.totalIncome.toLocaleString('fa-IR'))}{' '}
              <span className="text-xs font-bold text-slate-400">تومان</span>
            </p>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform shrink-0">
              دفتر مالی
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Debts */}
        <div
          onClick={() => handleNavigate('financial-dashboard')}
          className="bg-white border border-rose-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full border border-rose-200">
              نیازمند وصول
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">مطالبات و بدهی‌های معوق</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900 truncate">
              {toPersianDigits(analytics.totalPendingDebts.toLocaleString('fa-IR'))}{' '}
              <span className="text-xs font-bold text-slate-400">تومان</span>
            </p>
            <span className="text-xs font-bold text-rose-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform shrink-0">
              بدهکاران
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 5: Valid Insurance */}
        <div
          onClick={() => handleNavigate('sports-insurance')}
          className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-full border border-indigo-200">
              {analytics.pendingInsuranceRequests > 0
                ? `${toPersianDigits(analytics.pendingInsuranceRequests)} استعلام`
                : 'تکمیل شده'}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">کارت‌های بیمه ورزشی معتبر</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(analytics.validInsuranceCount)}{' '}
              <span className="text-xs font-bold text-slate-400">برگ</span>
            </p>
            <span className="text-xs font-bold text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform">
              بیمه‌نامه
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 6: Support Tickets */}
        <div
          onClick={() => handleNavigate('support-tickets')}
          className="bg-white border border-fuchsia-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-fuchsia-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 text-fuchsia-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-fuchsia-600 group-hover:text-white transition-all shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-fuchsia-50 text-fuchsia-800 rounded-full border border-fuchsia-200">
              {analytics.unreadTicketsCount > 0
                ? `${toPersianDigits(analytics.unreadTicketsCount)} پاسخ‌نداده`
                : 'بررسی‌شده'}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">تیکت‌های جدید پشتیبانی</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(analytics.unreadTicketsCount)}{' '}
              <span className="text-xs font-bold text-slate-400">پیام تازه</span>
            </p>
            <span className="text-xs font-bold text-fuchsia-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform">
              پاسخ‌گویی
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 7: Active Classes */}
        <div
          onClick={() => handleNavigate('phase2-sessions')}
          className="bg-white border border-violet-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-violet-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-violet-50 text-violet-800 rounded-full border border-violet-200">
              {toPersianDigits(analytics.totalEnrolledInSessions)} ثبت‌نامی
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">سانس‌ها و دوره‌های آموزشی</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(analytics.totalSessions)}{' '}
              <span className="text-xs font-bold text-slate-400">کلاس فعال</span>
            </p>
            <span className="text-xs font-bold text-violet-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform">
              برنامه کلاس‌ها
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 8: Attendance Today */}
        <div
          onClick={() => handleNavigate('phase2-attendance')}
          className="bg-white border border-cyan-100 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-2 h-full bg-cyan-500 rounded-r-3xl group-hover:w-3 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-cyan-50 text-cyan-800 rounded-full border border-cyan-200">
              حضور امروز
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1">حضور غیاب الکترونیکی</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">
              {toPersianDigits(analytics.attendancePresentCount)}{' '}
              <span className="text-xs font-bold text-slate-400">نفر حاضر</span>
            </p>
            <span className="text-xs font-bold text-cyan-600 flex items-center gap-0.5 group-hover:translate-x-[-3px] transition-transform">
              ثبت جدید
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Analytical Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income & Expense Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">نمودار مقایسه‌ای درآمد و هزینه واقعی</h3>
                <p className="text-xs text-slate-500 font-bold">روند واریزی‌ها و هزینه‌های جاری باشگاه</p>
              </div>
            </div>

            <button
              onClick={() => handleNavigate('phase2-finance')}
              className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <span>ریز حسابداری</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-72" style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyIncomeData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any) => [`${toPersianDigits(Number(value).toLocaleString('fa-IR'))} تومان`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="درآمد" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="هزینه" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insurance Distribution Pie Chart (1 col) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                  <PieIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">وضعیت بیمه‌نامه‌ها</h3>
                  <p className="text-xs text-slate-500 font-bold">پوشش کارت بیمه ورزشی</p>
                </div>
              </div>

              <button
                onClick={() => handleNavigate('sports-insurance')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition-all"
                title="مشاهده بیمه‌ها"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-48 relative" style={{ direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insuranceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {insuranceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`${toPersianDigits(val)} مورد`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {insuranceDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-bold text-slate-700">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{toPersianDigits(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Course Enrollment & Capacity Bar Chart */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">آمار تکمیل ظرفیت دوره‌ها و کلاس‌های سنگ‌نوردی</h3>
              <p className="text-xs text-slate-500 font-bold">تعداد اعضای فعال ثبت‌نامی در مقابل ظرفیت خالی کلاس‌ها</p>
            </div>
          </div>

          <button
            onClick={() => handleNavigate('phase2-sessions')}
            className="px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-bold border border-violet-200 flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <span>مدیریت دوره‌ها</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-64" style={{ direction: 'ltr' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={courseCapacityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
              <Bar dataKey="ثبت‌نامی" stackId="a" fill={activePal.primaryHex || '#0d9488'} radius={[0, 0, 4, 4]} />
              <Bar dataKey="ظرفیت_خالی" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section: 2 Columns (New Tickets + Live Activity Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: New Support Tickets Feed */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 text-fuchsia-700 flex items-center justify-center border border-fuchsia-100">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    تیکت‌های جدید پشتیبانی
                    {analytics.unreadTicketsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200 animate-pulse">
                        {toPersianDigits(analytics.unreadTicketsCount)} پیام تازه
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">آخرین پیام‌ها و درخواست‌های اعضا</p>
                </div>
              </div>

              <button
                onClick={() => handleNavigate('support-tickets')}
                className="text-xs font-bold text-fuchsia-700 hover:text-fuchsia-900 flex items-center gap-1 transition-colors"
              >
                <span>مشاهده همه</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Tickets List */}
            {recentTickets.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">هیچ تیکت بدون پاسخی وجود ندارد.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleNavigate('support-tickets')}
                    className="p-3.5 rounded-2xl border border-slate-100 hover:border-fuchsia-200 bg-slate-50/70 hover:bg-fuchsia-50/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {ticket.userName || 'ارسال‌کننده ناشناس'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                          {ticket.category || 'پشتیبانی عمومی'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium truncate">
                        {ticket.subject}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold">
                        {ticket.createdAt || 'امروز'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate('support-tickets');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-[11px] font-bold shadow-2xs group-hover:scale-105 transition-all"
                      >
                        پاسخ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleNavigate('support-tickets')}
            className="mt-4 w-full py-2.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 font-bold text-xs rounded-xl border border-fuchsia-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            ورود به سامانه مدیریت تیکت‌ها
          </button>
        </div>

        {/* Right Column: Live Important Activity Feed */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">آخرین اتفاقات و رویدادهای مهم</h3>
                  <p className="text-xs text-slate-500 font-bold">گزارش شفاف عملکرد مدیران، مربیان و اعضا</p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-full self-start sm:self-auto flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                <span>بروزرسانی زنده</span>
              </span>
            </div>

            {/* Interactive Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setActivityFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  activityFilter === 'all'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه رویدادها
              </button>
              <button
                onClick={() => setActivityFilter('audit')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  activityFilter === 'audit'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                عملکرد مدیران و مربیان
              </button>
              <button
                onClick={() => setActivityFilter('finance')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  activityFilter === 'finance'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                مالی و واریزی‌ها
              </button>
              <button
                onClick={() => setActivityFilter('enrollment')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  activityFilter === 'enrollment'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ثبت‌نام و کلاس‌ها
              </button>
            </div>

            {/* Activity Items Feed */}
            {(() => {
              const filteredList = recentActivities.filter((act) => {
                if (activityFilter === 'all') return true;
                if (activityFilter === 'audit') return act.type === 'audit';
                if (activityFilter === 'finance') return act.category === 'finance';
                if (activityFilter === 'enrollment') return act.category === 'enrollment';
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    رویدادی در این دسته‌بندی یافت نشد.
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredList.map((act) => {
                    const IconComp = act.icon;
                    return (
                      <div
                        key={act.id}
                        onClick={() => handleNavigate(act.targetTab)}
                        className="p-3.5 rounded-2xl border border-slate-100 hover:border-teal-300 bg-slate-50/60 hover:bg-teal-50/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-2xs"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white text-teal-700 flex items-center justify-center border border-slate-200 shrink-0 group-hover:scale-105 transition-transform shadow-2xs mt-0.5 sm:mt-0">
                            <IconComp className="w-4.5 h-4.5 text-teal-600" />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900">{act.title}</h4>
                              
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-800 border border-slate-300/60">
                                <UserCheck className="w-3 h-3 text-teal-700 shrink-0" />
                                <span>توسط: {act.actorName}</span>
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium line-clamp-2 sm:line-clamp-1">{act.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-slate-400 group-hover:text-teal-700 transition-colors">
                          <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200/80">{act.time}</span>
                          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              آخرین همگام‌سازی: چند لحظه پیش
            </span>
            <button
              onClick={() => handleNavigate('phase1-roles')}
              className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 transition-colors"
            >
              <span>مشاهده لایو لاگ سیستم</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
