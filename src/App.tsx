import React, { useState, useEffect } from 'react';
import {
  Mountain,
  Lock,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  LogOut,
  UserCheck,
  ChevronDown,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Users,
  Menu,
  HelpCircle,
  Inbox,
  WifiOff,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Terminal,
  Activity,
} from 'lucide-react';
import { PageHelpModal } from './components/PageHelpModal';
import { HeaderInboxModal } from './components/HeaderInboxModal';
import { SyncDiagnosticsModal } from './components/SyncDiagnosticsModal';
import { Sidebar, TabType } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Phase1RolesPermissions } from './components/Phase1RolesPermissions';
import { PreRegistrationPublicForm } from './components/PreRegistrationPublicForm';
import { PreRegistrationAdminPanel } from './components/PreRegistrationAdminPanel';
import { InsurancePackagesView } from './components/InsurancePackagesView';
import { ClubSettingsView } from './components/ClubSettingsView';
import { SessionsManagementView } from './components/SessionsManagementView';
import { AttendanceTrackerView } from './components/AttendanceTrackerView';
import { FinancialAccountingView } from './components/FinancialAccountingView';
import { FinancialDashboardView } from './components/FinancialDashboardView';
import { UserPortalCoursesView } from './components/UserPortalCoursesView';
import { SportsInsuranceView } from './components/SportsInsuranceView';
import { SupportTicketingView } from './components/SupportTicketingView';
import { AdminAnalyticsDashboard } from './components/AdminAnalyticsDashboard';
import { DataExportView } from './components/DataExportView';
import { CoachPortalView } from './components/CoachPortalView';
import { ShopExpensesView } from './components/ShopExpensesView';
import { SmsManagementView } from './components/SmsManagementView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getCurrentJalaliDate, formatJalaliDate } from './utils/jalaliDate';

import { toPersianDigits, toEnglishDigits } from './utils/nationalIdValidator';
import { dbStore } from './services/db';
import { UserRoleKey, User as UserType, ClubSettings } from './types';
import { applyThemeToDocument, THEME_PALETTES } from './utils/theme';

export default function App() {
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('club_app_is_logged_in') === 'true';
  });
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = sessionStorage.getItem('club_app_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // App Loading & Server Status States
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isServerDisconnected, setIsServerDisconnected] = useState(false);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(() => dbStore.isDbConnected());

  // Club Settings & Branding State
  const [clubSettings, setClubSettings] = useState<ClubSettings>(() => dbStore.getClubSettings());

  // Sidebar Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = sessionStorage.getItem('club_app_active_tab') as TabType;
    if (saved) return saved;
    const savedUserStr = sessionStorage.getItem('club_app_current_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (['super_admin', 'admin', 'secretary'].includes(u.activeRole)) {
          return 'admin-analytics';
        }
      } catch (e) {}
    }
    return 'admin-analytics';
  });

  // Watch activeTab changes to persist in session
  useEffect(() => {
    sessionStorage.setItem('club_app_active_tab', activeTab);
  }, [activeTab]);

  // Clean up any residual localStorage on mount
  useEffect(() => {
    try {
      localStorage.clear();
    } catch {}
  }, []);

  // Help & Inbox & Sync Diagnostics Modal States
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isSyncDiagnosticsOpen, setIsSyncDiagnosticsOpen] = useState(false);

  const loadDataFromMySQL = async () => {
    setIsSyncingData(true);
    setIsServerDisconnected(false);

    try {
      const ok = await dbStore.loadFromBackendMySql();
      if (!ok) {
        setIsServerDisconnected(true);
      }
    } catch (err) {
      console.warn('Backend load note:', err);
      setIsServerDisconnected(true);
    } finally {
      setIsDbConnected(dbStore.isDbConnected());
      setClubSettings(dbStore.getClubSettings());
      setPendingCount(dbStore.getPendingPreRegistrationsCount());

      const savedUser = sessionStorage.getItem('club_app_current_user');
      const isSavedLoggedIn = sessionStorage.getItem('club_app_is_logged_in') === 'true';

      if (isSavedLoggedIn && savedUser && dbStore.isDbConnected()) {
        try {
          const parsed = JSON.parse(savedUser);
          const freshUser = dbStore
            .getUsers()
            .find(
              (u) =>
                u.id === parsed.id ||
                u.username === parsed.username ||
                (u.nationalId && u.nationalId === parsed.nationalId)
            );
          if (freshUser) {
            const updated = { ...freshUser, activeRole: parsed.activeRole || freshUser.activeRole };
            setCurrentUser(updated);
            setIsLoggedIn(true);
            sessionStorage.setItem('club_app_current_user', JSON.stringify(updated));
            sessionStorage.setItem('club_app_is_logged_in', 'true');
          } else if (parsed && parsed.username) {
            setCurrentUser(parsed);
            setIsLoggedIn(true);
          }
        } catch (e) {
          console.error('Error parsing session user:', e);
        }
      } else if (!dbStore.isDbConnected()) {
        setIsServerDisconnected(true);
      }
      setIsSyncingData(false);
    }
  };

  useEffect(() => {
    loadDataFromMySQL();

    const handleUpdate = () => {
      setIsDbConnected(dbStore.isDbConnected());
      setClubSettings(dbStore.getClubSettings());
      setPendingCount(dbStore.getPendingPreRegistrationsCount());
    };

    window.addEventListener('dbStoreUpdated', handleUpdate);

    // Poll the actual connection status periodically to keep UI state accurately synced
    const interval = setInterval(() => {
      setIsDbConnected(dbStore.isDbConnected());
    }, 4000);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Unread inbox items count
  const userNotifs = currentUser
    ? dbStore.getNotificationsForUser(currentUser.id, currentUser.activeRole)
    : dbStore.getNotificationsForUser('public', 'athlete');
  const userTickets = currentUser
    ? ['super_admin', 'admin', 'secretary', 'accountant'].includes(currentUser.activeRole)
      ? dbStore.getSupportTickets()
      : dbStore.getSupportTicketsByUser(currentUser.id)
    : [];

  const unreadNotifCount = userNotifs.filter((n) => !n.isRead).length;
  const unreadTicketCount = userTickets.filter((t) =>
    currentUser && ['super_admin', 'admin', 'secretary', 'accountant'].includes(currentUser.activeRole)
      ? t.hasUnreadAdminMessage
      : t.hasUnreadUserMessage
  ).length;

  const totalUnreadCount = unreadNotifCount + unreadTicketCount;

  // Pending count for badge
  const [pendingCount, setPendingCount] = useState<number>(dbStore.getPendingPreRegistrationsCount());

  useEffect(() => {
    applyThemeToDocument(clubSettings.themePalette);
  }, [clubSettings]);

  const activePal = THEME_PALETTES[clubSettings.themePalette] || THEME_PALETTES.wave;

  const refreshPendingCount = () => {
    setPendingCount(dbStore.getPendingPreRegistrationsCount());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = toEnglishDigits(username).trim();
    const cleanPassword = toEnglishDigits(password).trim();

    try {
      // Direct server-side authentication
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.token && json.user) {
        sessionStorage.setItem('club_app_token', json.token);

        const found = json.user;
        const adminRoles: UserRoleKey[] = ['super_admin', 'admin', 'secretary'];
        const userAdminRole = found.roles.find((r: string) => adminRoles.includes(r as UserRoleKey));

        let effectiveUser = found;
        if (userAdminRole && !adminRoles.includes(found.activeRole)) {
          effectiveUser = { ...found, activeRole: userAdminRole as UserRoleKey };
        }

        setCurrentUser(effectiveUser);
        setIsLoggedIn(true);
        setLoginError('');

        sessionStorage.setItem('club_app_is_logged_in', 'true');
        sessionStorage.setItem('club_app_current_user', JSON.stringify(effectiveUser));

        if (adminRoles.includes(effectiveUser.activeRole)) {
          setActiveTab('admin-analytics');
        } else if (effectiveUser.activeRole === 'coach') {
          setActiveTab('coach-portal');
        } else if (effectiveUser.activeRole === 'accountant') {
          setActiveTab('phase2-finance');
        } else {
          setActiveTab('user-portal');
        }

        // Refresh DB data with newly authenticated token
        dbStore.loadFromBackendMySql();
        return;
      } else {
        setLoginError(json.error || 'نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch {
      setLoginError('امکان برقراری ارتباط با سرور و دیتابیس وجود ندارد. لطفاً اتصال شبکه یا دیتابیس را بررسی کنید.');
      setIsServerDisconnected(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setActiveTab('user-portal');
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    loadDataFromMySQL();
  };

  const handleSwitchActiveRole = (roleKey: UserRoleKey) => {
    if (!currentUser) return;
    const updated = { ...currentUser, activeRole: roleKey };
    setCurrentUser(updated);
    sessionStorage.setItem('club_app_current_user', JSON.stringify(updated));
    if (['super_admin', 'admin', 'secretary'].includes(roleKey)) {
      setActiveTab('admin-analytics');
    } else if (roleKey === 'coach') {
      setActiveTab('coach-portal');
    } else if (roleKey === 'accountant') {
      setActiveTab('phase2-finance');
    } else {
      setActiveTab('user-portal');
    }
  };

  // Determine header page title
  const getPageTitle = () => {
    switch (activeTab) {
      case 'prereg-public':
        return 'فرم پیش‌ثبت‌نام اعضای جدید (پورتال عمومی ورزشکاران)';
      case 'user-portal':
        return 'پورتال انتخاب دوره‌ها و پکیج‌های آموزشی';
      case 'sports-insurance':
      case 'insurance-packages':
        return 'سامانه جامع بیمه‌نامه ورزشی (آپلود، بایگانی و استعلام)';
      case 'support-tickets':
        return 'سامانه پشتیبانی و ارسال تیکت';
      case 'prereg-admin':
        return 'مدیریت و بررسی درخواست‌های ثبت‌نام';
      case 'phase1-roles':
        return 'مدیریت نقش‌ها و سطح دسترسی‌ها';
      case 'phase1-parents':
        return 'پیوند حساب سرپرست و ورزشکاران';
      case 'club-settings':
        return 'تنظیمات برند، لوگو و پوسته رنگی باشگاه';
      case 'phase2-sessions':
        return 'برنامه‌ریزی و مدیریت سانس‌های آموزشی';
      case 'phase2-attendance':
        return 'ثبت حضور و غیاب الکترونیکی سانس‌ها';
      case 'phase2-finance':
        return 'مدیریت شهریه‌ها و حسابداری مالی باشگاه';
      case 'financial-dashboard':
        return 'داشبورد تحلیل بدهکاران و طلبکاران (نمودار دایره‌ای)';
      case 'admin-analytics':
        return 'داشبورد تحلیلی و آماری مدیریت';
      case 'data-export':
        return 'مرکز استخراج کامل داده‌ها (خروجی Excel / CSV)';
      case 'coach-portal':
        return 'پنل اختصاصی مربیان';
      case 'shop-expenses':
        return 'مدیریت بوفه، فروشگاه و هزینه‌های جاری';
      default:
        return clubSettings.name;
    }
  };

  
  const isAdminOrSec = isLoggedIn && currentUser && ['super_admin', 'admin', 'secretary'].includes(currentUser.activeRole);
  const isCoach = isLoggedIn && currentUser && currentUser.activeRole === 'coach';
  const isAccountant = isLoggedIn && currentUser && currentUser.activeRole === 'accountant';

  if (isServerDisconnected) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 dir-rtl text-center font-sans">
        <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-3xl flex items-center justify-center mb-6 border border-red-500/30 shadow-2xl">
          <WifiOff className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black mb-3 text-red-100">ارتباط با سرور MySQL برقرار نیست</h2>
        <p className="text-slate-300 text-sm max-w-md mb-8 leading-relaxed">
          امکان دریافت یا بروزرسانی اطلاعات از سرور دیتابیس وجود ندارد. لطفاً از فعال بودن سرویس MySQL و صحت کانفیگ اتصال اطمینان حاصل نمایید.
        </p>
        <button
          onClick={loadDataFromMySQL}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          تلاش مجدد برای اتصال به دیتابیس
        </button>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 dir-rtl text-center font-sans">
        <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-base font-bold text-slate-200 mb-2">در حال دریافت اطلاعات از سرور MySQL...</h2>
        <p className="text-slate-400 text-xs">لطفاً چند لحظه شکیبا باشید</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white dir-rtl">
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-3 px-6 flex justify-center items-center shadow-2xs sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">{clubSettings.name}</h1>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          {activeTab === 'prereg-public' ? (
            <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl p-6 shadow-xl my-8">
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900">فرم پیش‌ثبت‌نام اعضا</h2>
                <button
                  onClick={() => setActiveTab('user-portal')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  بازگشت به ورود
                </button>
              </div>
              <PreRegistrationPublicForm onSuccessSubmitted={refreshPendingCount} />
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-2xl relative overflow-hidden my-auto text-right">
              {/* Decorative top color bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-2" 
                style={{ backgroundColor: activePal.primaryHex }}
              />

              <div className="text-center mb-8 space-y-3">
                {clubSettings.logoUrl ? (
                  <div className="flex justify-center transition-all duration-700 ease-out animate-fadeIn transform hover:scale-[1.02] py-1">
                    <img
                      src={clubSettings.logoUrl}
                      alt={clubSettings.name}
                      className="max-h-20 sm:max-h-24 w-auto object-contain rounded-2xl p-2 border border-slate-200/70 bg-white shadow-xs"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md transition-transform hover:scale-105"
                    style={{ backgroundColor: `${activePal.primaryHex}15`, color: activePal.primaryHex }}
                  >
                    <Mountain className="w-9 h-9 stroke-[2.2]" />
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                    ورود به سامانه
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    مدیریت اعضا و خدمات {clubSettings.name}
                  </p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نام کاربری یا کدملی
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="نام کاربری یا کدملی خود را وارد کنید"
                      className="w-full pl-3.5 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:bg-white transition-all dir-rtl placeholder:font-normal placeholder:text-slate-400"
                      required
                    />
                    <User className="w-5 h-5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رمز عبور
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور خود را وارد کنید"
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:bg-white transition-all dir-rtl placeholder:font-normal placeholder:text-slate-400"
                      required
                    />
                    <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                      title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <div 
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${
                        rememberMe 
                          ? 'border-transparent text-white shadow-xs' 
                          : 'border-slate-300 bg-slate-50 group-hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: rememberMe ? activePal.primaryHex : undefined }}
                    >
                      {rememberMe && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                      ذخیره نام کاربری و رمز عبور
                    </span>
                  </label>
                </div>

                {/* Error Alert */}
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold animate-shake">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 text-white font-black rounded-2xl text-xs transition-all shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  style={{ backgroundColor: activePal.primaryHex }}
                >
                  <span>ورود به حساب کاربری</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>

                {/* Public Pre-Registration Link */}
                <div className="pt-4 border-t border-slate-100 text-center">
                  <span className="text-xs text-slate-500 font-medium">هنوز عضو باشگاه نشده‌اید؟ </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('prereg-public')}
                    className="text-xs font-black transition-all hover:underline cursor-pointer"
                    style={{ color: activePal.primaryHex }}
                  >
                    پیش‌ثبت‌نام آنلاین
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs font-bold text-slate-500">
          {clubSettings.name} © {toPersianDigits(1403)} - تمامی حقوق محفوظ است.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-teal-500 selection:text-white dir-rtl">
      {/* Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        pendingCount={pendingCount}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchActiveRole}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        clubSettings={clubSettings}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Sticky Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-all shrink-0 border border-slate-200/80 shadow-2xs"
              title="باز کردن منوی اصلی"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 truncate">
                {getPageTitle()}
              </h1>
              {isSyncingData ? (
                <button
                  onClick={() => setIsSyncDiagnosticsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-800 rounded-full text-[10px] sm:text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  title="کلیک کنید برای مشاهده وضعیت و لاگ‌های خط‌به‌خط همگام‌سازی"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span>در حال همگام‌سازی...</span>
                </button>
              ) : isDbConnected ? (
                <button
                  onClick={() => setIsSyncDiagnosticsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full text-[10px] sm:text-[11px] font-bold shadow-xs transition-all cursor-pointer active:scale-95 group"
                  title="کلیک کنید تا لاگ‌های خط‌به‌خط، وضعیت جداول و تست زنده دیتابیس را مشاهده نمایید."
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>متصل به MySQL 🟢</span>
                  <Terminal className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <button
                  onClick={() => setIsSyncDiagnosticsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-[10px] sm:text-[11px] font-bold shadow-xs transition-all cursor-pointer active:scale-95 animate-pulse"
                  title="کلیک کنید برای عیب‌یابی و مشاهده دلیل قطع بودن اتصال یا خطاهای احتمالی"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>خطایابی MySQL 🟡</span>
                  <Terminal className="w-3 h-3 text-amber-700" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Blinking Header Inbox Button */}
            <button
              onClick={() => setIsInboxOpen(true)}
              className={`relative flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                totalUnreadCount > 0
                  ? 'bg-amber-500/10 text-amber-800 border-amber-300 ring-2 ring-amber-400/30 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
              title="صندوق ورودی اعلانات و پاسخ‌های تیکت"
            >
              <Inbox className={`w-4 h-4 ${totalUnreadCount > 0 ? 'text-amber-600 animate-bounce' : 'text-slate-600'}`} />
              <span className="hidden sm:inline whitespace-nowrap">اینباکس پیام‌ها</span>
              {totalUnreadCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs animate-pulse">
                  {toPersianDigits(totalUnreadCount)}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs transition-all active:scale-95 shrink-0"
              title="راهنمای کامل این بخش"
            >
              <HelpCircle className="w-4 h-4 text-teal-600 animate-pulse shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">راهنما و آموزش</span>
            </button>

            {isLoggedIn && currentUser ? (
              <div
                onClick={() => setIsMobileSidebarOpen(true)}
                className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-200/80 p-1 sm:p-1.5 rounded-xl border border-slate-200 cursor-pointer active:scale-95 transition-all shrink-0"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center overflow-hidden shrink-0">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700" />
                  )}
                </div>
                <div className="text-right px-1 hidden sm:block">
                  <p className="text-xs font-black text-slate-900 leading-none">{currentUser.fullName}</p>
                  <p className="text-[10px] font-bold mt-1" style={{ color: activePal.primaryHex }}>
                    نقش فعلی: {currentUser.activeRole}
                  </p>
                </div>
              </div>
            ) : null}

            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {toPersianDigits(formatJalaliDate(getCurrentJalaliDate()))}
            </span>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-28 md:pb-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary key={`${activeTab}-${isSyncingData}`}>
            {activeTab === 'prereg-public' && (
              <PreRegistrationPublicForm onSuccessSubmitted={refreshPendingCount} />
            )}

            {activeTab === 'user-portal' && isLoggedIn && currentUser && (
              <UserPortalCoursesView currentUser={currentUser} onUserUpdated={(updated) => setCurrentUser(updated)} />
            )}
            
            {(activeTab === 'sports-insurance' || activeTab === 'insurance-packages') && isLoggedIn && currentUser && (
              <SportsInsuranceView currentUser={currentUser} />
            )}

            {activeTab === 'support-tickets' && isLoggedIn && currentUser && (
              <SupportTicketingView currentUser={currentUser} />
            )}

            {activeTab === 'prereg-admin' && isLoggedIn && isAdminOrSec && (
              <PreRegistrationAdminPanel onDataUpdated={refreshPendingCount} />
            )}

            {activeTab === 'phase1-roles' && isLoggedIn && isAdminOrSec && (
              <Phase1RolesPermissions defaultTab="users" />
            )}

            {activeTab === 'phase1-parents' && isLoggedIn && isAdminOrSec && (
              <Phase1RolesPermissions defaultTab="parents" />
            )}

            {activeTab === 'club-settings' && isLoggedIn && isAdminOrSec && (
              <ClubSettingsView onSettingsUpdated={(newSet) => setClubSettings(newSet)} />
            )}

            {activeTab === 'phase2-sessions' && isLoggedIn && (isAdminOrSec || isCoach) && (
              <SessionsManagementView currentUserRole={currentUser?.activeRole} />
            )}

            {activeTab === 'phase2-attendance' && isLoggedIn && (isAdminOrSec || isCoach) && (
              <AttendanceTrackerView />
            )}

            {activeTab === 'phase2-finance' && isLoggedIn && (isAdminOrSec || isAccountant) && (
              <FinancialAccountingView currentUser={currentUser} />
            )}

            {activeTab === 'financial-dashboard' && isLoggedIn && (isAdminOrSec || isAccountant) && (
              <FinancialDashboardView />
            )}

            {activeTab === 'admin-analytics' && isLoggedIn && isAdminOrSec && (
              <AdminAnalyticsDashboard onNavigate={(tab) => setActiveTab(tab)} />
            )}

            {activeTab === 'data-export' && isLoggedIn && isAdminOrSec && (
              <DataExportView />
            )}

            {activeTab === 'coach-portal' && isLoggedIn && (isAdminOrSec || isCoach) && (
              <CoachPortalView currentUser={currentUser} />
            )}

            {activeTab === 'shop-expenses' && isLoggedIn && (isAdminOrSec || isAccountant) && (
              <ShopExpensesView currentUser={currentUser} />
            )}

            {activeTab === 'sms-panel' && isLoggedIn && isAdminOrSec && currentUser && (
              <SmsManagementView currentUser={currentUser} />
            )}

            {/* Login Modal Prompt if tab requires login but user is not logged in */}

            {isLoggedIn && activeTab !== 'prereg-public' && activeTab !== 'user-portal' && activeTab !== 'sports-insurance' && activeTab !== 'support-tickets' && (
              (() => {
                let hasAccess = false;
                if (['prereg-admin', 'phase1-roles', 'phase1-parents', 'insurance-packages', 'club-settings', 'admin-analytics', 'data-export', 'sms-panel'].includes(activeTab)) hasAccess = !!isAdminOrSec;
                if (['phase2-sessions', 'phase2-attendance', 'coach-portal'].includes(activeTab)) hasAccess = !!(isAdminOrSec || isCoach);
                if (['phase2-finance', 'financial-dashboard', 'shop-expenses'].includes(activeTab)) hasAccess = !!(isAdminOrSec || isAccountant);
                
                if (!hasAccess) {
                  return (
                    <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-md mx-auto my-12 shadow-xl text-center space-y-6">
                      <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                        <ShieldAlert className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-slate-900">عدم دسترسی</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          شما مجوز لازم برای مشاهده این بخش را ندارید.
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs font-bold text-slate-500">
          {clubSettings.name} © {toPersianDigits(1403)} - تمامی حقوق محفوظ است.
        </footer>

        {/* Global Page & Role Help Guide Modal */}
        <PageHelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          currentPageKey={activeTab}
          currentUserRole={currentUser?.activeRole}
        />

        {/* Header Inbox Modal */}
        <HeaderInboxModal
          isOpen={isInboxOpen}
          onClose={() => setIsInboxOpen(false)}
          currentUser={currentUser}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />

        {/* Real-time Line-by-Line MySQL Sync Diagnostics Modal */}
        <SyncDiagnosticsModal
          isOpen={isSyncDiagnosticsOpen}
          onClose={() => setIsSyncDiagnosticsOpen(false)}
        />

        {/* iOS Native Style Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          pendingCount={pendingCount}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          primaryColorHex={activePal.primaryHex}
        />
      </div>
    </div>
  );
}
