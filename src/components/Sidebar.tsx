import React, { useState } from 'react';
import { WaveLogoSVG } from './WaveLogoSVG';
import {
  Mountain,
  FileText,
  UserCheck,
  ShieldCheck,
  Link as LinkIcon,
  Award,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Lock,
  User as UserIcon,
  Key,
  Palette,
  Trophy,
  Flame,
  Shield,
  Target,
  Activity,
  Calendar,
  CheckSquare,
  DollarSign,
  Sparkles,
  PieChart,
  Users,
  LifeBuoy,
  MessageSquare,
  Search,
  FileSpreadsheet,
  ShoppingBag,
} from 'lucide-react';
import { UserRoleKey, User as UserType, ClubSettings } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { dbStore } from '../services/db';
import { THEME_PALETTES } from '../utils/theme';

export type TabType =
  | 'prereg-public'
  | 'user-portal'
  | 'sports-insurance'
  | 'support-tickets'
  | 'prereg-admin'
  | 'phase1-roles'
  | 'phase1-parents'
  | 'insurance-packages'
  | 'club-settings'
  | 'phase2-sessions'
  | 'phase2-attendance'
  | 'phase2-finance'
  | 'financial-dashboard'
  | 'admin-analytics'
  | 'data-export'
  | 'coach-portal'
  | 'shop-expenses'
  | 'sms-panel';


interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isLoggedIn: boolean;
  currentUser: UserType | null;
  pendingCount: number;
  onLogout: () => void;
  onSwitchRole: (role: UserRoleKey) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
  clubSettings?: ClubSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isLoggedIn,
  currentUser,
  pendingCount,
  onLogout,
  onSwitchRole,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  clubSettings,
}) => {
  const currentClub = clubSettings || dbStore.getClubSettings();
  const activePal = THEME_PALETTES[currentClub.themePalette] || THEME_PALETTES.wave;

  const ALL_GROUPS = [
    '🎯 خدمات عمومی و پورتال ورزشکاران',
    '👥 مدیریت اعضای باشگاه',
    '📆 برنامه‌ریزی و حضور غیاب',
    '💰 امور مالی و حسابداری',
    '📊 گزارشات و پنل پرسنلی',
    '⚙️ تنظیمات عمومی برنامه',
  ];

  // Default collapsed state for all categories (or only auto-open the group containing the active tab)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // Determine which group contains activeTab
    if (['prereg-public', 'user-portal', 'sports-insurance', 'support-tickets'].includes(activeTab)) {
      return ['🎯 خدمات عمومی و پورتال ورزشکاران'];
    }
    if (['prereg-admin', 'phase1-roles', 'phase1-parents'].includes(activeTab)) {
      return ['👥 مدیریت اعضای باشگاه'];
    }
    if (['phase2-sessions', 'phase2-attendance', 'coach-portal'].includes(activeTab)) {
      return ['📆 برنامه‌ریزی و حضور غیاب'];
    }
    if (['phase2-finance', 'financial-dashboard', 'shop-expenses'].includes(activeTab)) {
      return ['💰 امور مالی و حسابداری'];
    }
    if (['admin-analytics'].includes(activeTab)) {
      return ['📊 گزارشات و پنل پرسنلی'];
    }
    if (['club-settings', 'data-export', 'sms-panel'].includes(activeTab)) {
      return ['⚙️ تنظیمات عمومی برنامه'];
    }
    return [];
  });

  const [hoveredGroupIdx, setHoveredGroupIdx] = useState<number | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(t => t !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const renderLogoIcon = () => {
    switch (currentClub.logoIcon) {
      case 'trophy': return <Trophy className="w-5 h-5 text-white" />;
      case 'flame': return <Flame className="w-5 h-5 text-white" />;
      case 'shield': return <Shield className="w-5 h-5 text-white" />;
      case 'target': return <Target className="w-5 h-5 text-white" />;
      case 'activity': return <Activity className="w-5 h-5 text-white" />;
      case 'mountain': return <Mountain className="w-5 h-5 text-white" />;
      case 'wave':
      default:
        return <WaveLogoSVG className="w-6 h-6 text-white" />;
    }
  };

  
  const isAdminOrSec = isLoggedIn && currentUser && ['super_admin', 'admin', 'secretary'].includes(currentUser.activeRole);
  const isCoach = isLoggedIn && currentUser && currentUser.activeRole === 'coach';
  const isAccountant = isLoggedIn && currentUser && currentUser.activeRole === 'accountant';

  const navItems = [
    {
      groupTitle: '🎯 خدمات عمومی و پورتال ورزشکاران',
      items: [
        {
          id: 'prereg-public' as TabType,
          label: 'فرم ثبت‌نام اعضا',
          icon: FileText,
          badge: 'عمومی',
          requiresLogin: false,
          show: !isLoggedIn || isAdminOrSec,
        },
        {
          id: 'user-portal' as TabType,
          label: 'پنل کاربر (ورزشکار و اولیاء)',
          icon: Sparkles,
          badge: 'پورتال اصلی',
          requiresLogin: true,
          show: true,
        },
        {
          id: 'sports-insurance' as TabType,
          label: 'سامانه جامع بیمه‌نامه ورزشی',
          icon: ShieldCheck,
          badge: 'استعلام و بایگانی',
          requiresLogin: true,
          show: true,
        },
        {
          id: 'support-tickets' as TabType,
          label: 'پشتیبانی و ثبت تیکت',
          icon: LifeBuoy,
          badge: '۲۴/۷',
          requiresLogin: true,
          show: true,
        },
      ].filter(i => i.show),
    },
    {
      groupTitle: '👥 مدیریت اعضای باشگاه',
      items: [
        {
          id: 'prereg-admin' as TabType,
          label: 'مدیریت و بررسی درخواست‌ها',
          icon: UserCheck,
          badge: pendingCount > 0 ? `${toPersianDigits(pendingCount)} جدید` : null,
          requiresLogin: true,
          show: isAdminOrSec,
        },
        {
          id: 'phase1-roles' as TabType,
          label: 'لیست اعضا و پرونده ۳۶۰° (نقش‌ها)',
          icon: Users,
          badge: null,
          requiresLogin: true,
          show: isAdminOrSec,
        },
        {
          id: 'phase1-parents' as TabType,
          label: 'پیوند اولیاء و ورزشکاران',
          icon: LinkIcon,
          badge: null,
          requiresLogin: true,
          show: isAdminOrSec,
        },
      ].filter(i => i.show),
    },
    {
      groupTitle: '📆 برنامه‌ریزی و حضور غیاب',
      items: [
        {
          id: 'phase2-sessions' as TabType,
          label: 'سانس‌ها و دوره‌های آموزشی',
          icon: Calendar,
          badge: null,
          requiresLogin: true,
          show: isAdminOrSec, // Coach has their own portal now
        },
        {
          id: 'phase2-attendance' as TabType,
          label: 'مدیریت حضور و غیاب',
          icon: CheckSquare,
          badge: null,
          requiresLogin: true,
          show: isAdminOrSec,
        },
        {
          id: 'coach-portal' as TabType,
          label: 'پنل اختصاصی مربیان',
          icon: Users,
          badge: null,
          requiresLogin: true,
          show: isCoach || isAdminOrSec,
        },
      ].filter(i => i.show),
    },
    {
      groupTitle: '💰 امور مالی و حسابداری',
      items: [
        {
          id: 'phase2-finance' as TabType,
          label: 'شهریه‌ها و مدیریت مالی',
          icon: DollarSign,
          badge: null,
          requiresLogin: true,
          show: isAdminOrSec || isAccountant,
        },
        {
          id: 'financial-dashboard' as TabType,
          label: 'داشبورد بدهکاران و طلبکاران',
          icon: PieChart,
          badge: null,
          requiresLogin: true,
          show: isAdminOrSec || isAccountant,
        },
        {
          id: 'shop-expenses' as TabType,
          label: 'فروشگاه و بوفه (POS)',
          icon: ShoppingBag,
          badge: 'جدید',
          requiresLogin: true,
          show: isAdminOrSec || isAccountant,
        },
      ].filter(i => i.show),
    },
    {
      groupTitle: '📊 گزارشات و پنل پرسنلی',
      items: [
        {
          id: 'admin-analytics' as TabType,
          label: 'داشبورد تحلیلی و آماری',
          icon: Activity,
          badge: null,
          requiresLogin: true,
          show: isAdminOrSec,
        },
      ].filter(i => i.show),
    },
    {
      groupTitle: '⚙️ تنظیمات عمومی برنامه',
      items: [
        {
          id: 'sms-panel' as TabType,
          label: 'سامانه پیامک و اطلاع‌رسانی (sms.ir)',
          icon: MessageSquare,
          badge: 'sms.ir',
          requiresLogin: true,
          show: isAdminOrSec,
        },
        {
          id: 'data-export' as TabType,
          label: 'استخراج داده‌ها (Excel/CSV)',
          icon: FileSpreadsheet,
          badge: 'جدید',
          requiresLogin: true,
          show: isAdminOrSec,
        },
        {
          id: 'club-settings' as TabType,
          label: 'تنظیمات باشگاه، اسلایدر و اعلانات',
          icon: Palette,
          badge: 'تنظیمات',
          requiresLogin: true,
          show: isAdminOrSec,
        },
      ].filter(i => i.show),
    },
  ].filter(g => g.items.length > 0);

  const handleSelectTab = (tabId: TabType, requiresLogin: boolean) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Navigation Container */}
      <aside
        style={{
          backgroundColor: activePal.sidebarBgHex || '#0f172a',
          borderColor: activePal.sidebarBorderHex || '#1e293b',
        }}
        className={`fixed md:sticky top-0 right-0 z-50 h-screen border-l shadow-2xl md:shadow-none flex flex-col justify-between transition-all duration-300 overflow-hidden text-slate-100 ${
          isCollapsed ? 'md:w-20' : 'md:w-72'
        } ${isMobileOpen ? 'translate-x-0 w-72' : 'translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header & Brand */}
        <div className="flex flex-col h-full overflow-hidden">
          <div
            style={{ borderColor: activePal.sidebarHeaderBorderHex || '#1e293b' }}
            className={`h-16 shrink-0 border-b flex items-center justify-between ${isCollapsed && !isMobileOpen ? 'px-2' : 'px-4'}`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              {currentClub.logoUrl ? (
                <img
                  src={currentClub.logoUrl}
                  alt={currentClub.name}
                  className="h-9 w-9 object-contain shrink-0 rounded-lg p-0.5 bg-white/10 border border-white/10 shadow-2xs"
                />
              ) : currentClub.logoIcon?.startsWith('data:') || currentClub.logoIcon?.startsWith('http') ? (
                <img
                  src={currentClub.logoIcon}
                  alt={currentClub.name}
                  className="h-9 w-9 object-contain shrink-0 rounded-lg p-0.5 bg-white/10 border border-white/10 shadow-2xs"
                />
              ) : (currentClub.logoIcon === 'wave' || !currentClub.logoIcon || currentClub.themePalette === 'wave') ? (
                <div className="shrink-0 flex items-center justify-center" title={currentClub.name}>
                  <WaveLogoSVG className="w-8 h-8 text-white brightness-120" color="#FFFFFF" />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                  style={{ backgroundColor: activePal.primaryHex }}
                >
                  {renderLogoIcon()}
                </div>
              )}
              {(!isCollapsed || isMobileOpen) && (
                <div className="whitespace-nowrap overflow-hidden min-w-0">
                  <h1 className="text-sm font-black text-white leading-tight truncate">
                    {currentClub.name}
                  </h1>
                  <p className="text-[10px] font-bold truncate opacity-90" style={{ color: activePal.primaryHex }}>
                    {currentClub.slogan}
                  </p>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button (Desktop/Tablet) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden md:flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0 ${
                isCollapsed && !isMobileOpen ? 'p-1' : 'p-1.5'
              }`}
              title={isCollapsed ? 'باز کردن سایدبار' : 'بستن سایدبار'}
            >
              {isCollapsed ? <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            {/* Close Mobile Drawer */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Search Bar for Menu */}
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-3 pt-3 pb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در منو..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {menuSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMenuSearchQuery('')}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links List */}
          <div className="p-3 space-y-4 overflow-y-auto flex-1 min-h-0">
            {navItems
              .map((group) => {
                const filteredItems = menuSearchQuery.trim()
                  ? group.items.filter((item) =>
                      item.label.toLowerCase().includes(menuSearchQuery.toLowerCase())
                    )
                  : group.items;
                return { ...group, items: filteredItems };
              })
              .filter((group) => group.items.length > 0)
              .map((group, idx) => {
                const isGroupExpanded = menuSearchQuery.trim() ? true : expandedGroups.includes(group.groupTitle);
              
              const getGroupStyles = (title: string, index: number) => {
                const isHovered = hoveredGroupIdx === index;
                return {
                  style: {
                    backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isHovered ? activePal.primaryHex + '80' : 'rgba(255, 255, 255, 0.08)',
                    color: isHovered ? '#ffffff' : '#cbd5e1',
                  },
                  bullet: {
                    backgroundColor: activePal.primaryHex,
                    boxShadow: `0 0 8px ${activePal.primaryHex}80`,
                  }
                };
              };

              const styles = getGroupStyles(group.groupTitle, idx);
              
              return (
                <div key={idx} className="space-y-1">
                  {(!isCollapsed || isMobileOpen) && (
                    <button
                      onClick={() => toggleGroup(group.groupTitle)}
                      onMouseEnter={() => setHoveredGroupIdx(idx)}
                      onMouseLeave={() => setHoveredGroupIdx(null)}
                      style={styles.style}
                      className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-wider px-3.5 py-2.5 mb-2 rounded-xl border transition-all duration-200 focus:outline-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span style={styles.bullet} className="w-2.5 h-2.5 rounded-full shrink-0" />
                        <span className="font-black">{group.groupTitle}</span>
                      </div>
                      <ChevronDown
                        className="w-4 h-4 transition-transform duration-200 opacity-70"
                        style={{
                          transform: isGroupExpanded ? 'rotate(180deg)' : 'none',
                          color: styles.style.color,
                        }}
                      />
                    </button>
                  )}

                  {/* Render items only if group is expanded OR if sidebar is collapsed (to show icons) */}
                  {(isGroupExpanded || (isCollapsed && !isMobileOpen)) && (
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const isLocked = item.requiresLogin && !isLoggedIn;

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectTab(item.id, item.requiresLogin)}
                            style={
                              isActive
                                ? { backgroundColor: activePal.primaryHex, color: '#ffffff', boxShadow: `0 4px 14px ${activePal.primaryHex}50` }
                                : {}
                            }
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.color = '#ffffff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '';
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 relative group ${
                              isActive
                                ? 'shadow-md text-white'
                                : 'text-slate-300'
                            }`}
                            title={item.label}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                              {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
                            </div>

                            {(!isCollapsed || isMobileOpen) && (
                              <div className="flex items-center gap-1.5">
                                {isLocked && <Lock className="w-3 h-3 text-slate-500" />}
                                {item.badge && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom User Card / Footer */}
        <div
          style={{
            backgroundColor: activePal.sidebarFooterBgHex || '#020617',
            borderColor: activePal.sidebarHeaderBorderHex || '#1e293b',
          }}
          className="p-3 border-t shrink-0"
        >
          {isLoggedIn && currentUser ? (
            <div className="space-y-2">
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: activePal.sidebarBorderHex || 'rgba(255, 255, 255, 0.1)',
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl border"
              >
                <div
                  className="w-8 h-8 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden"
                  style={{ backgroundColor: activePal.primaryHex + '30', color: activePal.primaryHex }}
                >
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </div>

                {(!isCollapsed || isMobileOpen) && (
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-black text-white truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] font-bold truncate" style={{ color: activePal.primaryHex }}>
                      نقش: {currentUser.activeRole}
                    </p>
                  </div>
                )}

                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors shrink-0"
                  title="خروج از حساب"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Multi-role Selector if collapsed or open */}
              {(currentUser?.roles || []).length > 1 && (!isCollapsed || isMobileOpen) && (
                <div className="flex items-center justify-between text-[11px] font-bold px-1 text-slate-400">
                  <span>نقش فعال:</span>
                  <select
                    value={currentUser?.activeRole}
                    onChange={(e) => onSwitchRole(e.target.value as UserRoleKey)}
                    className="border rounded-lg text-[10px] font-bold px-2 py-1 focus:outline-none"
                    style={{
                      backgroundColor: activePal.sidebarBgHex || '#0f172a',
                      borderColor: activePal.sidebarBorderHex || '#334155',
                      color: activePal.primaryHex,
                    }}
                  >
                    {(currentUser?.roles || []).map((r) => (
                      <option
                        key={r}
                        value={r}
                        style={{ backgroundColor: activePal.sidebarBgHex || '#0f172a' }}
                        className="text-white"
                      >
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div>
              {(!isCollapsed || isMobileOpen) ? (
                <button
                  onClick={() => setActiveTab('user-portal')}
                  style={{ backgroundColor: activePal.primaryHex }}
                  className="w-full py-2.5 px-3 hover:opacity-90 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <Key className="w-3.5 h-3.5" />
                  ورود به سیستم
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('user-portal')}
                  style={{ backgroundColor: activePal.primaryHex }}
                  className="w-full p-2.5 hover:opacity-90 text-white rounded-xl flex items-center justify-center"
                  title="ورود به سیستم"
                >
                  <Key className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
