import React, { useState } from 'react';
import { WaveLogoSVG } from './WaveLogoSVG';
import {
  Palette,
  Mountain,
  Trophy,
  Flame,
  Shield,
  Target,
  Activity,
  Check,
  Save,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Send,
  Users,
  Bell,
  Megaphone,
  Layers,
  X,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  FileArchive,
  Database,
} from 'lucide-react';
import { ThemePaletteKey, ClubSettings, ClubAnnouncement, User, UserRoleKey } from '../types';
import { THEME_PALETTES, ThemePaletteDefinition, applyThemeToDocument } from '../utils/theme';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { ZipProfilePhotoImporter } from './ZipProfilePhotoImporter';
import { ExcelPreRegImporter } from './ExcelPreRegImporter';
import { DataImportManagementView } from './DataImportManagementView';
import { MySqlTablesTestModal } from './MySqlTablesTestModal';
import { SyncDiagnosticsModal } from './SyncDiagnosticsModal';
import { uploadFileToServer } from '../utils/fileUploader';
import { Terminal } from 'lucide-react';

interface ClubSettingsViewProps {
  onSettingsUpdated?: (newSettings: ClubSettings) => void;
}

export const ClubSettingsView: React.FC<ClubSettingsViewProps> = ({ onSettingsUpdated }) => {
  const currentSettings = dbStore.getClubSettings();

  const [activeTab, setActiveTab] = useState<'brand' | 'sliders' | 'notifications' | 'data_import' | 'importers'>('brand');

  // Brand States
  const [clubName, setClubName] = useState(currentSettings.name);
  const [clubSlogan, setClubSlogan] = useState(currentSettings.slogan);
  const [logoIcon, setLogoIcon] = useState(currentSettings.logoIcon);
  const [logoUrl, setLogoUrl] = useState(currentSettings.logoUrl || '');
  const [themePalette, setThemePalette] = useState<ThemePaletteKey>(currentSettings.themePalette);
  const [offlineMode, setOfflineMode] = useState(() => dbStore.isOfflineModeEnabled());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDbTestModalOpen, setIsDbTestModalOpen] = useState(false);
  const [isSyncDiagnosticsModalOpen, setIsSyncDiagnosticsModalOpen] = useState(false);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    try {
      const res = await uploadFileToServer(file, {
        prefix: 'club_logo',
        customName: 'logo',
        subDir: 'club',
      });
      if (res.success && res.url) {
        setLogoUrl(res.url);
      } else {
        alert(res.error || 'خطا در آپلود لوگوی باشگاه روی سرور');
      }
    } catch {
      alert('خطا در ارتباط با سرور جهت بارگذاری لوگو');
    }
  };

  // Sliders & Banners State
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>(() => dbStore.getAllAnnouncements());
  const [isSliderModalOpen, setIsSliderModalOpen] = useState(false);
  const [editingSliderId, setEditingSliderId] = useState<string | null>(null);
  const [sliderTitle, setSliderTitle] = useState('');
  const [sliderSubtitle, setSliderSubtitle] = useState('');
  const [sliderImageUrl, setSliderImageUrl] = useState('');
  const [sliderDiscountTag, setSliderDiscountTag] = useState('');
  const [sliderAudience, setSliderAudience] = useState<'all' | 'athletes' | 'coaches'>('all');
  const [sliderIsActive, setSliderIsActive] = useState(true);

  // Notification Dispatch State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifCategory, setNotifCategory] = useState<'general' | 'financial' | 'course' | 'insurance' | 'urgent'>('general');
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'role' | 'individual' | 'custom'>('all');
  const [notifTargetRole, setNotifTargetRole] = useState<UserRoleKey>('athlete');
  const [notifSelectedUserId, setNotifSelectedUserId] = useState('');
  const [notifCustomUserIds, setNotifCustomUserIds] = useState<string[]>([]);
  const [notifSuccessCount, setNotifSuccessCount] = useState<number | null>(null);

  const allUsers = dbStore.getUsers();

  const iconOptions = [
    { key: 'wave', label: 'لوگوی اختصاصی موج (WAVE)', Icon: WaveLogoSVG },
    { key: 'mountain', label: 'کوهستان (سنگ‌نوردی)', Icon: Mountain },
    { key: 'trophy', label: 'جام قهرمانی', Icon: Trophy },
    { key: 'activity', label: 'نبض ورزشی', Icon: Activity },
    { key: 'flame', label: 'مشعل المپیک', Icon: Flame },
    { key: 'shield', label: 'سپر امنیتی باشگاه', Icon: Shield },
    { key: 'target', label: 'سیبل و هدف', Icon: Target },
  ];

  const handlePaletteChange = (key: ThemePaletteKey) => {
    setThemePalette(key);
    applyThemeToDocument(key);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const wasOffline = dbStore.isOfflineModeEnabled();
    dbStore.setOfflineModeEnabled(offlineMode);

    const updated = dbStore.updateClubSettings(
      {
        name: clubName.trim() || 'باشگاه ورزشی',
        slogan: clubSlogan.trim(),
        logoIcon,
        logoUrl: logoUrl.trim() || undefined,
        themePalette,
      },
      'مدیر کل'
    );

    if (onSettingsUpdated) {
      onSettingsUpdated(updated);
    }

    setSavedSuccess(true);
    
    if (wasOffline !== offlineMode) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const [isUploadingSliderImage, setIsUploadingSliderImage] = useState(false);

  const handleSliderFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }

    setIsUploadingSliderImage(true);
    try {
      const res = await uploadFileToServer(file, {
        prefix: 'slider',
        customName: editingSliderId || `announcement_${Date.now()}`,
        subDir: 'club',
      });
      if (res.success && res.url) {
        setSliderImageUrl(res.url);
      } else {
        alert(res.error || 'خطا در آپلود بنر اسلایدر روی سرور');
      }
    } catch {
      alert('خطا در ارتباط با سرور جهت بارگذاری بنر');
    } finally {
      setIsUploadingSliderImage(false);
    }
  };

  const handleOpenNewSliderModal = () => {
    setEditingSliderId(null);
    setSliderTitle('');
    setSliderSubtitle('');
    setSliderImageUrl('https://images.unsplash.com/photo-1522163182402-834f871fd951?auto=format&fit=crop&q=80&w=1200');
    setSliderDiscountTag('');
    setSliderAudience('all');
    setSliderIsActive(true);
    setIsSliderModalOpen(true);
  };

  const handleOpenEditSlider = (ann: ClubAnnouncement) => {
    setEditingSliderId(ann.id);
    setSliderTitle(ann.title);
    setSliderSubtitle(ann.subtitle);
    setSliderImageUrl(ann.imageUrl);
    setSliderDiscountTag(ann.discountTag || '');
    setSliderAudience(ann.targetAudience);
    setSliderIsActive(ann.isActive);
    setIsSliderModalOpen(true);
  };

  const handleSaveSlider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sliderTitle.trim()) return;

    if (editingSliderId) {
      dbStore.updateAnnouncement(
        editingSliderId,
        {
          title: sliderTitle.trim(),
          subtitle: sliderSubtitle.trim(),
          imageUrl: sliderImageUrl.trim() || 'https://images.unsplash.com/photo-1522163182402-834f871fd951?auto=format&fit=crop&q=80&w=1200',
          discountTag: sliderDiscountTag.trim() || undefined,
          targetAudience: sliderAudience,
          isActive: sliderIsActive,
        },
        'مدیر کل'
      );
    } else {
      dbStore.addAnnouncement({
        title: sliderTitle.trim(),
        subtitle: sliderSubtitle.trim(),
        imageUrl: sliderImageUrl.trim() || 'https://images.unsplash.com/photo-1522163182402-834f871fd951?auto=format&fit=crop&q=80&w=1200',
        discountTag: sliderDiscountTag.trim() || undefined,
        targetAudience: sliderAudience,
        isActive: sliderIsActive,
      });
    }

    setAnnouncements(dbStore.getAllAnnouncements());
    setIsSliderModalOpen(false);
  };

  const handleDeleteSlider = (id: string) => {
    if (window.confirm('آیا از حذف این اسلایدر اطمینان دارید؟')) {
      dbStore.deleteAnnouncement(id, 'مدیر کل');
      setAnnouncements(dbStore.getAllAnnouncements());
    }
  };

  const handleToggleSliderStatus = (id: string, currentStatus: boolean) => {
    dbStore.updateAnnouncement(id, { isActive: !currentStatus }, 'مدیر کل');
    setAnnouncements(dbStore.getAllAnnouncements());
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    let targetIds: string[] = [];
    if (notifTargetType === 'individual' && notifSelectedUserId) {
      targetIds = [notifSelectedUserId];
    } else if (notifTargetType === 'custom') {
      targetIds = notifCustomUserIds;
    }

    const count = dbStore.sendTargetedNotification(
      {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        category: notifCategory,
        targetType: notifTargetType,
        targetRole: notifTargetRole,
        targetUserIds: targetIds,
      },
      'مدیر کل'
    );

    setNotifSuccessCount(count);
    setNotifTitle('');
    setNotifMessage('');
    setTimeout(() => setNotifSuccessCount(null), 4000);
  };

  const activePal = THEME_PALETTES[themePalette] || THEME_PALETTES.wave;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${activePal.badgeBg} flex items-center justify-center ${activePal.textPrimary}`}>
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">پنل مدیریت باشگاه، اسلایدرها و اعلانات</h2>
            <p className="text-xs text-slate-500">
              تنظیمات هویت بصری، مدیریت بنرهای اسلایدر صفحه اصلی و ارسال پیام‌های گروهی، تکی و دسته‌ای
            </p>
          </div>
        </div>

        {/* Sub-tabs Navigation Header */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('brand')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'brand'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Palette className="w-4 h-4 text-teal-400" />
            <span>تب اول: استایل و برند</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sliders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sliders'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>تب دوم: اسلایدرها و بنرها</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-md">
              {toPersianDigits(announcements.length)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Bell className="w-4 h-4 text-indigo-400" />
            <span>تب سوم: مرکز اعلانات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('importers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'importers'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileArchive className="w-4 h-4 text-emerald-400" />
            <span>تب چهارم: درون‌ریزی عکس‌ها و اکسل</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSyncDiagnosticsModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-black rounded-xl flex items-center gap-2 border border-slate-700 shadow-sm transition-all hover:scale-105 shrink-0"
            title="مشاهده خط‌به‌خط لاگ‌های سرور و تست ذخیره‌سازی داده‌ها"
          >
            <Terminal className="w-4 h-4 text-teal-400" />
            <span>مانیتورینگ زنده همگام‌سازی MySQL</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDbTestModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-sm shadow-teal-600/30 transition-all hover:scale-105 shrink-0"
          >
            <Database className="w-4 h-4 text-emerald-200" />
            <span>استعلام جداول MySQL</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
        </div>
      </div>

      {/* TAB 1: BRAND & COLOR PALETTE */}
      {activeTab === 'brand' && (
        <form onSubmit={handleSaveBrand} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-slate-600" />
                  تنظیمات هویت بصری، نام و پالت رنگی
                </h3>
                {savedSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 animate-bounce">
                    <CheckCircle2 className="w-4 h-4" /> ذخیره شد!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نام باشگاه:</label>
                  <input
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شعار باشگاه:</label>
                  <input
                    type="text"
                    value={clubSlogan}
                    onChange={(e) => setClubSlogan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>لوگوی مستطیلی اختصاصی باشگاه (جهت نمایش در فرم لاگین و هدر):</span>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      حذف لوگو
                    </button>
                  )}
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/70 p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                    <Upload className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>بارگذاری تصویر لوگو (فایل مستطیلی)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="w-full sm:w-1/2">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="یا لینک آدرس تصویر (https://...)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {logoUrl && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                    <div className="h-12 w-32 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      <img src={logoUrl} alt="لوگوی باشگاه" className="h-full w-full object-contain" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      پیش‌نمایش لوگوی انتخاب‌شده. این لوگو به صورت مستطیل افقی در بالاترین بخش فرم لاگین با انیمیشن ملایم قرار می‌گیرد.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">انتخاب پالت رنگی سامانه:</label>
                <select
                  value={themePalette}
                  onChange={(e) => handlePaletteChange(e.target.value as ThemePaletteKey)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                >
                  {Object.values(THEME_PALETTES).map((pal) => (
                    <option key={pal.key} value={pal.key}>
                      🎨 {pal.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visual Palette Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {Object.values(THEME_PALETTES).map((pal) => {
                  const isSelected = themePalette === pal.key;
                  return (
                    <div
                      key={pal.key}
                      onClick={() => handlePaletteChange(pal.key)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-800'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center -space-x-1 space-x-reverse">
                          <div className="w-5 h-5 rounded-full border border-white" style={{ backgroundColor: pal.primaryHex }} />
                          <div className="w-5 h-5 rounded-full border border-white" style={{ backgroundColor: pal.primaryHoverHex }} />
                        </div>
                        <span className="text-xs font-bold">{pal.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Database & Storage Mode Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-600" />
                  تنظیمات پایگاه داده و حالت آفلاین (Storage Engine)
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  نحوه ذخیره‌سازی داده‌های سامانه و همگام‌سازی با پایگاه داده هاست را انتخاب کنید.
                </p>
              </div>

              <div className="space-y-3">
                <div
                  onClick={() => setOfflineMode(false)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    !offlineMode
                      ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="database_mode"
                    checked={!offlineMode}
                    onChange={() => setOfflineMode(false)}
                    className="mt-1 accent-emerald-600 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      پایگاه داده آنلاین MySQL (توصیه شده و پیش‌فرض)
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                        امن و یکپارچه
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      کلیه تراکنش‌ها، ثبت‌نام‌ها، امور مالی و داده‌ها مستقیماً و منحصراً روی دیتابیس MySQL هاست ذخیره می‌شوند. در این حالت کش مرورگرها داده‌های شما را آلوده یا بازنویسی نمی‌کند.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setOfflineMode(true)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    offlineMode
                      ? 'bg-amber-50/50 border-amber-500 ring-1 ring-amber-500'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="database_mode"
                    checked={offlineMode}
                    onChange={() => setOfflineMode(true)}
                    className="mt-1 accent-amber-600 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      ذخیره‌سازی آفلاین و محلی مرورگر (LocalStorage)
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      برای سناریوهای آفلاین یا تست محلی بدون نیاز به اتصال دیتابیس آنلاین. اطلاعات در کش محلی مرورگر شما باقی می‌ماند.
                    </p>
                  </div>
                </div>
              </div>

              {!offlineMode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 leading-relaxed flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                  <span>
                    <strong>توجه:</strong> در حالت پایگاه داده آنلاین MySQL، اگر اتصال سرور به دیتابیس به هردلیلی قطع باشد، سامانه جهت امنیت داده‌ها به اطلاعات محلی قدیمی رجوع نمی‌کند تا هیچ اطلاعات مالی یا پرسنلی مخدوش نگردد.
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-8 py-3 ${activePal.bgPrimary} ${activePal.bgPrimaryHover} text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2`}
              >
                <Save className="w-4 h-4" />
                ذخیره تنظیمات برند
              </button>
            </div>
          </div>

          {/* Right Preview Card */}
          <div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                پیش‌نمایش زنده هویت بصری
              </span>
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                {logoUrl ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-2 border border-slate-100 rounded-xl bg-slate-50/50">
                    <img src={logoUrl} alt={clubName} className="h-12 w-auto max-w-full object-contain rounded-md" />
                    <div className="text-center">
                      <h4 className="text-sm font-black leading-tight">{clubName}</h4>
                      <p className="text-[11px] opacity-80 mt-0.5">{clubSlogan}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: activePal.primaryHex }}>
                      <Mountain className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black leading-tight">{clubName}</h4>
                      <p className="text-[11px] opacity-80 mt-0.5">{clubSlogan}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: SLIDER & BANNER MANAGEMENT */}
      {activeTab === 'sliders' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600" />
                مدیریت اسلایدرها و بنرهای صفحه اصلی کاربران
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ایجاد، ویرایش و انتشار بنرهای گرافیکی و اطلاعیه‌های اسلایدی در صفحه اول پورتال اعضا
              </p>
            </div>

            <button
              onClick={handleOpenNewSliderModal}
              className={`px-4 py-2.5 ${activePal.bgPrimary} ${activePal.bgPrimaryHover} text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              افزودن اسلایدر / بنر جدید
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`border rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all ${
                  ann.isActive ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50/80 border-slate-200 opacity-70'
                }`}
              >
                <div className="space-y-3">
                  <div className="relative h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover" />
                    {ann.discountTag && (
                      <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                        {ann.discountTag}
                      </span>
                    )}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-lg text-white ${ann.isActive ? 'bg-emerald-600' : 'bg-slate-500'}`}>
                      {ann.isActive ? 'فعال و نمایان' : 'غیرفعال'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-slate-900">{ann.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ann.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">تاریخ ایجاد: {ann.createdAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSliderStatus(ann.id, ann.isActive)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        ann.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {ann.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                    </button>
                    <button
                      onClick={() => handleOpenEditSlider(ann)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                      title="ویرایش"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlider(ann.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {announcements.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              هیچ اسلایدر یا بنری تعریف نشده است. لطفا روی دکمه افزودن اسلایدر جدید کلیک کنید.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS DISPATCH CENTER */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-teal-600" />
              پنل ارسال اعلانات گروهی، تکی، دسته‌ای و انتخابی
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ارسال اعلان فوری به اعضا با قابلیت انتخاب مخاطبین (همه، بر اساس نقش، کاربر منفرد یا گروه انتخابی)
            </p>
          </div>

          {notifSuccessCount !== null && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-xs text-emerald-900">اعلان با موفقیت ارسال شد!</h4>
                <p className="text-[11px] text-emerald-700 mt-0.5">این اعلان با موفقیت برای {notifSuccessCount} نفر از مخاطبین ثبت و ارسال گردید.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSendNotification} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع مخاطبین (دسته‌بندی ارسال):</label>
                <select
                  value={notifTargetType}
                  onChange={(e) => setNotifTargetType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                >
                  <option value="all">📢 ارسال گروهی (همه اعضای باشگاه)</option>
                  <option value="role">👥 ارسال دسته‌ای بر اساس نقش (ورزشکاران، مربیان و...)</option>
                  <option value="individual">👤 ارسال به یک کاربر خاص (تکی)</option>
                  <option value="custom">☑️ انتخاب چند کاربر خاص (انتخابی)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">دسته‌بندی موضوعی اعلان:</label>
                <select
                  value={notifCategory}
                  onChange={(e) => setNotifCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                >
                  <option value="general">📢 اطلاعیه عمومی</option>
                  <option value="financial">💳 مالی و شهریه</option>
                  <option value="course">📚 سانس و دوره‌ها</option>
                  <option value="insurance">🛡️ بیمه ورزشی</option>
                  <option value="urgent">🚨 هشدار فوری</option>
                </select>
              </div>
            </div>

            {notifTargetType === 'role' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب نقش هدف:</label>
                <select
                  value={notifTargetRole}
                  onChange={(e) => setNotifTargetRole(e.target.value as UserRoleKey)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                >
                  <option value="athlete">ورزشکاران</option>
                  <option value="coach">مربیان</option>
                  <option value="parent">والدین</option>
                  <option value="accountant">حسابداران</option>
                  <option value="secretary">منشی‌ها</option>
                </select>
              </div>
            )}

            {notifTargetType === 'individual' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب کاربر مورد نظر:</label>
                <select
                  value={notifSelectedUserId}
                  onChange={(e) => setNotifSelectedUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                >
                  <option value="">-- انتخاب کاربر از لیست اعضا --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.phone}) - نقش: {u.activeRole}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان اعلان:</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="مثلا: یادآوری پرداخت شهریه ماهانه سانس..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">متن کامل پیام / اطلاعیه:</label>
              <textarea
                rows={4}
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="متن اطلاعیه را با جزئیات وارد کنید..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className={`px-8 py-3 ${activePal.bgPrimary} ${activePal.bgPrimaryHover} text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2`}
              >
                <Send className="w-4 h-4" />
                ارسال فوری اعلان به مخاطبین
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: IMPORTERS (ZIP PROFILE PHOTOS + EXCEL PRE-REGISTRATION DATA) */}
      {activeTab === 'importers' && (
        <div className="space-y-6 animate-fadeIn">
          <ZipProfilePhotoImporter />
          <ExcelPreRegImporter />
        </div>
      )}

      {/* TAB 4: DATA IMPORTERS & PROFILE IMAGES */}
      {(activeTab as string) === 'importers' || (activeTab as string) === 'data_import' ? (
        <DataImportManagementView onImportComplete={() => {}} />
      ) : null}

      {/* SLIDER CREATE/EDIT MODAL */}
      {isSliderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                {editingSliderId ? 'ویرایش اسلایدر / بنر' : 'افزودن اسلایدر / بنر جدید'}
              </h3>
              <button onClick={() => setIsSliderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlider} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان اسلایدر:</label>
                <input
                  type="text"
                  value={sliderTitle}
                  onChange={(e) => setSliderTitle(e.target.value)}
                  placeholder="مثال: جشنواره تخفیف دوره‌های تابستانه"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">زیرعنوان / توضیحات کوتاه:</label>
                <input
                  type="text"
                  value={sliderSubtitle}
                  onChange={(e) => setSliderSubtitle(e.target.value)}
                  placeholder="مثال: ۲۰٪ تخفیف ثبت‌نام زودهنگام در تمامی سانس‌ها"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تصویر بنر اسلایدر:</label>
                <div className="space-y-3">
                  {sliderImageUrl && (
                    <div className="relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={sliderImageUrl} alt="پیش‌نمایش اسلایدر" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSliderImageUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-all"
                        title="حذف تصویر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">بارگذاری از سیستم</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSliderFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center">
                      <input
                        type="text"
                        value={sliderImageUrl}
                        onChange={(e) => setSliderImageUrl(e.target.value)}
                        placeholder="یا آدرس تصویر (URL) را وارد کنید..."
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold dir-ltr text-left"
                      />
                    </div>
                  </div>
                  {isUploadingSliderImage && (
                    <p className="text-[10px] text-teal-600 font-bold animate-pulse">در حال بارگذاری تصویر روی سرور...</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">برچسب تخفیف (اختیاری):</label>
                  <input
                    type="text"
                    value={sliderDiscountTag}
                    onChange={(e) => setSliderDiscountTag(e.target.value)}
                    placeholder="مثال: تخفیف ویژه ۲۰٪"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مخاطبین هدف:</label>
                  <select
                    value={sliderAudience}
                    onChange={(e) => setSliderAudience(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="all">همه اعضا</option>
                    <option value="athletes">فقط ورزشکاران</option>
                    <option value="coaches">فقط مربیان</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sliderActiveCheckbox"
                  checked={sliderIsActive}
                  onChange={(e) => setSliderIsActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="sliderActiveCheckbox" className="text-xs font-bold text-slate-700">
                  اسلایدر فعال باشد و در صفحه اصلی نمایش داده شود
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSliderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 ${activePal.bgPrimary} ${activePal.bgPrimaryHover} text-white text-xs font-bold rounded-xl shadow-sm`}
                >
                  ذخیره اسلایدر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MySQL Tables Status & Test Modal */}
      <MySqlTablesTestModal
        isOpen={isDbTestModalOpen}
        onClose={() => setIsDbTestModalOpen(false)}
      />

      {/* Real-time Line-by-Line MySQL Sync Diagnostics Modal */}
      <SyncDiagnosticsModal
        isOpen={isSyncDiagnosticsModalOpen}
        onClose={() => setIsSyncDiagnosticsModalOpen(false)}
      />
    </div>
  );
};
