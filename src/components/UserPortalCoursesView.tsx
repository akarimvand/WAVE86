import React, { useState, useEffect } from 'react';
import { WaveLogoSVG, WaveFullLogoSVG } from './WaveLogoSVG';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Users,
  CreditCard,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Star,
  Check,
  Building,
  TrendingUp,
  X,
  Lock,
  AlertTriangle,
  Bell,
  Edit3,
  Save,
  Camera,
  Upload,
  Trash2,
  FileText,
  Heart,
  Info,
  Eye,
  DollarSign,
  MessageSquare,
  Plus,
  RefreshCw,
  Phone,
  AlertCircle,
  MapPin,
  Activity,
  CheckSquare,
  Mountain,
  Trophy,
  Shield,
  Target,
  Search,
  ShoppingBag,
  Receipt,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { ShopInvoiceDetailModal } from './ShopInvoiceDetailModal';
import { DigitalMembershipCardModal } from './DigitalMembershipCardModal';
import {
  TrainingSession,
  User as UserType,
  ClubAnnouncement,
  AppNotification,
  SessionEnrollment,
  AttendanceRecord,
  SupportTicket,
  FinancialTransaction,
  ShopInvoice,
  DebtorRecord,
} from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { formatJalaliDate, getCurrentJalaliDate, isUserUnder18, addMonthsToJalali } from '../utils/jalaliDate';
import { JalaliDatePicker } from './JalaliDatePicker';
import { uploadFileToServer } from '../utils/fileUploader';

interface UserPortalCoursesViewProps {
  currentUser: UserType;
  onUserUpdated?: (updatedUser: UserType) => void;
  onNavigateGlobalTab?: (tab: any) => void;
}

export const UserPortalCoursesView: React.FC<UserPortalCoursesViewProps> = ({ currentUser, onUserUpdated, onNavigateGlobalTab }) => {
  // Parent Linked Children Check
  const linkedChildren = dbStore.getLinkedAthletesForParent(currentUser.id);
  const userRoles = currentUser?.roles || [];
  const isParent = userRoles.includes('parent') || currentUser?.activeRole === 'parent' || linkedChildren.length > 0;
  
  // Selected Profile state ('self' or child ID)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('self');

  // Fresh Data Refresh State
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefreshData = () => setRefreshKey((prev) => prev + 1);

  const handleUserPortalNotifClick = (notif: AppNotification) => {
    // 1. Mark as read
    dbStore.markNotificationAsRead(notif.id);
    handleRefreshData();

    // 2. Extract ticket ID if it is a ticket notification
    if (notif.actionLink === 'support-tickets' || notif.title.includes('تیکت') || notif.message.includes('تیکت')) {
      const match = notif.title.match(/TKT-\d+/i) || notif.message.match(/TKT-\d+/i);
      if (match) {
        const ticketNum = match[0].toUpperCase();
        const foundTicket = dbStore.getSupportTickets().find(t => t.ticketNumber === ticketNum);
        if (foundTicket) {
          sessionStorage.setItem('selectedTicketId', foundTicket.id);
        }
      }
    }

    // 3. Navigation routing
    if (notif.actionLink) {
      if (notif.actionLink === 'support-tickets') {
        if (onNavigateGlobalTab) {
          onNavigateGlobalTab('support-tickets');
        } else {
          setActivePortalTab('tickets');
        }
      } else if (notif.actionLink === 'sports-insurance') {
        if (onNavigateGlobalTab) {
          onNavigateGlobalTab('sports-insurance');
        } else {
          setActivePortalTab('profile');
        }
      } else if (notif.actionLink === 'phase2-sessions') {
        if (onNavigateGlobalTab && currentUser && ['super_admin', 'admin', 'secretary', 'coach'].includes(currentUser.activeRole)) {
          onNavigateGlobalTab('phase2-sessions');
        } else {
          setActivePortalTab('courses');
        }
      } else if (notif.actionLink === 'phase2-finance') {
        if (onNavigateGlobalTab && currentUser && ['super_admin', 'admin', 'secretary', 'accountant'].includes(currentUser.activeRole)) {
          onNavigateGlobalTab('phase2-finance');
        } else {
          setActivePortalTab('finance');
        }
      } else if (onNavigateGlobalTab) {
        onNavigateGlobalTab(notif.actionLink as any);
      }
    } else {
      // Fallback on Category
      if (notif.category === 'financial') {
        setActivePortalTab('finance');
      } else if (notif.category === 'course') {
        setActivePortalTab('courses');
      } else if (notif.category === 'insurance') {
        setActivePortalTab('profile');
      } else {
        setActivePortalTab('dashboard');
      }
    }
  };

  // Determine effective user being viewed
  const effectiveUser: UserType = React.useMemo(() => {
    if (selectedProfileId !== 'self') {
      const foundChild = linkedChildren.find((c) => c.id === selectedProfileId);
      if (foundChild) {
        const freshChild = dbStore.getUserById(foundChild.id);
        if (freshChild) return freshChild;
        return foundChild;
      }
    }
    const freshSelf = dbStore.getUserById(currentUser.id);
    if (freshSelf) return freshSelf;
    return currentUser;
  }, [selectedProfileId, currentUser, linkedChildren, refreshKey]);

  const isReadOnlyMode = selectedProfileId !== 'self';

  const getCleanId = (id: string) => {
    if (!id) return '';
    return id
      .replace('tx-shop-charge-', 'SC-')
      .replace('tx-shop-pay-', 'SP-')
      .replace('trx-enr-', 'RE-')
      .replace('trx-', 'TX-')
      .replace('debt-', 'DB-')
      .replace('enr-', 'EN-');
  };

  // Navigation Sub-Tab State
  type PortalTab = 'dashboard' | 'profile' | 'wallet' | 'finance' | 'courses' | 'shop' | 'attendance' | 'tickets' | 'parent_mode';
  const [activePortalTab, setActivePortalTab] = useState<PortalTab>('dashboard');

  // Fancy Custom Message Modal State (Replaces native browser alert)
  const [fancyModal, setFancyModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  // Courses Filtering & Detail Modal State
  const [courseStatusFilter, setCourseStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [courseTypeFilter, setCourseTypeFilter] = useState<string>('all');
  const [courseSearchTerm, setCourseSearchTerm] = useState<string>('');
  const [selectedDetailSession, setSelectedDetailSession] = useState<TrainingSession | null>(null);

  const isSessionExpired = (sess: TrainingSession): boolean => {
    if (!sess.isActive) return true;
    const currentJalaliStr = formatJalaliDate(getCurrentJalaliDate());
    if (sess.endDate && sess.endDate < currentJalaliStr) return true;
    return false;
  };

  const clubSettings = dbStore.getClubSettings();

  // Loaded DB State
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userTransactions, setUserTransactions] = useState(() => dbStore.getUserTransactions(effectiveUser.id));
  const [userDebts, setUserDebts] = useState(() => dbStore.getDebtors().filter((d) => 
    d.userId === effectiveUser.id || 
    (effectiveUser.nationalId && effectiveUser.nationalId !== '0000000000' && d.nationalId === effectiveUser.nationalId) ||
    (effectiveUser.phone && d.phone === effectiveUser.phone)
  ));
  const [enrollments, setEnrollments] = useState<SessionEnrollment[]>(() => dbStore.getUserEnrollments(effectiveUser.id));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => dbStore.getAttendanceRecordsForUser(effectiveUser.id));
  const [userTickets, setUserTickets] = useState<SupportTicket[]>(() => dbStore.getSupportTicketsByUser(effectiveUser.id));
  const [userShopInvoices, setUserShopInvoices] = useState<ShopInvoice[]>(() => dbStore.getShopInvoicesByAthlete(effectiveUser.id));

  useEffect(() => {
    const loadData = () => {
      setSessions(dbStore.getSessions());
      setAnnouncements(dbStore.getAnnouncementsForUser(effectiveUser.activeRole));
      setNotifications(dbStore.getNotificationsForUser(effectiveUser.id, effectiveUser.activeRole));
      setUserTransactions(dbStore.getUserTransactions(effectiveUser.id));
      setUserDebts(dbStore.getDebtors().filter((d) => 
        d.userId === effectiveUser.id || 
        (effectiveUser.nationalId && effectiveUser.nationalId !== '0000000000' && d.nationalId === effectiveUser.nationalId) ||
        (effectiveUser.phone && d.phone === effectiveUser.phone)
      ));
      setEnrollments(dbStore.getUserEnrollments(effectiveUser.id));
      setAttendanceRecords(dbStore.getAttendanceRecordsForUser(effectiveUser.id));
      setUserTickets(dbStore.getSupportTicketsByUser(effectiveUser.id));
      setUserShopInvoices(dbStore.getShopInvoicesByAthlete(effectiveUser.id));
    };

    loadData();

    const handleDbUpdate = () => {
      loadData();
    };

    window.addEventListener('dbStoreUpdated', handleDbUpdate);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleDbUpdate);
    };
  }, [effectiveUser.id, effectiveUser.activeRole, effectiveUser.nationalId, effectiveUser.phone, refreshKey]);

  // Announcements Slider State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  // Profile Edit Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMembershipCardOpen, setIsMembershipCardOpen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileFormData, setProfileFormData] = useState({
    phone: effectiveUser.phone || '',
    emergencyContactName: effectiveUser.emergencyContactName || '',
    emergencyContactRelation: effectiveUser.emergencyContactRelation || '',
    emergencyContactPhone: effectiveUser.emergencyContactPhone || '',
    bloodType: effectiveUser.bloodType || 'نامشخص',
    shoeSize: effectiveUser.shoeSize || '',
    clothingSize: effectiveUser.clothingSize || '',
    address: effectiveUser.address || '',
    medicalConditions: effectiveUser.medicalConditions || 'فاقد بیماری خاص',
    referrerName: effectiveUser.referrerName || '',
    referrerPhone: effectiveUser.referrerPhone || '',
    insuranceNumber: effectiveUser.insuranceNumber || '',
    insuranceExpiryDate: effectiveUser.insuranceExpiryDate || '',
    avatarUrl: effectiveUser.avatarUrl || '',
  });

  useEffect(() => {
    setProfileFormData({
      phone: effectiveUser.phone || '',
      emergencyContactName: effectiveUser.emergencyContactName || '',
      emergencyContactRelation: effectiveUser.emergencyContactRelation || '',
      emergencyContactPhone: effectiveUser.emergencyContactPhone || '',
      bloodType: effectiveUser.bloodType || 'نامشخص',
      shoeSize: effectiveUser.shoeSize || '',
      clothingSize: effectiveUser.clothingSize || '',
      address: effectiveUser.address || '',
      medicalConditions: effectiveUser.medicalConditions || 'فاقد بیماری خاص',
      referrerName: effectiveUser.referrerName || '',
      referrerPhone: effectiveUser.referrerPhone || '',
      insuranceNumber: effectiveUser.insuranceNumber || '',
      insuranceExpiryDate: effectiveUser.insuranceExpiryDate || '',
      avatarUrl: effectiveUser.avatarUrl || '',
    });
    setAvatarError(null);
  }, [effectiveUser]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setAvatarError(
        `خطا در آپلود: حجم تصویر انتخاب‌شده (${toPersianDigits(fileSizeMB)} مگابایت) بیشتر از سقف مجاز ۵ مگابایت است. لطفاً فایل کم‌حجم‌تری انتخاب کنید.`
      );
      e.target.value = '';
      return;
    }

    try {
      const res = await uploadFileToServer(file, {
        prefix: 'profile',
        customName: effectiveUser.nationalId || effectiveUser.id,
        subDir: 'profile_img',
      });
      if (res.success && res.url) {
        setProfileFormData((prev) => ({ ...prev, avatarUrl: res.url }));
        const updated = dbStore.updateUserProfile(effectiveUser.id, { avatarUrl: res.url }, currentUser.fullName);
        if (updated && updated.id === currentUser.id && onUserUpdated) {
          onUserUpdated(updated);
        }
        handleRefreshData();
      } else {
        setAvatarError(res.error || 'خطا در بارگذاری تصویر کاربر روی سرور');
      }
    } catch {
      setAvatarError('خطا در ارتباط با سرور جهت بارگذاری تصویر');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarError(null);
    setProfileFormData((prev) => ({ ...prev, avatarUrl: '' }));
    const updated = dbStore.updateUserProfile(effectiveUser.id, { avatarUrl: '' }, currentUser.fullName);
    if (updated && updated.id === currentUser.id && onUserUpdated) {
      onUserUpdated(updated);
    }
    handleRefreshData();
  };

  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyMode) return;

    const updated = dbStore.updateUserProfile(effectiveUser.id, profileFormData, currentUser.fullName);
    if (updated && updated.id === currentUser.id && onUserUpdated) {
      onUserUpdated(updated);
    }
    setIsEditingProfile(false);
    setProfileSaveSuccess(true);
    handleRefreshData();
    setTimeout(() => setProfileSaveSuccess(false), 4000);
  };

  // Conflict Detection Modal State
  const [conflictModalData, setConflictModalData] = useState<{
    isOpen: boolean;
    sessionTitle: string;
    conflictingTitle: string;
    conflictingDays: string[];
    conflictingTime: string;
  }>({
    isOpen: false,
    sessionTitle: '',
    conflictingTitle: '',
    conflictingDays: [],
    conflictingTime: '',
  });

  // Registration Order Modal State
  const [selectedSessionForOrder, setSelectedSessionForOrder] = useState<TrainingSession | null>(null);
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'online' | 'card_to_card' | 'pos'>('card_to_card');
  const [orderTrackingNo, setOrderTrackingNo] = useState('');
  const [orderReceiptUrl, setOrderReceiptUrl] = useState('');
  const [orderReceiptFileName, setOrderReceiptFileName] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Attach / Upload Receipt Modal State for Existing Transactions
  const [attachingTrx, setAttachingTrx] = useState<FinancialTransaction | null>(null);
  const [uploadReceiptUrl, setUploadReceiptUrl] = useState('');
  const [uploadReceiptFileName, setUploadReceiptFileName] = useState('');
  const [uploadTrackingNo, setUploadTrackingNo] = useState('');

  // Custom/Partial/Installment Payment States
  const [isCustomPaying, setIsCustomPaying] = useState(false);
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [customPayMethod, setCustomPayMethod] = useState<'online' | 'card_to_card' | 'pos'>('card_to_card');
  const [customPayTrackingNo, setCustomPayTrackingNo] = useState('');
  const [customPayReceiptUrl, setCustomPayReceiptUrl] = useState('');
  const [customPayReceiptFileName, setCustomPayReceiptFileName] = useState('');
  const [customPayDescription, setCustomPayDescription] = useState('پرداخت قسطی / علی‌الحساب شهریه');
  const [financeSubTab, setFinanceSubTab] = useState<'ledger' | 'transactions'>('ledger');

  // Viewing Receipt Document Modal State
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; fileName?: string; title: string } | null>(null);
  const [selectedShopInvoice, setSelectedShopInvoice] = useState<ShopInvoice | null>(null);

  const handleReceiptFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: 'order' | 'attach' | 'custom' | boolean = 'attach') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('حجم تصویر فیش واریزی بیش از ۱۰ مگابایت است. لطفاً فایل کم‌حجم‌تری انتخاب نمایید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        let finalUrl = dataUrl;
        try {
          const res = await fetch('/api/upload/general', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: dataUrl,
              folderType: 'receipt',
              fileName: file.name,
              customName: effectiveUser.nationalId || effectiveUser.id,
            }),
          });
          const json = await res.json();
          if (json.success && json.url) {
            finalUrl = json.url;
          }
        } catch {}

        if (mode === 'order' || mode === true) {
          setOrderReceiptUrl(finalUrl);
          setOrderReceiptFileName(file.name);
        } else if (mode === 'custom') {
          setCustomPayReceiptUrl(finalUrl);
          setCustomPayReceiptFileName(file.name);
        } else {
          setUploadReceiptUrl(finalUrl);
          setUploadReceiptFileName(file.name);
        }
      }
    };
    reader.readAsDataURL(file);
  };



  const handleSaveCustomPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(customPayAmount.replace(/,/g, ''));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('لطفاً یک مبلغ معتبر بزرگتر از صفر وارد نمایید.');
      return;
    }

    if (!customPayReceiptUrl && !customPayTrackingNo) {
      alert('لطفاً تصویر فیش واریزی را پیوست نموده یا کد پیگیری را وارد نمایید.');
      return;
    }

    dbStore.addTransaction({
      userId: effectiveUser.id,
      userName: effectiveUser.fullName,
      userNationalId: effectiveUser.nationalId,
      amount: amountNum,
      type: 'tuition',
      method: customPayMethod,
      trackingNumber: customPayTrackingNo,
      receiptUrl: customPayReceiptUrl,
      receiptFileName: customPayReceiptFileName,
      description: customPayDescription || 'پرداخت علی‌الحساب / اقساطی شهریه',
      status: 'pending',
      createdBy: currentUser.fullName,
    }, currentUser.fullName);

    alert('سند پرداخت با موفقیت ثبت شد و پس از تأیید مدیریت به عنوان بستانکاری در تراز معین حساب شما منظور خواهد شد.');
    setIsCustomPaying(false);
    setCustomPayAmount('');
    setCustomPayTrackingNo('');
    setCustomPayReceiptUrl('');
    setCustomPayReceiptFileName('');
    setCustomPayDescription('پرداخت قسطی / علی‌الحساب شهریه');
    handleRefreshData();
  };

  const buildUserLedger = () => {
    const ledger: any[] = [];

    // 1. Enrollments (Dues) - only active and expired ones (non-canceled)
    const userEnrollments = enrollments.filter((e) => e.status !== 'canceled');
    userEnrollments.forEach((e) => {
      const sess = sessions.find((s) => s.id === e.sessionId);
      const fee = (e.priceAtEnrollment !== undefined && e.priceAtEnrollment > 0) ? e.priceAtEnrollment : (sess ? sess.monthlyFee : (e.priceAtEnrollment || 0));
      ledger.push({
        id: `enr-${e.id}`,
        date: e.enrolledAt || e.startDate || '1405/01/01',
        description: `ثبت‌نام در دوره: ${sess?.title || 'برنامه ورزشی'}`,
        debit: fee,
        credit: 0,
        status: 'completed', // Charges are official
        type: 'tuition_charge',
        ref: e.id,
      });
    });

    // 2. Debtor Records (Manual Dues)
    const activeEnrollments = enrollments.filter((e) => e.status === 'active');
    userDebts.forEach((d) => {
      if (d.category === 'tuition') {
        // Skip if there is already a tuition charge/enrollment added in the ledger for this session
        const hasEnrollment = userEnrollments.some(
          (e) => d.categoryTitle?.includes(sessions.find(s => s.id === e.sessionId)?.title || '---') ||
                 (d.notes || '').includes(e.id)
        );
        if (hasEnrollment) {
          return;
        }
      }
      
      if (d.category === 'equipment') {
        // Skip double counted shop invoices in ledger (already shown under extra_charge in transactions)
        const hasShopCharge = userTransactions.some(
          (t) =>
            t.type === 'charge' &&
            t.amount === d.amount &&
            (
              (t.description && d.notes && (t.description.includes(d.notes) || d.notes.includes(t.description))) ||
              (t.description && t.description.includes('فاکتور') && d.categoryTitle && d.categoryTitle.includes('فاکتور')) ||
              (t.description && t.description.replace(/\D/g, '') === (d.notes || '').replace(/\D/g, '')) ||
              (d.categoryTitle || '').includes('فاکتور') ||
              (d.notes || '').includes('فاکتور')
            )
        );
        if (hasShopCharge) {
          return;
        }
      }
      
      ledger.push({
        id: `debt-${d.id}`,
        date: d.dueDate || '1405/01/01',
        description: `ثبت بدهی دستی: ${d.categoryTitle} ${d.notes ? `(${d.notes})` : ''}`,
        debit: d.amount || 0,
        credit: 0,
        status: 'completed',
        type: 'manual_charge',
        ref: d.id,
      });
    });

    // 3. Transactions (Completed and Pending/Rejected)
    userTransactions.forEach((t) => {
      if (t.type === 'charge' || t.type === 'penalty') {
        // Manual debit additions
        ledger.push({
          id: `trx-${t.id}`,
          date: t.createdAt,
          description: t.description?.includes('فاکتور') || t.description?.includes('INV-') ? t.description : `${t.type === 'penalty' ? 'جریمه دیرکرد/انضباطی' : 'شارژ مابه‌التفاوت حساب'}: ${t.description}`,
          debit: t.amount || 0,
          credit: 0,
          status: t.status,
          type: 'extra_charge',
          method: t.method,
          trackingNumber: t.trackingNumber,
          receiptUrl: t.receiptUrl,
          receiptFileName: t.receiptFileName,
          ref: t.id,
        });
      } else {
        // Payments
        ledger.push({
          id: `trx-${t.id}`,
          date: t.createdAt,
          description: (() => {
            const d = (t.description || '').trim();
            if (!d) return 'پرداخت بابت شهریه/خدمات';
            if (
              d.startsWith('بابت') ||
              d.startsWith('پرداخت') ||
              d.startsWith('تسویه') ||
              d.startsWith('فاکتور') ||
              d.startsWith('شارژ') ||
              d.startsWith('خرید') ||
              d.startsWith('ثبت‌نام') ||
              d.startsWith('شهریه')
            ) {
              return d;
            }
            return `پرداخت وجه بابت: ${d}`;
          })(),
          debit: 0,
          credit: t.amount || 0,
          status: t.status,
          type: 'payment',
          method: t.method,
          trackingNumber: t.trackingNumber,
          receiptUrl: t.receiptUrl,
          receiptFileName: t.receiptFileName,
          ref: t.id,
        });
      }
    });

    // Sort chronologically by date string, and if dates are equal, by creation timestamp ascending or ID comparison fallback
    ledger.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      const tsA = parseInt(((a.id || a.ref || '').match(/\d{13}/) || ['0'])[0], 10);
      const tsB = parseInt(((b.id || b.ref || '').match(/\d{13}/) || ['0'])[0], 10);
      if (tsA !== tsB && tsA > 0 && tsB > 0) {
        return tsA - tsB;
      }
      return (a.id || '').localeCompare(b.id || '');
    });

    // Calculate cumulative running balance for completed entries
    let currentBalance = 0; // Positive means user owes (Debtor / بدهکار), Negative means they have surplus credit (Creditor / بستانکار)
    
    const finalLedger = ledger.map((entry) => {
      if (entry.status === 'completed') {
        currentBalance += (entry.debit - entry.credit);
      }
      
      let balType: 'بدهکار' | 'بستانکار' | 'بی‌حساب' = 'بی‌حساب';
      if (currentBalance > 0) {
        balType = 'بدهکار';
      } else if (currentBalance < 0) {
        balType = 'بستانکار';
      }

      return {
        ...entry,
        runningBalance: Math.abs(currentBalance),
        balanceType: balType,
      };
    });

    // Return descending (latest first)
    return finalLedger.reverse();
  };

  const handleInitiateEnrollment = (session: TrainingSession) => {
    if (isReadOnlyMode) {
      alert('ثبت‌نام مستقیم فقط توسط دارنده حساب کاربری مجاز است. اولیاء محترم می‌توانند از طریق اکانت اصلی اقدام نمایند.');
      return;
    }

    // 1. Run Schedule Conflict Detection
    const conflictResult = dbStore.checkSessionScheduleConflict(effectiveUser.id, session.id);
    if (conflictResult.hasConflict) {
      setConflictModalData({
        isOpen: true,
        sessionTitle: session.title,
        conflictingTitle: conflictResult.conflictingSessionTitle || 'دوره قبلی',
        conflictingDays: conflictResult.conflictingDays || [],
        conflictingTime: conflictResult.conflictingTime || 'نامشخص',
      });
      return;
    }

    // 2. Open Order Modal if no conflict
    const today = formatJalaliDate(getCurrentJalaliDate());
    const defaultEnd = addMonthsToJalali(today, 1);
    const finalEnd = (session.endDate && session.endDate < defaultEnd) ? session.endDate : defaultEnd;

    setSelectedSessionForOrder(session);
    setOrderStartDate(session.startDate || today);
    setOrderEndDate(finalEnd);
    setOrderTrackingNo('');
    setOrderReceiptUrl('');
    setOrderReceiptFileName('');
    setOrderSuccess(false);
  };

  const handleConfirmEnrollment = () => {
    if (!selectedSessionForOrder || isSubmittingOrder) return;

    if (!orderStartDate.trim() || !orderEndDate.trim()) {
      alert('لطفاً تاریخ شروع و پایان دوره را مشخص نمایید.');
      return;
    }

    setIsSubmittingOrder(true);
    const result = dbStore.enrollAthlete(
      selectedSessionForOrder.id,
      effectiveUser.id,
      currentUser.fullName,
      orderPaymentMethod,
      {
        trackingNumber: orderTrackingNo || undefined,
        receiptUrl: orderReceiptUrl || undefined,
        receiptFileName: orderReceiptFileName || undefined,
        isAlreadyPaid: false, // Default is pending approval
        startDate: orderStartDate.trim(),
        endDate: orderEndDate.trim(),
        totalSessionsAllowed: selectedSessionForOrder.sessionsLimit || 12,
      }
    );

    setIsSubmittingOrder(false);

    if (result && 'error' in result) {
      alert(result.error);
      return;
    }

    setOrderSuccess(true);
    handleRefreshData();
  };

  const handleSaveAttachedReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachingTrx) return;

    if (!uploadReceiptUrl && !uploadTrackingNo) {
      alert('لطفاً حداقل فیش واریزی را پیوست نموده یا کد پیگیری را وارد نمایید.');
      return;
    }

    dbStore.attachReceiptToTransaction(
      attachingTrx.id,
      uploadReceiptUrl,
      uploadReceiptFileName,
      uploadTrackingNo,
      currentUser.fullName
    );

    alert('سند و فیش واریزی شما با موفقیت ثبت شد و در صف بررسی و تأیید مدیریت قرار گرفت.');
    setAttachingTrx(null);
    setUploadReceiptUrl('');
    setUploadReceiptFileName('');
    setUploadTrackingNo('');
    handleRefreshData();
  };

  // Support Ticket Form State
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicketData, setNewTicketData] = useState({
    subject: '',
    department: 'general' as any,
    priority: 'medium' as any,
    message: '',
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketData.subject.trim() || !newTicketData.message.trim()) return;

    dbStore.createSupportTicket(
      {
        userId: effectiveUser.id,
        userName: effectiveUser.fullName,
        userNationalId: effectiveUser.nationalId,
        userRole: effectiveUser.activeRole,
        userPhone: effectiveUser.phone,
        subject: newTicketData.subject,
        department: newTicketData.department,
        priority: newTicketData.priority,
      },
      newTicketData.message,
      undefined,
      currentUser.fullName
    );

    setIsCreatingTicket(false);
    setNewTicketData({ subject: '', department: 'general', priority: 'medium', message: '' });
    handleRefreshData();
  };

  // Calculate Net Financial Balance (perfectly aligned with buildUserLedger)
  const getUserBalanceInfo = () => {
    // buildUserLedger returns ledger in descending order (latest first)
    const ledger = buildUserLedger();
    const completedEntries = ledger.filter((entry) => entry.status === 'completed');
    
    // Total dues = sum of all debits in completed ledger entries
    const totalDues = completedEntries.reduce((sum, entry) => sum + entry.debit, 0);
    
    // Total paid = sum of all credits in completed ledger entries
    const totalPaid = completedEntries.reduce((sum, entry) => sum + entry.credit, 0);
    
    // Net running balance is determined by the last chronologically sorted entry,
    // which in a reversed list is the first item (index 0) of completedEntries.
    let netBalance = 0; // Positive means creditor, Negative means debtor
    let status: 'debtor' | 'creditor' | 'settled' = 'settled';
    let debtAmount = 0;
    let creditAmount = 0;
    
    if (completedEntries.length > 0) {
      const latestEntry = completedEntries[0]; // first item since list is descending/reversed
      const finalBal = latestEntry.runningBalance;
      const isDebtor = latestEntry.balanceType === 'بدهکار';
      const isCreditor = latestEntry.balanceType === 'بستانکار';
      
      if (isDebtor) {
        status = 'debtor';
        debtAmount = finalBal;
        netBalance = -finalBal;
      } else if (isCreditor) {
        status = 'creditor';
        creditAmount = finalBal;
        netBalance = finalBal;
      }
    }
    
    return {
      totalDues,
      totalPaid,
      netBalance,
      debtAmount,
      creditAmount,
      status,
    };
  };

  const balanceInfo = getUserBalanceInfo();
  const totalDebtsAmount = balanceInfo.status === 'debtor' ? balanceInfo.debtAmount : 0;
  const totalPaymentsAmount = balanceInfo.totalPaid;

  // Calculate Attendance Stats
  const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
  const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length;
  const excusedCount = attendanceRecords.filter((a) => a.status === 'excused').length;
  const closedCount = attendanceRecords.filter((a) => a.status === 'club_closed').length;

  const consumedSessions = presentCount + absentCount + closedCount;
  
  // Custom helper to calculate days between Jalali dates (formatted YYYY/MM/DD)
  const getDaysBetweenJalali = (d1: string, d2: string): number => {
    try {
      const p1 = d1.split('/').map(Number);
      const p2 = d2.split('/').map(Number);
      if (p1.length < 3 || p2.length < 3) return 30;
      const days1 = p1[0] * 365 + p1[1] * 30 + p1[2];
      const days2 = p2[0] * 365 + p2[1] * 30 + p2[2];
      return days2 - days1;
    } catch {
      return 30;
    }
  };

  let totalAllowedSessions = 0;
  let activeConsumedSessions = 0;
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  
  activeEnrollments.forEach(enr => {
    totalAllowedSessions += enr.totalSessionsAllowed ?? 12;
    activeConsumedSessions += enr.usedSessionsCount ?? 0;
  });

  if (totalAllowedSessions === 0 && enrollments.length > 0) {
    totalAllowedSessions = 12;
  }

  // Use the active enrollments count or fallback to historical consumed sessions
  const effectiveConsumed = activeEnrollments.length > 0 ? activeConsumedSessions : consumedSessions;
  const remainingSessions = Math.max(0, totalAllowedSessions - effectiveConsumed);
  const remainingPercentage = totalAllowedSessions > 0 ? Math.round((remainingSessions / totalAllowedSessions) * 100) : 0;
  
  const todayJalaliStr = formatJalaliDate(getCurrentJalaliDate());
  let lowestDaysLeft = 999;
  activeEnrollments.forEach(enr => {
    if (enr.expireDate) {
      const daysLeft = getDaysBetweenJalali(todayJalaliStr, enr.expireDate);
      if (daysLeft < lowestDaysLeft) {
        lowestDaysLeft = daysLeft;
      }
    }
  });

  const isSessionLow = activeEnrollments.length > 0 && remainingSessions <= 3;
  const isTimeLow = activeEnrollments.length > 0 && lowestDaysLeft <= 7 && lowestDaysLeft >= 0;

  const attendanceRate = consumedSessions > 0 ? Math.round((presentCount / consumedSessions) * 100) : 100;

  return (
    <div className="space-y-6 pb-12 dir-rtl font-vazir" dir="rtl">
      {/* ========================================================================= */}
      {/* PARENT LINK / PROFILE SWITCHER BAR */}
      {/* ========================================================================= */}
      {isParent && (
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-4 shadow-xl border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/40">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-teal-200">پورتال والدین و نظارت بر فرزندان</h3>
              <p className="text-xs text-slate-300">
                شما می‌توانید وضعیت حضور و غیاب، دوره‌ها، بیمه و تراز مالی فرزندان خود را مشاهده نمایید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium px-2 hidden sm:inline">انتخاب پرونده:</span>
            <button
              onClick={() => setSelectedProfileId('self')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedProfileId === 'self'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              👤 خودم ({currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'کاربر'})
            </button>
            {linkedChildren.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedProfileId(child.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedProfileId === child.id
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>👧 {child?.fullName || 'فرزند'}</span>
                <span className="text-[10px] opacity-80">({child.relation || 'فرزند'})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* READ-ONLY DISCLAIMER BANNER FOR PARENT VIEW */}
      {isReadOnlyMode && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 rounded-xl p-3 text-xs flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            در حال مشاهده پرونده کامل **{effectiveUser.fullName}** در حالت **نظارت اولیاء (فقط‌خواندنی)**. تمام آمارها،
            حضور و غیاب و صورت‌حساب‌ها به‌روز هستند.
          </span>
        </div>
      )}

      {/* SUCCESS ALERTS */}
      {profileSaveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-xl p-3 text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>اطلاعات پروفایل شخصی با موفقیت در دیتابیس سیستم ذخیره شد.</span>
        </div>
      )}

      {/* CLUB LOGO & ATHLETE BRANDING BANNER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {clubSettings.logoIcon?.startsWith('data:') || clubSettings.logoIcon?.startsWith('http') ? (
            <img
              src={clubSettings.logoIcon}
              alt={clubSettings.name}
              className="h-12 sm:h-14 w-auto max-w-[200px] object-contain rounded-xl bg-slate-50 p-1 border border-slate-200 shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-12 h-12 bg-stone-100 text-[#5b785d] rounded-xl border border-stone-200 flex items-center justify-center shrink-0 shadow-xs">
              {clubSettings.logoIcon === 'trophy' && <Trophy className="w-6 h-6" />}
              {clubSettings.logoIcon === 'activity' && <Activity className="w-6 h-6" />}
              {clubSettings.logoIcon === 'flame' && <Flame className="w-6 h-6" />}
              {clubSettings.logoIcon === 'shield' && <Shield className="w-6 h-6" />}
              {clubSettings.logoIcon === 'target' && <Target className="w-6 h-6" />}
              {clubSettings.logoIcon === 'mountain' && <Mountain className="w-6 h-6" />}
              {(clubSettings.logoIcon === 'wave' || !clubSettings.logoIcon) && <WaveLogoSVG className="w-7 h-7 text-[#5b785d]" />}
            </div>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">{clubSettings.name}</h2>
            <p className="text-xs text-slate-500">{clubSettings.slogan || 'سامانه جامع خدمات ورزشکاران و اعضا'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMembershipCardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 hover:from-teal-600 hover:to-slate-800 text-white rounded-xl text-xs font-black shadow-md shadow-teal-900/20 transition-all active:scale-95 border border-teal-500/30"
            title="مشاهده و چاپ کارت عضویت دیجیتال و شناسه ورود به گیت"
          >
            <CreditCard className="w-4 h-4 text-teal-300" />
            <span>کارت عضویت دیجیتال</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
            <span>کاربر فعال:</span>
            <span className="text-teal-700 font-black">{effectiveUser.fullName}</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-bold">
              کدملی: {toPersianDigits(effectiveUser.nationalId)}
            </span>
          </div>
        </div>
      </div>

      {/* UNREAD NOTIFICATIONS TOP ALERT BAR FOR ATHLETE */}
      {notifications.filter((n) => !n.isRead).length > 0 && (
        <div
          onClick={() => setActivePortalTab('dashboard')}
          className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 text-white p-3.5 rounded-2xl shadow-md border border-teal-400/30 flex items-center justify-between gap-3 cursor-pointer hover:opacity-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-amber-300 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-300 flex items-center gap-2">
                <span>پیام و اعلان جدید دارید!</span>
                <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-md">
                  {toPersianDigits(notifications.filter((n) => !n.isRead).length)} مورد جدید
                </span>
              </div>
              <p className="text-[11px] text-teal-100 font-medium line-clamp-1 mt-0.5">
                {notifications.find((n) => !n.isRead)?.title}: {notifications.find((n) => !n.isRead)?.message}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl shrink-0 transition-all">
            مشاهده در داشبورد ←
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN ATHLETE PORTAL NAVIGATION SUB-TABS (iOS Segmented Control) */}
      {/* ========================================================================= */}
      <div className="sticky top-2 z-30 max-w-full relative">
        {/* Subtle touch scroll gradient indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-200/60 to-transparent pointer-events-none z-10 rounded-l-2xl" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-200/60 to-transparent pointer-events-none z-10 rounded-r-2xl" />
        
        <div className="bg-slate-200/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-300/60 shadow-xs flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none touch-pan-x max-w-full">
          <button
            type="button"
            onClick={() => setActivePortalTab('dashboard')}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
              activePortalTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
            <span>داشبورد</span>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 animate-bounce shadow-md">
                {toPersianDigits(notifications.filter((n) => !n.isRead).length)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('profile')}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
              activePortalTab === 'profile'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <User className="w-4 h-4 shrink-0 text-teal-600" />
            <span>پروفایل و بیمه</span>
            {!effectiveUser.isInsuranceValid && (
              <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('finance')}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
              activePortalTab === 'finance'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-indigo-600" />
            <span>امور مالی</span>
            {totalDebtsAmount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                بدهکار
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('courses')}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
              activePortalTab === 'courses'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0 text-blue-600" />
            <span>ثبت‌نام دوره‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('shop')}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
              activePortalTab === 'shop'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0 text-amber-600" />
            <span>خریدهای فروشگاه</span>
            {userShopInvoices.filter((i) => i.paymentStatus === 'unpaid').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                {userShopInvoices.filter((i) => i.paymentStatus === 'unpaid').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('attendance')}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
              activePortalTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>حضور و غیاب</span>
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0">
              {toPersianDigits(attendanceRate)}٪
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('tickets')}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-95 ${
              activePortalTab === 'tickets'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 text-violet-600" />
            <span>پشتیبانی</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD & SLIDER & NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activePortalTab === 'dashboard' && (
        <div className="space-y-6">
          {/* SUBSCRIPTION STATUS WIDGETS (PROMINENT VIEW ON TOP OF DASHBOARD) */}
          <div className="max-w-md mx-auto w-full bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-teal-500/30 text-center space-y-3">
            <h4 className="text-xs font-black text-teal-300">وضعیت اشتراک فعال شما</h4>
            <div className="flex items-center justify-center gap-6 my-2">
              <div className="space-y-1">
                <span className="text-2xl font-black text-amber-400">{toPersianDigits(remainingSessions)}</span>
                <span className="text-[10px] text-slate-300 block">جلسه باقیمانده</span>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="space-y-1">
                <span className="text-2xl font-black text-teal-300">{toPersianDigits(lowestDaysLeft < 999 ? lowestDaysLeft : 0)}</span>
                <span className="text-[10px] text-slate-300 block">روز تا پایان اعتبار</span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${totalAllowedSessions > 0 ? Math.min(100, (remainingSessions / totalAllowedSessions) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* WARNING BANNER FOR LOW SUBSCRIPTION SESSIONS OR EXPIRY TIME */}
          {(isSessionLow || isTimeLow) && (
            <div className="bg-amber-500/15 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shrink-0 shadow-xs">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-950">توجه: اعتبار اشتراک شما رو به اتمام است!</h4>
                  <p className="text-[11px] sm:text-xs text-amber-900 mt-1 leading-relaxed">
                    {isSessionLow && isTimeLow 
                      ? `تنها ${toPersianDigits(remainingSessions)} جلسه مجاز و ${toPersianDigits(lowestDaysLeft)} روز تا پایان مهلت اعتبار زمانی دوره شما باقی مانده است.`
                      : isSessionLow 
                      ? `تنها ${toPersianDigits(remainingSessions)} جلسه مجاز حضور از پکیج شما باقی مانده است. لطفاً برای ثبت‌نام و شارژ مجدد اقدام کنید.`
                      : `تنها ${toPersianDigits(lowestDaysLeft)} روز تا سررسید تاریخ انقضای پکیج شما باقی مانده است.`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActivePortalTab('courses')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shrink-0 active:scale-95"
              >
                شارژ مجدد اشتراک
              </button>
            </div>
          )}

          {/* PROMOTIONAL SLIDER / BANNERS */}
          {announcements.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white group">
              <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                <img
                  src={announcements[currentSlideIndex]?.imageUrl}
                  alt={announcements[currentSlideIndex]?.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent flex flex-col justify-end p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-2">
                    {announcements[currentSlideIndex]?.discountTag && (
                      <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg shadow-md animate-pulse">
                        {announcements[currentSlideIndex].discountTag}
                      </span>
                    )}
                    <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-medium px-2.5 py-1 rounded-lg">
                      اطلاعیه رسمی باشگاه
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white mb-2 leading-tight">
                    {announcements[currentSlideIndex]?.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl line-clamp-2 leading-relaxed">
                    {announcements[currentSlideIndex]?.subtitle}
                  </p>
                </div>
              </div>

              {/* SLIDER CONTROLS */}
              {announcements.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentSlideIndex(
                        (prev) => (prev - 1 + announcements.length) % announcements.length
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white text-slate-800 rounded-full transition-all border border-slate-200 shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentSlideIndex((prev) => (prev + 1) % announcements.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white text-slate-800 rounded-full transition-all border border-slate-200 shadow-md"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {announcements.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          currentSlideIndex === idx ? 'w-6 bg-teal-500' : 'w-2 bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* QUICK SHORTCUTS GRID - BEAUTIFUL APP-STYLE FOR MOBILE */}
          <div className="block lg:hidden bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <h4 className="text-[11px] font-black text-slate-400 mb-3 text-right">دسترسی سریع به بخش‌های پنل</h4>
            <div className="grid grid-cols-3 gap-y-4 gap-x-3 text-center">
              {[
                { id: 'profile', label: 'پروفایل و بیمه', icon: User, color: 'text-teal-600 bg-teal-50 border-teal-100/50' },
                { id: 'finance', label: 'امور مالی', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50 border-indigo-100/50' },
                { id: 'courses', label: 'ثبت‌نام دوره', icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-100/50' },
                { id: 'attendance', label: 'حضور و غیاب', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50' },
                { id: 'shop', label: 'خریدهای بوفه', icon: ShoppingBag, color: 'text-amber-600 bg-amber-50 border-amber-100/50' },
                { id: 'tickets', label: 'پشتیبانی و تیکت', icon: MessageSquare, color: 'text-violet-600 bg-violet-50 border-violet-100/50' },
              ].map((shortcut) => {
                const IconComponent = shortcut.icon;
                return (
                  <button
                    key={shortcut.id}
                    type="button"
                    onClick={() => setActivePortalTab(shortcut.id as any)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none group active:scale-95 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${shortcut.color} flex items-center justify-center border group-hover:scale-105 transition-transform shadow-xs`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black text-slate-700 leading-tight block whitespace-nowrap">
                      {shortcut.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUICK SUMMARY CARDS (iOS 2x2 Widget Grid on Mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div
              onClick={() => setActivePortalTab('profile')}
              className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between gap-2 shadow-xs hover:border-teal-400 transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-slate-500 font-bold">بیمه ورزشی</span>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-200/60 shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <span
                  className={`text-xs sm:text-sm font-black block ${
                    effectiveUser.isInsuranceValid ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {effectiveUser.isInsuranceValid ? 'معتبر و تاییدشده' : 'نیازمند تمدید'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">پزشکی ورزشی</span>
              </div>
            </div>

            <div
              onClick={() => setActivePortalTab('courses')}
              className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between gap-2 shadow-xs hover:border-indigo-400 transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-slate-500 font-bold">دوره‌های فعال</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200/60 shrink-0">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-slate-900 block">
                  {toPersianDigits(enrollments.filter((e) => e.status === 'active').length)} دوره فعال
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">سالن و سانس‌ها</span>
              </div>
            </div>

            <div
              onClick={() => setActivePortalTab('finance')}
              className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between gap-2 shadow-xs hover:border-amber-400 transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-slate-500 font-bold">تراز مالی</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60 shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <span
                  className={`text-xs sm:text-sm font-black block ${
                    balanceInfo.status === 'debtor' 
                      ? 'text-rose-600' 
                      : 'text-emerald-600'
                  }`}
                >
                  {balanceInfo.status === 'debtor'
                    ? `${toPersianDigits(balanceInfo.debtAmount.toLocaleString())} ت بدهکار`
                    : balanceInfo.status === 'creditor'
                    ? `${toPersianDigits(balanceInfo.creditAmount.toLocaleString())} ت بستانکار`
                    : 'تسویه کامل'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">صورت‌حساب</span>
              </div>
            </div>

            <div
              onClick={() => setActivePortalTab('attendance')}
              className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between gap-2 shadow-xs hover:border-teal-400 transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-slate-500 font-bold">نرخ حضور</span>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-200/60 shrink-0">
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-teal-700 block">
                  {toPersianDigits(attendanceRate)}٪ ({toPersianDigits(presentCount)} از {toPersianDigits(consumedSessions)})
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">کارنامه جلسات</span>
              </div>
            </div>
          </div>

          {/* USER-FRIENDLY ACCOUNT & SESSIONS INSIGHTS WIDGET */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            
            {/* SESSIONS & ATTENDANCE SUMMARY CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">وضعیت اعتبار و مانده جلسات شما</h3>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">سانس‌های فعال این ماه</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center mb-6">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">کل جلسات مجاز</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800">{toPersianDigits(totalAllowedSessions)} جلسه</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">جلسات مصرف‌شده</span>
                    <span className="text-xs sm:text-sm font-black text-amber-600">{toPersianDigits(consumedSessions)} جلسه</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 font-bold block mb-1">باقی‌مانده مجاز</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700">{toPersianDigits(remainingSessions)} جلسه</span>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">درصد استفاده از سانس‌های مجاز:</span>
                    <span className="text-teal-700">{toPersianDigits(totalAllowedSessions > 0 ? Math.round((consumedSessions / totalAllowedSessions) * 100) : 0)}٪</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div 
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalAllowedSessions > 0 ? Math.min(100, (consumedSessions / totalAllowedSessions) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3 text-xs mt-2">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Activity className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>نرخ حضور مستمر شما در تمرینات:</span>
                </div>
                <span className="font-black text-teal-700 text-xs sm:text-sm">{toPersianDigits(attendanceRate)}٪ موفق</span>
              </div>
            </div>

            {/* SIMPLE BALANCE & TRANSACTION TRACKER */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">خلاصه بالانس و تراز مالی حساب شما</h3>
                  </div>
                  {balanceInfo.status === 'debtor' ? (
                    <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-1 rounded-lg">
                      بدهکار (نیاز به پرداخت)
                    </span>
                  ) : balanceInfo.status === 'creditor' ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded-lg">
                      بستانکار (دارای اعتبار مازاد)
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg">
                      حساب تسویه شده
                    </span>
                  )}
                </div>

                {/* FINANCIAL STATEMENT FLOW WIDGET */}
                <div className="grid grid-cols-3 gap-3 text-center mb-6">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">کل بدهی / شهریه‌ها</span>
                    <span className="text-[11px] sm:text-xs font-black text-slate-800">
                      {toPersianDigits(balanceInfo.totalDues.toLocaleString())} تومان
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                    <span className="text-[10px] text-emerald-600 font-bold block mb-1">کل پرداخت‌های تاییدشده</span>
                    <span className="text-[11px] sm:text-xs font-black text-emerald-700">
                      {toPersianDigits(balanceInfo.totalPaid.toLocaleString())} تومان
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    balanceInfo.status === 'debtor' 
                      ? 'bg-rose-50 border-rose-100 text-rose-700' 
                      : balanceInfo.status === 'creditor'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-bold'
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                  }`}>
                    <span className="text-[10px] font-bold block mb-1">وضعیت نهایی (تراز)</span>
                    <span className="text-[11px] sm:text-xs font-black">
                      {balanceInfo.status === 'debtor' 
                        ? `${toPersianDigits(balanceInfo.debtAmount.toLocaleString())} تومان بدهکار` 
                        : balanceInfo.status === 'creditor'
                        ? `${toPersianDigits(balanceInfo.creditAmount.toLocaleString())} تومان بستانکار`
                        : '۰ تومان (تسویه)'}
                    </span>
                  </div>
                </div>

                {/* DIRECT QUICK ACTIONS FOR USER */}
                <div className="space-y-2 mb-4 text-xs font-bold">
                  <div className="text-slate-500 mb-1.5 font-bold">آخرین گردش حساب شما:</div>
                  {userTransactions.slice(0, 2).length === 0 ? (
                    <div className="text-center py-2 text-slate-400 font-medium">هیچ تراکنشی یافت نشد</div>
                  ) : (
                    <div className="space-y-1.5">
                      {userTransactions.slice(0, 2).map((t) => (
                        <div key={t.id} className="bg-slate-50/80 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-700">
                          <span className="line-clamp-1 max-w-[180px] text-right">{t.description}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{toPersianDigits((t.amount || 0).toLocaleString())} ت</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                              t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : t.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {t.status === 'completed' ? 'تاییدشده' : t.status === 'pending' ? 'در انتظار تایید' : 'ردشده'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2.5 mt-2">
                <button
                  onClick={() => setActivePortalTab('finance')}
                  className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl border border-slate-200 transition-all"
                >
                  مشاهده ریز صورت‌حساب مالی
                </button>
                {totalDebtsAmount > 0 && (
                  <button
                    onClick={() => setActivePortalTab('finance')}
                    className="w-full text-center py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-xs transition-all animate-pulse"
                  >
                    ارسال فیش و تسویه بدهی
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* NOTIFICATIONS CENTER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-600 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-900">اعلان‌ها و پیام‌های سیستم</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  {toPersianDigits(notifications.length)} اعلان ({toPersianDigits(notifications.filter(n => !n.isRead).length)} خوانده‌نشده)
                </span>
                {notifications.some(n => !n.isRead) && (
                  <button
                    onClick={() => {
                      dbStore.markAllNotificationsAsRead(currentUser.id, currentUser.activeRole);
                      handleRefreshData();
                    }}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-xl transition-colors border border-teal-200"
                  >
                    ✓ علامت همه به‌عنوان خوانده‌شده
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  هیچ اعلانی در حال حاضر ثبت نشده است.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleUserPortalNotifClick(notif)}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.98] duration-200 ${
                      notif.isRead
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        : 'bg-teal-50/70 border-teal-200 text-slate-900 shadow-xs hover:bg-teal-50 hover:border-teal-300'
                    }`}
                  >
                    <div className="space-y-1 text-right w-full">
                      <div className="flex items-center gap-2 justify-start">
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0 animate-pulse" />
                        )}
                        <h4 className="font-bold text-sm text-slate-900">{notif.title}</h4>
                        <span className="text-[10px] bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                          {notif.category === 'insurance' && '🛡️ بیمه'}
                          {notif.category === 'financial' && '💳 مالی'}
                          {notif.category === 'course' && '📚 سانس'}
                          {notif.category === 'urgent' && '🚨 فوری'}
                          {notif.category === 'general' && '📢 عمومی'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400 block">{notif.createdAt}</span>
                        {(notif.actionLink || notif.category === 'financial' || notif.category === 'course' || notif.category === 'insurance') && (
                          <span className="text-[10px] font-black text-teal-700 hover:underline flex items-center gap-0.5">
                            مشاهده و پیگیری ←
                          </span>
                        )}
                      </div>
                    </div>

                    {!notif.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dbStore.markNotificationAsRead(notif.id);
                          handleRefreshData();
                        }}
                        className="text-xs text-teal-600 hover:text-teal-800 font-bold underline shrink-0 whitespace-nowrap self-start"
                      >
                        علامت به‌عنوان خوانده‌شده
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFILE & SPORTS INSURANCE */}
      {/* ========================================================================= */}
      {activePortalTab === 'profile' && (
        <div className="space-y-6">
          {/* DIGITAL MEMBERSHIP CARD BANNER / CALL TO ACTION */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-xl border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 shadow-inner">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-teal-200">کارت هوشمند و عضویت دیجیتال شما</h3>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                    گیت تردد و بارکد
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  شناسه هوشمند و استاندارد ورود به سالن، متصل به سامانه تردد، وضعیت بیمه ورزشی و بارکد نوری اختصاصی.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsMembershipCardOpen(true)}
                className="w-full md:w-auto px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>نمایش و چاپ کارت عضویت</span>
              </button>
            </div>
          </div>

          {/* IDENTITY LOCK NOTICE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-4">
                {/* USER AVATAR / PROFILE PHOTO PREVIEW */}
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center overflow-hidden shadow-xs">
                    {profileFormData.avatarUrl || effectiveUser.avatarUrl ? (
                      <img
                        src={profileFormData.avatarUrl || effectiveUser.avatarUrl}
                        alt={effectiveUser.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-teal-600" />
                    )}
                  </div>
                  {!isReadOnlyMode && (
                    <label
                      htmlFor="user-avatar-upload-header"
                      className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-1.5 rounded-lg shadow-md cursor-pointer hover:bg-teal-600 transition-colors"
                      title="آپلود عکس جدید"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        id="user-avatar-upload-header"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{effectiveUser.fullName}</h3>
                    <span className="bg-teal-100 text-teal-800 border border-teal-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {effectiveUser.activeRole === 'athlete' ? 'ورزشکار' : 'عضو باشگاه'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    شماره ملی: {toPersianDigits(effectiveUser.nationalId)} | شماره همراه: {toPersianDigits(effectiveUser.phone)}
                  </p>
                </div>
              </div>

              {!isReadOnlyMode && (
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditingProfile ? 'انصراف از ویرایش' : 'ویرایش اطلاعات تکمیلی'}</span>
                </button>
              )}
            </div>

            {/* AVATAR ERROR ALERT IF FILE > 5MB */}
            {avatarError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{avatarError}</span>
                </div>
                <button
                  onClick={() => setAvatarError(null)}
                  className="text-rose-500 hover:text-rose-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PROFILE PHOTO UPLOAD BOX */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                  {profileFormData.avatarUrl || effectiveUser.avatarUrl ? (
                    <img
                      src={profileFormData.avatarUrl || effectiveUser.avatarUrl}
                      alt="عکس پرسنلی"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>عکس پرسنلی و پرتره ورزشکار</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-normal">
                      حداکثر ۵ مگابایت
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    فرمت‌های مجاز: JPG, PNG, WEBP. عکس جهت صدور کارت عضویت و بیمه‌نامه استفاده می‌شود.
                  </p>
                </div>
              </div>

              {!isReadOnlyMode && (
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <label
                    htmlFor="user-avatar-upload-input"
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>انتخاب و آپلود عکس</span>
                    <input
                      id="user-avatar-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                    />
                  </label>

                  {(profileFormData.avatarUrl || effectiveUser.avatarUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                      title="حذف عکس"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">حذف</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* IDENTITY LOCKED WARNING */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-700">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-800 block">قفل اطلاعات هویتی (اصلی)</span>
                اطلاعات اصلی شامل نام، نام خانوادگی، شماره ملی و کد شناسنامه پس از احراز هویت توسط مدیریت
                قفل شده‌اند. در صورت تغییر قانونی، با پشتیبانی تماس بگیرید.
              </div>
            </div>

            {/* PROFILE FORM */}
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نام و نام خانوادگی (قفل)</label>
                  <input
                    type="text"
                    disabled
                    value={effectiveUser.fullName}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">شماره ملی (قفل)</label>
                  <input
                    type="text"
                    disabled
                    value={toPersianDigits(effectiveUser.nationalId)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">شماره همراه تماس</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile || isReadOnlyMode}
                    value={profileFormData.phone}
                    onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نام مخاطب اضطراری</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile || isReadOnlyMode}
                    value={profileFormData.emergencyContactName}
                    onChange={(e) => setProfileFormData({ ...profileFormData, emergencyContactName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                    placeholder="مثلاً پدر / همسر"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">شماره تماس اضطراری</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile || isReadOnlyMode}
                    value={profileFormData.emergencyContactPhone}
                    onChange={(e) => setProfileFormData({ ...profileFormData, emergencyContactPhone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">گروه خونی</label>
                  <select
                    disabled={!isEditingProfile || isReadOnlyMode}
                    value={profileFormData.bloodType}
                    onChange={(e) => setProfileFormData({ ...profileFormData, bloodType: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                  >
                    <option value="نامشخص">نامشخص</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">سایز کفش سنگ‌نوردی</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile || isReadOnlyMode}
                    value={profileFormData.shoeSize}
                    onChange={(e) => setProfileFormData({ ...profileFormData, shoeSize: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                    placeholder="مثلاً ۳۸ یا ۴۲"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">سایز پوشاک / هارنس</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile || isReadOnlyMode}
                    value={profileFormData.clothingSize}
                    onChange={(e) => setProfileFormData({ ...profileFormData, clothingSize: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                    placeholder="مثلاً M یا L"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">شماره بیمه‌نامه ورزشی</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile || isReadOnlyMode}
                    value={profileFormData.insuranceNumber}
                    onChange={(e) => setProfileFormData({ ...profileFormData, insuranceNumber: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                    placeholder="شماره کارت بیمه فدراسیون"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">سوابق پزشکی / حساسیت‌های دارویی</label>
                <textarea
                  rows={2}
                  disabled={!isEditingProfile || isReadOnlyMode}
                  value={profileFormData.medicalConditions}
                  onChange={(e) => setProfileFormData({ ...profileFormData, medicalConditions: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                  placeholder="در صورت داشتن هرگونه بیماری قلبی، آسم، آسیب‌دیدگی مفاصل یا حساسیت، ذکر فرمایید..."
                />
              </div>

              {isEditingProfile && !isReadOnlyMode && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>ذخیره تغییرات در دیتابیس</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* SPORTS INSURANCE CARD STATUS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">کارت بیمه ورزشی فدراسیون پزشکی ورزشی</h3>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  effectiveUser.isInsuranceValid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {effectiveUser.isInsuranceValid ? '✓ بیمه‌نامه معتبر' : '⚠️ نیازمند استعلام / تمدید'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">شماره بیمه‌نامه:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {effectiveUser.insuranceNumber
                    ? toPersianDigits(effectiveUser.insuranceNumber)
                    : 'ثبت نشده'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">تاریخ انقضاء بیمه:</span>
                <span className="font-bold text-teal-700 text-sm">
                  {effectiveUser.insuranceExpiryDate
                    ? toPersianDigits(effectiveUser.insuranceExpiryDate)
                    : 'نامشخص'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">وضعیت مجوز حضور در سالن:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {effectiveUser.isInsuranceValid ? 'مجاز و بدون محدودیت' : 'غیرمجاز (نیازمند ارائه کارت)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* TAB 3: FINANCIAL DASHBOARD */}
      {/* ========================================================================= */}
      {activePortalTab === 'finance' && (
        <div className="space-y-6">
          {/* NET BALANCE CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-right">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
                تراز و صورت‌حساب مالی ورزشکار
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                {balanceInfo.status === 'debtor'
                  ? `مانده بدهی: ${toPersianDigits(balanceInfo.debtAmount.toLocaleString())} تومان`
                  : balanceInfo.status === 'creditor'
                  ? `تراز حساب: ${toPersianDigits(balanceInfo.creditAmount.toLocaleString())} تومان بستانکار (اعتبار)`
                  : 'تراز حساب: صفر (تسویه کامل)'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                مجموع پرداختی‌های تاییدشده شما: {toPersianDigits(balanceInfo.totalPaid.toLocaleString())} تومان
              </p>
            </div>

            {!isReadOnlyMode && (
              <button
                onClick={() => {
                  setCustomPayAmount(totalDebtsAmount > 0 ? totalDebtsAmount.toString() : '');
                  setIsCustomPaying(true);
                }}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-xs transition-all shrink-0"
              >
                ثبت فیش واریزی جدید (علی‌الحساب یا اقساطی)
              </button>
            )}
          </div>

          {/* ACTIVE PACKAGES & ENROLLMENT FINANCIAL STATUS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3">
              دوره‌ها و پکیج‌های فعال (وضعیت تسویه شهریه)
            </h3>

            {enrollments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                هیچ دوره یا پکیج فعالی برای شما ثبت نشده است.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrollments.map((enr) => {
                  const sess = sessions.find((s) => s.id === enr.sessionId);
                  const isPaid = enr.paymentStatus === 'paid';
                  return (
                    <div key={enr.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-teal-800">
                          {sess?.title || enr.athleteName || 'دوره آموزشی'}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPaid ? 'تسویه‌شده و تأییدشده' : 'در انتظار بررسی سند / واریز'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200 font-medium">
                        <div>
                          شهریه دوره: <span className="text-slate-900 font-bold">{toPersianDigits(((sess?.monthlyFee) || 0).toLocaleString())} تومان</span>
                        </div>
                        <div>
                          روش پرداخت: <span className="text-slate-800 font-bold">
                            {enr.paymentMethod === 'card_to_card' ? 'کارت به کارت' : enr.paymentMethod === 'online' ? 'آنلاین' : 'پوز'}
                          </span>
                        </div>
                      </div>

                      {/* Receipt buttons if pending or receipt exists */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs">
                        {enr.receiptUrl ? (
                          <button
                            onClick={() =>
                              setViewingReceipt({
                                url: enr.receiptUrl!,
                                fileName: enr.receiptFileName,
                                title: `فیش واریزی دوره ${sess?.title || ''}`,
                              })
                            }
                            className="text-teal-700 hover:text-teal-900 font-bold text-[11px] flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>مشاهده تصویر فیش واریزی</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">فیش واریزی پیوست نشده</span>
                        )}

                        {!isPaid && !isReadOnlyMode && (
                          <button
                            onClick={() => {
                              const matchingTrx = userTransactions.find((t) => t.type === 'tuition' && t.status === 'pending');
                              if (matchingTrx) {
                                setAttachingTrx(matchingTrx);
                              } else {
                                setAttachingTrx({
                                  id: `trx-enr-${enr.id}`,
                                  userId: effectiveUser.id,
                                  userName: effectiveUser.fullName,
                                  userNationalId: effectiveUser.nationalId,
                                  amount: sess?.monthlyFee || 0,
                                  type: 'tuition',
                                  method: enr.paymentMethod || 'card_to_card',
                                  description: `شهریه دوره ${sess?.title || ''}`,
                                  status: 'pending',
                                  createdAt: enr.enrolledAt,
                                  createdBy: effectiveUser.fullName,
                                });
                              }
                            }}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>پیوست / ارسال فیش</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAYMENT HISTORY & LEDGER VIEW */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                تاریخچه و وضعیت تراکنش‌های مالی فردی
              </h3>
              
              {/* Modern Tab Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setFinanceSubTab('ledger')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    financeSubTab === 'ledger'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  دفتر معین (کاردکس بدهکار / بستانکار)
                </button>
                <button
                  onClick={() => setFinanceSubTab('transactions')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    financeSubTab === 'transactions'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  فهرست فیش‌های ارسالی
                </button>
              </div>
            </div>

            {financeSubTab === 'ledger' ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed font-medium">
                  <strong>💡 راهنمای کاردکس دفتر معین:</strong> ردیف‌های <span className="font-bold text-rose-700">بدهکار</span> نشان‌دهنده هزینه‌ها، جریمه‌ها یا شهریه‌هایی است که به حساب شما منظور شده‌اند. ردیف‌های <span className="font-bold text-emerald-700">بستانکار</span> نشان‌دهنده پرداخت‌ها یا فیش‌هایی است که ارسال کرده‌اید و توسط مدیریت تأیید شده‌اند. تراز نهایی پس از ثبت هر ردیف محاسبه شده است.
                </div>

                {/* Mobile Card View for Ledger */}
                <div className="block sm:hidden space-y-3">
                  {buildUserLedger().length === 0 ? (
                    <div className="text-center p-6 text-slate-500 text-xs">
                      هیچ گردش حساب یا دفتر معینی ثبت نشده است.
                    </div>
                  ) : (
                    buildUserLedger().map((entry) => (
                      <div key={entry.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-xs text-slate-900">{entry.description}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">کد سند: {getCleanId(entry.id)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{toPersianDigits(entry.date)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[10px]">بدهکار (هزینه/شهریه):</span>
                            <span className={`font-bold ${entry.debit > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {entry.debit > 0 ? `${toPersianDigits(entry.debit.toLocaleString())} تومان` : '---'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">بستانکار (پرداختی):</span>
                            <span className={`font-bold ${entry.credit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {entry.credit > 0 ? `${toPersianDigits(entry.credit.toLocaleString())} تومان` : '---'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                          <span className="text-slate-500">مانده انباشته حساب:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800">
                              {entry.status === 'completed' ? `${toPersianDigits(entry.runningBalance.toLocaleString())} تومان` : '—'}
                            </span>
                            {entry.status === 'completed' && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                                entry.balanceType === 'بدهکار'
                                  ? 'bg-rose-50 text-rose-700'
                                  : entry.balanceType === 'بستانکار'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {entry.balanceType}
                              </span>
                            )}
                            {entry.status !== 'completed' && (
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-sm">
                                در انتظار تایید
                              </span>
                            )}
                          </div>
                        </div>

                        {(() => {
                          const inv = dbStore.findShopInvoiceFromDescription(entry.description);
                          if (!inv) return null;
                          return (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => setSelectedShopInvoice(inv)}
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg font-bold text-[11px] flex items-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5 text-teal-600" />
                                مشاهده فاکتور و پرینت ({inv.invoiceNumber})
                              </button>
                            </div>
                          );
                        })()}

                        {entry.receiptUrl && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() =>
                                setViewingReceipt({
                                  url: entry.receiptUrl!,
                                  fileName: entry.receiptFileName,
                                  title: entry.description,
                                })
                              }
                              className="text-teal-700 hover:underline font-bold text-[10px] flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              مشاهده سند ضمیمه شده
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View for Ledger */}
                <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                        <th className="p-3">کد سند</th>
                        <th className="p-3">تاریخ</th>
                        <th className="p-3">شرح رویداد مالی</th>
                        <th className="p-3 text-rose-700">بدهکار (تعهد/شهریه)</th>
                        <th className="p-3 text-emerald-700">بستانکار (پرداخت شما)</th>
                        <th className="p-3">تراز مانده کاردکس</th>
                        <th className="p-3 text-center">وضعیت سند</th>
                        <th className="p-3 text-center">ضمیمه</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {buildUserLedger().length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center p-6 text-slate-500">
                            هیچ رکوردی در دفتر معین شما ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        buildUserLedger().map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-[10px] text-slate-500 font-bold whitespace-nowrap">{getCleanId(entry.id)}</td>
                            <td className="p-3 text-slate-600 font-mono">{toPersianDigits(entry.date)}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block text-xs">{entry.description}</span>
                              {entry.method && (
                                <span className="text-[10px] text-slate-400">
                                  روش: {entry.method === 'online' ? 'درگاه آنلاین' : entry.method === 'card_to_card' ? 'کارت به کارت' : 'کارتخوان'}
                                  {entry.trackingNumber && ` | پیگیری: ${toPersianDigits(entry.trackingNumber)}`}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {entry.debit > 0 ? (
                                <span className="font-black text-rose-600">
                                  {toPersianDigits(entry.debit.toLocaleString())} تومان-
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              {entry.credit > 0 ? (
                                <span className="font-black text-emerald-600">
                                  {toPersianDigits(entry.credit.toLocaleString())} تومان+
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-3 font-bold">
                              {entry.status === 'completed' ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-900">{toPersianDigits(entry.runningBalance.toLocaleString())} تومان</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                                    entry.balanceType === 'بدهکار'
                                      ? 'bg-rose-50 text-rose-700'
                                      : entry.balanceType === 'بستانکار'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {entry.balanceType}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">موقت (در انتظار تأیید)</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  entry.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : entry.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {entry.status === 'completed'
                                  ? 'تأییدشده'
                                  : entry.status === 'pending'
                                  ? 'در انتظار بررسی فیش'
                                  : 'ردشده'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {(() => {
                                  const inv = dbStore.findShopInvoiceFromDescription(entry.description);
                                  if (!inv) return null;
                                  return (
                                    <button
                                      onClick={() => setSelectedShopInvoice(inv)}
                                      className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 border border-teal-200"
                                      title="مشاهده و پرینت فاکتور حرارتی"
                                    >
                                      <Receipt className="w-3 h-3 text-teal-600" />
                                      فاکتور
                                    </button>
                                  );
                                })()}
                                {entry.receiptUrl ? (
                                  <button
                                    onClick={() =>
                                      setViewingReceipt({
                                        url: entry.receiptUrl!,
                                        fileName: entry.receiptFileName,
                                        title: entry.description,
                                      })
                                    }
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 border border-slate-200"
                                  >
                                    <Eye className="w-3 h-3 text-slate-500" />
                                    ضمیمه
                                  </button>
                                ) : (
                                  !dbStore.findShopInvoiceFromDescription(entry.description) && (
                                    <span className="text-slate-400 text-[10px]">—</span>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile Card View for raw transactions list */}
                <div className="block sm:hidden space-y-3">
                  {userTransactions.length === 0 ? (
                    <div className="text-center p-6 text-slate-500 text-xs">
                      هیچ تراکنش مالی ثبت نشده است.
                    </div>
                  ) : (
                    userTransactions.map((t) => (
                      <div key={t.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{t.description || t.type}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : t.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {t.status === 'completed'
                              ? 'تأییدشده'
                              : t.status === 'pending'
                              ? 'در انتظار بررسی'
                              : 'ردشده'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">مبلغ:</span>
                          <span className="font-black text-emerald-700 text-sm">
                            {toPersianDigits((t.amount || 0).toLocaleString())} تومان
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                          <div>
                            روش: <span className="font-bold text-slate-800">
                              {t.method === 'online' && 'درگاه آنلاین'}
                              {t.method === 'card_to_card' && 'کارت به کارت'}
                              {t.method === 'pos' && 'کارتخوان'}
                              {t.method === 'cash' && 'نقدی'}
                            </span>
                          </div>
                          <div className="text-left dir-ltr font-mono font-bold text-slate-700">
                            پیگیری: {toPersianDigits(t.trackingNumber || '---')}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-[10px] text-slate-400">تاریخ: {toPersianDigits(t.createdAt)}</span>
                          {t.receiptUrl ? (
                            <button
                              onClick={() =>
                                setViewingReceipt({
                                  url: t.receiptUrl!,
                                  fileName: t.receiptFileName,
                                  title: `فیش واریزی ${t.description}`,
                                })
                              }
                              className="text-teal-700 hover:underline font-bold text-[10px] flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              مشاهده فیش
                            </button>
                          ) : t.status === 'pending' && !isReadOnlyMode ? (
                            <button
                              onClick={() => {
                                setAttachingTrx(t);
                                setUploadTrackingNo(t.trackingNumber || '');
                              }}
                              className="text-amber-700 hover:underline font-bold text-[10px] flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              پیوست فیش
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View for raw transactions */}
                <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                        <th className="p-3">عنوان پرداختی</th>
                        <th className="p-3">مبلغ (تومان)</th>
                        <th className="p-3">روش پرداخت</th>
                        <th className="p-3">شماره پیگیری</th>
                        <th className="p-3">سند/فیش</th>
                        <th className="p-3">تاریخ</th>
                        <th className="p-3 text-center">وضعیت</th>
                        <th className="p-3 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {userTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center p-6 text-slate-500">
                            هیچ تراکنش مالی ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        userTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-3 font-medium text-slate-900">{t.description || t.type}</td>
                            <td className="p-3 font-bold text-emerald-700">
                              {toPersianDigits((t.amount || 0).toLocaleString())}
                            </td>
                            <td className="p-3 text-slate-600">
                              {t.method === 'online' && 'درگاه آنلاین'}
                              {t.method === 'card_to_card' && 'کارت به کارت'}
                              {t.method === 'pos' && 'کارتخوان'}
                              {t.method === 'cash' && 'نقدی'}
                            </td>
                            <td className="p-3 font-mono text-slate-700 font-bold">
                              {toPersianDigits(t.trackingNumber || '---')}
                            </td>
                            <td className="p-3">
                              {t.receiptUrl ? (
                                <button
                                  onClick={() =>
                                    setViewingReceipt({
                                      url: t.receiptUrl!,
                                      fileName: t.receiptFileName,
                                      title: `فیش واریزی ${t.description}`,
                                    })
                                  }
                                  className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg text-[10px] flex items-center gap-1 border border-teal-200"
                                >
                                  <Eye className="w-3 h-3" />
                                  مشاهده
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px]">ندارد</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 font-mono">{toPersianDigits(t.createdAt)}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  t.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : t.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {t.status === 'completed'
                                  ? 'تأییدشده'
                                  : t.status === 'pending'
                                  ? 'در انتظار بررسی'
                                  : 'ردشده'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {t.status === 'pending' && !isReadOnlyMode && (
                                <button
                                  onClick={() => {
                                    setAttachingTrx(t);
                                    setUploadTrackingNo(t.trackingNumber || '');
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[10px] border border-amber-200 flex items-center gap-1 mx-auto"
                                >
                                  <Upload className="w-3 h-3" />
                                  ارسال فیش
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COURSES, CONFLICT DETECTION & ATTENDANCE REPORT CARD */}
      {/* ========================================================================= */}
      {activePortalTab === 'courses' && (
        <div className="space-y-6">
          {/* Header & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Mountain className="w-6 h-6 text-teal-600" />
                  <span>لیست جامع دوره‌ها و سانس‌های آموزشی باشگـاه</span>
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  مشاهده تمام سانس‌های فعال و دوره‌های منقضی شده، بررسی تداخل زمان‌بندی و ثبت‌نام آنلاین
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none touch-pan-x max-w-full">
                <button
                  onClick={() => setCourseStatusFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    courseStatusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  همه دوره‌ها ({toPersianDigits(sessions.length)})
                </button>
                <button
                  onClick={() => setCourseStatusFilter('active')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                    courseStatusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>دوره‌های فعال ({toPersianDigits(sessions.filter((s) => !isSessionExpired(s)).length)})</span>
                </button>
                <button
                  onClick={() => setCourseStatusFilter('expired')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                    courseStatusFilter === 'expired'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <Lock className="w-3 h-3 text-rose-300" />
                  <span>منقضی شده ({toPersianDigits(sessions.filter((s) => isSessionExpired(s)).length)})</span>
                </button>
              </div>
            </div>

            {/* Search & Sport Type Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={courseSearchTerm}
                  onChange={(e) => setCourseSearchTerm(e.target.value)}
                  placeholder="جستجوی عنوان دوره، نام مربی یا توضیحات..."
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                {courseSearchTerm && (
                  <button
                    onClick={() => setCourseSearchTerm('')}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sport Type Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto shrink-0 pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-500 shrink-0 ml-1">رشته:</span>
                {['all', 'بولدرینگ تخصصی', 'دیواره و سرطناب', 'سنگ‌نوردی کودکان', 'سنگ‌نوردی عمومی'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setCourseTypeFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 border ${
                      courseTypeFilter === st
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'all' ? 'همه رشته‌ها' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {(() => {
            const filtered = sessions.filter((sess) => {
              const expired = isSessionExpired(sess);
              if (courseStatusFilter === 'active' && expired) return false;
              if (courseStatusFilter === 'expired' && !expired) return false;
              if (courseTypeFilter !== 'all' && sess.sportType !== courseTypeFilter) return false;

              if (courseSearchTerm.trim()) {
                const term = courseSearchTerm.toLowerCase();
                const matchTitle = sess.title.toLowerCase().includes(term);
                const matchCoach = sess.coachName.toLowerCase().includes(term);
                const matchDesc = (sess.description || '').toLowerCase().includes(term);
                const matchSport = (sess.sportType || '').toLowerCase().includes(term);
                if (!matchTitle && !matchCoach && !matchDesc && !matchSport) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-black text-slate-700">هیچ دوره‌ای با این مشخصات یافت نشد.</h4>
                  <p className="text-xs text-slate-500 font-bold">
                    لطفاً عبارت جستجو یا فیلترهای انتخابی را تغییر دهید.
                  </p>
                  <button
                    onClick={() => {
                      setCourseStatusFilter('all');
                      setCourseTypeFilter('all');
                      setCourseSearchTerm('');
                    }}
                    className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition-all border border-teal-200"
                  >
                    پاک کردن فیلترها
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((sess) => {
                  const isEnrolled = enrollments.some(
                    (e) => e.sessionId === sess.id && e.status === 'active'
                  );
                  const expired = isSessionExpired(sess);

                  return (
                    <div
                      key={sess.id}
                      className={`group relative bg-white border rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                        expired
                          ? 'border-rose-200 bg-slate-50/60 opacity-90 hover:shadow-md hover:border-rose-300'
                          : isEnrolled
                          ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md hover:shadow-xl'
                          : 'border-slate-200/90 hover:border-teal-400 hover:shadow-xl hover:-translate-y-1'
                      }`}
                    >
                      {/* Top Accent Stripe */}
                      <div
                        className={`h-2.5 w-full ${
                          expired
                            ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-slate-500'
                            : isEnrolled
                            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
                            : 'bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-600'
                        }`}
                      />

                      <div className="p-5 space-y-4">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/80">
                            {sess.sportType || 'سنگ‌نوردی'}
                          </span>

                          {expired ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 shadow-2xs">
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>منقضی شده</span>
                            </span>
                          ) : isEnrolled ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ثبت‌نام شده</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>فعال و آماده ثبت‌نام</span>
                            </span>
                          )}
                        </div>

                        {/* Title & Level */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                              {sess.title}
                            </h4>
                          </div>
                          {sess.level && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              سطح: {sess.level}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                          {sess.description || 'توضیحات و سرفصل آموزشی این سانس تمرینی.'}
                        </p>

                        {/* Meta Specs */}
                        <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100 font-medium bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>مربی:</span>
                            </span>
                            <span className="font-bold text-slate-900">{sess.coachName}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>روزهای برگزاری:</span>
                            </span>
                            <span className="font-bold text-slate-900">{sess.daysOfWeek.join('، ')}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>ساعت سانس:</span>
                            </span>
                            <span className="font-bold text-slate-900">
                              {toPersianDigits(sess.startTime)} تا {toPersianDigits(sess.endTime)}
                            </span>
                          </div>

                          {sess.startDate && sess.endDate && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px]">
                              <span className="text-slate-500">بازه برگزاری:</span>
                              <span className={`font-mono font-bold ${expired ? 'text-rose-600' : 'text-slate-700'}`}>
                                {toPersianDigits(sess.startDate)} تا {toPersianDigits(sess.endDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">شهریه ماهانه:</span>
                          <span className={`text-sm font-black ${expired ? 'text-slate-500 line-through' : 'text-teal-800'}`}>
                            {toPersianDigits(((sess.monthlyFee ?? (sess as any).fee) || 0).toLocaleString())} تومان
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedDetailSession(sess)}
                            className="p-2 text-slate-600 hover:text-teal-700 bg-white hover:bg-teal-50 border border-slate-200 rounded-xl transition-all shadow-2xs"
                            title="مشاهده جزئیات کامل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {expired ? (
                            <button
                              disabled
                              className="px-3.5 py-2 bg-slate-200 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed border border-slate-300 flex items-center gap-1 shrink-0"
                              title="امکان ثبت‌نام وجود ندارد، این دوره منقضی شده است."
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>غیرقابل انتخاب</span>
                            </button>
                          ) : isEnrolled ? (
                            <button
                              disabled
                              className="px-3.5 py-2 bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl border border-emerald-300 shrink-0"
                            >
                              ثبت‌نام شده
                            </button>
                          ) : (
                            <button
                              onClick={() => handleInitiateEnrollment(sess)}
                              className="px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 shrink-0"
                            >
                              <span>انتخاب و ثبت‌نام</span>
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4.5: SHOP & BUFFET INVOICES & PURCHASES */}
      {/* ========================================================================= */}
      {activePortalTab === 'shop' && (
        <div className="space-y-6">
          {/* CREDIT PERMISSION & SHOP SUMMARY BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-amber-500/30 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-200">فاکتورها و خریدهای بوفه / فروشگاه</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    لیست کامل فاکتورهای صادر شده، اقلام تحویلی، وضعیت پرداخت و مانده تسویه بوفه
                  </p>
                </div>
              </div>

              {/* PARENT CREDIT PERMISSION TOGGLE */}
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700 w-full flex items-center justify-between gap-4">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-200 block">خرید نسیه / اعتباری از بوفه:</span>
                    <span className={`text-[11px] font-black ${effectiveUser.allowCreditPurchase ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {effectiveUser.allowCreditPurchase ? 'مجاز و فعال می باشد' : 'غیرفعال (فقط خرید نقدی)'}
                    </span>
                  </div>

                  {(isParent || (userRoles as string[]).includes('admin') || (userRoles as string[]).includes('receptionist') || (userRoles as string[]).includes('secretary') || currentUser?.activeRole === 'admin' || currentUser?.activeRole === 'secretary') ? (
                    <button
                      onClick={() => {
                        const newStatus = !effectiveUser.allowCreditPurchase;
                        dbStore.updateUser(effectiveUser.id, { allowCreditPurchase: newStatus });
                        handleRefreshData();
                        if (newStatus) {
                          if (isParent) {
                            setFancyModal({
                              isOpen: true,
                              title: 'فعال‌سازی مجوز خرید اعتباری (نسیه)',
                              message: `والد گرامی، مجوز خرید اعتباری (نسیه) برای فرزند شما با موفقیت فعال گردید. از این پس ایشان مجاز به ثبت خریدهای اعتباری از بوفه و فروشگاه باشگاه می‌باشند و لیست خریدها و گزارش تراکنش‌های خرید ایشان در پنل کاربری شما به‌صورت یکپارچه قابل مشاهده و پیگیری است.`,
                              type: 'success',
                            });
                          } else {
                            setFancyModal({
                              isOpen: true,
                              title: 'تغییر وضعیت خرید اعتباری',
                              message: `امکان خرید اعتباری بوفه برای ورزشکار ${effectiveUser.fullName} با موفقیت فعال گردید.`,
                              type: 'success',
                            });
                          }
                        } else {
                          setFancyModal({
                            isOpen: true,
                            title: 'تغییر وضعیت خرید اعتباری',
                            message: `امکان خرید اعتباری بوفه برای ورزشکار ${effectiveUser.fullName} با موفقیت غیرفعال گردید.`,
                            type: 'info',
                          });
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 ${
                        effectiveUser.allowCreditPurchase
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
                          : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black'
                      }`}
                    >
                      <span>{effectiveUser.allowCreditPurchase ? 'غیرفعال‌سازی خرید نسیه' : 'فعال‌سازی خرید نسیه'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 bg-slate-700/50 px-2 py-1 rounded-lg border border-slate-600">
                      {effectiveUser.allowCreditPurchase ? 'توسط سرپرست فعال شد' : 'نیازمند مجوز سرپرست/مدیریت'}
                    </span>
                  )}
                </div>

                {isParent && isUserUnder18(effectiveUser.birthDate) && effectiveUser.allowCreditPurchase && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2.5 max-w-md animate-in fade-in slide-in-from-top-1">
                    <span className="text-sm select-none">ℹ️</span>
                    <div>
                      <span className="font-bold text-emerald-300 block mb-0.5">مجوز خرید اعتباری فعال است</span>
                      <span>مجوز خرید اعتباری (نسیه) برای فرزند شما فعال است؛ خریدهای ثبت‌شده در بخش گزارش‌های فروشگاه قابل پیگیری و مشاهده می‌باشد.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SHOP FINANCIAL SUMMARY STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(() => {
                const totalInvoices = userShopInvoices.length;
                const totalAmount = userShopInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

                return (
                  <>
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1">
                      <span className="text-xs text-slate-400 font-bold block">مجموع کل خریدهای بوفه</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-black text-amber-300">
                          {toPersianDigits(totalAmount.toLocaleString())}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">تومان</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        مجموع ارزش خریدهای ثبت شده بوفه و فروشگاه
                      </span>
                    </div>

                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1">
                      <span className="text-xs text-slate-400 font-bold block">تعداد کل فاکتورها</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-black text-emerald-400">
                          {toPersianDigits(totalInvoices)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">عدد</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        تعداد دفعات ثبت فاکتور خرید
                      </span>
                    </div>

                    <div className="bg-slate-800/60 p-4 rounded-xl border border-amber-500/20 flex flex-col justify-center space-y-1">
                      <span className="text-[11px] text-amber-200/90 font-black block">💡 راهنمای تسویه حساب بوفه:</span>
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                        تسویه حساب فاکتورهای نسیه به صورت یکپارچه از طریق پرداختی‌های شما در <span className="text-amber-400 font-bold">«دفتر معین / کاردکس مالی»</span> اعمال و تراز می‌شود و نیازی به تسویه جداگانه تک‌تک فاکتورها نیست.
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* INVOICES LIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>ریز فاکتورها و سوابق خریدهای ورزشکار</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                تعداد: {toPersianDigits(userShopInvoices.length)} فاکتور
              </span>
            </div>

            {userShopInvoices.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">هیچ فاکتور خریدی برای این پرونده ثبت نشده است.</h4>
                <p className="text-xs text-slate-500">
                  خریدهای شما از بوفه و فروشگاه باشگاه پس از تحویل کالا به همراه جزئیات در این بخش قرار می‌گیرند.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userShopInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-amber-300 transition-all space-y-4 bg-slate-50/50"
                  >
                    {/* INVOICE HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 font-mono text-xs font-black px-2.5 py-1 rounded-lg">
                          {inv.invoiceNumber}
                        </span>
                        <div className="text-xs text-slate-600 font-bold">
                          <span>تاریخ خرید: {toPersianDigits(formatJalaliDate(inv.createdAt || inv.date))}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                          }`}
                        >
                          {inv.paymentStatus === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تسویه شده</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>تسویه نشده (نسیه)</span>
                            </>
                          )}
                        </span>

                        <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded-lg">
                          روش: {inv.paymentMethod === 'cash' ? 'نقدی / کارتخوان (POS)' : 'افزودن به حساب شخص (نسیه)'}
                        </span>
                      </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">نام کالا / خدمت</th>
                            <th className="p-2.5 text-center">تعداد</th>
                            <th className="p-2.5 text-center">قیمت واحد</th>
                            <th className="p-2.5 text-left">قیمت کل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {inv.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                              <td className="p-2.5 text-center font-mono font-bold">{toPersianDigits(item.quantity)}</td>
                              <td className="p-2.5 text-center font-mono">{toPersianDigits(item.unitPrice.toLocaleString())}</td>
                              <td className="p-2.5 text-left font-mono font-bold text-amber-800">
                                {toPersianDigits(item.totalPrice.toLocaleString())} تومان
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* INVOICE FOOTER */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                      <div className="text-xs text-slate-600 font-medium">
                        <span>صادرکننده / تحویل‌دهنده: </span>
                        <span className="font-bold text-slate-800">{(inv as any).sellerName || inv.creatorName || 'مدیریت باشگاه'}</span>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-500 font-bold block">مبلغ کل فاکتور:</span>
                          <span className="text-base font-black text-amber-900 font-mono">
                            {toPersianDigits(inv.totalAmount.toLocaleString())} تومان
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedShopInvoice(inv)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>فاکتور</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ATTENDANCE REPORT CARD & STATISTICS */}
      {/* ========================================================================= */}
      {activePortalTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-6 h-6 text-teal-600" />
                  <span>سوابق و کارنامه حضور و غیاب ورزشکار</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ثبت‌نام، تعداد جلسات مجاز، جزییات حضور و غیاب ثبت‌شده توسط مربیان در سانس‌های آموزشی
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">مانده اشتراک:</span>
                <span className="text-lg font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                  {toPersianDigits(remainingPercentage)}٪
                </span>
              </div>
            </div>

            {/* ATTENDANCE PROGRESS BAR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">درصد اشتراک باقیمانده</span>
                <span className="text-teal-700">{toPersianDigits(remainingPercentage)} درصد</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-1000"
                  style={{ width: `${remainingPercentage}%` }}
                />
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1 font-medium">جلسات مجاز</span>
                <span className="text-lg font-black text-slate-900">{toPersianDigits(totalAllowedSessions)}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1 font-medium">تعداد حضور</span>
                <span className="text-lg font-black text-emerald-600">{toPersianDigits(presentCount)}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1 font-medium">تعداد غیبت</span>
                <span className="text-lg font-black text-rose-600">{toPersianDigits(absentCount)}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1 font-medium">غیبت موجه</span>
                <span className="text-lg font-black text-amber-600">{toPersianDigits(excusedCount)}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1 font-medium">تعطیلی باشگاه</span>
                <span className="text-lg font-black text-indigo-600">{toPersianDigits(closedCount)}</span>
              </div>
            </div>

            {/* HISTORY LOG (Mobile Cards + Desktop Table) */}
            <div className="block sm:hidden space-y-3">
              {attendanceRecords.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-xs font-bold">
                  هنوز حضور و غیابی برای این ورزشکار ثبت نشده است.
                </div>
              ) : (
                attendanceRecords.map((att, index) => (
                  <div key={att.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-mono text-[10px] font-bold">
                          {toPersianDigits(index + 1)}
                        </span>
                        <span className="font-black text-xs text-slate-900">
                          {sessions.find((s) => s.id === att.sessionId)?.title || 'سانس تمرینی'}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                          att.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : att.status === 'absent'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : att.status === 'excused'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {att.status === 'present' && '✓ حاضر'}
                        {att.status === 'absent' && '✕ غایب'}
                        {att.status === 'excused' && 'موجه'}
                        {att.status === 'club_closed' && 'تعطیلی باشگاه'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-200/60 text-[11px] font-bold">
                      <div className="text-slate-500">
                        تاریخ: <span className="text-slate-900 font-mono font-black">{toPersianDigits(att.date)}</span>
                      </div>
                      {att.status === 'present' && (
                        <div className="text-slate-500 text-left">
                          ساعت: <span className="text-emerald-700 font-mono">{toPersianDigits(att.checkInTime || '—')}</span> تا <span className="text-rose-700 font-mono">{toPersianDigits(att.checkOutTime || '—')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                      <span>ثبت توسط: {att.recordedBy}</span>
                    </div>

                    {att.reason && (
                      <div className="text-[11px] bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200/60 mt-1 font-medium">
                        توضیحات / عملکرد: {att.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-black">
                    <th className="p-3.5 text-center">#</th>
                    <th className="p-3.5">تاریخ جلسـه</th>
                    <th className="p-3.5">عنوان سانس</th>
                    <th className="p-3.5 text-center">ساعت ورود</th>
                    <th className="p-3.5 text-center">ساعت خروج</th>
                    <th className="p-3.5">وضعیت ثبت‌شده</th>
                    <th className="p-3.5">عملکرد / دلیل غیبت</th>
                    <th className="p-3.5">ثبت توسط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-6 text-slate-500 font-bold">
                        هنوز حضور و غیابی برای این ورزشکار ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((att, index) => (
                      <tr key={att.id} className="hover:bg-slate-50/85 transition-colors">
                        <td className="p-3.5 font-mono text-center font-bold text-slate-400">{toPersianDigits(index + 1)}</td>
                        <td className="p-3.5 font-mono font-black text-slate-900">{toPersianDigits(att.date)}</td>
                        <td className="p-3.5 font-bold text-slate-700">
                          {sessions.find((s) => s.id === att.sessionId)?.title || 'سانس تمرینی'}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-700">
                          {att.status === 'present' ? toPersianDigits(att.checkInTime || '—') : '—'}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-700">
                          {att.status === 'present' ? toPersianDigits(att.checkOutTime || '—') : '—'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                              att.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : att.status === 'excused'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {att.status === 'present' && 'حاضر'}
                            {att.status === 'absent' && 'غایب'}
                            {att.status === 'excused' && 'موجه'}
                            {att.status === 'club_closed' && 'تعطیلی باشگاه'}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-700">
                          {att.reason || <span className="text-slate-300 font-light">—</span>}
                        </td>
                        <td className="p-3.5 text-slate-500 font-medium">{att.recordedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SUPPORT & TICKETING */}
      {/* ========================================================================= */}
      {activePortalTab === 'tickets' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">سامانه پشتیبانی و تیکتینگ باشگاه</h3>
                <p className="text-xs text-slate-500">
                  ارسال مستقیم پیام به مدیریت، مربیان یا امور مالی باشگـاه
                </p>
              </div>

              {!isReadOnlyMode && (
                <button
                  onClick={() => setIsCreatingTicket(!isCreatingTicket)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت تیکت جدید</span>
                </button>
              )}
            </div>

            {/* CREATE TICKET FORM */}
            {isCreatingTicket && !isReadOnlyMode && (
              <form onSubmit={handleCreateTicket} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                <h4 className="font-bold text-sm text-teal-800">ایجاد تیکت پشتیبانی جدید</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">موضوع تیکت</label>
                    <input
                      type="text"
                      required
                      value={newTicketData.subject}
                      onChange={(e) => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                      placeholder="عنوان خلاصه پیام..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">دپارتمان مربوطه</label>
                    <select
                      value={newTicketData.department}
                      onChange={(e) => setNewTicketData({ ...newTicketData, department: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                    >
                      <option value="tuition">امور شهریه و مالی</option>
                      <option value="insurance">بیمه ورزشی</option>
                      <option value="coaching">امور مربیان و سانس‌ها</option>
                      <option value="general">پشتیبانی عمومی</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">اولویت</label>
                    <select
                      value={newTicketData.priority}
                      onChange={(e) => setNewTicketData({ ...newTicketData, priority: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                    >
                      <option value="low">عادی</option>
                      <option value="medium">متوسط</option>
                      <option value="high">مهم</option>
                      <option value="urgent">فوری</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">متن دقیق درخواست</label>
                  <textarea
                    rows={3}
                    required
                    value={newTicketData.message}
                    onChange={(e) => setNewTicketData({ ...newTicketData, message: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-medium"
                    placeholder="جزئیات پیام خود را بنویسید..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTicket(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    ارسال تیکت
                  </button>
                </div>
              </form>
            )}

            {/* TICKETS LIST */}
            <div className="space-y-4">
              {userTickets.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  هنوز هیچ تیکت پشتیبانی ثبت نکرده‌اید.
                </div>
              ) : (
                userTickets.map((t) => (
                  <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-teal-700 font-bold">{toPersianDigits(t.ticketNumber)}</span>
                        <h4 className="font-bold text-sm text-slate-900">{t.subject}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {t.status === 'open' && '⏳ در انتظار بررسی'}
                        {t.status === 'in_progress' && '💬 پاسخ داده شده'}
                        {t.status === 'resolved' && '✓ حل شده'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                      {t.messages[0]?.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-medium">
                      <span>تاریخ ثبت: {toPersianDigits(t.createdAt)}</span>
                      <span>آخرین بروزرسانی: {toPersianDigits(t.lastResponseAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDULE CONFLICT DETECTION MODAL */}
      {/* ========================================================================= */}
      {conflictModalData.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-800">تداخل زمانی در برنامه هفتگی</h3>
                <span className="text-xs text-slate-500">شناسایی تداخل هوشمند سانس‌ها</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              ورزشکار گرامی، سانس انتخابی شما **«{conflictModalData.sessionTitle}»** با دوره ثبت‌نامی فعال قبلی شما **«{conflictModalData.conflictingTitle}»** در روزهای **{conflictModalData.conflictingDays.join('، ')}** (ساعت **{toPersianDigits(conflictModalData.conflictingTime)}**) تداخل زمانی دارد.
              <br />
              <span className="text-rose-600 font-bold block pt-2">
                امکان ثبت‌نام همزمان در دو سانس متداخل وجود ندارد.
              </span>
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConflictModalData({ ...conflictModalData, isOpen: false })}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
              >
                متوجه شدم (انصراف)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REGISTRATION ORDER PAYMENT MODAL */}
      {/* ========================================================================= */}
      {selectedSessionForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">تایید ثبت‌نام در سانس {selectedSessionForOrder.title}</h3>
              <button
                onClick={() => setSelectedSessionForOrder(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-emerald-800">ثبت‌نام اولیه شما با موفقیت انجام شد!</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200/80">
                  اطلاعات دوره **{selectedSessionForOrder.title}** به لیست دوره‌های شما اضافه شد. وضعیت پرداخت شهریه تا زمان بررسی و تأیید سند توسط مدیریت به‌صورت «در انتظار بررسی» است.
                </p>
                <button
                  onClick={() => setSelectedSessionForOrder(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  متوجه شدم و بازگشت به پنل
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ورزشکار:</span>
                    <span className="text-slate-900 font-bold">{effectiveUser.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مبلغ شهریه دوره:</span>
                    <span className="text-teal-700 font-bold">
                      {toPersianDigits(((selectedSessionForOrder.monthlyFee ?? (selectedSessionForOrder as any).fee) || 0).toLocaleString())} تومان
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    توجه: ثبت‌نام شما بلافاصله ثبت می‌شود، ولی تسویه نهایی شهریه پس از بررسی و تأیید مدیریت انجام می‌پذیرد.
                  </span>
                </div>

                {/* Date Range Selection */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">بازه زمانی و تاریخ اشتراک دوره:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        تاریخ شروع دوره (شمسی) <span className="text-rose-500">*</span>
                      </label>
                      <JalaliDatePicker
                        value={orderStartDate}
                        onChange={setOrderStartDate}
                        placeholder="تاریخ شروع..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        تاریخ پایان دوره (شمسی) <span className="text-rose-500">*</span>
                      </label>
                      <JalaliDatePicker
                        value={orderEndDate}
                        onChange={setOrderEndDate}
                        placeholder="تاریخ پایان..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">روش پرداخت</label>
                  <select
                    value={orderPaymentMethod}
                    onChange={(e) => setOrderPaymentMethod(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-medium"
                  >
                    <option value="card_to_card">کارت به کارت (واریز به حساب)</option>
                    <option value="pos">دستگاه کارتخوان باشگاه</option>
                    <option value="online">درگاه آنلاین شتاب</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">شماره پیگیری / کد ارجاع واریزی</label>
                  <input
                    type="text"
                    value={orderTrackingNo}
                    onChange={(e) => setOrderTrackingNo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-medium"
                    placeholder="مثلاً ۶۵۴۳۲۱"
                  />
                </div>

                {/* File / Receipt Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">تصویر یا سند فیش واریزی (اختیاری)</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-3 text-center transition-all bg-slate-50">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleReceiptFileSelect(e, true)}
                      className="hidden"
                      id="order-receipt-upload"
                    />
                    <label htmlFor="order-receipt-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                      <Upload className="w-5 h-5 text-teal-600" />
                      <span className="text-xs text-slate-700 font-bold">
                        {orderReceiptFileName ? `انتخاب شد: ${orderReceiptFileName}` : 'کلیک کنید جهت بارگذاری فیش واریزی'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">تصویر یا فایل PDF تا سقف ۱۰ مگابایت</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedSessionForOrder(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleConfirmEnrollment}
                    disabled={isSubmittingOrder}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>در حال ثبت‌نام...</span>
                      </>
                    ) : (
                      <span>تایید و ثبت‌نام دوره</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ATTACH / UPLOAD RECEIPT MODAL FOR EXISTING TRANSACTIONS */}
      {/* ========================================================================= */}
      {attachingTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-600" />
                <span>پیوست سند / فیش واریزی</span>
              </h3>
              <button
                onClick={() => setAttachingTrx(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttachedReceipt} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">موضوع:</span>
                  <span className="font-bold text-slate-900">{attachingTrx.description || attachingTrx.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مبلغ:</span>
                  <span className="font-bold text-teal-700">{toPersianDigits((attachingTrx.amount || 0).toLocaleString())} تومان</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">شماره پیگیری / ارجاع واریز</label>
                <input
                  type="text"
                  value={uploadTrackingNo}
                  onChange={(e) => setUploadTrackingNo(e.target.value)}
                  placeholder="مثلاً ۱۲۳۴۵۶"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">تصویر یا سند فیش واریزی</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center transition-all bg-slate-50">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleReceiptFileSelect(e, false)}
                    className="hidden"
                    id="attach-receipt-file"
                  />
                  <label htmlFor="attach-receipt-file" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-teal-600" />
                    <span className="text-xs text-slate-700 font-bold">
                      {uploadReceiptFileName ? `فایل انتخاب شده: ${uploadReceiptFileName}` : 'انتخاب تصویر فیش واریزی'}
                    </span>
                    <span className="text-[10px] text-slate-400">تصویر یا فایل PDF تا سقف ۱۰ مگابایت</span>
                  </label>
                </div>
              </div>

              {uploadReceiptUrl && (
                <div className="bg-teal-50 border border-teal-200 p-2 rounded-xl flex items-center justify-between text-xs text-teal-800">
                  <span className="truncate max-w-[200px] font-medium">{uploadReceiptFileName || 'فایل واریزی'}</span>
                  <span className="font-bold text-emerald-600">✓ آماده ارسال</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAttachingTrx(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  ثبت و ارسال سند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM INSTALLMENT / PARTIAL PAYMENT MODAL */}
      {/* ========================================================================= */}
      {isCustomPaying && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-600" />
                <span>ثبت فیش پرداخت جدید (اقساطی یا علی‌الحساب)</span>
              </h3>
              <button
                onClick={() => setIsCustomPaying(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomPayment} className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl text-xs text-teal-800 leading-relaxed font-medium">
                شما می‌توانید کل یا بخشی از بدهی خود را پرداخت نموده و فیش آن را ثبت نمایید. این تراکنش پس از تایید مدیریت فعال شده و در دفتر معین شما اعمال خواهد شد.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">مبلغ پرداختی (تومان)</label>
                <input
                  type="text"
                  required
                  value={customPayAmount}
                  onChange={(e) => {
                    // Only allow digits and commas
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val) {
                      setCustomPayAmount(parseFloat(val).toLocaleString());
                    } else {
                      setCustomPayAmount('');
                    }
                  }}
                  placeholder="مثلاً ۳۰۰,۰۰۰"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-500"
                />
                {customPayAmount && (
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    مبلغ وارد شده: {toPersianDigits(customPayAmount)} تومان
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">روش پرداخت</label>
                <select
                  value={customPayMethod}
                  onChange={(e) => setCustomPayMethod(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none"
                >
                  <option value="card_to_card">کارت به کارت</option>
                  <option value="online">درگاه آنلاین</option>
                  <option value="pos">کارتخوان</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">شماره پیگیری / ارجاع</label>
                <input
                  type="text"
                  required
                  value={customPayTrackingNo}
                  onChange={(e) => setCustomPayTrackingNo(e.target.value)}
                  placeholder="مثلاً ۹۸۷۶۵۴۳۲۱"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">توضیحات و بابت پرداخت</label>
                <input
                  type="text"
                  value={customPayDescription}
                  onChange={(e) => setCustomPayDescription(e.target.value)}
                  placeholder="بابت قسط اول، شهریه مرداد و ..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">تصویر یا سند فیش واریزی</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center transition-all bg-slate-50">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleReceiptFileSelect(e, 'custom')}
                    className="hidden"
                    id="custom-receipt-file"
                  />
                  <label htmlFor="custom-receipt-file" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-teal-600" />
                    <span className="text-xs text-slate-700 font-bold">
                      {customPayReceiptFileName ? `فایل: ${customPayReceiptFileName}` : 'انتخاب تصویر فیش واریزی'}
                    </span>
                    <span className="text-[10px] text-slate-400">تصویر یا فایل PDF تا سقف ۱۰ مگابایت</span>
                  </label>
                </div>
              </div>

              {customPayReceiptUrl && (
                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <span className="truncate max-w-[200px] font-medium">{customPayReceiptFileName || 'فایل واریزی'}</span>
                  <span className="font-bold text-emerald-600">✓ آماده بارگذاری</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCustomPaying(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  ثبت نهایی فیش پرداخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW RECEIPT DOCUMENT MODAL */}
      {/* ========================================================================= */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <span>{viewingReceipt.title}</span>
              </h3>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 rounded-xl p-2 border border-slate-200 min-h-[250px] max-h-[450px] overflow-auto flex items-center justify-center">
              {viewingReceipt.url.startsWith('data:image/') || viewingReceipt.url.startsWith('http') ? (
                <img
                  src={viewingReceipt.url}
                  alt="فیش واریزی"
                  className="max-w-full max-h-[400px] object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="text-center py-10 space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    {viewingReceipt.fileName || 'سند فیش واریزی (PDF)'}
                  </p>
                  <a
                    href={viewingReceipt.url}
                    download={viewingReceipt.fileName || 'receipt.pdf'}
                    className="inline-block px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
                  >
                    دانلود سند
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 text-xs">
              <span className="text-slate-500 font-medium">{viewingReceipt.fileName || 'فایل واریزی'}</span>
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedDetailSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs dir-rtl animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className={`p-5 text-white flex items-center justify-between shrink-0 ${
              isSessionExpired(selectedDetailSession)
                ? 'bg-gradient-to-r from-rose-700 to-slate-800'
                : 'bg-gradient-to-r from-teal-800 to-slate-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Mountain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">{selectedDetailSession.title}</h3>
                  <p className="text-xs text-white/80 font-bold">
                    رشته: {selectedDetailSession.sportType} | سطح: {selectedDetailSession.level || 'عمومی'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailSession(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Status Alert Banner */}
              {isSessionExpired(selectedDetailSession) ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-bold flex items-center gap-2">
                  <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="block font-black text-rose-900">این دوره منقضی شده است.</span>
                    تاریخ برگزاری یا مهلت ثبت‌نام این سانس به اتمام رسیده و دیگر جهت انتخاب یا ثبت‌نام جدید در دسترس نمی‌باشد.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-black text-emerald-900">دوره فعال و آماده ثبت‌نام</span>
                    امکان بررسی پایش تداخل‌های کاری و ثبت‌نام آنلاین برای این سانس فراهم می‌باشد.
                  </div>
                </div>
              )}

              {/* Grid Specifications */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-bold text-[10px] block">استاد / مربی:</span>
                  <span className="font-black text-slate-900 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    {selectedDetailSession.coachName}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-bold text-[10px] block">روزهای هفته:</span>
                  <span className="font-black text-slate-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    {selectedDetailSession.daysOfWeek.join('، ')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-bold text-[10px] block">ساعت سانس:</span>
                  <span className="font-black text-slate-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    {toPersianDigits(selectedDetailSession.startTime)} تا {toPersianDigits(selectedDetailSession.endTime)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-bold text-[10px] block">سالن / بخش:</span>
                  <span className="font-black text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    {selectedDetailSession.locationRoom || 'سالن اصلی باشگاه'}
                  </span>
                </div>

                {selectedDetailSession.startDate && selectedDetailSession.endDate && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 col-span-2">
                    <span className="text-slate-400 font-bold text-[10px] block">بازه دقیق برگزاری دوره:</span>
                    <span className="font-mono font-bold text-slate-800">
                      از {toPersianDigits(selectedDetailSession.startDate)} تا {toPersianDigits(selectedDetailSession.endDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Course Description */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-slate-900">سرفصل‌ها و توضیحات کامل دوره:</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {selectedDetailSession.description || 'توضیحات و سرفصل آموزشی این سانس تمرینی در این بخش درج شده است.'}
                </p>
              </div>

              {/* Price & Capacity Summary */}
              <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 block">شهریه ماهانه:</span>
                  <span className="text-base font-black text-teal-900">
                    {toPersianDigits(((selectedDetailSession.monthlyFee ?? (selectedDetailSession as any).fee) || 0).toLocaleString())} تومان
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-teal-700 block">ظرفیت کل سانس:</span>
                  <span className="text-sm font-black text-teal-900">
                    {toPersianDigits(selectedDetailSession.capacity)} نفر
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setSelectedDetailSession(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                بستن
              </button>

              {isSessionExpired(selectedDetailSession) ? (
                <button
                  disabled
                  className="px-5 py-2.5 bg-slate-300 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed border border-slate-400 flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>این دوره منقضی شده است</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const sess = selectedDetailSession;
                    setSelectedDetailSession(null);
                    handleInitiateEnrollment(sess);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>ثبت‌نام در این دوره</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shop Invoice Detail Modal */}
      {selectedShopInvoice && (
        <ShopInvoiceDetailModal
          invoice={selectedShopInvoice}
          onClose={() => setSelectedShopInvoice(null)}
        />
      )}

      {/* Fancy Custom Message Modal (Anti-Slop, Ultra-Elegant) */}
      {fancyModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-4">
              <div className={`p-3.5 rounded-2xl shrink-0 border ${
                fancyModal.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : fancyModal.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                {fancyModal.type === 'success' ? (
                  <CheckSquare className="w-6 h-6" />
                ) : fancyModal.type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <div className="text-right">
                <h4 className="font-black text-slate-900 text-base leading-tight">
                  {fancyModal.title}
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed text-right whitespace-pre-line font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {fancyModal.message}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setFancyModal({ ...fancyModal, isOpen: false })}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Membership Card Modal */}
      <DigitalMembershipCardModal
        user={effectiveUser}
        isOpen={isMembershipCardOpen}
        onClose={() => setIsMembershipCardOpen(false)}
        enrollments={enrollments}
        sessions={sessions}
      />
    </div>
  );
};
