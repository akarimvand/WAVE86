export type PreRegistrationStatus = 'pending' | 'approved' | 'rejected';

export type ThemePaletteKey =
  | 'wave' // تم اختصاصی موج (Sage & Coast - لوگو)
  | 'teal' // سبزآبی و فیروزه‌ای
  | 'emerald' // سبز زمردی
  | 'sky' // آبی آسمانی
  | 'blue' // آبی کاربنی و اقیانوسی
  | 'indigo' // نیلی و سورمه‌ای
  | 'violet' // بنفش ارغوانی
  | 'fuchsia' // سرخابی
  | 'rose' // قرمز یاقوتی و سرخ
  | 'amber' // طلایی و کهربایی
  | 'orange' // نارنجی و آجری
  | 'cyan' // فیروزه‌ای روشن
  | 'slate' // خاکستری زغالی
  | 'olive'; // سبز لیمویی و زیتونی

export interface ClubSettings {
  name: string; // نام باشگاه
  slogan: string; // شعار باشگاه
  logoIcon: string; // آیکون پیش‌فرض ('mountain' | 'trophy' | 'activity' | 'flame' | 'shield' | 'target') یا آدرس عکس
  logoUrl?: string; // آدرس یا تصویر لوگوی مستطیلی باشگاه (Base64 یا لینک)
  themePalette: ThemePaletteKey;
  updatedAt?: string;

  // SMS.ir Gateway Configuration
  smsApiKey?: string; // x-api-key از پنل sms.ir
  smsLineNumber?: string; // شماره خط فرستنده (۳۰۰۰...)
  smsSignature?: string; // امضای انتهای پیامک‌ها
  smsAutoSendOnRegister?: boolean; // ارسال پیامک خوش‌آمد به محض تایید ثبت‌نام
  smsAutoSendOnPayment?: boolean; // ارسال پیامک تایید پرداخت فیش/شهریه
  smsAutoSendOnInsurance?: boolean; // ارسال پیامک تایید یا انقضای بیمه
  smsAutoSendOnDebtReminder?: boolean; // ارسال پیامک خودکار یادآوری بدهی
  smsWelcomePatternId?: string; // شناسه پترن پیامک خوش‌آمدگویی
  smsPaymentPatternId?: string; // شناسه پترن تایید پرداخت
  smsDebtPatternId?: string; // شناسه پترن یادآوری بدهی

  // Bale Messenger Configuration
  baleBotToken?: string; // توکن ربات بله (از BotFather بله)
  baleChannelOrChatId?: string; // شناسه چت یا آیدی کانال بله (مثلاً @channel_id یا آیدی عددی)
  baleAutoSendOnRegister?: boolean; // ارسال پیام بله به محض ثبت‌نام
  baleAutoSendOnPayment?: boolean; // ارسال پیام بله به محض پرداخت
  baleAutoSendOnInsurance?: boolean; // ارسال پیام بله بابت بیمه
  baleAutoSendOnDebtReminder?: boolean; // ارسال پیام بله یادآوری بدهی
}

export interface PreRegistrationRequest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string; // Combined
  fatherName: string;
  shenasnamehNo: string; // شماره شناسنامه
  nationalId: string;
  birthDate: string; // Jalali
  gender: 'male' | 'female';
  isUnder18: boolean;
  phone: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelation?: string;
  emergencyContactPhone: string;
  
  // Physical & Medical
  bloodType: string;
  shoeSize: string;
  clothingSize: string;
  medicalConditions?: string; // حساسیت پزشکی و دارویی
  
  // Residence & Job
  address: string;
  educationOrJob?: string;
  
  // Referrer Info
  referrerName?: string;
  referrerPhone?: string;
  
  // Climbing & Insurance
  climbingExperienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  insuranceNumber?: string;

  // Parent Info for Under 18
  parentFullName?: string;
  parentNationalId?: string;
  parentPhone?: string;

  avatarUrl?: string; // آدرس یا تصویر بیس۶۴ پروفایل

  status: PreRegistrationStatus;
  rejectionReason?: string;
  assignedRoles?: UserRoleKey[];
  createdUserId?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export type UserRoleKey = 'super_admin' | 'admin' | 'secretary' | 'accountant' | 'coach' | 'athlete' | 'parent';

export interface Permission {
  key: string;
  title: string;
  module: string;
  description: string;
}

export interface Role {
  id: string;
  key: UserRoleKey;
  title: string;
  description: string;
  permissions: string[]; // List of permission keys
  isSystem?: boolean; // Cannot delete system roles
}

export interface User {
  id: string;
  username: string;
  /** Optimistic-locking revision (server-managed, Phase 3). */
  version?: number;
  /** Set by server for bootstrap accounts; cleared after first password change. */
  mustChangePassword?: boolean;
  firstName?: string;
  lastName?: string;
  fullName: string;
  fatherName?: string;
  shenasnamehNo?: string;
  nationalId: string;
  password?: string;
  birthDate?: string; // Jalali date "1380/05/12"
  gender?: 'male' | 'female';
  phone: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  shoeSize?: string;
  clothingSize?: string;
  address?: string;
  medicalConditions?: string;
  referrerName?: string;
  referrerPhone?: string;
  educationOrJob?: string;
  climbingExperienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  roles: UserRoleKey[];
  activeRole: UserRoleKey;
  isActive: boolean;
  insuranceNumber?: string;
  insuranceExpiryDate?: string; // Jalali date
  isInsuranceValid?: boolean;
  avatarUrl?: string; // تصویر یا لینک عکس پروفایل
  baleChatId?: string; // شناسه چت یا آیدی بله کاربر
  allowCreditPurchase?: boolean; // اجازه خرید نسیه/اعتباری (توسط والد یا سیستم)
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ParentAthleteLink {
  id: string;
  parentId: string;
  athleteId: string;
  relationType: 'father' | 'mother' | 'guardian';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details: string;
  timestamp: string;
}

export const SYSTEM_PERMISSIONS: Permission[] = [
  // User Management
  { key: 'users:read', title: 'مشاهده لیست کاربران', module: 'مدیریت کاربران', description: 'دسترسی به مشاهده لیست همه اعضا و اطلاعات' },
  { key: 'users:write', title: 'ایجاد و ویرایش کاربران', module: 'مدیریت کاربران', description: 'دسترسی به افزودن، ویرایش و تغییر نقش اعضا' },
  { key: 'users:delete', title: 'حذف کاربران', module: 'مدیریت کاربران', description: 'امکان حذف یا غیرفعال‌سازی حساب اعضا' },
  
  // Pre-registration
  { key: 'preregistration:manage', title: 'بررسی پیش‌ثبت‌نام‌ها', module: 'پیش‌ثبت‌نام', description: 'تأیید یا رد درخواست‌های پیش‌ثبت‌نام عمومی' },

  // Insurance
  { key: 'insurance:manage', title: 'مدیریت بیمه ورزشی', module: 'بیمه‌نامه', description: 'تأیید و ثبت تاریخ اعتبار کارت بیمه ورزشی اعضا' },

  // Packages & Schedule
  { key: 'packages:read', title: 'مشاهده دوره‌ها', module: 'دوره‌های ورزشی', description: 'مشاهده لیست برنامه‌ها و پکیج‌های تمرینی' },
  { key: 'packages:write', title: 'تعریف و ویرایش دوره', module: 'دوره‌های ورزشی', description: 'امکان ایجاد دوره، تعیین قیمت و زمان‌بندی' },

  // Finance
  { key: 'finance:read', title: 'مشاهده صورت‌حساب‌ها', module: 'حسابداری و مالی', description: 'دیدن بدهی‌ها و سوابق پرداخت‌ها' },
  { key: 'finance:write', title: 'ثبت دریافت/پرداخت', module: 'حسابداری و مالی', description: 'ثبت شهریه و تراکنش‌های مالی' },
  { key: 'finance:reports', title: 'گزارش سود و زیان', module: 'حسابداری و مالی', description: 'مشاهده گزارش کامل درآمدها و هزینه‌های باشگاه' },

  // Attendance
  { key: 'attendance:record', title: 'ثبت حضور و غیاب', module: 'حضور و غیاب', description: 'امکان علامت‌زدن حضور یا غیبت اعضا در جلسات' },
  { key: 'attendance:view_all', title: 'مشاهده گزارش حضور و غیاب', module: 'حضور و غیاب', description: 'گزارش کامل جلسات برگزارشده' },

  // Support & Announcements
  { key: 'tickets:manage', title: 'پاسخ‌گویی به تیکت‌ها', module: 'پشتیبانی', description: 'بررسی و پاسخ به تیکت‌های اعضا' },
  { key: 'announcements:manage', title: 'مدیریت اعلانات و اسلایدر', module: 'اطلاع‌رسانی', description: 'ارسال پیام گروهی و تنظیم اسلایدر ورودی' },
];

export const INITIAL_ROLES: Role[] = [
  {
    id: 'role-admin',
    key: 'admin',
    title: 'مدیر کل (Admin)',
    description: 'دسترسی نامحدود به تمامی بخش‌های سیستم و پیکربندی',
    permissions: SYSTEM_PERMISSIONS.map((p) => p.key),
    isSystem: true,
  },
  {
    id: 'role-secretary',
    key: 'secretary',
    title: 'منشی باشگاه',
    description: 'مدیریت ثبت‌نام، بیمه، حضور غیاب و پاسخ به تیکت‌ها',
    permissions: [
      'users:read',
      'users:write',
      'preregistration:manage',
      'insurance:manage',
      'packages:read',
      'attendance:record',
      'attendance:view_all',
      'tickets:manage',
    ],
    isSystem: true,
  },
  {
    id: 'role-accountant',
    key: 'accountant',
    title: 'حسابدار',
    description: 'مدیریت شهریه‌ها، درآمدها، هزینه‌های جاری و گزارشات مالی',
    permissions: [
      'users:read',
      'finance:read',
      'finance:write',
      'finance:reports',
    ],
    isSystem: true,
  },
  {
    id: 'role-coach',
    key: 'coach',
    title: 'مربی',
    description: 'مشاهده دوره‌های تحت نظر، ثبت حضور غیاب و ارتباط با اعضا',
    permissions: [
      'packages:read',
      'attendance:record',
      'attendance:view_all',
    ],
    isSystem: true,
  },
  {
    id: 'role-athlete',
    key: 'athlete',
    title: 'ورزشکار',
    description: 'مشاهده برنامه‌ها، درخواست ثبت‌نام دوره، کارت بیمه و سوابق مالی',
    permissions: ['packages:read', 'finance:read'],
    isSystem: true,
  },
  {
    id: 'role-parent',
    key: 'parent',
    title: 'والدین',
    description: 'مشاهده یکپارچه سوابق مالی، حضورغیاب و دوره تمامی فرزندان',
    permissions: ['packages:read', 'finance:read'],
    isSystem: true,
  },
];

// Phase 2 Interfaces
export interface TrainingSession {
  id: string;
  title: string;
  sportType: 'سنگ‌نوردی عمومی' | 'بولدرینگ تخصصی' | 'دیواره و سرطناب' | 'سنگ‌نوردی کودکان' | 'آمادگی جسمانی';
  coachId: string;
  coachName: string;
  daysOfWeek: ('شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنج‌شنبه' | 'جمعه')[];
  startTime: string; // e.g., "16:00"
  endTime: string; // e.g., "18:00"
  capacity: number;
  monthlyFee: number; // Toman
  isActive: boolean;
  description?: string;
  startDate?: string; // Jalali
  endDate?: string; // Jalali
  registrationDeadline?: string; // Jalali
  level?: string;
  locationRoom?: string;
  createdAt: string;
  sessionsLimit?: number; // Optional sessions limit, defaults to 12
}

export interface SessionEnrollment {
  id: string;
  sessionId: string;
  userId: string;
  athleteName: string;
  athletePhone: string;
  athleteNationalId: string;
  status: 'active' | 'expired' | 'canceled';
  paymentStatus: 'paid' | 'pending' | 'partially_paid';
  trackingNumber?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  paymentMethod?: 'pos' | 'card_to_card' | 'cash' | 'online';
  enrolledAt: string; // Jalali
  expireDate: string; // Jalali
  startDate?: string; // Jalali custom start date e.g. "1403/05/01"
  endDate?: string;   // Jalali custom end date e.g. "1403/06/01"
  totalSessionsAllowed?: number; // Defaults to 12
  usedSessionsCount?: number;    // Defaults to 0
  priceAtEnrollment?: number;    // Toman - Price locked at enrollment time
}

export interface FinancialTransaction {
  id: string;
  userId: string;
  userName: string;
  userNationalId: string;
  amount: number; // Toman
  type: 'tuition' | 'single_session' | 'insurance' | 'equipment' | 'other' | 'charge' | 'penalty' | 'wallet_deposit';
  method: 'pos' | 'card_to_card' | 'cash' | 'online' | 'wallet';
  trackingNumber?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string; // Jalali
  createdBy: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  date: string; // Jalali date e.g., "1403/05/03"
  userId: string;
  userName: string;
  status: 'present' | 'absent' | 'excused' | 'club_closed';
  reason?: string; // Reason for excused absence or club closed
  recordedBy: string;
  recordedAt: string;
  checkInTime?: string;  // e.g., "17:15"
  checkOutTime?: string; // e.g., "19:00"
}

export interface DebtorRecord {
  id: string;
  userId?: string;
  fullName: string;
  nationalId: string;
  phone: string;
  category: 'tuition' | 'insurance' | 'equipment' | 'pending_receipt' | 'other';
  categoryTitle: string;
  amount: number; // Toman
  dueDate: string; // Jalali
  status: 'overdue' | 'due_soon' | 'pending_approval';
  notes?: string;
}

export interface CreditorRecord {
  id: string;
  creditorName: string;
  category: 'coach_salary' | 'rent' | 'equipment_vendor' | 'member_deposit' | 'maintenance';
  categoryTitle: string;
  contactPhone?: string;
  ibanNumber?: string;
  amount: number; // Toman
  dueDate: string; // Jalali
  status: 'unpaid' | 'partially_paid' | 'settled';
  notes?: string;
}

// Insurance Upload Request Interface
export interface InsuranceRequest {
  id: string;
  userId: string;
  userName: string;
  userNationalId: string;
  insuranceNumber: string;
  startDate: string; // Jalali
  expiryDate: string; // Jalali
  documentUrl?: string; // Image or PDF URL base64
  fileName?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string; // Jalali
  reviewedAt?: string;
  reviewedBy?: string;
}

// Support Ticket System Interfaces
export type TicketDepartment = 'tuition' | 'registration' | 'insurance' | 'technical' | 'coaching' | 'general';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRoleKey;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string; // Jalali timestamp
}

export interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g. "TK-1403-104"
  userId: string;
  userName: string;
  userNationalId: string;
  userRole: UserRoleKey;
  userPhone: string;
  subject: string;
  department: TicketDepartment;
  priority: TicketPriority;
  status: TicketStatus;
  lastResponseAt: string; // Jalali timestamp
  hasUnreadAdminMessage?: boolean;
  hasUnreadUserMessage?: boolean;
  createdAt: string; // Jalali timestamp
  messages: TicketMessage[];
}

export interface ClubAnnouncement {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  discountTag?: string;
  startDate?: string; // Jalali e.g. "1403/05/01"
  endDate?: string; // Jalali e.g. "1403/05/15"
  isActive: boolean;
  targetAudience: 'all' | 'athletes' | 'coaches';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  targetAudience?: 'all' | 'athlete' | 'coach' | 'parent' | 'admin' | 'secretary' | 'accountant' | 'individual';
  title: string;
  message: string;
  category: 'general' | 'financial' | 'course' | 'insurance' | 'urgent';
  isRead: boolean;
  actionLink?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  code?: string;
  category: string;
  price: number; // قیمت فروش به تومان
  buyPrice?: number; // قیمت خرید برای محاسبه سود
  stock: number; // موجودی انبار
  minStock: number; // حداقل سطح موجودی جهت هشدار
  unit?: string; // واحد مثل عدد، بسته، کیلوگرم
  imageUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface ShopInvoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-1001"
  athleteId: string;
  athleteName: string;
  creatorId: string;
  creatorName: string;
  date: string; // Jalali date "1403/05/15"
  items: ShopInvoiceItem[];
  totalAmount: number;
  paymentMethod: 'cash' | 'credit' | 'pos' | 'card_to_card' | 'online' | 'wallet'; // cash/pos/online/wallet/card_to_card: پرداخت تسویه, credit: نسیه (منظور به حساب)
  paymentStatus: 'paid' | 'unpaid'; // paid: تسویه شده, unpaid: تسویه نشده (بدهکار)
  notes?: string;
  createdAt: string;
}

export interface SmsLogRecord {
  id: string;
  recipients: string[]; // شماره‌ها یا شناسه چت دریافت‌کنندگان
  recipientNames?: string[]; // نام افراد
  message: string;
  channel?: 'sms' | 'bale' | 'both'; // کانال ارسال (SMS.ir / بله / هر دو)
  type: 'single' | 'bulk' | 'verify_pattern' | 'auto_notification' | 'bale_channel';
  targetGroup?: string; // 'all_athletes' | 'debtors' | 'session' | 'custom' | ...
  status: 'sent' | 'failed' | 'pending';
  cost?: number; // هزینه یا تعرفه
  packId?: string; // شناسه بسته در sms.ir
  messageIds?: (number | string)[]; // شناسه‌های پیامک در سامانه
  sentBy: string; // نام ثبت‌کننده / مدیر / سیستم
  sentAt: string; // تاریخ و ساعت جلالی
  errorMessage?: string;
}



