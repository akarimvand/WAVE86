import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  MessageSquare,
  UserPlus,
  Menu,
  Award,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  ShoppingBag,
  User,
  Key,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { User as UserType, UserRoleKey } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isLoggedIn: boolean;
  currentUser: UserType | null;
  pendingCount: number;
  onOpenMobileSidebar: () => void;
  primaryColorHex?: string;
}

interface NavItem {
  id: TabType | 'menu';
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: number | string;
  badgeColor?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  isLoggedIn,
  currentUser,
  pendingCount,
  onOpenMobileSidebar,
  primaryColorHex = '#0d9488',
}) => {
  const activeRole: UserRoleKey = currentUser?.activeRole || 'athlete';

  // Determine items based on role (Hamburger menu is kept in top header only)
  const getNavItems = (): NavItem[] => {
    if (!isLoggedIn) {
      return [
        { id: 'user-portal', label: 'ورود اعضا', icon: Key },
        { id: 'prereg-public', label: 'پیش‌ثبت‌نام', icon: UserPlus },
        { id: 'sports-insurance', label: 'استعلام بیمه', icon: ShieldCheck },
      ];
    }

    if (activeRole === 'athlete') {
      return [
        { id: 'user-portal', label: 'داشبورد اعضا', icon: Sparkles },
        { id: 'sports-insurance', label: 'کارت بیمه', icon: ShieldCheck },
        { id: 'support-tickets', label: 'پشتیبانی', icon: MessageSquare },
      ];
    }

    if (activeRole === 'coach') {
      return [
        { id: 'coach-portal', label: 'پنل مربی', icon: Award },
        { id: 'phase2-sessions', label: 'سانس‌ها', icon: Calendar },
        { id: 'phase2-attendance', label: 'حضور و غیاب', icon: CheckSquare },
        { id: 'support-tickets', label: 'پیام‌ها', icon: MessageSquare },
      ];
    }

    if (['admin', 'secretary'].includes(activeRole)) {
      return [
        { id: 'admin-analytics', label: 'داشبورد', icon: LayoutDashboard },
        { id: 'prereg-admin', label: 'درخواست‌ها', icon: Users, badge: pendingCount > 0 ? pendingCount : undefined, badgeColor: 'bg-rose-500' },
        { id: 'phase2-sessions', label: 'سانس‌ها', icon: Calendar },
        { id: 'financial-dashboard', label: 'امور مالی', icon: CreditCard },
      ];
    }

    if (activeRole === 'accountant') {
      return [
        { id: 'financial-dashboard', label: 'تراز مالی', icon: CreditCard },
        { id: 'phase2-finance', label: 'دفتر کل', icon: Receipt },
        { id: 'shop-expenses', label: 'بوفه و هزینه‌ها', icon: ShoppingBag },
        { id: 'support-tickets', label: 'پشتیبانی', icon: MessageSquare },
      ];
    }

    return [
      { id: 'user-portal', label: 'پورتال', icon: User },
    ];
  };

  const navItems = getNavItems();

  const handleItemClick = (id: TabType | 'menu') => {
    if (id === 'menu') {
      onOpenMobileSidebar();
    } else {
      setActiveTab(id as TabType);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 px-2 dir-rtl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id !== 'menu' && activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              type="button"
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 active:scale-90 touch-manipulation min-w-[58px] ${
                isActive
                  ? 'text-slate-900 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              {/* Active Pill Indicator Background */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-2xl opacity-15 animate-fadeIn"
                  style={{ backgroundColor: primaryColorHex }}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative mb-0.5">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                  style={{ color: isActive ? primaryColorHex : undefined }}
                />

                {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2 text-[9px] text-white font-black px-1.5 py-0.2 rounded-full shadow-xs border border-white ${
                      item.badgeColor || 'bg-rose-500'
                    }`}
                  >
                    {toPersianDigits(item.badge)}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] leading-tight tracking-tight whitespace-nowrap transition-colors ${
                  isActive ? 'font-black text-slate-900' : 'font-medium text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
