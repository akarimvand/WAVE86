import React, { useState, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Clock,
  Receipt,
  Check,
  X,
  FileText,
  Printer,
  User,
  Wallet,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Edit3,
  Trash2,
  Eye,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  CheckCheck,
  Calendar,
  ChevronDown,
  RefreshCw,
  Info,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { FinancialTransaction, User as UserType, DebtorRecord, ShopInvoice } from '../types';
import { toPersianDigits, toEnglishDigits, numberToPersianWords } from '../utils/nationalIdValidator';
import { getCurrentJalaliDate, formatJalaliDate } from '../utils/jalaliDate';
import { JalaliDatePicker } from './JalaliDatePicker';
import { ShopInvoiceDetailModal } from './ShopInvoiceDetailModal';
import { uploadFileToServer } from '../utils/fileUploader';

interface FinancialAccountingViewProps {
  currentUser?: UserType | null;
}

export const FinancialAccountingView: React.FC<FinancialAccountingViewProps> = ({ currentUser }) => {
  // Current operator / actor name
  const currentActorName = currentUser?.fullName
    ? `${currentUser.fullName} (${
        currentUser.activeRole === 'super_admin'
          ? 'مدیر ارشد'
          : currentUser.activeRole === 'admin'
          ? 'مدیر'
          : currentUser.activeRole === 'secretary'
          ? 'پذیرش'
          : 'حسابدار'
      })`
    : 'حسابدار سیستم';

  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => dbStore.getTransactions());
  const [users, setUsers] = useState<UserType[]>(() => dbStore.getUsers());
  const [enrollments, setEnrollments] = useState(() => dbStore.getEnrollments());
  const [sessions, setSessions] = useState(() => dbStore.getSessions());
  const [debtors, setDebtors] = useState<DebtorRecord[]>(() => dbStore.getDebtors());

  React.useEffect(() => {
    const handleDbUpdate = () => {
      setTransactions([...dbStore.getTransactions()]);
      setUsers([...dbStore.getUsers()]);
      setEnrollments([...dbStore.getEnrollments()]);
      setSessions([...dbStore.getSessions()]);
      setDebtors([...dbStore.getDebtors()]);
    };

    window.addEventListener('dbStoreUpdated', handleDbUpdate);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleDbUpdate);
    };
  }, []);

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

  // Receipt & Delete Confirmation States
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; fileName?: string; title: string } | null>(null);
  const [deleteConfirmTrx, setDeleteConfirmTrx] = useState<FinancialTransaction | null>(null);
  const [selectedShopInvoice, setSelectedShopInvoice] = useState<ShopInvoice | null>(null);

  // Mode: 'transactions' | 'cardex' | 'balance_panel' | 'debt_management'
  const [viewMode, setViewMode] = useState<'transactions' | 'cardex' | 'balance_panel' | 'debt_management'>('balance_panel');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'creditor' | 'debtor' | 'settled'>('all');

  // Cardex State
  const [cardexUserId, setCardexUserId] = useState<string>(() => (users.length > 0 ? users[0].id : ''));
  const [cardexSearchQuery, setCardexSearchQuery] = useState(() => {
    const defaultUser = users.find(u => u.id === (users.length > 0 ? users[0].id : ''));
    return defaultUser ? defaultUser.fullName : '';
  });
  const [isCardexDropdownOpen, setIsCardexDropdownOpen] = useState(false);

  React.useEffect(() => {
    const selectedUser = users.find(u => u.id === cardexUserId);
    if (selectedUser && cardexSearchQuery !== selectedUser.fullName && !isCardexDropdownOpen) {
      setCardexSearchQuery(selectedUser.fullName);
    }
  }, [cardexUserId, users]);

  // New Transaction / Deposit Receipt Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FinancialTransaction['type']>('tuition');
  const [method, setMethod] = useState<FinancialTransaction['method']>('pos');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [description, setDescription] = useState('');
  const [trxDate, setTrxDate] = useState<string>(() => formatJalaliDate(getCurrentJalaliDate()));
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAddTransactionModal = (presetUserId?: string) => {
    const targetId = presetUserId || cardexUserId || (users.length > 0 ? users[0].id : '');
    setSelectedUserId(targetId);
    const targetUser = users.find((u) => u.id === targetId);
    setUserSearchQuery(targetUser ? targetUser.fullName : '');
    setIsUserDropdownOpen(false);
    setAmount(''); // Clean empty state for conscious input
    setType('tuition');
    setMethod('pos');
    setTrackingNumber('');
    setDescription('');
    setTrxDate(formatJalaliDate(getCurrentJalaliDate()));
    setReceiptUrl(null);
    setReceiptFileName(null);
    setIsConfirmModalOpen(false);
    setIsAddModalOpen(true);
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawEnglish = toEnglishDigits(e.target.value).replace(/\D/g, '');
    setAmount(rawEnglish);
  };

  const handleReceiptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }

    const targetUser = users.find((u) => u.id === selectedUserId);
    const cleanNatId = (targetUser?.nationalId || '0000000000').replace(/\D/g, '');
    const cleanDate = (trxDate || formatJalaliDate(getCurrentJalaliDate())).replace(/\//g, '');
    const cleanTrack = trackingNumber ? trackingNumber.replace(/\D/g, '') : `${Date.now().toString().slice(-4)}`;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const standardizedName = `${cleanNatId}_receipt_${cleanDate}_${cleanTrack}.${ext}`;

    try {
      const res = await uploadFileToServer(file, {
        prefix: 'receipt',
        customName: `${cleanNatId}_${cleanTrack}`,
        subDir: 'receipts',
      });
      if (res.success && res.url) {
        setReceiptUrl(res.url);
        setReceiptFileName(standardizedName);
      } else {
        alert(res.error || 'خطا در بارگذاری تصویر فیش روی سرور');
      }
    } catch {
      alert('خطا در ارتباط با سرور جهت بارگذاری فیش');
    }
  };

  // Edit Transaction Modal State
  const [editingTrx, setEditingTrx] = useState<FinancialTransaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<FinancialTransaction['type']>('tuition');
  const [editMethod, setEditMethod] = useState<FinancialTransaction['method']>('pos');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'completed' | 'pending' | 'rejected'>('completed');

  // New Manual Debt States
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [debtUserId, setDebtUserId] = useState('');
  const [debtAmount, setDebtAmount] = useState('150000');
  const [debtCategory, setDebtCategory] = useState<DebtorRecord['category']>('other');
  const [debtCategoryTitle, setDebtCategoryTitle] = useState('خسارت به وسایل باشگاه');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtNotes, setDebtNotes] = useState('');
  const [debtStatus, setDebtStatus] = useState<DebtorRecord['status']>('due_soon');

  // Edit Debt States
  const [editingDebtor, setEditingDebtor] = useState<DebtorRecord | null>(null);
  const [editDebtAmount, setEditDebtAmount] = useState('');
  const [editDebtCategory, setEditDebtCategory] = useState<DebtorRecord['category']>('other');
  const [editDebtCategoryTitle, setEditDebtCategoryTitle] = useState('');
  const [editDebtDueDate, setEditDebtDueDate] = useState('');
  const [editDebtNotes, setEditDebtNotes] = useState('');
  const [editDebtStatus, setEditDebtStatus] = useState<DebtorRecord['status']>('due_soon');

  const openEditDebtModal = (debtor: DebtorRecord) => {
    setEditingDebtor(debtor);
    setEditDebtAmount((debtor.amount || 0).toString());
    setEditDebtCategory(debtor.category);
    setEditDebtCategoryTitle(debtor.categoryTitle);
    setEditDebtDueDate(debtor.dueDate);
    setEditDebtNotes(debtor.notes || '');
    setEditDebtStatus(debtor.status);
  };

  const handleSaveEditDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebtor) return;

    dbStore.updateDebtor(
      editingDebtor.id,
      {
        amount: parseInt(editDebtAmount, 10) || 0,
        category: editDebtCategory,
        categoryTitle: editDebtCategoryTitle,
        dueDate: editDebtDueDate,
        notes: editDebtNotes || undefined,
        status: editDebtStatus,
      },
      'حسابدار سیستم'
    );

    refreshData();
    setEditingDebtor(null);
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtUserId) return;

    const userObj = users.find((u) => u.id === debtUserId);
    if (!userObj) return;

    dbStore.addDebtor(
      {
        userId: userObj.id,
        fullName: userObj.fullName,
        nationalId: userObj.nationalId,
        phone: userObj.phone || '09120000000',
        category: debtCategory,
        categoryTitle: debtCategoryTitle,
        amount: parseInt(debtAmount, 10) || 0,
        dueDate: debtDueDate || formatJalaliDate(getCurrentJalaliDate()),
        status: debtStatus,
        notes: debtNotes || undefined,
      },
      'حسابدار سیستم'
    );

    refreshData();
    setIsAddDebtModalOpen(false);
    setDebtUserId('');
    setDebtAmount('150000');
    setDebtCategory('other');
    setDebtCategoryTitle('خسارت به وسایل باشگاه');
    setDebtDueDate('');
    setDebtNotes('');
  };

  const openEditTrxModal = (trx: FinancialTransaction) => {
    setEditingTrx(trx);
    setEditAmount((trx.amount || 0).toString());
    setEditType(trx.type);
    setEditMethod(trx.method);
    setEditTrackingNumber(trx.trackingNumber || '');
    setEditDescription(trx.description || '');
    setEditStatus(trx.status);
  };

  const handleSaveEditTrx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrx) return;

    const newAmount = parseInt(editAmount, 10) || 0;

    if (editMethod === 'wallet' && editStatus === 'completed') {
      const bal = getUserBalanceInfo(editingTrx.userId);
      const originalMethod = editingTrx.method;
      const originalAmount = editingTrx.amount || 0;
      
      const availableCredit = originalMethod === 'wallet' ? (bal.creditAmount + originalAmount) : bal.creditAmount;
      
      if (availableCredit < newAmount) {
        alert(`خطا: موجودی کیف پول کاربر برای این ویرایش کافی نیست!\nموجودی در دسترس: ${availableCredit.toLocaleString('fa-IR')} تومان\nمبلغ درخواستی جدید: ${newAmount.toLocaleString('fa-IR')} تومان`);
        return;
      }
    }

    dbStore.updateTransaction(
      editingTrx.id,
      {
        amount: newAmount,
        type: editType,
        method: editMethod,
        trackingNumber: editTrackingNumber || undefined,
        description: editDescription,
        status: editStatus,
      },
      'مدیر کل / حسابدار'
    );

    refreshData();
    setEditingTrx(null);
  };

  const handleDeleteTrx = () => {
    if (!editingTrx) return;
    setDeleteConfirmTrx(editingTrx);
  };

  const confirmDeleteTrx = () => {
    if (!deleteConfirmTrx) return;
    dbStore.deleteTransaction(deleteConfirmTrx.id, 'مدیر کل / حسابدار');
    refreshData();
    setDeleteConfirmTrx(null);
    setEditingTrx(null);
  };

  const refreshData = () => {
    setTransactions(dbStore.getTransactions());
    setUsers(dbStore.getUsers());
    setEnrollments(dbStore.getEnrollments());
    setSessions(dbStore.getSessions());
    setDebtors(dbStore.getDebtors());
  };

  const handlePreSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('لطفاً یک ورزشکار یا عضو را به عنوان واریزکننده انتخاب نمایید.');
      return;
    }

    const userObj = users.find((u) => u.id === selectedUserId);
    if (!userObj) {
      alert('کاربر انتخاب‌شده معتبر نیست.');
      return;
    }

    const amt = parseInt(amount, 10) || 0;
    if (amt <= 0) {
      alert('مبلغ واریزی باید بزرگتر از صفر باشد.');
      return;
    }

    if (type === 'wallet_deposit' && method === 'wallet') {
      alert('خطا: روش پرداخت برای شارژ کیف پول نمی‌تواند خود کیف پول باشد!');
      return;
    }

    if (method === 'wallet') {
      const bal = getUserBalanceInfo(userObj.id);
      if (bal.creditAmount < amt) {
        alert(`خطا: موجودی کیف پول کاربر کافی نیست!\nموجودی فعلی: ${bal.creditAmount.toLocaleString('fa-IR')} تومان\nمبلغ درخواستی: ${amt.toLocaleString('fa-IR')} تومان`);
        return;
      }
    }

    setIsConfirmModalOpen(true);
  };

  const handleFinalConfirmTransaction = () => {
    if (!selectedUserId) return;
    const userObj = users.find((u) => u.id === selectedUserId);
    if (!userObj) return;

    const amt = parseInt(amount, 10) || 0;

    dbStore.addTransaction(
      {
        userId: userObj.id,
        userName: userObj.fullName,
        userNationalId: userObj.nationalId,
        amount: amt,
        type,
        method,
        trackingNumber: trackingNumber ? trackingNumber.trim() : undefined,
        description: description ? description.trim() : `پرداخت بابت ${getTypeLabel(type)}`,
        status: 'completed',
        createdAt: trxDate || formatJalaliDate(getCurrentJalaliDate()),
        receiptUrl: receiptUrl || undefined,
        receiptFileName: receiptFileName || undefined,
        createdBy: currentActorName,
      },
      currentActorName
    );

    refreshData();
    setIsConfirmModalOpen(false);
    setIsAddModalOpen(false);
    setSelectedUserId('');
    setUserSearchQuery('');
    setTrackingNumber('');
    setDescription('');
    setReceiptUrl(null);
    setReceiptFileName(null);
  };

  const handleUpdateStatus = (id: string, newStatus: 'completed' | 'pending' | 'rejected') => {
    dbStore.updateTransactionStatus(id, newStatus, 'حسابدار سیستم');
    refreshData();
  };

  const getTypeLabel = (t: FinancialTransaction['type'], description?: string) => {
    if (description && (description.includes('فاکتور') || description.includes('INV-'))) {
      return 'فاکتور فروشگاه';
    }
    switch (t) {
      case 'tuition':
        return 'شهریه ماهیانه دوره';
      case 'single_session':
        return 'ورودی تک‌جلسه‌ای';
      case 'insurance':
        return 'کارت بیمه ورزشی';
      case 'equipment':
        return 'تجهیزات و فروشگاه';
      case 'charge':
        return 'شارژ/منظور به حساب';
      default:
        return 'متفرقه';
    }
  };

  const getMethodLabel = (m: FinancialTransaction['method']) => {
    switch (m) {
      case 'pos':
        return 'دستگاه پوز (کارت‌خوان)';
      case 'card_to_card':
        return 'کارت به کارت';
      case 'cash':
        return 'نقدی';
      case 'online':
        return 'درگاه آنلاین';
      default:
        return m;
    }
  };

  const buildUserLedger = (userId: string) => {
    const userObj = users.find((u) => u.id === userId);
    if (!userObj) return [];

    const ledger: any[] = [];
    const balanceTransactions = transactions.filter((t) => t.userId === userId);

    // 1. Enrollments (Dues) - only active and expired (non-canceled)
    const userEnrollments = enrollments.filter((e) => e.userId === userId && e.status !== 'canceled');
    userEnrollments.forEach((e) => {
      const sess = sessions.find((s) => s.id === e.sessionId);
      const fee = sess ? sess.monthlyFee : 0;
      ledger.push({
        id: `enr-${e.id}`,
        date: e.enrolledAt || '1405/01/01',
        description: `ثبت‌نام در دوره: ${sess?.title || 'برنامه ورزشی'}`,
        debit: fee,
        credit: 0,
        status: 'completed', // Charges are official
        type: 'tuition_charge',
        ref: e.id,
      });
    });

    // 2. Debtor Records (Manual Dues)
    const activeEnrollments = enrollments.filter((e) => e.userId === userId && e.status === 'active');
    const userDebtorRecords = debtors.filter(
      (d) => d.userId === userId || (userObj && d.nationalId && d.nationalId !== '0000000000' && d.nationalId === userObj.nationalId)
    );
    userDebtorRecords.forEach((d) => {
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
        const hasShopCharge = balanceTransactions.some(
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
    balanceTransactions.forEach((t) => {
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
          createdBy: t.createdBy,
        });
      } else {
        // Payments
        ledger.push({
          id: `trx-${t.id}`,
          date: t.createdAt,
          description: (() => {
            const d = (t.description || '').trim();
            if (!d) return 'پرداخت بابت خدمات/فروشگاه';
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
          createdBy: t.createdBy,
        });
      }
    });

    // Sort chronologically by date string, and if dates are equal, by creation timestamp ascending or ID string locale comparison
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

  // Helper for per-user financial balance breakdown (derived from buildUserLedger for complete precision)
  const getUserBalanceInfo = (userId: string) => {
    // buildUserLedger returns ledger in descending order (latest first)
    const ledger = buildUserLedger(userId);
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

  // All users balance list
  const userBalances = users.map((u) => {
    const bal = getUserBalanceInfo(u.id);
    return {
      user: u,
      ...bal,
    };
  });

  const filteredBalances = userBalances.filter((item) => {
    if (!item?.user) return false;
    const name = item.user.fullName || '';
    const natId = item.user.nationalId || '';
    const phone = item.user.phone || '';
    const matchesSearch =
      name.includes(searchTerm) ||
      natId.includes(searchTerm) ||
      phone.includes(searchTerm);
    const matchesStatus = balanceFilter === 'all' || item.status === balanceFilter;
    return matchesSearch && matchesStatus;
  });

  // Global Statistics
  const totalSystemDebts = userBalances.reduce((sum, b) => sum + b.debtAmount, 0);
  const totalSystemCredits = userBalances.reduce((sum, b) => sum + b.creditAmount, 0);
  const totalCreditorCount = userBalances.filter((b) => b.status === 'creditor').length;
  const totalDebtorCount = userBalances.filter((b) => b.status === 'debtor').length;

  const filteredTransactions = transactions
    .filter((trx) => {
      const uName = trx?.userName || '';
      const uNatId = trx?.userNationalId || '';
      const trackNum = trx?.trackingNumber || '';
      const matchesSearch =
        uName.includes(searchTerm) ||
        uNatId.includes(searchTerm) ||
        (trackNum && trackNum.includes(searchTerm));
      const matchesType = typeFilter === 'all' || trx.type === typeFilter;
      const matchesMethod = methodFilter === 'all' || trx.method === methodFilter;
      return matchesSearch && matchesType && matchesMethod;
    })
    .sort((a, b) => {
      // Sort strictly from newest to oldest
      const tsA = parseInt((a.id.match(/\d{13}/) || ['0'])[0], 10);
      const tsB = parseInt((b.id.match(/\d{13}/) || ['0'])[0], 10);
      if (tsA > 0 && tsB > 0 && tsA !== tsB) {
        return tsB - tsA;
      }
      const dateA = a.createdAt || '';
      const dateB = b.createdAt || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return b.id.localeCompare(a.id);
    });

  // Financial Statistics Calculations
  const totalRevenue = transactions
    .filter((t) => t.status === 'completed' && t.type !== 'charge' && t.type !== 'penalty')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const completedCount = transactions.filter((t) => t.status === 'completed').length;
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

  // Selected Cardex Calculations
  const cardexUser = users.find((u) => u.id === cardexUserId);
  const cardexTransactions = cardexUserId ? dbStore.getUserTransactions(cardexUserId) : [];
  const cardexBalance = cardexUserId ? getUserBalanceInfo(cardexUserId) : null;
  const cardexLedger = cardexUserId ? buildUserLedger(cardexUserId) : [];
  const lastPayment = cardexTransactions.length > 0 ? cardexTransactions[0] : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">مدیریت مالی، بالانس حساب و کاردکس شهریه</h2>
            <p className="text-xs text-slate-500 mt-1">
              محاسبه بدهی‌ها، ذخیره پرداخت‌های مازاد به عنوان اعتبار حساب کاربر و صدور فاکتور و کاردکس انفرادی
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode('balance_panel')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'balance_panel' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              پنل بالانس و اعتبار مالی
            </button>
            <button
              onClick={() => setViewMode('cardex')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cardex' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              کاردکس مالی فردی
            </button>
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'transactions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دفتر تراکنش‌ها
            </button>
            <button
              onClick={() => setViewMode('debt_management')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'debt_management' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              مدیریت بدهی‌ها (مطالبات)
            </button>
          </div>

          <button
            onClick={() => {
              openAddTransactionModal(cardexUserId);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-teal-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            ثبت واریزی / فیش جدید
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: BALANCE PANEL (پنل بالانس و اعتبار مالی) */}
      {viewMode === 'balance_panel' && (
        <div className="space-y-6">
          {/* Balance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-emerald-200/80 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
                <span>اعتبار مازاد و بستانکاری اعضا</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-black text-emerald-700">
                {toPersianDigits(totalSystemCredits.toLocaleString('fa-IR'))} <span className="text-xs font-bold text-slate-500">تومان</span>
              </p>
              <p className="text-[10px] text-emerald-600/90 font-medium">
                ذخیره‌شده در کیف پول اعضا برای دوره‌های بعدی
              </p>
            </div>

            <div className="bg-white border border-rose-200/80 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
                <span>کل مطالبات و بدهی اعضا</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-black text-rose-700">
                {toPersianDigits(totalSystemDebts.toLocaleString('fa-IR'))} <span className="text-xs font-bold text-slate-500">تومان</span>
              </p>
              <p className="text-[10px] text-rose-600/90 font-medium">
                مجموع شهریه‌های معوقه ورزشکاران
              </p>
            </div>

            <div className="bg-white border border-teal-200/80 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-teal-800 text-xs font-bold">
                <span>اعضای دارای اعتبار مازاد</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900">{toPersianDigits(totalCreditorCount)} نفر</p>
              <p className="text-[10px] text-slate-500 font-medium">
                پرداخت بیش از مبلغ شهریه موظف
              </p>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                <span>اعضای بدهکار</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-black text-amber-700">{toPersianDigits(totalDebtorCount)} نفر</p>
              <p className="text-[10px] text-amber-600/90 font-medium">
                نیازمند پیگیری و تسویه
              </p>
            </div>
          </div>

          {/* Explanation Banner for Overpayments */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-2xl shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-300">قانون ذخیره اعتبار مازاد (بستانکاری)</h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  چنانچه کاربر یا ولی وی، مبلـغی مازاد بر شهریه دوره واریز نماید، این مبلغ به صورت <strong className="text-emerald-300">«اعتبار کیف پول مالی»</strong> در پرونده کاربر محفوظ می‌ماند و در ثبت‌نام دوره‌های آتی یا خرید تجهیزات تسویه می‌شود.
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی نام، کد ملی یا شماره همراه..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-600">فیلتر وضعیت بالانس:</span>
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">همه اعضا</option>
                <option value="creditor">بستانکار (دارای اعتبار مازاد)</option>
                <option value="debtor">بدهکار (دارای مانده بدهی)</option>
                <option value="settled">تسویه حساب کامل</option>
              </select>
            </div>
          </div>

          {/* Balance Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600" />
                جدول بالانس مالی تفکیکی اعضای باشگاه
              </h3>
              <span className="text-xs font-bold text-slate-500">
                تعداد: {toPersianDigits(filteredBalances.length)} کاربر
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/70 text-slate-700 font-black border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">نام و مشخصات ورزشکار</th>
                    <th className="p-3.5">کل شهریه موظف (تومان)</th>
                    <th className="p-3.5">کل پرداختی‌ها (تومان)</th>
                    <th className="p-3.5">وضعیت بالانس و اعتبار</th>
                    <th className="p-3.5 text-center">جزئیات و عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        کاربری مطابق جستجو و فیلتر پیدا نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((item) => (
                      <tr key={item.user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{item.user.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            کد ملی: {toPersianDigits(item.user.nationalId)} | همراه: {toPersianDigits(item.user.phone)}
                          </p>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {toPersianDigits(item.totalDues.toLocaleString('fa-IR'))}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700">
                          {toPersianDigits(item.totalPaid.toLocaleString('fa-IR'))}
                        </td>
                        <td className="p-3.5">
                          {item.status === 'creditor' ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
                                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                بستانکار (اعتبار مازاد: {toPersianDigits(item.creditAmount.toLocaleString('fa-IR'))} تومان)
                              </span>
                              <p className="text-[10px] text-emerald-700 font-medium">
                                🟢 در حساب محفوظ است
                              </p>
                            </div>
                          ) : item.status === 'debtor' ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                بدهکار (مانده بدهی: {toPersianDigits(item.debtAmount.toLocaleString('fa-IR'))} تومان)
                              </span>
                              <p className="text-[10px] text-rose-700 font-medium">
                                🔴 نیازمند تسویه شهریه
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-teal-50 text-teal-800 border border-teal-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                              تسویه حساب کامل
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setCardexUserId(item.user.id);
                                setViewMode('cardex');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-[11px] transition-all flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-600" />
                              کاردکس
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserId(item.user.id);
                                setIsAddModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-[11px] shadow-sm transition-all flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              ثبت واریز
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: TRANSACTIONS (دفتر روزنامه) */}
      {viewMode === 'transactions' && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-xs font-bold">کل درآمد ثبت‌شده (موفق)</span>
                <p className="text-xl font-black text-emerald-700 mt-1">
                  {toPersianDigits((totalRevenue ?? 0).toLocaleString('fa-IR'))} <span className="text-xs font-bold text-slate-500">تومان</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-xs font-bold">تراکنش‌های موفق</span>
                <p className="text-xl font-black text-slate-900 mt-1">{toPersianDigits(completedCount)} فقره</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-xs font-bold">فیش‌های در انتظار بررسی</span>
                <p className="text-xl font-black text-amber-600 mt-1">{toPersianDigits(pendingCount)} فقره</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی نام، کد ملی یا شماره پیگیری..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">همه بابت‌ها</option>
                <option value="tuition">شهریه ماهیانه</option>
                <option value="single_session">تک‌جلسه‌ای</option>
                <option value="insurance">کارت بیمه</option>
                <option value="equipment">تجهیزات</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">همه روش‌های پرداخت</option>
                <option value="pos">پوز (کارت‌خوان)</option>
                <option value="card_to_card">کارت به کارت</option>
                <option value="cash">نقدی</option>
                <option value="online">آنلاین</option>
                <option value="wallet">کیف پول اعتباری</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">لیست تراکنش‌ها و سوابق شهریه</h3>
              <span className="text-xs font-bold text-slate-500">
                تعداد: {toPersianDigits(filteredTransactions.length)} تراکنش
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                  <tr>
                    <th className="p-3.5">نام ورزشکار</th>
                    <th className="p-3.5">ماهیت مالی</th>
                    <th className="p-3.5">بابت / شرح</th>
                    <th className="p-3.5">روش پرداخت</th>
                    <th className="p-3.5">کد پیگیری</th>
                    <th className="p-3.5">مبلغ (تومان)</th>
                    <th className="p-3.5">تاریخ ثبت</th>
                    <th className="p-3.5 text-center">وضعیت</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        هیچ تراکنش مالی مطابق فیلتر یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((trx) => {
                      const isDebit =
                        trx.type === 'charge' ||
                        (trx.description?.includes('بابت فاکتور') && !trx.description?.includes('تسویه')) ||
                        trx.description?.includes('منظور به حساب') ||
                        trx.description?.includes('بدهی');

                      return (
                        <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900">{trx.userName}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">کد ملی: {toPersianDigits(trx.userNationalId)}</p>
                          </td>
                          <td className="p-3.5">
                            {isDebit ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                                بدهکار (بدهی)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                                بستانکار (پرداخت)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">{trx.description || getTypeLabel(trx.type, trx.description)}</td>
                          <td className="p-3.5 font-bold text-slate-700">{getMethodLabel(trx.method)}</td>
                          <td className="p-3.5 font-mono text-slate-600">{trx.trackingNumber ? toPersianDigits(trx.trackingNumber) : '—'}</td>
                          <td className="p-3.5 font-black text-emerald-700">{toPersianDigits((trx.amount ?? 0).toLocaleString('fa-IR'))}</td>
                          <td className="p-3.5 font-mono text-slate-600">
                            <p className="font-bold text-slate-900">{toPersianDigits(trx.createdAt)}</p>
                            {trx.createdBy ? (
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200 font-sans" title={`ثبت‌شده توسط: ${trx.createdBy}`}>
                                👤 {trx.createdBy}
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 text-[10px] text-slate-400 font-sans">👤 سیستم</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                trx.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : trx.status === 'pending'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {trx.status === 'completed' ? 'موفق و تأییدشده' : trx.status === 'pending' ? 'در انتظار بررسی' : 'ردشده'}
                            </span>
                          </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(() => {
                              const inv = dbStore.findShopInvoiceFromDescription(trx.description);
                              if (!inv) return null;
                              return (
                                <button
                                  onClick={() => setSelectedShopInvoice(inv)}
                                  className="p-1.5 text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px] border border-teal-200"
                                  title="مشاهده فاکتور و پرینت حرارتی"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-teal-600" />
                                  <span>فاکتور</span>
                                </button>
                              );
                            })()}
                            <button
                              onClick={() => openEditTrxModal(trx)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
                              title="مشاهده، جزئیات و اصلاح تراکنش"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>جزئیات / اصلاح</span>
                            </button>
                            {trx.status !== 'completed' && (
                              <button
                                onClick={() => handleUpdateStatus(trx.id, 'completed')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="تأیید تراکنش"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {trx.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus(trx.id, 'rejected')}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="رد تراکنش"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirmTrx(trx)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
                              title="حذف تراکنش"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW MODE 3: INDIVIDUAL FINANCIAL CARDEX (کاردکس مالی فردی) */}
      {viewMode === 'cardex' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">انتخاب ورزشکار جهت مشاهده کاردکس مالی</label>
                <p className="text-[11px] text-slate-500">مشاهده صورت‌حساب مالی، گردش تراکنش‌ها و بالانس اعتبار کاربر</p>
              </div>
            </div>

            <div className="w-full sm:w-96 relative">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-3.5 text-slate-400 font-bold" />
                <input
                  type="text"
                  placeholder="جستجوی نام یا کد ملی ورزشکار..."
                  value={cardexSearchQuery}
                  onFocus={() => {
                    setIsCardexDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setCardexSearchQuery(e.target.value);
                    setIsCardexDropdownOpen(true);
                  }}
                  className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                />
                {cardexSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCardexSearchQuery('');
                      setIsCardexDropdownOpen(true);
                    }}
                    className="absolute left-3 top-3 p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isCardexDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsCardexDropdownOpen(false)}
                  />
                  
                  <div className="absolute right-0 left-0 z-20 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                    {(() => {
                      const filtered = users.filter((u) => {
                        const query = cardexSearchQuery.trim().toLowerCase();
                        if (!query) return true;
                        return (
                          u.fullName.toLowerCase().includes(query) ||
                          u.nationalId.includes(query) ||
                          (u.phone && u.phone.includes(query))
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-4 text-center text-xs text-slate-400">
                            ورزشکاری با این مشخصات یافت نشد.
                          </div>
                        );
                      }

                      return filtered.map((u) => {
                        const isSelected = u.id === cardexUserId;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setCardexUserId(u.id);
                              setCardexSearchQuery(u.fullName);
                              setIsCardexDropdownOpen(false);
                            }}
                            className={`w-full text-right px-4 py-3 text-xs transition-colors flex items-center justify-between ${
                              isSelected 
                                ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold' 
                                : 'hover:bg-slate-50 text-slate-700 font-bold'
                            }`}
                          >
                            <div>
                              <span>{u.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-mono mr-2">
                                (کد ملی: {toPersianDigits(u.nationalId)})
                              </span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>

          {cardexUser && cardexBalance && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Cardex Header */}
              <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1 text-center md:text-right">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    صورت‌حساب و کاردکس مالی انفرادی
                  </span>
                  <h3 className="text-lg font-black">{cardexUser.fullName}</h3>
                  <p className="text-xs text-slate-300 font-mono">
                    کد ملی: {toPersianDigits(cardexUser.nationalId)} | تلفن: {toPersianDigits(cardexUser.phone)}
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
                >
                  <Printer className="w-4 h-4" />
                  چاپ صورت‌حساب رسمـی
                </button>
              </div>

              {/* Individual Balance Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <span className="text-slate-600 text-[11px] font-bold">کل شهریه و تعهدات مالی</span>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    {toPersianDigits(cardexBalance.totalDues.toLocaleString('fa-IR'))} <span className="text-xs font-bold text-slate-500">تومان</span>
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <span className="text-emerald-800 text-[11px] font-bold">مجموع واریزی‌های موفق</span>
                  <p className="text-lg font-black text-emerald-800 mt-1">
                    {toPersianDigits(cardexBalance.totalPaid.toLocaleString('fa-IR'))} <span className="text-xs font-bold text-slate-500">تومان</span>
                  </p>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                  <span className="text-teal-800 text-[11px] font-bold">اعتبار مازاد بستانکار (کیف پول)</span>
                  <p className="text-lg font-black text-teal-800 mt-1">
                    {toPersianDigits(cardexBalance.creditAmount.toLocaleString('fa-IR'))} <span className="text-xs font-bold text-slate-500">تومان</span>
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                  <span className="text-rose-800 text-[11px] font-bold">مانده بدهی قابل تسویه</span>
                  <p className="text-lg font-black text-rose-800 mt-1">
                    {toPersianDigits(cardexBalance.debtAmount.toLocaleString('fa-IR'))} <span className="text-xs font-bold text-slate-500">تومان</span>
                  </p>
                </div>
              </div>

              {/* Overpayment Credit Info Note */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-teal-900">
                <Wallet className="w-5 h-5 text-teal-600 shrink-0" />
                <p>
                  <strong>اطلاعیه اعتبار مالی:</strong> در صورت واریز وجه مازاد بر شهریه، مابه‌التفاوت به عنوان <strong>اعتبار بستانکار</strong> در پرونده مالی ورزشکار حفظ شده و در ثبت‌نام دوره‌ها یا خدمات بعدی محاسبه خواهد شد.
                </p>
              </div>

              {/* Cardex Transactions Table (دفتر معین / کاردکس مالی انفرادی) */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-black text-slate-900">دفتر معین و کاردکس مالی انفرادی (بدهکار/بستانکار)</h4>
                  <span className="text-[10px] text-slate-500">
                    برای ویرایش یا تأیید هر تراکنش مالی بر روی ردیف آن کلیک کنید.
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-100">
                      <tr>
                        <th className="p-3">کد سند</th>
                        <th className="p-3">تاریخ ثبت</th>
                        <th className="p-3">شرح / بابت</th>
                        <th className="p-3">بدهکار (افزایش بدهی)</th>
                        <th className="p-3">بستانکار (واریزی)</th>
                        <th className="p-3 text-center">وضعیت</th>
                        <th className="p-3">باقیمانده حساب</th>
                        <th className="p-3 text-center">تشخیص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cardexLedger.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-slate-400">
                            هیچ رکوردی در دفتر معین این ورزشکار ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        cardexLedger.map((entry: any) => {
                          const isTrx = entry.type === 'extra_charge' || entry.type === 'payment';
                          const fullTrx = isTrx ? transactions.find(t => t.id === entry.ref) : null;
                          return (
                            <tr
                              key={entry.id}
                              onClick={() => {
                                if (fullTrx) {
                                  openEditTrxModal(fullTrx);
                                }
                              }}
                              className={`transition-colors ${isTrx ? 'hover:bg-slate-100/80 cursor-pointer' : 'bg-slate-50/40 text-slate-600'}`}
                            >
                              <td className="p-3 font-mono text-[10px] text-slate-500 font-bold whitespace-nowrap">{getCleanId(entry.id)}</td>
                              <td className="p-3 font-mono font-bold text-slate-900">{toPersianDigits(entry.date)}</td>
                              <td className="p-3">
                                <span className="font-bold block text-slate-800">{entry.description}</span>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {entry.trackingNumber && (
                                    <span className="block text-[10px] text-slate-400 font-mono">
                                      شماره پیگیری: {toPersianDigits(entry.trackingNumber)} {entry.method ? `(${getMethodLabel(entry.method)})` : ''}
                                    </span>
                                  )}
                                  {entry.createdBy && (
                                    <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                      ثبت‌کننده: {entry.createdBy}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-black text-rose-600">
                                {entry.debit > 0 ? `${toPersianDigits(entry.debit.toLocaleString())} تومان` : '—'}
                              </td>
                              <td className="p-3 font-black text-emerald-600">
                                {entry.credit > 0 ? `${toPersianDigits(entry.credit.toLocaleString())} تومان` : '—'}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                    entry.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : entry.status === 'pending'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {entry.status === 'completed' ? 'تأییدشده' : entry.status === 'pending' ? 'در انتظار تایید' : 'ردشده'}
                                </span>
                              </td>
                              <td className="p-3 font-black text-slate-900 font-mono">
                                {toPersianDigits(entry.runningBalance.toLocaleString())} تومان
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                    entry.balanceType === 'بدهکار'
                                      ? 'bg-rose-50 text-rose-800'
                                      : entry.balanceType === 'بستانکار'
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {entry.balanceType}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 4: DEBT MANAGEMENT (مدیریت بدهی‌ها و مطالبات) */}
      {viewMode === 'debt_management' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Info Banner & Manual Debt Button */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">مدیریت بدهی‌ها و مطالبات اعضا</h3>
                <p className="text-xs text-slate-500 mt-1">
                  قابلیت مدیریت، ویرایش، افزایش یا کاهش مبالغ بدهی ورزشکاران و شارژ دستی انواع مبالغ متفرقه (نظیر جریمه، خرید تجهیزات، خسارت و غیره)
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setDebtUserId(users.length > 0 ? users[0].id : '');
                setDebtAmount('150000');
                setDebtCategory('other');
                setDebtCategoryTitle('خسارت به وسایل باشگاه');
                setDebtDueDate(formatJalaliDate(getCurrentJalaliDate()));
                setDebtNotes('');
                setDebtStatus('due_soon');
                setIsAddDebtModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-amber-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              ثبت بدهی دستی جدید
            </button>
          </div>

          {/* List Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900">لیست بدهی‌های منظور شده به حساب اعضا</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">در این بخش می‌توانید هر بدهی ثبت شده را مدیریت، ویرایش یا با ثبت سند بانکی به صورت آنی تسویه نمایید.</p>
              </div>
              <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                {toPersianDigits(debtors.length)} بدهکاری فعال
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-100">
                  <tr>
                    <th className="p-3">نام و مشخصات ورزشکار</th>
                    <th className="p-3">عنوان بدهکاری (علت)</th>
                    <th className="p-3">دسته‌بندی</th>
                    <th className="p-3">تاریخ سررسید</th>
                    <th className="p-3">مبلغ بدهی</th>
                    <th className="p-3 text-center">وضعیت پرداخت</th>
                    <th className="p-3 text-center">عملیات مدیریت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                        هیچ بدهکاری معلقی در سیستم ثبت نشده است. حساب تمام کاربران کاملاً تصفیه است.
                      </td>
                    </tr>
                  ) : (
                    debtors.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{d.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            کد ملی: {toPersianDigits(d.nationalId)} | تلفن: {toPersianDigits(d.phone)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-black text-slate-800">{d.categoryTitle}</div>
                          {d.notes && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-xs truncate" title={d.notes}>
                              {d.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 font-bold text-[10px]">
                            {d.category === 'tuition' ? 'شهریه سانس' : d.category === 'insurance' ? 'بیمه ورزشی' : d.category === 'equipment' ? 'تجهیزات و لوازم' : d.category === 'pending_receipt' ? 'منتظر تایید سند' : 'سایر / متفرقه'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{toPersianDigits(d.dueDate)}</td>
                        <td className="p-3 font-black text-rose-700 text-sm">
                          {toPersianDigits((d.amount ?? 0).toLocaleString('fa-IR'))} <span className="text-[10px] text-slate-500 font-normal">تومان</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            d.status === 'overdue'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : d.status === 'pending_approval'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {d.status === 'overdue' ? 'سررسید گذشته' : d.status === 'pending_approval' ? 'در انتظار تایید سند' : 'فعال و معتبر'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                if (confirm(`آیا از تسویه کامل بدهی "${d.fullName}" بابت "${d.categoryTitle}" به مبلغ ${toPersianDigits((d.amount ?? 0).toLocaleString('fa-IR'))} تومان اطمینان دارید؟\nبا این کار، بدهی حذف شده و یک تراکنش دریافتی موفق در حساب ثبت خواهد شد.`)) {
                                  dbStore.settleDebtor(d.id, 'حسابدار سیستم');
                                  refreshData();
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              تسویه
                            </button>
                            <button
                              onClick={() => openEditDebtModal(d)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors"
                              title="ویرایش بدهی و تغییر مبلغ"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`آیا از حذف دائم و فیزیکی بدهی "${d.fullName}" بابت "${d.categoryTitle}" اطمینان دارید؟`)) {
                                  dbStore.deleteDebtor(d.id, 'حسابدار سیستم');
                                  setDebtors(dbStore.getDebtors());
                                  refreshData();
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
                              title="حذف بدهی"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction & Deposit Receipt Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shadow-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">ثبت واریزی و فیش پرداخت جدید</h3>
                  <p className="text-[11px] text-slate-500">ثبت دریافت شهریه، شارژ کیف پول و تسویه بدهی به همراه پیوست فیش</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsUserDropdownOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePreSubmitTransaction} className="space-y-4">
              {/* Payer / User Selection with Autocomplete Search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  انتخاب پرداخت‌کننده / صاحب حساب <span className="text-red-500">*</span>
                </label>

                {(() => {
                  const selectedUser = users.find((u) => u.id === selectedUserId);
                  const selectedBal = selectedUserId ? getUserBalanceInfo(selectedUserId) : null;

                  if (selectedUser && !isUserDropdownOpen) {
                    return (
                      <div className="bg-slate-50 border border-teal-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                            {selectedUser.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-slate-900">{selectedUser.fullName}</span>
                              {selectedBal && selectedBal.status === 'debtor' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                  بدهکار: {toPersianDigits(selectedBal.debtAmount.toLocaleString('fa-IR'))} ت
                                </span>
                              )}
                              {selectedBal && selectedBal.status === 'creditor' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  اعتبار کیف پول: {toPersianDigits(selectedBal.creditAmount.toLocaleString('fa-IR'))} ت
                                </span>
                              )}
                              {selectedBal && selectedBal.status === 'settled' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-700">
                                  بی‌حساب
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              کد ملی: {toPersianDigits(selectedUser.nationalId)} | همراه: {toPersianDigits(selectedUser.phone)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(true);
                            setUserSearchQuery('');
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5" />
                          تغییر شخص
                        </button>
                      </div>
                    );
                  }

                  // Searchable Dropdown
                  const filteredUsers = users.filter((u) => {
                    const q = userSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (u.fullName || '').toLowerCase().includes(q) ||
                      (u.nationalId || '').includes(q) ||
                      (u.phone || '').includes(q)
                    );
                  });

                  return (
                    <div className="relative">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="جستجوی نام، کد ملی یا شماره همراه عضو..."
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value);
                            setIsUserDropdownOpen(true);
                          }}
                          onFocus={() => setIsUserDropdownOpen(true)}
                          className="w-full pr-9 pl-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                        />
                        {userSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setUserSearchQuery('')}
                            className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {isUserDropdownOpen && (
                        <div className="absolute right-0 left-0 z-30 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                          {filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 font-medium">
                              عضوی با این مشخصات یافت نشد.
                            </div>
                          ) : (
                            filteredUsers.map((u) => {
                              const bal = getUserBalanceInfo(u.id);
                              const isSelected = u.id === selectedUserId;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserId(u.id);
                                    setUserSearchQuery(u.fullName);
                                    setIsUserDropdownOpen(false);
                                  }}
                                  className={`w-full text-right px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold'
                                      : 'hover:bg-slate-50 text-slate-700 font-bold'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span>{u.fullName}</span>
                                      {bal.status === 'debtor' && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                          بدهکار {toPersianDigits(bal.debtAmount.toLocaleString('fa-IR'))} ت
                                        </span>
                                      )}
                                      {bal.status === 'creditor' && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          اعتبار {toPersianDigits(bal.creditAmount.toLocaleString('fa-IR'))} ت
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      کد ملی: {toPersianDigits(u.nationalId)} | تلفن: {toPersianDigits(u.phone)}
                                    </p>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Date, Category, and Payment Method Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <JalaliDatePicker
                    label="تاریخ پرداخت و سند (شمسی)"
                    required
                    value={trxDate}
                    onChange={(val) => setTrxDate(val)}
                    placeholder="انتخاب تاریخ شمسی..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    بابت دریافت <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="tuition">شهریه ماهیانه دوره / شارژ حساب</option>
                    <option value="single_session">ورودی تک‌جلسه‌ای</option>
                    <option value="insurance">کارت بیمه ورزشی</option>
                    <option value="equipment">تجهیزات و ابزار</option>
                    <option value="wallet_deposit">افزایش موجودی کیف پول</option>
                    <option value="other">متفرقه</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    روش پرداخت <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pos">پوز (کارت‌خوان باشگاه)</option>
                    <option value="card_to_card">کارت به کارت</option>
                    <option value="cash">نقدی</option>
                    <option value="online">درگاه پرداخت آنلاین</option>
                    <option value="wallet">کیف پول اعتباری</option>
                  </select>
                </div>
              </div>

              {/* Amount & Tracking Number Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">
                      مبلغ دریافتی (تومان) <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مبلغ را دستی وارد کنید (مثلاً: 1,500,000)"
                      value={amount ? parseInt(amount, 10).toLocaleString('en-US') : ''}
                      onChange={handleAmountInputChange}
                      dir="ltr"
                      className="w-full pl-16 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono tracking-wider text-left"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">تومان</span>
                  </div>

                  {/* Live Persian Words Display */}
                  {amount && parseInt(amount, 10) > 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 flex items-center gap-2 mt-1.5 shadow-2xs">
                      <span className="text-[11px] font-black text-teal-700 shrink-0">✍️ به حروف:</span>
                      <span className="font-extrabold text-slate-900 leading-tight">{numberToPersianWords(amount)}</span>
                    </div>
                  ) : null}

                  {/* Overpayment / Debt Accountant Notice Box */}
                  {(() => {
                    if (!selectedUserId || !amount) return null;
                    const bal = getUserBalanceInfo(selectedUserId);
                    const enteredAmt = parseInt(amount, 10) || 0;
                    if (enteredAmt <= 0) return null;

                    if (bal.status === 'debtor') {
                      if (enteredAmt > bal.debtAmount) {
                        const overpay = enteredAmt - bal.debtAmount;
                        return (
                          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1 mt-2 animate-in fade-in duration-150">
                            <div className="flex items-center gap-1.5 font-black text-amber-800">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>توجه حسابدار: مبلغ واریزی بیشتر از کل بدهی شخص است</span>
                            </div>
                            <p className="text-[11px] text-amber-900 leading-relaxed">
                              مبلغ وارد شده (<strong className="text-amber-950 font-black">{toPersianDigits(enteredAmt.toLocaleString('fa-IR'))} تومان</strong>) از کل بدهی فعلی این شخص (<strong className="text-rose-700 font-black">{toPersianDigits(bal.debtAmount.toLocaleString('fa-IR'))} تومان</strong>) بیشتر است.
                            </p>
                            <p className="text-[11px] font-black text-teal-900 bg-amber-100/70 p-1.5 rounded-lg border border-amber-200">
                              💡 پس از تسویه کامل بدهی، مبلغ مازاد (<strong className="text-emerald-700">{toPersianDigits(overpay.toLocaleString('fa-IR'))} تومان</strong>) به صورت خودکار به عنوان <strong>«اعتبار کیف پول (بستانکاری)»</strong> در پرونده شخص ذخیره خواهد شد.
                            </p>
                          </div>
                        );
                      } else if (enteredAmt === bal.debtAmount) {
                        return (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs text-emerald-800 flex items-center gap-2 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>مبلغ دقیقاً برابر با کل بدهی است و حساب شخص کاملاً تسویه خواهد شد.</span>
                          </div>
                        );
                      } else {
                        const rem = bal.debtAmount - enteredAmt;
                        return (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-800 flex items-center gap-2 mt-2">
                            <Info className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>
                              تسویه بخشی از بدهی. مانده بدهی پس از این واریز: <strong>{toPersianDigits(rem.toLocaleString('fa-IR'))} تومان</strong>
                            </span>
                          </div>
                        );
                      }
                    } else if (bal.status === 'creditor') {
                      return (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5 text-xs text-teal-800 flex items-center gap-2 mt-2">
                          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>
                            این عضو بدهی ندارد (دارای {toPersianDigits(bal.creditAmount.toLocaleString('fa-IR'))} ت اعتبار). کل این مبلغ به کیف پول وی اضافه می‌شود.
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5 text-xs text-teal-800 flex items-center gap-2 mt-2">
                          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>
                            عضو در وضعیت بی‌حساب است. مبلغ دریافتی به عنوان اعتبار کیف پول ذخیره خواهد شد.
                          </span>
                        </div>
                      );
                    }
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    شماره پیگیری فیش / رسید کارت‌خوان
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً: 8871239"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">کد رهگیری تراکنش یا شماره فیش واریزی بانکی</p>
                </div>
              </div>

              {/* Receipt File Upload Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  بارگذاری تصویر فیش یا سند واریزی (اختیاری)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleReceiptFileUpload}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                />

                {receiptUrl ? (
                  <div className="bg-slate-50 border border-teal-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {receiptUrl.startsWith('data:image') || receiptUrl.startsWith('http') ? (
                        <img
                          src={receiptUrl}
                          alt="رسید واریزی"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {receiptFileName || 'تصویر فیش واریزی پیوست شد'}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          فایل با موفقیت بارگذاری شد
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingReceipt({
                            url: receiptUrl,
                            fileName: receiptFileName || 'فیش واریزی',
                            title: `فیش واریزی ثبت شده`,
                          })
                        }
                        className="p-2 text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1"
                        title="مشاهده بزرگتر تصویر"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">مشاهده</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptUrl(null);
                          setReceiptFileName(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1"
                        title="حذف و بارگذاری فایل دیگر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">حذف</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/60 hover:bg-teal-50/40 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-teal-100 text-slate-500 group-hover:text-teal-600 flex items-center justify-center border border-slate-200 transition-colors shadow-sm">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 group-hover:text-teal-900">
                      جهت پیوست تصویر فیش واریزی یا رسید پوز کلیک نمایید
                    </p>
                    <p className="text-[10px] text-slate-400">
                      فرمت‌های مجاز: JPG, PNG, WEBP, PDF (حداکثر ۱۰ مگابایت)
                    </p>
                  </div>
                )}
              </div>

              {/* Description / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و شرح بابت سند</label>
                <textarea
                  rows={2}
                  placeholder="مثلاً شهریه و واریزی مازاد بابت اعتبار دوره‌های بعد..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  بررسی و ثبت پرداخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal Before Saving Transaction (جعبه پیام تأیید زیبا و شفاف) */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white border border-teal-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                <CheckCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تأیید نهایی ثبت سند و واریزی</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  لطفاً صحت مشخصات سند مالی زیر را بررسی و تأیید فرمایید
                </p>
              </div>
            </div>

            {/* Prominent Highlight Callout Box (as requested by user) */}
            {(() => {
              const selectedUser = users.find((u) => u.id === selectedUserId);
              const amtNum = parseInt(amount, 10) || 0;
              return (
                <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-400/70 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 leading-relaxed">
                        شما در حال ثبت مبلغ پرداختی{' '}
                        <span className="text-sm font-black text-emerald-700 underline underline-offset-4 decoration-emerald-500">
                          {toPersianDigits(amtNum.toLocaleString('fa-IR'))} تومان
                        </span>{' '}
                        به حساب{' '}
                        <span className="text-sm font-black text-teal-950">
                          {selectedUser?.fullName || 'عضو نامشخص'}
                        </span>{' '}
                        (کد ملی: {toPersianDigits(selectedUser?.nationalId || '')}) هستید.
                      </p>
                      <p className="text-[11px] font-extrabold text-teal-800">
                        آیا اطلاعات مورد تأیید است و سند ذخیره شود؟
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Detailed Transaction Breakdown Card */}
            {(() => {
              const selectedUser = users.find((u) => u.id === selectedUserId);
              const currentBal = selectedUserId ? getUserBalanceInfo(selectedUserId) : null;
              const amtNum = parseInt(amount, 10) || 0;

              // Forecast new balance
              let forecastBadge = '';
              if (currentBal) {
                if (currentBal.status === 'debtor') {
                  const remainingDebt = currentBal.debtAmount - amtNum;
                  if (remainingDebt > 0) {
                    forecastBadge = `مانده بدهی پس از ثبت: ${toPersianDigits(remainingDebt.toLocaleString('fa-IR'))} تومان`;
                  } else if (remainingDebt === 0) {
                    forecastBadge = 'حساب کاربر کاملاً تسویه خواهد شد (بی‌حساب)';
                  } else {
                    forecastBadge = `حساب تسویه و مبلغ ${toPersianDigits(Math.abs(remainingDebt).toLocaleString('fa-IR'))} تومان به عنوان اعتبار کیف پول ذخیره می‌شود.`;
                  }
                } else if (currentBal.status === 'creditor') {
                  const newCredit = currentBal.creditAmount + amtNum;
                  forecastBadge = `مجموع اعتبار کیف پول پس از ثبت: ${toPersianDigits(newCredit.toLocaleString('fa-IR'))} تومان`;
                } else {
                  forecastBadge = `مبلغ ${toPersianDigits(amtNum.toLocaleString('fa-IR'))} تومان به عنوان اعتبار کیف پول کاربر ذخیره می‌شود.`;
                }
              }

              return (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">👤 صاحب حساب / واریزکننده:</span>
                    <span className="font-black text-slate-900">{selectedUser?.fullName}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">💰 مبلغ پرداختی:</span>
                    <div className="text-left">
                      <span className="font-black text-emerald-700 text-sm block">
                        {toPersianDigits(amtNum.toLocaleString('fa-IR'))} تومان
                      </span>
                      <span className="text-[10px] text-teal-800 font-extrabold block">
                        ({numberToPersianWords(amtNum)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">👮‍♂️ ثبت‌کننده سند:</span>
                    <span className="font-black text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {currentActorName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">📅 تاریخ واریز و سند:</span>
                    <span className="font-black text-slate-800">{toPersianDigits(trxDate)} (شمسی)</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">🏷️ بابت دریافت:</span>
                    <span className="font-bold text-slate-800">{getTypeLabel(type)}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">💳 روش پرداخت:</span>
                    <span className="font-bold text-slate-800">{getMethodLabel(method)}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">🔢 شماره پیگیری / ارجاع:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {trackingNumber ? toPersianDigits(trackingNumber) : '— (ثبت نشده)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">📎 وضعیت فیش پیوست:</span>
                    <span className="font-bold">
                      {receiptUrl ? (
                        <span className="text-emerald-700 font-black">
                          ✅ دارای تصویر فیش ({receiptFileName || 'پیوست'})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">بدون فیش پیوست</span>
                      )}
                    </span>
                  </div>

                  {description && (
                    <div className="flex items-start justify-between pb-2 border-b border-slate-200/70">
                      <span className="text-slate-500 font-bold shrink-0">📝 توضیحات:</span>
                      <span className="font-medium text-slate-800 text-right pr-2">{description}</span>
                    </div>
                  )}

                  {forecastBadge && (
                    <div className="pt-1 text-[11px] font-bold text-teal-900 flex items-center gap-1.5 bg-teal-50/90 p-2.5 rounded-xl border border-teal-200">
                      <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{forecastBadge}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                انصراف و ویرایش اطلاعات
              </button>
              <button
                type="button"
                onClick={handleFinalConfirmTransaction}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                تأیید نهایی و ثبت قطعی سند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Details Transaction Modal */}
      {editingTrx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">مشاهده و اصلاح اطلاعات تراکنش مالی</h3>
                <p className="text-[11px] text-teal-700 font-bold mt-0.5">
                  پیوست شده به: {editingTrx.userName} (کد ملی: {toPersianDigits(editingTrx.userNationalId)})
                </p>
              </div>
              <button onClick={() => setEditingTrx(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTrx} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">تاریخ ثبت:</span>
                  <p className="font-mono font-bold text-slate-800">{toPersianDigits(editingTrx.createdAt)}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">ثبت‌کننده:</span>
                  <p className="font-bold text-slate-800">{editingTrx.createdBy || 'سیستم'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بابت تراکنش</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="tuition">شهریه ماهیانه دوره</option>
                    <option value="single_session">ورودی تک‌جلسه‌ای</option>
                    <option value="insurance">کارت بیمه ورزشی</option>
                    <option value="equipment">تجهیزات و ابزار</option>
                    <option value="other">متفرقه / شارژ حساب</option>
                    <option value="charge">شارژ مازاد اعتبار</option>
                    <option value="penalty">جریمه یا مابه‌التفاوت</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">روش پرداخت</label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="pos">پوز (کارت‌خوان)</option>
                    <option value="card_to_card">کارت به کارت</option>
                    <option value="cash">نقدی</option>
                    <option value="online">درگاه آنلاین</option>
                    <option value="wallet">کیف پول اعتباری</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ (تومان)</label>
                  <input
                    type="number"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره پیگیری فیش / پوز</label>
                  <input
                    type="text"
                    value={editTrackingNumber}
                    onChange={(e) => setEditTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت پرداخت</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="completed">تأییدشده و موفق</option>
                  <option value="pending">در انتظار بررسی</option>
                  <option value="rejected">ردشده و ناموفق</option>
                </select>
              </div>

              {editingTrx.receiptUrl && (
                <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>فیش/سند واریزی پیوست شده</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setViewingReceipt({
                        url: editingTrx.receiptUrl!,
                        fileName: editingTrx.receiptFileName,
                        title: `فیش واریزی ${editingTrx.userName}`,
                      })
                    }
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    مشاهده سند
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات تراکنش</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDeleteTrx}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف تراکنش
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTrx(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    ذخیره و اصلاح تراکنش
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Warning Modal */}
      {deleteConfirmTrx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-900">هشدار حذف تراکنش مالی</h3>
                <span className="text-[11px] text-slate-500 font-medium">اقدام غیرقابل بازگشت مدیریتی</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">نام ورزشکار:</span>
                <span className="font-bold text-slate-900">{deleteConfirmTrx.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مبلغ تراکنش:</span>
                <span className="font-bold text-rose-700">{toPersianDigits((deleteConfirmTrx.amount || 0).toLocaleString())} تومان</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">بابت:</span>
                <span className="font-bold text-slate-800">{deleteConfirmTrx.description || deleteConfirmTrx.type}</span>
              </div>
            </div>

            <p className="text-xs text-rose-700 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200/80 leading-relaxed">
              آیا از حذف کامل این تراکنش اطمینان دارید؟ با حذف این سند، مبالغ مربوطه از تراز مالی پرونده ورزشکار کسر خواهد شد.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTrx(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                onClick={confirmDeleteTrx}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                تایید و حذف قطعی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
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

      {/* Add Manual Debt Modal */}
      {isAddDebtModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in scale-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">ثبت بدهکاری دستی جدید برای ورزشکار</h3>
              <button onClick={() => setIsAddDebtModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب ورزشکار بدهکار</label>
                <select
                  required
                  value={debtUserId}
                  onChange={(e) => setDebtUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">-- انتخاب کنید --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} (کد ملی: {toPersianDigits(u.nationalId)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی</label>
                  <select
                    value={debtCategory}
                    onChange={(e) => {
                      const cat = e.target.value as DebtorRecord['category'];
                      setDebtCategory(cat);
                      if (cat === 'tuition') setDebtCategoryTitle('شهریه سانس');
                      else if (cat === 'insurance') setDebtCategoryTitle('بیمه ورزشی');
                      else if (cat === 'equipment') setDebtCategoryTitle('تجهیزات و لوازم');
                      else setDebtCategoryTitle('خسارت به وسایل باشگاه');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="other">متفرقه / خسارت / سایر</option>
                    <option value="tuition">شهریه سانس</option>
                    <option value="insurance">بیمه ورزشی</option>
                    <option value="equipment">تجهیزات و ابزار</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بابت / بابت چه چیزی؟</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خسارت به طناب باشگاه"
                    value={debtCategoryTitle}
                    onChange={(e) => setDebtCategoryTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ بدهی (تومان)</label>
                  <input
                    type="number"
                    required
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ سررسید (جلالی)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 1404/05/20"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت پرداخت</label>
                <select
                  value={debtStatus}
                  onChange={(e) => setDebtStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="due_soon">فعال / به موقع</option>
                  <option value="overdue">سررسید گذشته (منقضی)</option>
                  <option value="pending_approval">در انتظار تایید سند</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و جزئیات بدهکاری (اختیاری)</label>
                <textarea
                  rows={2}
                  placeholder="جزئیات تکمیلی بابت این بدهکاری..."
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDebtModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/10 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  منظور کردن به حساب ورزشکار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manual Debt Modal */}
      {editingDebtor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in scale-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-900">ویرایش و تغییر بدهی {editingDebtor.fullName}</h3>
                <span className="text-[10px] text-slate-400">امکان ویرایش مبالغ (کم/زیاد)، علت و جزئیات بدهی</span>
              </div>
              <button onClick={() => setEditingDebtor(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDebt} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold">مخاطب بدهی:</span> {editingDebtor.fullName} (کد ملی: {toPersianDigits(editingDebtor.nationalId)})
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی</label>
                  <select
                    value={editDebtCategory}
                    onChange={(e) => setEditDebtCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="other">متفرقه / خسارت / سایر</option>
                    <option value="tuition">شهریه سانس</option>
                    <option value="insurance">بیمه ورزشی</option>
                    <option value="equipment">تجهیزات و ابزار</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بابت / بابت چه چیزی؟</label>
                  <input
                    type="text"
                    required
                    value={editDebtCategoryTitle}
                    onChange={(e) => setEditDebtCategoryTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ بدهی (تومان) - کم / زیاد</label>
                  <input
                    type="number"
                    required
                    value={editDebtAmount}
                    onChange={(e) => setEditDebtAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ سررسید (جلالی)</label>
                  <input
                    type="text"
                    required
                    value={editDebtDueDate}
                    onChange={(e) => setEditDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت پرداخت</label>
                <select
                  value={editDebtStatus}
                  onChange={(e) => setEditDebtStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="due_soon">فعال / به موقع</option>
                  <option value="overdue">سررسید گذشته (منقضی)</option>
                  <option value="pending_approval">در انتظار تایید سند</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و جزئیات بدهکاری (اختیاری)</label>
                <textarea
                  rows={2}
                  value={editDebtNotes}
                  onChange={(e) => setEditDebtNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`آیا از حذف این بدهی اطمینان دارید؟`)) {
                      dbStore.deleteDebtor(editingDebtor.id, 'حسابدار سیستم');
                      refreshData();
                      setEditingDebtor(null);
                    }
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف بدهی
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDebtor(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/10 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    ذخیره تغییرات بدهی
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop Invoice Detail & Thermal Print Modal */}
      {selectedShopInvoice && (
        <ShopInvoiceDetailModal
          invoice={selectedShopInvoice}
          onClose={() => setSelectedShopInvoice(null)}
        />
      )}
    </div>
  );
};
