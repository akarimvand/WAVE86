import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  BookOpen,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  Users,
  Wallet,
  Headphones,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Layers,
  FileText,
  Clock,
  ShieldCheck,
  Award,
  DollarSign,
  PieChart,
  ShoppingBag,
  Database,
  Sliders,
  HeartHandshake,
  Key,
  Smartphone,
  Check,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle as QuestionIcon,
} from 'lucide-react';
import { UserRoleKey } from '../types';

export interface PageHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageKey: string;
  currentUserRole?: string;
}

interface MenuItemGuide {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  icon: React.ElementType;
  roles: string[];
  summary: string;
  simpleSummary: string;
  steps: string[];
  tips: string[];
}

interface AthleteSimpleGuide {
  id: string;
  question: string;
  icon: React.ElementType;
  answer: string;
  steps: string[];
  tip?: string;
}

interface RoleGuideItem {
  roleKey: string;
  roleName: string;
  icon: React.ElementType;
  badgeColor: string;
  description: string;
  allowedMenus: string[];
  mainTasks: string[];
  proTips: string[];
}

// ----------------------------------------------------
// 1. ALL MENU GUIDES (MENU-BY-MENU)
// ----------------------------------------------------
const ALL_MENU_GUIDES: MenuItemGuide[] = [
  // Category 1: عمومی و پورتال ورزشکاران
  {
    id: 'user-portal',
    title: 'پورتال جامع ورزشکار و ولی',
    category: 'خدمات عمومی و پورتال ورزشکاران',
    categoryIcon: '🎯',
    icon: UserCheck,
    roles: ['ورزشکار', 'شاگرد', 'ولی / سرپرست', 'مدیر'],
    summary: 'میز کار اختصاصی ورزشکار جهت انتخاب کلاس، پرداخت شهریه، مشاهده مانده جلسات و ارتباط با باشگاه.',
    simpleSummary: 'صفحه اصلی شما! اینجا می‌تونید کلاس انتخاب کنید، شهریه رو بدید و ببینید چند جلسه از کلاستون مونده.',
    steps: [
      'از تب «انتخاب سانس»، کلاس دلخواه خود را بر اساس روز و ساعت پیدا کرده و دکمه انتخاب را بزنید.',
      'از تب «امور مالی»، مانده بدهی را ببینید و از طریق درگاه پرداخت آنلاین یا ارسال تصویر فیش بانکی تسویه کنید.',
      'از تب «حضور و غیاب»، کارنامه جلسات و درصد باقی‌مانده از اشتراک خود را چک کنید.',
      'سرپرستان و والدین می‌توانند از منوی بالای صفحه، بین فرزندان خود جابجا شوند.',
    ],
    tips: [
      'سیستم به صورت خودکار مانع از انتخاب دو کلاس هم‌زمان می‌شود تا تداخل ساعتی نداشته باشید.',
      'در صورت اتمام سقف ۱۲ جلسه یا گذشت ۳۰ روز، سیستم به شما پیام تمدید دوره می‌دهد.',
    ],
  },
  {
    id: 'prereg-public',
    title: 'فرم پیش‌ثبت‌نام آنلاین',
    category: 'خدمات عمومی و پورتال ورزشکاران',
    categoryIcon: '🎯',
    icon: FileText,
    roles: ['عموم کاربران', 'متقاضیان جدید'],
    summary: 'فرم الکترونیکی ثبت‌نام متقاضیان جدید شامل اطلاعات هویتی، سلامت، بیمه ورزشی و رشته انتخابی.',
    simpleSummary: 'برای عضویت اولیه در باشگاه، فقط کافیه این فرم رو پر کنید تا حسابتون ساخته بشه.',
    steps: [
      'کد ملی، نام، نام خانوادگی، شماره موبایل و تاریخ تولد را وارد کنید.',
      'تصویر کارت ملی و کارت بیمه ورزشی (در صورت وجود) را بارگذاری نمایید.',
      'پرسشنامه کوتاه سلامت و رضایت‌نامه را تایید کرده و دکمه ثبت نهایی را بزنید.',
    ],
    tips: [
      'پس از تایید توسط پذیرش باشگاه، رمز عبور پیش‌فرض شما همان «کد ملی» خواهد بود.',
    ],
  },
  {
    id: 'sports-insurance',
    title: 'استعلام و پایش بیمه ورزشی',
    category: 'خدمات عمومی و پورتال ورزشکاران',
    categoryIcon: '🎯',
    icon: ShieldCheck,
    roles: ['ورزشکار', 'مربی', 'پذیرش', 'مدیر'],
    summary: 'سامانه استعلام آنلاین اصالت و تاریخ انقضای کارت بیمه فدراسیون پزشکی ورزشی.',
    simpleSummary: 'اینجا می‌تونید ببینید بیمه ورزشی‌تون تا کی اعتبار داره و اگه تموم شده عکس کارت جدید رو بفرستید.',
    steps: [
      'کد ملی خود یا ورزشکار را وارد کرده و دکمه استعلام را بزنید.',
      'تاریخ شروع و پایان اعتبار کارت به همراه وضعیت (معتبر، در شرف انقضا، منقضی) نمایش داده می‌شود.',
      'در صورت تمدید، تصویر کارت جدید را آپلود کنید تا پذیرش آن را تایید کند.',
    ],
    tips: [
      'داشتن بیمه ورزشی فدراسیون طبق قانون الزامی است؛ بدون بیمه امکان حضور در سانس وجود ندارد.',
    ],
  },
  {
    id: 'support-tickets',
    title: 'سامانه پشتیبانی و تیکتینگ',
    category: 'خدمات عمومی و پورتال ورزشکاران',
    categoryIcon: '🎯',
    icon: Headphones,
    roles: ['همه کاربران', 'ورزشکاران', 'مربیان', 'مدیران'],
    summary: 'مرکز ارسال پیام مستقیم و گفتگوی آنلاین با مدیریت، بخش مالی یا مربیان باشگاه.',
    simpleSummary: 'هر سوال، درخواست مرخصی، مشکل مالی یا نظری دارید اینجا پیام بدید تا سریع جواب داده بشه.',
    steps: [
      'روی دکمه «ثبت پیام / تیکت جدید» کلیک کنید.',
      'موضوع، واحد مربوطه (مدیریت، مالی، مربی) و متن پیام خود را بنویسید.',
      'در صورت نیاز می‌توانید تصویر فیش یا سند مورد نظر را پیوست کنید.',
      'پاسخ مسئولان باشگاه را در همین بخش مشاهده و دنبال کنید.',
    ],
    tips: [
      'با زدن دکمه ضربدر بالای هر گفتگو می‌توانید به راحتی به لیست پیام‌ها بازگردید.',
    ],
  },

  // Category 2: مدیریت اعضای باشگاه
  {
    id: 'prereg-admin',
    title: 'کارتابل پیش‌ثبت‌نام‌ها',
    category: 'مدیریت اعضای باشگاه',
    categoryIcon: '👥',
    icon: UserCheck,
    roles: ['مدیر ارشد', 'پذیرش / منشی'],
    summary: 'بررسی مدارک و اطلاعات افراد متقاضی عضویت جدید و تبدیل آن‌ها به اعضای رسمی.',
    simpleSummary: 'لیست افرادی که فرم عضویت پر کردن؛ با یک کلیک تاییدشون کنید تا به لیست اعضا اضافه بشن.',
    steps: [
      'درخواست‌های در انتظار بررسی را در تب «در انتظار» مشاهده کنید.',
      'مدارک و شماره تماس متقاضی را تطبیق دهید.',
      'روی دکمه «تایید و صدور عضویت» کلیک کنید تا حساب کاربری فرد فوراً ساخته شود.',
    ],
    tips: [
      'امکان خروجی اکسل یا پرینت فرم مشخصات برای پرونده فیزیکی وجود دارد.',
    ],
  },
  {
    id: 'phase1-roles',
    title: 'کاربران، نقش‌ها و دسترسی‌ها',
    category: 'مدیریت اعضای باشگاه',
    categoryIcon: '👥',
    icon: ShieldAlert,
    roles: ['مدیر ارشد'],
    summary: 'مدیریت کل اعضا، تغییر نقش‌ها (مدیر، مربی، ورزشکار، حسابدار)، ریست رمز عبور و پرونده ۳۶۰ درجه.',
    simpleSummary: 'فهرست تمام اعضای باشگاه با قابلیت جستجو، تغییر رمز، تغییر نقش و مشاهده کل سوابق فرد.',
    steps: [
      'کاربر مورد نظر را از کادر جستجو با نام یا کد ملی بیابید.',
      'برای مشاهده کل سوابق مالی، سانس‌ها و حضورغیاب روی «پرونده ۳۶۰°» کلیک کنید.',
      'جهت ریست رمز کاربر فراموشکار، دکمه «ریست رمز به کد ملی» را بزنید.',
    ],
    tips: [
      'می‌توانید به یک کاربر چند نقش همزمان اختصاص دهید (مثلاً مربی که خودش ورزشکار سانس دیگری است).',
    ],
  },
  {
    id: 'phase1-parents',
    title: 'ارتباط والدین و فرزندان',
    category: 'مدیریت اعضای باشگاه',
    categoryIcon: '👥',
    icon: Users,
    roles: ['مدیر ارشد', 'پذیرش'],
    summary: 'پیوند دادن حساب کاربری اولیاء به پرونده فرزندان ورزشکار برای کنترل یکپارچه شهریه و حضور.',
    simpleSummary: 'وصل کردن حساب پدر یا مادر به حساب فرزند تا بتونن شهریه رو آنلاین پرداخت کنن و حضورش رو ببینن.',
    steps: [
      'نام والد و نام فرزند را از لیست‌ها انتخاب کنید.',
      'نسبت (پدر، مادر، سرپرست) را مشخص نموده و دکمه اتصال را بزنید.',
    ],
    tips: [
      'یک والد می‌تواند همزمان به چند فرزند متصل باشد و بین آن‌ها جابجا شود.',
    ],
  },
  {
    id: 'insurance-packages',
    title: 'تعریف تعرفه‌های بیمه',
    category: 'مدیریت اعضای باشگاه',
    categoryIcon: '👥',
    icon: Award,
    roles: ['مدیر ارشد', 'حسابدار'],
    summary: 'تعریف مبالغ و بسته‌های بیمه ورزشی فدراسیون و حق عضویت سالانه باشگاه.',
    simpleSummary: 'تنظیم قیمت و مدت اعتبار بیمه ورزشی و عضویت سالانه باشگاه.',
    steps: [
      'بسته بیمه جدید را با عنوان، مبلغ و مدت اعتبار (مثلاً ۳۶۵ روز) تعریف کنید.',
      'هنگام ثبت‌نام سانس، هزینه بیمه به صورت خودکار در فاکتور لحاظ می‌شود.',
    ],
    tips: [
      'می‌توانید برای اعضایی که از قبل بیمه دارند، گزینه کسر هزینه بیمه را فعال نگه دارید.',
    ],
  },

  // Category 3: برنامه‌ریزی و حضور غیاب
  {
    id: 'phase2-sessions',
    title: 'مدیریت سانس‌ها و دوره‌ها',
    category: 'برنامه‌ریزی و حضور غیاب',
    categoryIcon: '📆',
    icon: Calendar,
    roles: ['مدیر ارشد', 'پذیرش'],
    summary: 'تعریف کلاس‌ها، تعیین مربی، روزهای زوج/فرد، ساعت شروع و پایان، ظرفیت و شهریه دوره.',
    simpleSummary: 'ساخت و برنامه‌ریزی کلاس‌های ورزشی، مشخص کردن مربی، ساعت و مبلغ شهریه.',
    steps: [
      'دکمه «تعریف سانس جدید» را بزنید.',
      'عنوان کلاس (مثلاً سنگ‌نوردی پیشرفته)، مربی، روزها و ساعت برگزاری را تعیین کنید.',
      'شهریه ماهانه و ظرفیت مجاز سانس را وارد و ذخیره کنید.',
      'با کلیک روی دکمه اعضا، لیست ورزشکاران ثبت‌نامی را ببینید یا عضو جدید اضافه/حذف کنید.',
    ],
    tips: [
      'در صورت حذف یک ورزشکار از سانس، بدهی شهریه آن سانس بلافاصله از حساب او پاک می‌گردد.',
    ],
  },
  {
    id: 'phase2-attendance',
    title: 'حضور و غیاب هوشمند',
    category: 'برنامه‌ریزی و حضور غیاب',
    categoryIcon: '📆',
    icon: Layers,
    roles: ['مدیر ارشد', 'مربی', 'پذیرش'],
    summary: 'ثبت الکترونیکی ورود و خروج ورزشکاران، کسر خودکار جلسه از اشتراک و هشدار انقضا.',
    simpleSummary: 'تیک زدن حاضر یا غایب بودن بچه‌ها در هر جلسه؛ سیستم خودش حساب می‌کنه چند جلسه مونده.',
    steps: [
      'سانس مورد نظر و تاریخ روز را انتخاب کنید.',
      'وضعیت هر شاگرد را با یک کلیک مشخص کنید: حاضر (سبز)، غایب (قرمز)، موجه (آبی)، تعطیل (خاکستری).',
      'دکمه «ذخیره نهایی حضور و غیاب» را بزنید.',
    ],
    tips: [
      'غیبت‌های موجه از ۱۲ جلسه اشتراک کسر نمی‌شوند.',
      'اگر اشتراک ورزشکار رو به اتمام باشد (کمتر از ۲ جلسه)، سیستم علامت هشدار زرد نشان می‌دهد.',
    ],
  },
  {
    id: 'coach-portal',
    title: 'پورتال اختصاصی مربی',
    category: 'برنامه‌ریزی و حضور غیاب',
    categoryIcon: '📆',
    icon: GraduationCap,
    roles: ['مربیان'],
    summary: 'میز کار اختصاصی مربی برای مشاهده کلاس‌های خود، حضور و غیاب سریع و ثبت یادداشت‌های فنی.',
    simpleSummary: 'صفحه ویژه مربی برای دیدن لیست شاگردان، ثبت حضور و غیاب همون روز و نوشتن نکات تمرینی.',
    steps: [
      'کلاس فعال خود را انتخاب کنید.',
      'حضور و غیاب شاگردان را تیک بزنید.',
      'در کادر توضیحات هر شاگرد، پیشرفت ورزشی یا نکات مربیگری را یادداشت کنید.',
    ],
    tips: [
      'مربی فقط کلاس‌های مربوط به خودش را می‌بیند و به مسائل مالی دسترسی نخواهد داشت.',
    ],
  },

  // Category 4: امور مالی و حسابداری
  {
    id: 'phase2-finance',
    title: 'حسابداری و کاردکس معین',
    category: 'امور مالی و حسابداری',
    categoryIcon: '💰',
    icon: DollarSign,
    roles: ['مدیر ارشد', 'حسابدار'],
    summary: 'دفتر معین کامل بدهکار/بستانکار اشخاص، تسویه مطالبات، ثبت فیش، و پیگیری مانده حساب.',
    simpleSummary: 'حساب و کتاب دقیق تمام اعضا، ثبت پرداختی‌ها، بررسی فیش‌های بانکی و دیدن طلبکاری و بدهکاری.',
    steps: [
      'در بخش کاردکس، نام یا کد ملی ورزشکار را جستجو کنید تا دفتر حساب او باز شود.',
      'ستون بدهکار (شهریه‌ها و فاکتورها) و بستانکار (پرداختی‌ها) و مانده نهایی را بررسی کنید.',
      'برای ثبت دریافتی جدید دستی (کارت‌خوان یا وجه نقد)، دکمه «ثبت تراکنش جدید» را بزنید.',
      'در تب فیش‌های معلق، تصویر فیش‌های ارسالی اعضا را بازبینی و تایید یا رد نمایید.',
    ],
    tips: [
      'تراز جاری به صورت لحظه‌ای محاسبه می‌شود و امکان بروز خطای انسانی در جمع جبری وجود ندارد.',
    ],
  },
  {
    id: 'financial-dashboard',
    title: 'داشبورد و نمودارهای مالی',
    category: 'امور مالی و حسابداری',
    categoryIcon: '💰',
    icon: PieChart,
    roles: ['مدیر ارشد', 'حسابدار'],
    summary: 'نمودارهای آماری درآمدها به تفکیک درگاه آنلاین، کارت‌خوان و کارت‌به‌کارت با مقایسه ماهانه.',
    simpleSummary: 'نمودارهای قشنگ و دقیق از میزان کل درآمد باشگاه، سود و زیان و مقایسه با ماه‌های قبل.',
    steps: [
      'بازه زمانی مورد نظر (ماه جاری، ۳ ماه گذشته، سال) را انتخاب کنید.',
      'سهم روش‌های مختلف پرداخت و سود خالص پس از کسر هزینه‌ها را مشاهده کنید.',
    ],
    tips: [
      'نمودارها به صورت کاملاً زنده همگام با تراکنش‌ها آپدیت می‌شوند.',
    ],
  },
  {
    id: 'shop-expenses',
    title: 'فروشگاه، بوفه و هزینه‌ها',
    category: 'امور مالی و حسابداری',
    categoryIcon: '💰',
    icon: ShoppingBag,
    roles: ['مدیر ارشد', 'حسابدار', 'پذیرش'],
    summary: 'صدور فاکتور خرید بوفه و تجهیزات ورزشی به‌همراه ثبت و طبقه‌بندی هزینه‌های جاری باشگاه.',
    simpleSummary: 'خرید و فروش اقلام بوفه و لوازم ورزشی و ثبت خرج‌های باشگاه مثل اجاره و قبوض.',
    steps: [
      'برای فروش بوفه: نام ورزشکار را انتخاب و اقلام مورد نظر را به سبد اضافه و فاکتور را ثبت کنید.',
      'برای ثبت هزینه باشگاه: مبلغ، دسته هزینه (اجاره، تعمیرات، حقوق مربیان) و تصویر فاکتور را درج نمایید.',
    ],
    tips: [
      'هزینه‌های ثبت‌شده خودکار از کل درآمد کسر می‌شوند تا سود خالص محاسبه شود.',
    ],
  },

  // Category 5: گزارشات و پنل پرسنلی
  {
    id: 'admin-analytics',
    title: 'داشبورد مدیریتی و تحلیلی',
    category: 'گزارشات و پنل پرسنلی',
    categoryIcon: '📊',
    icon: Sparkles,
    roles: ['مدیر ارشد'],
    summary: 'اتاق فرمان باشگاه؛ مانیتورینگ تعداد اعضای فعال، سانس‌های شلوغ، هشدارهای بیمه و وضعیت کلی.',
    simpleSummary: 'صفحه آمار کلی باشگاه در یک نگاه؛ چند نفر ورزشکار داریم، چقدر درآمد داشتیم و کدوما بیمه‌شون تموم شده.',
    steps: [
      'کارت‌های بالایی آمار کلی اعضا، بدهی‌های معوقه و ثبت‌نام‌های جدید را نشان می‌دهند.',
      'بخش هشدارهای هوشمند، مواردی که نیاز به توجه فوری دارند را یادآوری می‌کند.',
    ],
    tips: [
      'با کلیک بر روی هر هشدار، مستقیماً به صفحه مربوط به آن هدایت می‌شوید.',
    ],
  },

  // Category 6: تنظیمات عمومی برنامه
  {
    id: 'club-settings',
    title: 'تنظیمات، لوگو و برندینگ',
    category: 'تنظیمات عمومی برنامه',
    categoryIcon: '⚙️',
    icon: Sliders,
    roles: ['مدیر ارشد'],
    summary: 'تغییر نام باشگاه، شعار، لوگو، تم‌های رنگی جذاب و مدیریت بنرهای اسلایدر صفحه اصلی.',
    simpleSummary: 'تغییر رنگ، عکس لوگو، اسم باشگاه و عکس بنرهای بالای صفحه.',
    steps: [
      'نام، شعار و اطلاعات تماس باشگاه را ویرایش کنید.',
      'عکس لوگو یا بنر اسلایدر جدید را مستقیماً از کامپیوتر بارگذاری نمایید.',
      'از بین تم‌های رنگی مدرن یکی را انتخاب کرده و ذخیره کنید.',
    ],
    tips: [
      'تغییر تم و بنر بلافاصله در تمام گوشی‌ها و سیستم‌های کاربران اعمال می‌شود.',
    ],
  },
  {
    id: 'data-export',
    title: 'پشتیبان‌گیری و خروجی داده‌ها',
    category: 'تنظیمات عمومی برنامه',
    categoryIcon: '⚙️',
    icon: Database,
    roles: ['مدیر ارشد'],
    summary: 'دریافت فایل اکسل و نسخه پشتیبان (Backup) کامل از تمام اعضا، تراکنش‌ها و سوابق باشگاه.',
    simpleSummary: 'دانلود فایل اکسل از همه اعضا و اطلاعات باشگاه برای ذخیره مطمئن در کامپیوتر.',
    steps: [
      'روی دکمه «دریافت فایل اکسل جامع» یا «تهیه نسخه پشتیبان JSON» کلیک کنید.',
      'فایل دانلود شده را در مکانی امن در رایانه خود نگهداری فرمایید.',
    ],
    tips: [
      'توصیه می‌شود در پایان هر ماه یک فایل پشتیبان دانلود و ذخیره فرمایید.',
    ],
  },
];

// ----------------------------------------------------
// 2. SIMPLE ATHLETE / STUDENT QUESTIONS & FAQS (زبان بسیار ساده و روان)
// ----------------------------------------------------
const ATHLETE_SIMPLE_GUIDES: AthleteSimpleGuide[] = [
  {
    id: 'q1',
    question: 'چطور کلاسم رو انتخاب و ثبت‌نام کنم؟',
    icon: Calendar,
    answer: 'خیلی ساده! بعد از ورود به حسابت، برو توی تب «انتخاب سانس». لیست همه کلاس‌ها با اسم مربی، روزها، ساعت و قیمتشون نوشته شده. کافیه روی دکمه «انتخاب» بزنی. سیستم خودکار چک می‌کنه که ساعت کلاست با کلاس دیگه‌ای تداخل نداشته باشه.',
    steps: [
      'وارد پورتال ورزشکار شو.',
      'برو به بخش «انتخاب سانس».',
      'کلاس مورد نظرت رو پیدا کن و دکمه انتخاب رو بزن.',
    ],
    tip: 'اگه کلاسی پر شده باشه یا با کلاس دیگه‌ت تداخل داشته باشه، سیستم بهت پیام میده.',
  },
  {
    id: 'q2',
    question: 'شهریه رو چطوری پرداخت کنم؟',
    icon: Wallet,
    answer: 'برو به بخش «امور مالی». اونجا دقیقاً نوشته چقدر شهریه داری. می‌تونی از درگاه آنلاین با کارت بانکی و رمز دوم مستقیم پرداخت کنی یا اگه کارت‌به‌کارت کردی، عکس فیش رو آپلود کنی تا باشگاه تایید کنه.',
    steps: [
      'برو به تب «امور مالی».',
      'مبلغ بدهی رو ببین.',
      'دکمه «پرداخت آنلاین» رو بزن یا فیش واریزیت رو بارگذاری کن.',
    ],
    tip: 'به محض پرداخت آنلاین، حساب شما تسویه میشه و نیازی به تماس با باشگاه نیست.',
  },
  {
    id: 'q3',
    question: 'از کجا بفهمم چند جلسه از کلاسم مونده؟',
    icon: Layers,
    answer: 'توی تب «حضور و غیاب»، یه نمودار دایره‌ای خوشگل هست که بهت نشون میده چند جلسه اومدی و چند جلسه از ۱۲ جلسه‌ت مونده. تاریخ و ساعت دقیق هر جلسه‌ای که اومدی هم اونجا ثبت شده.',
    steps: [
      'برو به تب «حضور و غیاب».',
      'درصد مانده اشتراک و تعداد جلسات باقیمانده رو ببین.',
      'تاریخ جلسات قبلی رو چک کن.',
    ],
    tip: 'اگه غیبت موجه داشته باشی و مربی ثبت کنه، از جلساتت کم نمیشه.',
  },
  {
    id: 'q4',
    question: 'بیمه ورزشی من معتبره یا تموم شده؟',
    icon: ShieldCheck,
    answer: 'از منوی سمت راست گزینه «استعلام بیمه ورزشی» رو بزن و کد ملیت رو وارد کن. اگه سبز باشه یعنی معتبره. اگه قرمز یا زرد شد، می‌تونی از سایت فدراسیون تمدید کنی و عکس کارت جدیدت رو بفرستی.',
    steps: [
      'کد ملیت رو در بخش استعلام بیمه بزن.',
      'تاریخ اعتبار کارتت رو ببین.',
      'در صورت تمدید، عکس کارت جدیدت رو آپلود کن.',
    ],
    tip: 'بیمه ورزشی یک‌ساله است و برای ورود به باشگاه ضروریه.',
  },
  {
    id: 'q5',
    question: 'چطوری به مربی یا مدیر باشگاه پیام بدم؟',
    icon: Headphones,
    answer: 'از منوی «سامانه پشتیبانی و تیکت»، دکمه پیام جدید رو بزن. موضوعت (مثلاً مرخصی یا سوال درباره تمرین) رو بنویس و ارسال کن. به محض اینکه جواب بدن، برات اعلان میاد.',
    steps: [
      'برو به بخش «سامانه پشتیبانی».',
      'دکمه «ثبت پیام جدید» رو بزن.',
      'متنت رو بنویس و ارسال کن.',
    ],
    tip: 'هر وقت پیام جدیدی از طرف باشگاه بیاد، زنگوله بالای صفحه قرمز میشه.',
  },
  {
    id: 'q6',
    question: 'اگه رمزم یادم رفت چی کار کنم؟',
    icon: Key,
    answer: 'رمز اولیه همه اعضا برابر با «کد ملی ۱۰ رقمی» هست. اگه رمزت رو عوض کردی و یادت رفته، فقط کافیه به پذیرش یا مدیر باشگاه بگی تا با یک کلیک رمزت رو دوباره به کد ملیت برگردونه.',
    steps: [
      'کد ملیت رو به عنوان نام کاربری و رمز وارد کن.',
      'در صورت بروز مشکل، با پذیرش باشگاه تماس بگیر تا رمزت ریست بشه.',
    ],
    tip: 'پیشنهاد می‌کنیم بعد از اولین ورود، رمز عبورت رو شخصی‌سازی کنی.',
  },
];

// ----------------------------------------------------
// 3. ROLES GUIDE
// ----------------------------------------------------
const ROLE_GUIDES: RoleGuideItem[] = [
  {
    roleKey: 'athlete',
    roleName: 'ورزشکار / شاگرد باشگاه',
    icon: UserCheck,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'دسترسی آسان و خودکار برای انتخاب کلاس‌ها، پرداخت شهریه، کارنامه حضور و پیام‌رسانی.',
    allowedMenus: ['پورتال ورزشکار', 'استعلام بیمه ورزشی', 'پشتیبانی و تیکت', 'فرم پیش‌ثبت‌نام'],
    mainTasks: [
      'مشاهده برنامه کلاسی و ثبت‌نام در سانس‌ها',
      'پرداخت آنلاین شهریه با کارت بانکی یا ارسال فیش',
      'دیدن تعداد جلسات باقیمانده از اشتراک ورزشی',
      'پیگیری وضعیت بیمه ورزشی فدراسیون',
      'گفتگوی مستقیم با مربی و مدیریت',
    ],
    proTips: [
      'رمز عبور اولیه شما همان کد ملی ۱۰ رقمی شماست.',
      'با فعال‌سازی پیامک‌ها، یادآوری جلسات و انقضای اشتراک برایتان پیامک می‌شود.',
    ],
  },
  {
    roleKey: 'parent',
    roleName: 'ولی / سرپرست ورزشکار',
    icon: Users,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'کنترل کامل پرونده، رفت‌وآمد و پرداخت‌های همه فرزندان تنها از طریق یک حساب کاربری.',
    allowedMenus: ['پورتال ولی و فرزندان', 'استعلام بیمه', 'پشتیبانی و تیکت'],
    mainTasks: [
      'جابجایی آسان بین پرونده‌های فرزندان از منوی بالای صفحه',
      'پرداخت آنلاین شهریه کلاس‌ها و اقساط فرزندان',
      'نظارت دقیق بر حضور و غیاب و نظم تمرینی فرزند',
      'ارسال درخواست مرخصی یا سوالات به مربی',
    ],
    proTips: [
      'اگر چند فرزند در باشگاه دارید، نیازی به چند نام کاربری جداگانه نیست؛ همه زیر نظر حساب شما هستند.',
    ],
  },
  {
    roleKey: 'coach',
    roleName: 'مربی ورزشی',
    icon: GraduationCap,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'میز کار اختصاصی مربی جهت نظارت بر شاگردان، ثبت حضور و غیاب و ارزیابی تمرینات.',
    allowedMenus: ['پورتال مربی', 'حضور و غیاب هوشمند', 'استعلام بیمه', 'پشتیبانی و تیکت'],
    mainTasks: [
      'مشاهده لیست شاگردان ثبت‌نام شده در هر سانس',
      'ثبت روزانه حضور، غیاب و غیبت‌های موجه شاگردان',
      'بررسی کارت بیمه ورزشی شاگردان سر کلاس',
      'ثبت توصیه‌های تمرینی و نکات فنی برای هر ورزشکار',
    ],
    proTips: [
      'ثبت دقیق حضور و غیاب باعث می‌شود سهمیه جلسات شاگردان به درستی مدیریت شود.',
    ],
  },
  {
    roleKey: 'accountant',
    roleName: 'حسابدار / مدیر مالی',
    icon: Wallet,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'مدیریت تراز معین، پیگیری بدهکاران، تایید فیش‌ها، بوفه و هزینه‌های جاری باشگاه.',
    allowedMenus: ['حسابداری و کاردکس', 'داشبورد مالی', 'فروشگاه و بوفه', 'پکیج‌های بیمه'],
    mainTasks: [
      'بررسی و تایید واریزی‌های فیش بانکی ارسالی اعضا',
      'ثبت تراکنش‌های دستی، پوز و تسویه بدهی‌ها',
      'صدور فاکتور بوفه و ثبت هزینه‌های روزمره باشگاه',
      'گزارش‌گیری سود و زیان و تراز مالی',
    ],
    proTips: [
      'از بخش کاردکس مالی، با جستجوی نام هر شخص می‌توانید ریز تمام فاکتورها و دریافتی‌ها را ببینید.',
    ],
  },
  {
    roleKey: 'admin',
    roleName: 'مدیر ارشد / مدیر باشگاه',
    icon: ShieldAlert,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'دسترسی نامحدود به تمامی بخش‌ها، آمار، کاربران، سانس‌ها، مالی و تنظیمات پایه.',
    allowedMenus: ['تمام ۱۷ منوی نرم‌افزار بدون محدودیت'],
    mainTasks: [
      'تعریف سانس‌ها، مربیان و نرخ شهریه‌ها',
      'تایید پیش‌ثبت‌نام اعضای جدید و ساخت حساب',
      'مدیریت دسترسی‌ها و ریست رمز عبور کاربران',
      'مشاهده آمارهای زنده درآمدی و اعضای فعال',
      'شخصی‌سازی ظاهر، تم و بنرهای باشگاه',
    ],
    proTips: [
      'با پرونده ۳۶۰ درجه می‌توانید کل سوابق یک فرد (مالی، حضور، سانس، بیمه) را یکجا ببینید.',
    ],
  },
  {
    roleKey: 'reception',
    roleName: 'پذیرش و منشی باشگاه',
    icon: Headphones,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'پاسخگویی به مراجعین حضوری، ثبت‌نام، تایید مدارک و حضور و غیاب ورودی.',
    allowedMenus: ['پیش‌ثبت‌نام‌ها', 'سانس‌ها', 'حضور و غیاب', 'پشتیبانی', 'بوفه'],
    mainTasks: [
      'ثبت‌نام متقاضیان جدید و تحویل کارت عضویت',
      'بررسی و تایید مدارک هویتی و کارت بیمه ورزشی',
      'پاسخگویی به پیام‌های تیکتینگ اعضا',
    ],
    proTips: [
      'پیام‌های با اولویت بالا در بخش تیکتینگ را سریع‌تر بررسی فرمایید.',
    ],
  },
];

export const PageHelpModal: React.FC<PageHelpModalProps> = ({
  isOpen,
  onClose,
  currentPageKey,
  currentUserRole = 'athlete',
}) => {
  // Normalize role
  const isAthleteOrParent = ['athlete', 'user', 'student', 'parent'].includes(currentUserRole.toLowerCase());
  const isCoach = currentUserRole.toLowerCase() === 'coach';

  // State
  const [activeTab, setActiveTab] = useState<'athlete-simple' | 'menus' | 'current-page' | 'roles'>(() => {
    if (isAthleteOrParent) return 'athlete-simple';
    return 'menus';
  });

  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(() => currentPageKey || 'user-portal');

  const [expandedAthleteFaq, setExpandedAthleteFaq] = useState<string | null>('q1');
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>(() => {
    if (currentUserRole.includes('admin')) return 'admin';
    if (currentUserRole.includes('coach')) return 'coach';
    if (currentUserRole.includes('parent')) return 'parent';
    if (currentUserRole.includes('accountant')) return 'accountant';
    return 'athlete';
  });

  // Whenever modal opens, sync active tab nicely
  useEffect(() => {
    if (isOpen) {
      if (isAthleteOrParent) {
        setActiveTab('athlete-simple');
      } else {
        setActiveTab('menus');
      }
      setExpandedMenuId(currentPageKey);
    }
  }, [isOpen, currentPageKey, currentUserRole]);

  if (!isOpen) return null;

  // Categories list
  const categories = ['all', ...Array.from(new Set(ALL_MENU_GUIDES.map((m) => m.category)))];

  // Filtered menus
  const filteredMenus = ALL_MENU_GUIDES.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const q = menuSearchQuery.trim().toLowerCase();
    if (!q) return matchesCat;
    const matchesQuery =
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.simpleSummary.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  // Current page guide
  const currentPageGuide =
    ALL_MENU_GUIDES.find(
      (m) =>
        m.id === currentPageKey ||
        (currentPageKey === 'phase2-finance' && m.id === 'phase2-finance') ||
        (currentPageKey === 'financial-acc' && m.id === 'phase2-finance') ||
        (currentPageKey === 'financial-dash' && m.id === 'financial-dashboard') ||
        (currentPageKey === 'shop' && m.id === 'shop-expenses') ||
        (currentPageKey === 'settings' && m.id === 'club-settings') ||
        (currentPageKey === 'analytics' && m.id === 'admin-analytics')
    ) || ALL_MENU_GUIDES[0];

  const selectedRoleGuide = ROLE_GUIDES.find((r) => r.roleKey === selectedRoleKey) || ROLE_GUIDES[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 rounded-2xl border border-teal-500/30 text-teal-300 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black leading-tight">مرکز راهنمای جامع و آسان سامانه موج</h2>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30 font-bold">
                  نسخه ۲.۵
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                راهنمای تفکیک‌شده بر اساس نقش، فهرست منو به منو و آموزش ساده ویژه ورزشکاران
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="بستن پنجره راهنما"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TABS NAVIGATION */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2.5 flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
          
          {/* Athlete Simple Guide Tab */}
          <button
            onClick={() => setActiveTab('athlete-simple')}
            className={`px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x shrink-0 cursor-pointer ${
              activeTab === 'athlete-simple'
                ? 'bg-white text-teal-900 border-slate-200 shadow-2xs font-black ring-1 ring-teal-500/20'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <HeartHandshake className={`w-4 h-4 ${activeTab === 'athlete-simple' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span>راهنمای ساده ورزشکاران (پرسش و پاسخ)</span>
            <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded-md font-bold">ویژه</span>
          </button>

          {/* Menu-by-Menu Tab */}
          <button
            onClick={() => setActiveTab('menus')}
            className={`px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x shrink-0 cursor-pointer ${
              activeTab === 'menus'
                ? 'bg-white text-teal-900 border-slate-200 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'menus' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span>راهنمای منو به منو ({ALL_MENU_GUIDES.length} بخش)</span>
          </button>

          {/* Current Page Tab */}
          <button
            onClick={() => setActiveTab('current-page')}
            className={`px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x shrink-0 cursor-pointer ${
              activeTab === 'current-page'
                ? 'bg-white text-teal-900 border-slate-200 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'current-page' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span>همین صفحه ({currentPageGuide.title})</span>
          </button>

          {/* Roles Guide Tab */}
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x shrink-0 cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white text-teal-900 border-slate-200 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'roles' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span>وظایف و دسترسی نقش‌ها</span>
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

          {/* ==================================================== */}
          {/* TAB 1: ATHLETE SIMPLE FAQ (زبان بسیار ساده و روان) */}
          {/* ==================================================== */}
          {activeTab === 'athlete-simple' && (
            <div className="space-y-5">
              {/* Banner */}
              <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border border-teal-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-600 text-white rounded-2xl shrink-0 shadow-md">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-teal-950">راهنمای صمیمی و گام‌به‌گام ورزشکاران و خانواده‌ها</h3>
                    <p className="text-xs text-teal-800 font-medium mt-0.5">
                      پاسخ‌های شفاف و بسیار ساده به مهم‌ترین سوالات و کارهایی که در سامانه انجام می‌دهید
                    </p>
                  </div>
                </div>
                <div className="bg-white/80 border border-teal-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-teal-900 shrink-0">
                  ⚡ زبان ساده و خودمانی
                </div>
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-3">
                {ATHLETE_SIMPLE_GUIDES.map((item) => {
                  const Icon = item.icon;
                  const isExpanded = expandedAthleteFaq === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isExpanded
                          ? 'bg-white border-teal-300 shadow-md ring-2 ring-teal-500/10'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedAthleteFaq(isExpanded ? null : item.id)}
                        className="w-full text-right p-4 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${isExpanded ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={`text-xs sm:text-sm font-black ${isExpanded ? 'text-teal-950' : 'text-slate-800'}`}>
                            {item.question}
                          </span>
                        </div>
                        <div className="p-1 rounded-lg text-slate-400 bg-slate-50">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-5 pt-1 space-y-4 border-t border-slate-100 animate-fadeIn">
                          <p className="text-xs font-bold text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                            {item.answer}
                          </p>

                          {/* Quick Steps */}
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-black text-slate-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                              <span>مراحل انجام کار:</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {item.steps.map((st, sIdx) => (
                                <div key={sIdx} className="bg-teal-50/60 border border-teal-100 p-2.5 rounded-xl flex items-start gap-2">
                                  <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                                    {sIdx + 1}
                                  </span>
                                  <span className="text-[11px] font-bold text-teal-950 leading-snug">{st}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Pro Tip */}
                          {item.tip && (
                            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 flex items-start gap-2 text-xs font-bold text-amber-900">
                              <span className="shrink-0 text-amber-600">💡 نکته مهم:</span>
                              <span>{item.tip}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: MENU-BY-MENU COMPREHENSIVE DIRECTORY */}
          {/* ==================================================== */}
          {activeTab === 'menus' && (
            <div className="space-y-5">
              {/* Filter and Search Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      placeholder="جستجوی عنوان منو، کارایی یا کلمات کلیدی (مثلاً شهریه، سانس، بیمه...)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                    {menuSearchQuery && (
                      <button
                        onClick={() => setMenuSearchQuery('')}
                        className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'all' ? 'همه بخش‌ها' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Cards */}
              <div className="space-y-3">
                {filteredMenus.map((menu) => {
                  const Icon = menu.icon;
                  const isExpanded = expandedMenuId === menu.id;
                  return (
                    <div
                      key={menu.id}
                      className={`bg-white border rounded-2xl transition-all overflow-hidden ${
                        isExpanded ? 'border-teal-400 shadow-md ring-2 ring-teal-500/10' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedMenuId(isExpanded ? null : menu.id)}
                        className="w-full text-right p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 ${isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900">{menu.title}</h4>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                                {menu.categoryIcon} {menu.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{menu.summary}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <div className="hidden sm:flex items-center gap-1">
                            {menu.roles.map((r, rIdx) => (
                              <span key={rIdx} className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded font-bold">
                                {r}
                              </span>
                            ))}
                          </div>
                          <div className="p-1 rounded-lg text-slate-400 bg-slate-100">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {/* Accordion Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/40 animate-fadeIn">
                          {/* Simple Summary */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
                            <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block">
                              📌 خلاصه و کاربرد این منو:
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-relaxed">
                              {menu.simpleSummary}
                            </p>
                          </div>

                          {/* Step by Step Guide */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-teal-600" />
                              <span>راهنمای کار با این بخش (گام به گام):</span>
                            </h5>
                            <div className="space-y-1.5">
                              {menu.steps.map((st, stIdx) => (
                                <div key={stIdx} className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                    {stIdx + 1}
                                  </span>
                                  <p className="text-xs font-medium text-slate-800 leading-relaxed">{st}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tips */}
                          {menu.tips && menu.tips.length > 0 && (
                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-1">
                              <span className="text-[11px] font-black text-amber-900 block">💡 نکات مهم و کلیدی:</span>
                              {menu.tips.map((tp, tpIdx) => (
                                <div key={tpIdx} className="flex items-start gap-2 text-xs font-bold text-amber-800">
                                  <ChevronLeft className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>{tp}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: CURRENT PAGE DETAILS */}
          {/* ==================================================== */}
          {activeTab === 'current-page' && (
            <div className="space-y-6">
              {/* Banner */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-teal-950 font-black text-base">
                  <CheckCircle2 className="w-6 h-6 text-teal-600" />
                  <h3>راهنمای بخش جاری: {currentPageGuide.title}</h3>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">
                  {currentPageGuide.summary}
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">نقش‌های مجاز برای این صفحه:</span>
                  {currentPageGuide.roles.map((r, idx) => (
                    <span key={idx} className="text-[10px] bg-teal-100 text-teal-800 font-black px-2 py-0.5 rounded-md">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Simplified Explanation */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-black text-slate-900">به زبان ساده:</h4>
                <p className="text-xs font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">
                  {currentPageGuide.simpleSummary}
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  چگونه از این بخش استفاده کنیم؟ (گام به گام)
                </h4>
                <div className="space-y-2">
                  {currentPageGuide.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs"
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-relaxed pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {currentPageGuide.tips && currentPageGuide.tips.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider block">
                    💡 نکات طلایی و پرکاربرد این صفحه
                  </h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    {currentPageGuide.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-bold text-amber-900">
                        <ChevronLeft className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: ROLES GUIDE & DUTIES */}
          {/* ==================================================== */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              {/* Role Selection Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ROLE_GUIDES.map((r) => {
                  const IconComp = r.icon;
                  const isSelected = selectedRoleKey === r.roleKey;
                  return (
                    <button
                      key={r.roleKey}
                      onClick={() => setSelectedRoleKey(r.roleKey)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isSelected ? 'bg-teal-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black truncate leading-tight">{r.roleName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Role Details */}
              {selectedRoleGuide && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xs">
                        {React.createElement(selectedRoleGuide.icon, { className: 'w-6 h-6 text-teal-400' })}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">{selectedRoleGuide.roleName}</h3>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{selectedRoleGuide.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border shrink-0 ${selectedRoleGuide.badgeColor}`}>
                      راهنمای نقش
                    </span>
                  </div>

                  {/* Main Tasks */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-900 block">
                      📌 وظایف و امکانات مجاز برای این نقش:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedRoleGuide.mainTasks.map((task, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-bold text-slate-800">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allowed Menus */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-700 block">منوهای در دسترس:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRoleGuide.allowedMenus.map((m, mIdx) => (
                        <span key={mIdx} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-bold border border-slate-200">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pro Tips */}
                  {selectedRoleGuide.proTips.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/80">
                      <h4 className="text-xs font-black text-amber-900 block">
                        💡 نکات مهم برای این نقش:
                      </h4>
                      {selectedRoleGuide.proTips.map((tip, idx) => (
                        <p key={idx} className="text-xs font-bold text-slate-700 leading-relaxed bg-amber-50 border border-amber-200 p-3 rounded-xl">
                          {tip}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER BAR */}
        <div className="bg-slate-100 border-t border-slate-200 p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>پشتیبانی آنلاین همیشه در بخش «سامانه تیکتینگ» آماده پاسخگویی به شماست.</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            متوجه شدم و بستن
          </button>
        </div>

      </div>
    </div>
  );
};
