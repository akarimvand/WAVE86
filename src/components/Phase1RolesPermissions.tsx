import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Users,
  UserCheck,
  UserPlus,
  Key,
  Database,
  FileCode,
  Copy,
  Check,
  History,
  Info,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  Search,
  Eye,
  Filter,
  X,
  Lock,
  Unlock,
  Loader2,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { SYSTEM_PERMISSIONS, UserRoleKey, Role, User } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { Member360Modal } from './Member360Modal';

interface Phase1RolesPermissionsProps {
  defaultTab?: 'matrix' | 'users' | 'parents' | 'audit' | 'mysql';
}

export const Phase1RolesPermissions: React.FC<Phase1RolesPermissionsProps> = ({ defaultTab = 'matrix' }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users' | 'parents' | 'audit' | 'mysql'>(defaultTab);
  const [roles, setRoles] = useState<Role[]>(() => dbStore.getRoles());
  const [users, setUsers] = useState<User[]>(() => dbStore.getUsers());
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-secretary');
  const [auditLogs, setAuditLogs] = useState(() => dbStore.getAuditLogs());
  const [copiedSql, setCopiedSql] = useState(false);

  // Sync with defaultTab prop changes from sidebar navigation
  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Real-time synchronization when MySQL or local data updates
  React.useEffect(() => {
    const handleDbUpdate = () => {
      setRoles([...dbStore.getRoles()]);
      setUsers([...dbStore.getUsers()]);
      setAuditLogs([...dbStore.getAuditLogs()]);
    };

    window.addEventListener('dbStoreUpdated', handleDbUpdate);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleDbUpdate);
    };
  }, []);

  // Security toggles: hide ticks by default
  const [showMatrixTicks, setShowMatrixTicks] = useState(false);
  const [isEditingUserRoles, setIsEditingUserRoles] = useState(false);
  const [isSavingUserRoles, setIsSavingUserRoles] = useState(false);

  // Draft state storage
  const [draftPermissions, setDraftPermissions] = useState<Record<string, string[]>>({});
  const [draftUserRoles, setDraftUserRoles] = useState<Record<string, UserRoleKey[]>>({});

  // Elegant Success/Info Toast modal (Anti-Slop)
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Search & Modal state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRoleKey>('all');
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

  // Quick Password Reset State
  const [userForResetPass, setUserForResetPass] = useState<User | null>(null);
  const [quickNewPass, setQuickNewPass] = useState('');
  const [resetAlertMessage, setResetAlertMessage] = useState<string | null>(null);

  const getUserRolesList = (user: User): UserRoleKey[] => {
    let raw: any = user.roles;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
        if (typeof raw === 'string') {
          raw = JSON.parse(raw);
        }
      } catch {
        if (raw.includes(',')) {
          raw = raw.split(',').map((s: string) => s.trim());
        } else if (raw) {
          raw = [raw.trim()];
        } else {
          raw = [];
        }
      }
    }
    if (!Array.isArray(raw)) return ['athlete'];
    const normalized = raw
      .filter((r) => Boolean(r) && typeof r === 'string')
      .map((r: string) => (r === 'super_admin' ? 'admin' : r)) as UserRoleKey[];
    return Array.from(new Set(normalized.length > 0 ? normalized : ['athlete']));
  };

  // Synchronize drafts with dbStore values on data refresh
  React.useEffect(() => {
    const permDraft: Record<string, string[]> = {};
    roles.forEach((r) => {
      permDraft[r.id] = [...r.permissions];
    });
    setDraftPermissions(permDraft);
  }, [roles]);

  React.useEffect(() => {
    if (!isEditingUserRoles) {
      const userDraft: Record<string, UserRoleKey[]> = {};
      users.forEach((u) => {
        userDraft[u.id] = getUserRolesList(u);
      });
      setDraftUserRoles(userDraft);
    }
  }, [users, isEditingUserRoles]);

  const handleQuickResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForResetPass) return;
    const res = dbStore.resetUserPassword(userForResetPass.id, quickNewPass, 'مدیر ارشد');
    if (res.success) {
      setUsers([...dbStore.getUsers()]);
      setAuditLogs([...dbStore.getAuditLogs()]);
      setUserForResetPass(null);
      setQuickNewPass('');
      setResetAlertMessage(`رمز عبور کاربر ${res.user?.fullName} با موفقیت به «${res.passwordUsed}» تغییر یافت.`);
      setTimeout(() => setResetAlertMessage(null), 5000);
    }
  };

  // Selected Role for Permission Editing
  const currentRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const handleToggleDraftPermission = (permissionKey: string) => {
    if (!currentRole) return;
    const isSystemRole = currentRole.key === 'admin';
    if (isSystemRole) return; // Admin permissions cannot be restricted

    const currentRolePerms = draftPermissions[currentRole.id] || [];
    const hasPermission = currentRolePerms.includes(permissionKey);
    let updated: string[];
    if (hasPermission) {
      updated = currentRolePerms.filter((p) => p !== permissionKey);
    } else {
      updated = [...currentRolePerms, permissionKey];
    }

    setDraftPermissions({
      ...draftPermissions,
      [currentRole.id]: updated,
    });
  };

  const handleSaveMatrixPermissions = () => {
    let changeCount = 0;
    Object.entries(draftPermissions).forEach(([roleId, perms]) => {
      const orig = roles.find((r) => r.id === roleId);
      if (orig) {
        const sortedOrig = [...orig.permissions].sort();
        const sortedDraft = [...perms].sort();
        if (JSON.stringify(sortedOrig) !== JSON.stringify(sortedDraft)) {
          dbStore.updateRolePermissions(roleId, perms, 'مدیر ارشد');
          changeCount++;
        }
      }
    });

    if (changeCount > 0) {
      setRoles([...dbStore.getRoles()]);
      setAuditLogs([...dbStore.getAuditLogs()]);
      setSuccessModal({
        isOpen: true,
        title: 'ذخیره موفقیت‌آمیز مجوزها',
        message: 'سطوح دسترسی پویای نقش‌ها با موفقیت تغییر یافته و در پایگاه داده ذخیره شد.',
      });
    } else {
      setSuccessModal({
        isOpen: true,
        title: 'بدون تغییر جدید',
        message: 'تغییری در ماتریس دسترسی ایجاد نشده است که نیاز به ذخیره‌سازی داشته باشد.',
      });
    }
    setShowMatrixTicks(false); // Hide ticks again after save
  };

  const handleToggleDraftUserRole = (userId: string, roleKey: UserRoleKey) => {
    if (!roleKey) return;
    const user = users.find((u) => u.id === userId);
    const currentUserRoles: UserRoleKey[] = draftUserRoles[userId] !== undefined
      ? draftUserRoles[userId]
      : (user ? getUserRolesList(user) : (['athlete'] as UserRoleKey[]));
    let updated: UserRoleKey[];

    if (currentUserRoles.includes(roleKey)) {
      if (currentUserRoles.length === 1) {
        setSuccessModal({
          isOpen: true,
          title: 'عدم حذف تنها نقش',
          message: 'هر عضو باشگاه برای تداوم دسترسی باید حداقل یک نقش تخصیص‌یافته داشته باشد.',
        });
        return;
      }
      updated = currentUserRoles.filter((r) => r !== roleKey);
    } else {
      updated = [...currentUserRoles, roleKey];
    }

    setDraftUserRoles((prev) => ({
      ...prev,
      [userId]: updated,
    }));
  };

  const handleSaveUserRoles = async () => {
    setIsSavingUserRoles(true);
    let changeCount = 0;
    const updatesToApply: { userId: string; roles: UserRoleKey[] }[] = [];

    Object.entries(draftUserRoles).forEach(([userId, draftRoles]) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        const origRoles = getUserRolesList(user);
        const sortedOrig = [...origRoles].sort();
        const sortedDraft = [...draftRoles].sort();
        if (JSON.stringify(sortedOrig) !== JSON.stringify(sortedDraft)) {
          updatesToApply.push({ userId, roles: draftRoles });
        }
      }
    });

    if (updatesToApply.length > 0) {
      try {
        for (const item of updatesToApply) {
          await dbStore.updateUserRolesAsync(item.userId, item.roles, 'مدیر ارشد');
          changeCount++;
        }

        setUsers([...dbStore.getUsers()]);
        setAuditLogs([...dbStore.getAuditLogs()]);
        setSuccessModal({
          isOpen: true,
          title: 'بروزرسانی موفقیت‌آمیز نقش‌ها',
          message: `${toPersianDigits(changeCount)} تغییر در نقش‌های اعضا با موفقیت در پایگاه داده ذخیره و اعمال شد.`,
        });
      } catch (err: any) {
        setSuccessModal({
          isOpen: true,
          title: 'خطا در ذخیره‌سازی نقش‌ها',
          message: `خطا در اعمال تغییرات در پایگاه داده: ${err?.message || err}`,
        });
      }
    } else {
      setSuccessModal({
        isOpen: true,
        title: 'عدم ردیابی تغییر',
        message: 'هیچ تغییری در نقش اعضا برای ذخیره‌سازی ردیابی نشد.',
      });
    }
    setIsSavingUserRoles(false);
    setIsEditingUserRoles(false); // Reset to read-only view
  };

  // Parent-Athlete Links
  const parentUsers = users.filter((u) => (u?.roles || []).includes('parent'));
  const athleteUsers = users.filter((u) => (u?.roles || []).includes('athlete'));

  const [selectedParentId, setSelectedParentId] = useState<string>(parentUsers[0]?.id || '');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(athleteUsers[0]?.id || '');

  const handleLinkParentAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId || !selectedAthleteId) return;

    dbStore.linkParentAndAthlete(selectedParentId, selectedAthleteId, 'father', 'مدیر ارشد');
    setUsers([...dbStore.getUsers()]);
    setAuditLogs([...dbStore.getAuditLogs()]);
  };

  const handleUnlink = (parentId: string, athleteId: string) => {
    dbStore.unlinkParentAndAthlete(parentId, athleteId, 'مدیر ارشد');
    setUsers([...dbStore.getUsers()]);
    setAuditLogs([...dbStore.getAuditLogs()]);
  };

  const sqlScript = dbStore.generateMySQLSchemaSQL();

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">مدیریت نقش‌ها و دسترسی‌های اعضا</h2>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-100 text-teal-800">
                  مدیریت سیستم
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                تعیین سطوح دسترسی، تخصیص چندنقشی همزمان و مدیریت پیوند اولیاء و فرزندان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRoles([...dbStore.getRoles()]);
                setUsers([...dbStore.getUsers()]);
                setAuditLogs([...dbStore.getAuditLogs()]);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
              به‌روزرسانی
            </button>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-100 pt-4 overflow-x-auto max-w-full pb-2 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 touch-pan-x">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Key className="w-4 h-4 shrink-0" />
            ماتریس دسترسی نقش‌ها
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            تخصیص نقش اعضا
          </button>

          <button
            onClick={() => setActiveTab('parents')}
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'parents'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <LinkIcon className="w-4 h-4 shrink-0" />
            پیوند اولیاء و ورزشکاران
          </button>
        </div>
      </div>

      {/* TAB 1: PERMISSION MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-teal-600" />
                تنظیم سطح دسترسی پویا برای نقش‌ها
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مدیر می‌تواند مجوزهای هر نقش (به‌جز مدیر ارشد) را با علامت زدن یا برداشتن چک‌باکس‌ها تغییر دهد.
              </p>
            </div>

            {/* Select Role Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 font-bold whitespace-nowrap">انتخاب نقش:</label>
              <select
                value={selectedRoleId}
                onChange={(e) => {
                  setSelectedRoleId(e.target.value);
                  // Hide ticks again when changing role to respect default behavior
                  setShowMatrixTicks(false);
                }}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-teal-900">{currentRole.title}</span>
              <p className="text-xs text-slate-600">{currentRole.description}</p>
            </div>
            {currentRole.key === 'admin' && (
              <span className="text-xs text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded-xl font-bold">
                نقش سیستم (دسترسی به تمامی ماژول‌ها)
              </span>
            )}
          </div>

          {/* Secure Default Hidden Ticks View */}
          {!showMatrixTicks ? (
            <div className="bg-slate-50 border border-slate-200/80 p-8 rounded-2xl text-center space-y-4 max-w-xl mx-auto my-6 animate-in fade-in">
              <div className="w-12 h-12 bg-teal-50 border border-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-black text-slate-900">مشاهده و ویرایش ماتریس دسترسی</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  تیک‌های جدول دسترسی برای نقش <strong className="text-teal-700">«{currentRole.title}»</strong> به جهت ممانعت از تغییر تصادفی به‌طور پیش‌فرض پنهان شده‌اند. برای بارگذاری و تغییر تیک‌ها، روی دکمه زیر کلیک کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMatrixTicks(true);
                }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 mx-auto active:scale-95"
              >
                <Unlock className="w-4.5 h-4.5" />
                نمایش تیک‌ها و فعال‌سازی ویرایش
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              {/* Permission Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SYSTEM_PERMISSIONS.map((perm) => {
                  const rolePerms = draftPermissions[currentRole.id] || [];
                  const isChecked = rolePerms.includes(perm.key);
                  const isDisabled = currentRole.key === 'admin';

                  return (
                    <div
                      key={perm.key}
                      onClick={() => !isDisabled && handleToggleDraftPermission(perm.key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-teal-50/80 border-teal-300 text-slate-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      } ${isDisabled ? 'cursor-not-allowed opacity-80' : ''}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg mt-0.5 flex items-center justify-center border text-xs ${
                          isChecked
                            ? 'bg-teal-600 border-teal-600 text-white font-bold'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{perm.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">
                            {perm.module}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{perm.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowMatrixTicks(false);
                    // Reset current role draft permissions back to database values
                    setDraftPermissions({
                      ...draftPermissions,
                      [currentRole.id]: [...currentRole.permissions],
                    });
                  }}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs hover:underline transition-all"
                >
                  انصراف و پنهان‌سازی مجدد
                </button>

                <button
                  type="button"
                  onClick={handleSaveMatrixPermissions}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ذخیره تغییرات ماتریس دسترسی
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MULTI-ROLE USERS & MEMBER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>فهرست اعضای باشگاه و مدیریت نقش‌ها</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                برای مشاهده پرونده کامل هر عضو (شامل مشخصات، بیمه، دوره‌ها، مالی، حضور غیاب و اولیاء) روی نام او یا دکمه «پرونده ۳۶۰°» کلیک کنید.
              </p>
            </div>

            {/* Search and Role Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی اعضا (نام، کد ملی، همراه)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 w-60"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">همه نقش‌ها</option>
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Header for editing user roles (Anti-Slop / High-Craft) */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-teal-600 shadow-3xs shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-800 block">ویرایش تراکنشی و انتساب نقش اعضا</span>
                <span className="text-[10px] text-slate-500 leading-snug block mt-0.5">
                  جهت جلوگیری از اعمال تصادفی دسترسی‌ها، ویرایش به صورت پیش‌فرض قفل است. با فعال‌سازی دکمه مقابل تیک‌ها نمایان می‌شوند.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!isEditingUserRoles ? (
                <button
                  type="button"
                  onClick={() => setIsEditingUserRoles(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Unlock className="w-4 h-4" />
                  فعال‌سازی ویرایش و تخصیص نقش‌ها
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingUserRoles(false);
                      // Reset draft state back to original
                      const userDraft: Record<string, UserRoleKey[]> = {};
                      users.forEach((u) => {
                        userDraft[u.id] = getUserRolesList(u);
                      });
                      setDraftUserRoles(userDraft);
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
                  >
                    لغو تغییرات
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveUserRoles}
                    disabled={isSavingUserRoles}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSavingUserRoles ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    )}
                    {isSavingUserRoles ? 'در حال ذخیره‌سازی...' : 'ذخیره نهایی نقش‌ها'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-right text-xs text-slate-700 min-w-[900px]">
              <thead className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 min-w-[170px]">نام و نام خانوادگی</th>
                  <th className="p-3.5 min-w-[160px]">کد ملی / نام کاربری</th>
                  <th className="p-3.5 min-w-[120px]">شماره همراه</th>
                  <th className="p-3.5 min-w-[320px]">نقش‌های تخصیص‌یافته</th>
                  <th className="p-3.5 text-center min-w-[110px]">کارت بیمه</th>
                  <th className="p-3.5 text-center min-w-[180px]">عملیات مدیر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filteredList = users.filter((u) => {
                    if (!u) return false;
                    const uRoles = getUserRolesList(u);
                    const fName = (u.fullName || '').toLowerCase();
                    const nId = (u.nationalId || '').toString();
                    const ph = (u.phone || '').toString();
                    const un = (u.username || '').toLowerCase();
                    const query = searchQuery.trim().toLowerCase();

                    const matchesSearch =
                      !query ||
                      fName.includes(query) ||
                      nId.includes(query) ||
                      ph.includes(query) ||
                      un.includes(query);

                    const matchesRole = roleFilter === 'all' || uRoles.includes(roleFilter);
                    return matchesSearch && matchesRole;
                  });

                  if (filteredList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="w-10 h-10 text-slate-300 stroke-1" />
                            <p className="font-bold text-sm text-slate-600">
                              {users.length === 0 ? 'هیچ کاربری در دیتابیس یافت نشد.' : 'هیچ عضوی با این مشخصات یافت نشد.'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {users.length === 0
                                ? 'از بخش پیش‌ثبت‌نام‌ها یا درون‌ریزی اکسل می‌توانید اعضا را اضافه نمایید.'
                                : 'فیلتر نقش یا عبارت جستجو را تغییر دهید.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return filteredList.map((u, uIdx) => {
                    const uRoles = getUserRolesList(u);
                    const draftList = draftUserRoles[u.id] || uRoles;
                    const displayName = u.fullName || u.username || 'عضو باشگاه';

                    return (
                      <tr key={`${u.id}-${uIdx}`} className="hover:bg-teal-50/30 transition-colors">
                        <td className="p-3.5">
                          <button
                            onClick={() => setSelectedUserForModal(u)}
                            className="flex items-center gap-2.5 text-right font-black text-slate-900 hover:text-teal-700 transition-colors group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform shrink-0">
                              {displayName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-900 truncate">{displayName}</span>
                              {u.fatherName && <span className="text-[10px] text-slate-400 font-normal block truncate">فرزند {u.fatherName}</span>}
                            </div>
                          </button>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">
                          <div className="font-bold text-xs">{toPersianDigits(u.nationalId || '-')}</div>
                          <div className="text-[10px] text-slate-400">@{u.username || '-'}</div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-medium">{toPersianDigits(u.phone || '-')}</td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {!isEditingUserRoles ? (
                              // Read-only view (ticks and unassigned roles are completely hidden as requested!)
                              draftList.length === 0 ? (
                                <span className="text-slate-400 italic text-[11px]">فاقد نقش فعال</span>
                              ) : (
                                draftList.map((roleKey) => {
                                  const rObj = roles.find((r) => r.key === roleKey || r.id === `role-${roleKey}`);
                                  return (
                                    <span
                                      key={roleKey}
                                      className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-100 rounded-lg text-[10px] font-black whitespace-nowrap inline-flex items-center gap-1 shadow-3xs"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                      {rObj ? rObj.title : roleKey}
                                    </span>
                                  );
                                })
                              )
                            ) : (
                              // Edit view (all roles rendered as draft-toggleable buttons with tick state)
                              roles.map((r) => {
                                const roleKey = (r.key || (r as any).key_name || r.id.replace('role-', '')) as UserRoleKey;
                                const isAssigned = draftList.includes(roleKey);
                                return (
                                  <button
                                    key={roleKey || r.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleDraftUserRole(u.id, roleKey);
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap select-none ${
                                      isAssigned
                                        ? 'bg-teal-600 border-teal-700 text-white shadow-xs hover:bg-teal-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black ${
                                      isAssigned ? 'bg-white/20 text-white' : 'border border-slate-300 bg-white text-transparent'
                                    }`}>
                                      ✓
                                    </span>
                                    <span>{r.title}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          {u.isInsuranceValid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold inline-block whitespace-nowrap">
                              معتبر
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] bg-rose-100 text-rose-800 border border-rose-200 font-bold inline-block whitespace-nowrap">
                              منقضی / نامشخص
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setUserForResetPass(u)}
                              title="ریست کلمه عبور کاربر"
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1 shadow-xs whitespace-nowrap"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600" />
                              <span>ریست رمز</span>
                            </button>
                            <button
                              onClick={() => setSelectedUserForModal(u)}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1 shadow-xs whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5 text-teal-600" />
                              <span>پرونده ۳۶۰°</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member 360° Modal */}
      {selectedUserForModal && (
        <Member360Modal
          user={selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
          onDataChanged={() => {
            setUsers([...dbStore.getUsers()]);
          }}
          onSelectMember={(member) => {
            setSelectedUserForModal(member);
          }}
        />
      )}

      {/* Alert Banner */}
      {resetAlertMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{resetAlertMessage}</span>
        </div>
      )}

      {/* Quick Reset Password Modal */}
      {userForResetPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <Key className="w-5 h-5" />
                <h3 className="text-base text-slate-900">بازنشانی کلمه عبور کاربر</h3>
              </div>
              <button
                onClick={() => setUserForResetPass(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
              تغییر یا بازنشانی کلمه عبور برای کاربر <strong>«{userForResetPass.fullName}»</strong> (کد ملی: {toPersianDigits(userForResetPass.nationalId)}).
              در صورت عدم ورود کلمه عبور جدید، رمز عبور به‌طور پیش‌فرض به <strong>کد ملی</strong> تنظیم می‌گردد.
            </p>

            <form onSubmit={handleQuickResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  کلمه عبور جدید (اختیاری):
                </label>
                <input
                  type="text"
                  value={quickNewPass}
                  onChange={(e) => setQuickNewPass(e.target.value)}
                  placeholder={`پیش‌فرض: ${userForResetPass.nationalId}`}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserForResetPass(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  تایید و ریست رمز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: PARENT-ATHLETE LINKS */}
      {activeTab === 'parents' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-teal-600" />
              مدیریت پیوند والد و فرزندان (چند فرزند برای یک والد)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              مدیر می‌تواند مشخص کند کدام حساب والد به کدام فرزندان (ورزشکاران) متصل است تا در داشبورد والد به‌صورت یکپارچه نمایش داده شود.
            </p>
          </div>

          {/* Form to link parent and athlete */}
          <form onSubmit={handleLinkParentAthlete} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب والد:</label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 font-bold"
              >
                {parentUsers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({toPersianDigits(p.phone)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب ورزشکار (فرزند):</label>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 font-bold"
              >
                {athleteUsers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName} ({a.fatherName ? `فرزند ${a.fatherName}` : 'ورزشکار'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20"
            >
              <UserPlus className="w-4 h-4" />
              ثبت پیوند والد - فرزند
            </button>
          </form>

          {/* List of Parents and their linked children */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">لیست والدین و فرزندان تحت پوشش:</h4>

            {parentUsers.map((parent) => {
              const children = dbStore.getChildrenForParent(parent.id);

              return (
                <div key={parent.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xs">
                        والد
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900">{parent.fullName}</span>
                        <p className="text-xs text-slate-500">شماره تماس: {toPersianDigits(parent.phone)} | کد ملی: {toPersianDigits(parent.nationalId)}</p>
                      </div>
                    </div>

                    <span className="text-xs bg-white text-teal-800 font-bold px-3 py-1 rounded-full border border-slate-200">
                      {toPersianDigits(children.length)} فرزند ثبت‌شده
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {children.length === 0 ? (
                      <p className="text-xs text-slate-400 italic col-span-full">هنوز فرزندی به این والد متصل نشده است.</p>
                    ) : (
                      children.map((child) => (
                        <div key={child.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{child.fullName}</p>
                            <p className="text-[10px] text-slate-500">کد ملی: {toPersianDigits(child.nationalId)}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUnlink(parent.id, child.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors border border-rose-100"
                            title="حذف اتصال"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600" />
              دفتر ردگیری و ممیزی تغییرات (Audit Trail)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تمام تغییرات نقش‌ها، دسترسی‌ها و اطلاعات کاربران با ذکر کاربر انجام‌دهنده و زمان دقیق ثبت می‌شود.
            </p>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 text-center">هنوز رکوردی ثبت نشده است.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <div>
                      <span className="font-black text-teal-900">{log.action}</span>
                      <span className="text-slate-500 px-2"> توسط: {log.userName}</span>
                      <p className="text-slate-700 text-[11px] mt-0.5 font-medium">{log.details}</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 bg-white px-2.5 py-1 rounded-xl font-mono border border-slate-200 self-start sm:self-auto font-bold">
                    {toPersianDigits(log.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MYSQL SCRIPT EXPORT */}
      {activeTab === 'mysql' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-600" />
                اسکریپت کامل MySQL جهت ایمپورت در cPanel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                برای استقرار نهایی روی هاست ایران با phpMyAdmin، می‌توانید اسکریپت زیر را کپی کرده و اجرا کنید.
              </p>
            </div>

            <button
              onClick={handleCopySql}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-colors shadow-md shadow-teal-600/20"
            >
              {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedSql ? 'کپی شد!' : 'کپی اسکریپت SQL'}
            </button>
          </div>

          <div className="relative bg-slate-900 p-4 rounded-2xl border border-slate-800 overflow-x-auto font-mono text-xs text-emerald-400 leading-relaxed max-h-96">
            <pre className="whitespace-pre">{sqlScript}</pre>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL FOR THE ACTIONS (Anti-Slop / High-Craft) */}
      {successModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-900">{successModal.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{successModal.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-xs"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
