import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Send,
  MessageSquare,
  Settings,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Smartphone,
  RefreshCw,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  Key,
  Layers,
  Zap,
  Check,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  UserCheck,
  Info,
  Calendar,
  Eye,
  X,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { User, TrainingSession, DebtorRecord, SmsLogRecord, ClubSettings } from '../types';
import { dbStore } from '../services/db';
import { toPersianDigits, formatToman, toEnglishDigits } from '../utils/nationalIdValidator';
import { getCurrentJalaliDate, formatJalaliDate } from '../utils/jalaliDate';
import { THEME_PALETTES } from '../utils/theme';

interface SmsManagementViewProps {
  currentUser: User;
}

const QUICK_TEMPLATES = [
  {
    title: 'خوش‌آمدگویی عضویت',
    body: '{نام} عزیز، به {نام_باشگاه} خوش آمدید. ثبت‌نام شما با موفقیت تایید شد. برای مشاهده برنامه تمرینات وارد پرتال باشگاه شوید.',
  },
  {
    title: 'یادآوری تمدید شهریه',
    body: '{نام} گرامی، مهلت پرداخت شهریه شما فرارسیده است. مبلغ بدهی: {مبلغ_بدهی} تومان. خواهشمند است نسبت به تسویه حساب اقدام فرمایید. - {نام_باشگاه}',
  },
  {
    title: 'تغییر ساعت / سانس',
    body: 'ورزشکار گرامی ({نام})، به اطلاع می‌رساند سانس تمرینی شما در تاریخ {تاریخ} با تغییر ساعت برگزار خواهد شد. لطفا برنامه را بررسی نمایید.',
  },
  {
    title: 'هشدار انقضای بیمه ورزشی',
    body: '{نام} عزیز، اعتبار کارت بیمه ورزشی شما به پایان رسیده است. جهت جلوگیری از عدم اجازه ورود به سالن سنگ‌نوردی، لطفا فورا بیمه خود را تمدید فرمایید.',
  },
  {
    title: 'تعطیلی اضطراری سالن',
    body: 'ورزشکاران گرامی {نام_باشگاه}، به دلیل تعمیرات و تجهیز سالن سنگ‌نوردی، سالن در تاریخ {تاریخ} تعطیل می‌باشد. جلسات جبرانی متعاقبا اعلام خواهد شد.',
  },
];

export const SmsManagementView: React.FC<SmsManagementViewProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'send' | 'verify' | 'logs' | 'settings'>('send');
  const [clubSettings, setClubSettings] = useState<ClubSettings>(dbStore.getClubSettings());
  const [users, setUsers] = useState<User[]>(dbStore.getUsers());
  const [sessions, setSessions] = useState<TrainingSession[]>(dbStore.getSessions());
  const [debtors, setDebtors] = useState<DebtorRecord[]>(dbStore.getDebtors());
  const [smsLogs, setSmsLogs] = useState<SmsLogRecord[]>(dbStore.getSmsLogs());

  // Connection & Credit State
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [isCheckingCredit, setIsCheckingCredit] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [availableLines, setAvailableLines] = useState<string[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);

  // Settings State Form
  const [apiKeyInput, setApiKeyInput] = useState(clubSettings.smsApiKey || '');
  const [lineNumberInput, setLineNumberInput] = useState(clubSettings.smsLineNumber || '30007732');
  const [signatureInput, setSignatureInput] = useState(clubSettings.smsSignature || clubSettings.name || 'باشگاه سنگ‌نوردی موج');
  const [autoRegister, setAutoRegister] = useState(clubSettings.smsAutoSendOnRegister !== false);
  const [autoPayment, setAutoPayment] = useState(clubSettings.smsAutoSendOnPayment !== false);
  const [autoInsurance, setAutoInsurance] = useState(clubSettings.smsAutoSendOnInsurance !== false);
  const [autoDebt, setAutoDebt] = useState(Boolean(clubSettings.smsAutoSendOnDebtReminder));
  const [welcomePatternId, setWelcomePatternId] = useState(clubSettings.smsWelcomePatternId || '');
  const [paymentPatternId, setPaymentPatternId] = useState(clubSettings.smsPaymentPatternId || '');
  const [debtPatternId, setDebtPatternId] = useState(clubSettings.smsDebtPatternId || '');
  
  // Bale Messenger Settings State
  const [baleTokenInput, setBaleTokenInput] = useState(clubSettings.baleBotToken || '');
  const [baleChatInput, setBaleChatInput] = useState(clubSettings.baleChannelOrChatId || '');
  const [baleAutoRegister, setBaleAutoRegister] = useState(clubSettings.baleAutoSendOnRegister !== false);
  const [baleAutoPayment, setBaleAutoPayment] = useState(clubSettings.baleAutoSendOnPayment !== false);
  const [baleAutoInsurance, setBaleAutoInsurance] = useState(clubSettings.baleAutoSendOnInsurance !== false);
  const [baleAutoDebt, setBaleAutoDebt] = useState(Boolean(clubSettings.baleAutoSendOnDebtReminder));
  const [isTestingBale, setIsTestingBale] = useState(false);
  const [baleBotInfo, setBaleBotInfo] = useState<any>(null);

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Bulk Send Channel State
  const [sendChannel, setSendChannel] = useState<'sms' | 'bale' | 'both'>('sms');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Bulk Send Form State
  const [targetAudience, setTargetAudience] = useState<'all_athletes' | 'debtors' | 'session' | 'coaches' | 'custom'>('all_athletes');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [customNumbersInput, setCustomNumbersInput] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false);

  // Fast Verify Pattern Send State
  const [verifyMobile, setVerifyMobile] = useState('');
  const [verifyTemplateId, setVerifyTemplateId] = useState('');
  const [verifyParams, setVerifyParams] = useState<{ name: string; value: string }[]>([
    { name: 'Code', value: '' },
    { name: 'Name', value: '' },
  ]);
  const [isSendingVerify, setIsSendingVerify] = useState(false);

  // Logs Filter State
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');

  // Refresh component data
  const refreshLocalData = () => {
    setClubSettings(dbStore.getClubSettings());
    setUsers(dbStore.getUsers());
    setSessions(dbStore.getSessions());
    setDebtors(dbStore.getDebtors());
    setSmsLogs(dbStore.getSmsLogs());
  };

  useEffect(() => {
    refreshLocalData();
    const handleUpdate = () => refreshLocalData();
    window.addEventListener('dbStoreUpdated', handleUpdate);
    return () => window.removeEventListener('dbStoreUpdated', handleUpdate);
  }, []);

  // Fetch Credit Balance
  const handleCheckCredit = async (silent = false) => {
    if (!clubSettings.smsApiKey && !apiKeyInput) {
      if (!silent) showToast('لطفاً ابتدا کلید وب‌سرویس (API Key) را در بخش تنظیمات وارد نمایید.', 'error');
      return;
    }
    setIsCheckingCredit(true);
    setCreditError(null);
    try {
      const res = await dbStore.checkSmsCredit(apiKeyInput || clubSettings.smsApiKey);
      if (res.success && typeof res.credit === 'number') {
        setCreditBalance(res.credit);
        if (!silent) showToast(`مانده اعتبار با موفقیت دریافت شد: ${res.credit.toLocaleString('fa-IR')} ریال`, 'success');
      } else {
        setCreditError(res.error || 'پاسخی از سرور sms.ir دریافت نشد.');
        if (!silent) showToast(res.error || 'خطا در استعلام اعتبار', 'error');
      }
    } catch (err: any) {
      setCreditError(err.message || 'خطای شبکه');
    } finally {
      setIsCheckingCredit(false);
    }
  };

  // Fetch Available Lines
  const handleFetchLines = async () => {
    if (!clubSettings.smsApiKey && !apiKeyInput) {
      showToast('لطفاً ابتدا کلید وب‌سرویس (API Key) را وارد کنید.', 'error');
      return;
    }
    setIsLoadingLines(true);
    try {
      const res = await dbStore.getSmsLines(apiKeyInput || clubSettings.smsApiKey);
      if (res.success && res.lines && res.lines.length > 0) {
        setAvailableLines(res.lines);
        if (!lineNumberInput || lineNumberInput === '30007732') {
          setLineNumberInput(res.lines[0]);
        }
        showToast(`${toPersianDigits(res.lines.length)} خط اختصاصی فعال یافت شد.`, 'success');
      } else {
        showToast(res.error || 'خط اختصاصی فعالی روی این حساب یافت نشد.', 'error');
      }
    } catch (err: any) {
      showToast('خطا در دریافت لیست خطوط.', 'error');
    } finally {
      setIsLoadingLines(false);
    }
  };

  // Auto-check credit on mount if API Key exists
  useEffect(() => {
    if (clubSettings.smsApiKey) {
      handleCheckCredit(true);
    }
  }, [clubSettings.smsApiKey]);

  // Compute recipient list based on Target Audience
  const computedRecipients = useMemo(() => {
    const list: { name: string; phone: string; baleChatId?: string; debt?: number; extra?: string }[] = [];

    if (targetAudience === 'all_athletes') {
      users
        .filter((u) => u.isActive && (u.roles.includes('athlete') || u.activeRole === 'athlete'))
        .forEach((u) => {
          if (u.phone || u.baleChatId) {
            list.push({ name: u.fullName, phone: u.phone || '', baleChatId: u.baleChatId });
          }
        });
    } else if (targetAudience === 'debtors') {
      const debtorMap = new Map<string, number>();
      debtors.forEach((d) => {
        debtorMap.set(d.userId, (debtorMap.get(d.userId) || 0) + (d.amount || 0));
      });

      debtorMap.forEach((debtAmount, uid) => {
        const u = users.find((x) => x.id === uid);
        if (u && (u.phone || u.baleChatId) && debtAmount > 0) {
          list.push({ name: u.fullName, phone: u.phone || '', baleChatId: u.baleChatId, debt: debtAmount });
        }
      });
    } else if (targetAudience === 'session' && selectedSessionId) {
      const targetSession = sessions.find((s) => s.id === selectedSessionId);
      const enrollments = dbStore.getEnrollments().filter((e) => e.sessionId === selectedSessionId && e.status === 'active');

      enrollments.forEach((e) => {
        const u = users.find((x) => x.id === e.userId);
        const ph = e.athletePhone || u?.phone || '';
        if (ph || u?.baleChatId) {
          list.push({ name: e.athleteName || u?.fullName || 'ورزشکار', phone: ph, baleChatId: u?.baleChatId, extra: targetSession?.title });
        }
      });
    } else if (targetAudience === 'coaches') {
      users
        .filter((u) => u.isActive && (u.roles.includes('coach') || u.roles.includes('admin') || u.roles.includes('secretary')))
        .forEach((u) => {
          if (u.phone || u.baleChatId) {
            list.push({ name: u.fullName, phone: u.phone || '', baleChatId: u.baleChatId, extra: u.roles.join(', ') });
          }
        });
    } else if (targetAudience === 'custom') {
      const rawInputs = customNumbersInput
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter(Boolean);

      const uniqueInputs = Array.from(new Set(rawInputs));
      uniqueInputs.forEach((inputVal, idx) => {
        const cleanDigits = toEnglishDigits(inputVal).replace(/\D/g, '');
        const matched = users.find((u) => (u.phone && u.phone.replace(/\D/g, '') === cleanDigits) || u.baleChatId === inputVal);
        list.push({
          name: matched ? matched.fullName : `مخاطب ${idx + 1}`,
          phone: cleanDigits.length >= 10 ? cleanDigits : inputVal,
          baleChatId: matched?.baleChatId || (inputVal.startsWith('@') || !isNaN(Number(inputVal)) ? inputVal : undefined),
        });
      });
    }

    return list;
  }, [targetAudience, selectedSessionId, customNumbersInput, users, debtors, sessions]);

  // Character & Page Part Calculator
  const fullComposedMessage = useMemo(() => {
    let text = messageBody.trim();
    if (includeSignature && signatureInput.trim()) {
      text += `\n\n📌 ${signatureInput.trim()}`;
    }
    return text;
  }, [messageBody, includeSignature, signatureInput]);

  const charCount = fullComposedMessage.length;
  const isPersian = /[\u0600-\u06FF]/.test(fullComposedMessage);
  const smsPages = useMemo(() => {
    if (charCount === 0) return 0;
    if (isPersian) {
      if (charCount <= 70) return 1;
      return Math.ceil(charCount / 67);
    } else {
      if (charCount <= 160) return 1;
      return Math.ceil(charCount / 153);
    }
  }, [charCount, isPersian]);

  // Handle Test Bale Connection
  const handleTestBaleConnection = async () => {
    if (!baleTokenInput.trim()) {
      showToast('لطفاً توکن ربات بله (Bot Token) را وارد نمایید.', 'error');
      return;
    }
    setIsTestingBale(true);
    setBaleBotInfo(null);
    try {
      const res = await dbStore.testBaleBotConnection(baleTokenInput.trim());
      if (res.success) {
        setBaleBotInfo(res.botInfo);
        showToast(res.message || `ارتباط با ربات بله برقرار شد: ${res.botInfo?.first_name || 'Bot'}`, 'success');
      } else {
        showToast(res.error || 'خطا در اتصال به ربات بله', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در برقراری ارتباط با پیام‌رسان بله', 'error');
    } finally {
      setIsTestingBale(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const updated = dbStore.updateClubSettings(
        {
          smsApiKey: apiKeyInput.trim(),
          smsLineNumber: lineNumberInput.trim(),
          smsSignature: signatureInput.trim(),
          smsAutoSendOnRegister: autoRegister,
          smsAutoSendOnPayment: autoPayment,
          smsAutoSendOnInsurance: autoInsurance,
          smsAutoSendOnDebtReminder: autoDebt,
          smsWelcomePatternId: welcomePatternId.trim(),
          smsPaymentPatternId: paymentPatternId.trim(),
          smsDebtPatternId: debtPatternId.trim(),
          baleBotToken: baleTokenInput.trim(),
          baleChannelOrChatId: baleChatInput.trim(),
          baleAutoSendOnRegister: baleAutoRegister,
          baleAutoSendOnPayment: baleAutoPayment,
          baleAutoSendOnInsurance: baleAutoInsurance,
          baleAutoSendOnDebtReminder: baleAutoDebt,
        },
        currentUser.fullName || 'مدیر'
      );
      setClubSettings(updated);
      showToast('تنظیمات پیامک sms.ir و پیام‌رسان بله با موفقیت ذخیره شد.', 'success');
      if (apiKeyInput) handleCheckCredit(true);
      if (baleTokenInput) handleTestBaleConnection();
    } catch (err: any) {
      showToast('خطا در ذخیره تنظیمات.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Execute Sending Bulk / Single Messages (SMS & Bale)
  const handleExecuteSend = async () => {
    if (!messageBody.trim()) {
      showToast('متن پیام نمی‌تواند خالی باشد.', 'error');
      return;
    }
    if (computedRecipients.length === 0) {
      showToast('هیچ گیرنده‌ای برای ارسال یافت نشد.', 'error');
      return;
    }

    setIsSending(true);
    setIsConfirmSendOpen(false);

    try {
      const isPersonalized = messageBody.includes('{نام}') || messageBody.includes('{مبلغ_بدهی}');
      const todayDate = formatJalaliDate(getCurrentJalaliDate());

      let smsSuccessCount = 0;
      let baleSuccessCount = 0;
      let smsFailCount = 0;
      let baleFailCount = 0;
      let lastBaleError = '';

      // 1. Send via Bale if selected ('bale' or 'both')
      if (sendChannel === 'bale' || sendChannel === 'both') {
        const tokenToUse = baleTokenInput || clubSettings.baleBotToken;
        if (!tokenToUse) {
          showToast('توکن ربات بله در کادر تنطیمات یا فرم وارد نشده است.', 'error');
          baleFailCount = computedRecipients.length;
          lastBaleError = 'توکن ربات بله وارد نشده است.';
        } else {
          for (const recipient of computedRecipients) {
            const recipientChatId = recipient.baleChatId || baleChatInput || clubSettings.baleChannelOrChatId;

            let customMsg = isPersonalized
              ? messageBody
                  .replace(/{نام}/g, recipient.name)
                  .replace(/{نام_باشگاه}/g, clubSettings.name || 'باشگاه')
                  .replace(/{مبلغ_بدهی}/g, recipient.debt ? formatToman(recipient.debt) : '0')
                  .replace(/{تاریخ}/g, todayDate)
              : fullComposedMessage;

            if (isPersonalized && includeSignature && signatureInput.trim()) {
              customMsg += `\n\n📌 ${signatureInput.trim()}`;
            }

            if (!recipientChatId) {
              baleFailCount++;
              lastBaleError = 'شناسه چت یا آیدی کانال بله مشخص نشده است.';
              dbStore.addSmsLog({
                recipients: ['نامشخص'],
                recipientNames: [recipient.name],
                message: customMsg,
                channel: 'bale',
                type: 'bale_channel',
                targetGroup: targetAudience,
                status: 'failed',
                errorMessage: 'شناسه چت یا آیدی کانال/گروه بله برای این گیرنده مشخص نشده است.',
                sentBy: currentUser.fullName || 'مدیریت',
              });
              continue;
            }

            const baleRes = await dbStore.sendBaleMessage({
              botToken: tokenToUse,
              chatId: recipientChatId,
              text: customMsg,
              recipientName: recipient.name,
              targetGroup: targetAudience,
              sentBy: currentUser.fullName || 'مدیریت',
            });
            if (baleRes.success) {
              baleSuccessCount++;
            } else {
              baleFailCount++;
              lastBaleError = baleRes.error || 'خطا در ارسال پیام به بله';
            }
          }
        }
      }

      // 2. Send via SMS if selected ('sms' or 'both')
      if (sendChannel === 'sms' || sendChannel === 'both') {
        if (isPersonalized) {
          for (const recipient of computedRecipients) {
            let customMsg = messageBody
              .replace(/{نام}/g, recipient.name)
              .replace(/{نام_باشگاه}/g, clubSettings.name || 'باشگاه')
              .replace(/{مبلغ_بدهی}/g, recipient.debt ? formatToman(recipient.debt) : '0')
              .replace(/{تاریخ}/g, todayDate);

            if (includeSignature && signatureInput.trim()) {
              customMsg += `\n\n📌 ${signatureInput.trim()}`;
            }

            const smsRes = await dbStore.sendBulkSms({
              mobiles: [recipient.phone],
              messageText: customMsg,
              recipientNames: [recipient.name],
              targetGroup: targetAudience,
              sentBy: currentUser.fullName || 'مدیریت',
            });

            if (smsRes.success) smsSuccessCount++;
            else smsFailCount++;
          }
        } else {
          const phoneList = computedRecipients.map((r) => r.phone);
          const nameList = computedRecipients.map((r) => r.name);

          const smsRes = await dbStore.sendBulkSms({
            mobiles: phoneList,
            messageText: fullComposedMessage,
            recipientNames: nameList,
            targetGroup: targetAudience,
            sentBy: currentUser.fullName || 'مدیریت',
          });

          if (smsRes.success) smsSuccessCount = phoneList.length;
          else smsFailCount = phoneList.length;
        }
      }

      refreshLocalData();
      if (apiKeyInput) handleCheckCredit(true);

      // Construct Result Toast
      const feedbackMessages: string[] = [];
      let isErrorToast = false;

      if (sendChannel === 'sms' || sendChannel === 'both') {
        if (smsFailCount === 0 && smsSuccessCount > 0) {
          feedbackMessages.push(`پیامک: ${toPersianDigits(smsSuccessCount)} ارسال موفق`);
        } else if (smsFailCount > 0) {
          feedbackMessages.push(`پیامک: ${toPersianDigits(smsSuccessCount)} موفق، ${toPersianDigits(smsFailCount)} ناموفق`);
          if (smsSuccessCount === 0) isErrorToast = true;
        }
      }

      if (sendChannel === 'bale' || sendChannel === 'both') {
        if (baleFailCount === 0 && baleSuccessCount > 0) {
          feedbackMessages.push(`بله: ${toPersianDigits(baleSuccessCount)} ارسال موفق`);
        } else if (baleFailCount > 0) {
          const errDetail = lastBaleError ? ` - علت: ${lastBaleError}` : '';
          feedbackMessages.push(`بله: ${toPersianDigits(baleSuccessCount)} موفق، ${toPersianDigits(baleFailCount)} ناموفق${errDetail}`);
          if (baleSuccessCount === 0) isErrorToast = true;
        }
      }

      showToast(feedbackMessages.join(' | ') || 'عملیات ارسال به پایان رسید.', isErrorToast ? 'error' : 'success');
      if (baleSuccessCount > 0 || smsSuccessCount > 0) {
        setMessageBody('');
      }
    } catch (err: any) {
      showToast(err.message || 'خطای غیرمنتظره در ارسال پیام', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Sending Verify Pattern (Fast OTP / Transactional)
  const handleSendVerifyPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyMobile.trim() || !verifyTemplateId.trim()) {
      showToast('لطفاً شماره موبایل و شناسه قالب (Template ID) را وارد نمایید.', 'error');
      return;
    }

    const cleanMobile = toEnglishDigits(verifyMobile).trim().replace(/\D/g, '');
    const cleanTemplateId = parseInt(toEnglishDigits(verifyTemplateId).trim(), 10);

    if (cleanMobile.length < 10 || isNaN(cleanTemplateId)) {
      showToast('شماره موبایل یا شناسه قالب نامعتبر است.', 'error');
      return;
    }

    const validParams = verifyParams.filter((p) => p.name.trim() && p.value.trim());

    setIsSendingVerify(true);
    try {
      const res = await dbStore.sendVerifyPatternSms({
        mobile: cleanMobile,
        templateId: cleanTemplateId,
        parameters: validParams,
        sentBy: currentUser.fullName || 'مدیریت',
      });

      if (res.success) {
        showToast('پیامک سریع (پترن) با موفقیت به شماره گیرنده ارسال گردید.', 'success');
        refreshLocalData();
        handleCheckCredit(true);
        setVerifyMobile('');
        setVerifyParams([
          { name: 'Code', value: '' },
          { name: 'Name', value: '' },
        ]);
      } else {
        showToast(res.error || 'خطا در ارسال الگوی پیامک سریع.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'خطای وب‌سرویس پترن', 'error');
    } finally {
      setIsSendingVerify(false);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return smsLogs.filter((log) => {
      const q = logSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        log.message.toLowerCase().includes(q) ||
        log.recipients.some((r) => r.includes(q)) ||
        (log.recipientNames && log.recipientNames.some((n) => n.toLowerCase().includes(q)));

      const matchStatus = logStatusFilter === 'all' || log.status === logStatusFilter;
      const matchType = logTypeFilter === 'all' || log.type === logTypeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [smsLogs, logSearchQuery, logStatusFilter, logTypeFilter]);

  // Export Logs to Excel
  const handleExportLogsExcel = () => {
    if (smsLogs.length === 0) {
      showToast('تاریخچه‌ای برای صدور فایل اکسل وجود ندارد.', 'info');
      return;
    }

    const rows = filteredLogs.map((log, index) => ({
      'ردیف': index + 1,
      'تاریخ و زمان ارسال': log.sentAt,
      'نوع ارسال':
        log.type === 'bulk'
          ? 'ارسال گروهی'
          : log.type === 'single'
          ? 'ارسال تکی'
          : log.type === 'verify_pattern'
          ? 'الگوی پترن سریع'
          : 'خودکار سیستم',
      'تعداد گیرندگان': log.recipients.length,
      'شماره‌های گیرنده': log.recipients.join(' ، '),
      'نام مخاطبان': log.recipientNames?.join(' ، ') || '-',
      'متن پیامک': log.message,
      'وضعیت ارسال': log.status === 'sent' ? 'موفق' : 'ناموفق',
      'فرستنده': log.sentBy,
      'شناسه پیامک سرور': log.packId || log.messageIds?.join(', ') || '-',
      'هزینه تقریبی (ریال)': log.cost || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سوابق پیامک');
    const todayJalali = getCurrentJalaliDate();
    XLSX.writeFile(wb, `SMS_Logs_${todayJalali.jy}_${todayJalali.jm}.xlsx`);
    showToast('فایل اکسل سوابق پیامک با موفقیت دانلود شد.', 'success');
  };

  const isConfigured = Boolean(clubSettings.smsApiKey);
  const activePal = THEME_PALETTES[clubSettings.themePalette] || THEME_PALETTES.wave;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 font-sans" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold border transition-all animate-bounce ${
            toastType === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20'
              : toastType === 'error'
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20'
              : 'bg-teal-700 text-white border-teal-600 shadow-teal-900/20'
          }`}
        >
          {toastType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header & Status Summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm shrink-0">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900">
                  سامانه پیامک و اطلاع‌رسانی هوشمند باشگاه
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  sms.ir REST API
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ارسال پیامک‌های گروهی، یادآوری بدهی و شهریه، اطلاع‌رسانی تغییر سانس و وب‌سرویس پترن سریع
              </p>
            </div>
          </div>

          {/* Quick Credit & Status Badges */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Gateway Status Badge */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border ${
                isConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div className="text-xs">
                <div className="font-black">{isConfigured ? 'درگاه پیامک متصل' : 'نیازمند تنظیم API Key'}</div>
                <div className="text-[10px] opacity-75 font-mono">
                  {clubSettings.smsLineNumber ? `خط فرستنده: ${clubSettings.smsLineNumber}` : 'sms.ir Gateway'}
                </div>
              </div>
            </div>

            {/* Credit Balance Card */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 shadow-xs">
              <CreditCard className="w-5 h-5 text-teal-600" />
              <div>
                <div className="text-[10px] text-slate-500 font-bold">مانده اعتبار پنل:</div>
                <div className="text-sm font-black font-mono text-teal-700 flex items-center gap-1">
                  {isCheckingCredit ? (
                    <span className="text-xs text-slate-400 animate-pulse">در حال استعلام...</span>
                  ) : creditBalance !== null ? (
                    <>
                      <span>{toPersianDigits(creditBalance.toLocaleString('fa-IR'))}</span>
                      <span className="text-[10px] text-slate-500 font-sans">ریال</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">نامشخص</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCheckCredit(false)}
                disabled={isCheckingCredit}
                className="p-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 text-teal-600 transition-colors shadow-xs"
                title="استعلام مجدد اعتبار"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingCredit ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Link to sms.ir recharge */}
            <a
              href="https://app.sms.ir/finance/charge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm shadow-teal-600/30 transition-all hover:scale-105"
            >
              <span>شارژ پنل</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Sub-tabs Navigation Header */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('send')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'send'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Send className="w-4 h-4 text-teal-400" />
            <span>ارسال پیامک گروهی و تکی</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-teal-300 font-mono">
              {toPersianDigits(users.filter((u) => u.isActive && u.phone).length)} مخاطب
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('verify')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'verify'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>ارسال پترن سریع (OTP / خدماتی)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'logs'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>تاریخچه و لاگ ارسال‌ها</span>
            {smsLogs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold">
                {toPersianDigits(smsLogs.length)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'settings'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>تنظیمات درگاه و اتوماسیون</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SEND BULK & SINGLE SMS & BALE */}
      {/* ========================================================================= */}
      {activeSubTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column: Audience & Composer */}
          <div className="lg:col-span-8 space-y-6">
            {/* Channel Selector (SMS / Bale / Both) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-teal-600" />
                  <span>انتخاب کانال اطلاع‌رسانی (پیامک / پیام‌رسان بله)</span>
                </span>
                <span className="text-xs font-normal text-slate-500">
                  {sendChannel === 'sms' ? 'ارسال پیامک مخابراتی' : sendChannel === 'bale' ? 'ارسال به پیام‌رسان بله' : 'ارسال دوگانه (پیامک + بله)'}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSendChannel('sms')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    sendChannel === 'sms'
                      ? 'bg-teal-50/80 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📱</span>
                    <div>
                      <div className="text-xs font-bold">پیامک (SMS.ir)</div>
                      <div className="text-[10px] text-slate-500 font-normal">ارسال به شماره موبایل مخاطبین</div>
                    </div>
                  </div>
                  {sendChannel === 'sms' && <Check className="w-4 h-4 text-teal-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSendChannel('bale')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    sendChannel === 'bale'
                      ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">💬</span>
                    <div>
                      <div className="text-xs font-bold">پیام‌رسان بله (Bale)</div>
                      <div className="text-[10px] text-slate-500 font-normal">ارسال به کانال یا گروه/چت بله</div>
                    </div>
                  </div>
                  {sendChannel === 'bale' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSendChannel('both')}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    sendChannel === 'both'
                      ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🚀</span>
                    <div>
                      <div className="text-xs font-bold">ارسال دوگانه (پیامک + بله)</div>
                      <div className="text-[10px] text-slate-500 font-normal">همزمان در شبکه مخابرات و پیام‌رسان</div>
                    </div>
                  </div>
                  {sendChannel === 'both' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              </div>
            </div>

            {/* Audience Filter Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>۱. انتخاب مخاطبان و گیرندگان پیامک</span>
              </h2>

              {/* Target Type Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTargetAudience('all_athletes')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    targetAudience === 'all_athletes'
                      ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Users className="w-5 h-5 text-teal-600" />
                  <span className="text-xs">همه ورزشکاران</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('debtors')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    targetAudience === 'debtors'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <DollarSign className="w-5 h-5 text-rose-600" />
                  <span className="text-xs">بدهکاران شهریه</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('session')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    targetAudience === 'session'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-2 ring-indigo-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs">اعضای سانس خاص</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('coaches')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    targetAudience === 'coaches'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">مربیان و کادر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAudience('custom')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    targetAudience === 'custom'
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-800 ring-2 ring-cyan-500/20 font-black'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-cyan-600" />
                  <span className="text-xs">شماره‌های دلخواه</span>
                </button>
              </div>

              {/* Sub-selectors */}
              {targetAudience === 'session' && (
                <div className="pt-2 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    انتخاب دوره / سانس ورزشی:
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- یک سانس را انتخاب کنید --</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.coachName} - ساعت {s.startTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetAudience === 'custom' && (
                <div className="pt-2 animate-fadeIn space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    شماره موبایل‌های موردنظر (با اینتر یا کاما جدا کنید):
                  </label>
                  <textarea
                    rows={3}
                    value={customNumbersInput}
                    onChange={(e) => setCustomNumbersInput(e.target.value)}
                    placeholder="09121112233&#10;09354445566&#10;09137778899"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              {/* Recipient Counter & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">تعداد گیرندگان شناسایی‌شده:</span>
                  <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 font-black font-mono text-sm border border-teal-200">
                    {toPersianDigits(computedRecipients.length)} نفر
                  </span>
                </div>

                {computedRecipients.length > 0 && (
                  <div className="text-[11px] text-slate-500 truncate max-w-md">
                    نمونه گیرندگان:{' '}
                    {computedRecipients
                      .slice(0, 3)
                      .map((r) => `${r.name} (${r.phone})`)
                      .join(' ، ')}
                    {computedRecipients.length > 3 && ` و ${computedRecipients.length - 3} نفر دیگر`}
                  </div>
                )}
              </div>
            </div>

            {/* Message Composer Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                  <span>۲. تنظیم و نگارش متن پیامک</span>
                </h2>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>درج خودکار امضای باشگاه</span>
                </label>
              </div>

              {/* Quick Template Picker */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500">
                  ⚡ استفاده از قالب‌های آماده پیامکی:
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageBody(tmpl.body)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>{tmpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Tags Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="text-slate-500 text-[11px] font-bold">متغیرهای هوشمند:</span>
                {[
                  { tag: '{نام}', label: 'نام عضو' },
                  { tag: '{نام_باشگاه}', label: 'نام باشگاه' },
                  { tag: '{مبلغ_بدهی}', label: 'مبلغ بدهی' },
                  { tag: '{تاریخ}', label: 'تاریخ روز' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessageBody((prev) => prev + ` ${item.tag}`)}
                    className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 font-mono text-xs hover:bg-teal-100 transition-colors font-bold"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="متن پیامک خود را اینجا بنویسید..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-300 text-xs sm:text-sm leading-relaxed text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 resize-none shadow-inner"
                />

                {includeSignature && signatureInput.trim() && (
                  <div className="absolute bottom-3 left-4 text-xs font-bold text-slate-400 pointer-events-none select-none">
                    📌 {signatureInput.trim()}
                  </div>
                )}
              </div>

              {/* Character & Cost Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-slate-500">تعداد کاراکتر: </span>
                    <strong className="font-mono text-slate-900">{toPersianDigits(charCount)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">تعداد پارت / صفحه: </span>
                    <strong className="font-mono text-teal-700 font-black">{toPersianDigits(smsPages)} صفحه</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">زبان: </span>
                    <span className="font-bold text-slate-800">{isPersian ? 'فارسی' : 'انگلیسی'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500">مجموع پیامک ارسالی:</span>
                  <strong className="font-mono text-indigo-700 font-black text-sm">
                    {toPersianDigits(computedRecipients.length * Math.max(smsPages, 1))} پیامک
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMessageBody('')}
                  disabled={!messageBody}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
                >
                  پاکسازی متن
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmSendOpen(true)}
                  disabled={!messageBody.trim() || computedRecipients.length === 0 || isSending}
                  className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال پیامک به {toPersianDigits(computedRecipients.length)} نفر</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Mobile Smartphone Preview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span>پیش‌نمایش در گوشی مخاطب</span>
              </h3>

              {/* Smartphone Frame Mockup */}
              <div className="mx-auto w-full max-w-[280px] rounded-[38px] bg-slate-900 p-3 shadow-xl border-4 border-slate-700 text-white relative overflow-hidden">
                {/* Notch */}
                <div className="w-24 h-4 bg-slate-950 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                </div>

                {/* Screen Header */}
                <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800 text-[10px] text-slate-400">
                  <span className="font-mono">{new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-bold text-teal-400 font-mono">{clubSettings.smsLineNumber || '30007732'}</span>
                  <span>📶 100%</span>
                </div>

                {/* Chat Bubble Area */}
                <div className="min-h-[260px] py-4 flex flex-col justify-end space-y-2">
                  <div className="bg-gradient-to-r from-teal-700 to-emerald-700 rounded-2xl rounded-tr-xs p-3.5 text-xs text-white shadow-md space-y-2 max-w-[92%] self-end">
                    <p className="whitespace-pre-line leading-relaxed text-[11px]">
                      {fullComposedMessage || 'متن پیامک شما پس از تایپ در این قسمت برای بررسی دقیق نمایش داده می‌شود...'}
                    </p>
                    <div className="text-[9px] text-teal-200 font-mono text-left">
                      {new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="w-16 h-1 bg-slate-600 rounded-full mx-auto mt-2" />
              </div>

              {/* Tips Box */}
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-100 text-xs text-slate-700 space-y-1.5">
                <div className="font-black text-teal-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>نکات مهم ارسال پیامک:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                  <li>پیامک‌های حاوی تبلیغات به افرادی که بلک‌لیست مخابراتی دارند تحویل نمی‌شوند.</li>
                  <li>برای ارسال‌های فوری و کدهای تایید حتماً از تب «ارسال پترن سریع» استفاده فرمایید.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FAST VERIFY PATTERN (OTP / TRANSACTIONAL) */}
      {/* ========================================================================= */}
      {activeSubTab === 'verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>ارسال سریع بر اساس الگوی تایید شده (Verify Pattern)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  این روش مستقیماً از طریق وب‌سرویس پترن sms.ir ارسال می‌شود و <strong>از بلک‌لیست مخابرات عبور می‌کند</strong> (مناسب کد تایید، تاییدیه پرداخت و هشدارهای اضطراری).
                </p>
              </div>

              <form onSubmit={handleSendVerifyPattern} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      شماره موبایل گیرنده: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="09121234567"
                      value={verifyMobile}
                      onChange={(e) => setVerifyMobile(toEnglishDigits(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      شناسه قالب پترن (Template ID): <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123456"
                      value={verifyTemplateId}
                      onChange={(e) => setVerifyTemplateId(toEnglishDigits(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Dynamic Parameter Pairs */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      پارامترهای متغیر قالب (Key - Value Parameters):
                    </label>
                    <button
                      type="button"
                      onClick={() => setVerifyParams((prev) => [...prev, { name: '', value: '' }])}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      + افزودن متغیر جدید
                    </button>
                  </div>

                  {verifyParams.map((param, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="نام متغیر (مثلاً Code یا Name)"
                        value={param.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVerifyParams((prev) =>
                            prev.map((item, i) => (i === pIdx ? { ...item, name: val } : item))
                          );
                        }}
                        className="w-1/2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                      />
                      <input
                        type="text"
                        placeholder="مقدار متغیر (مثلاً 54321)"
                        value={param.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVerifyParams((prev) =>
                            prev.map((item, i) => (i === pIdx ? { ...item, value: val } : item))
                          );
                        }}
                        className="w-1/2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                      />
                      {verifyParams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setVerifyParams((prev) => prev.filter((_, i) => i !== pIdx))}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSendingVerify}
                    className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-600/30 transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSendingVerify ? 'در حال ارسال پترن...' : 'ارسال فوری وب‌سرویس پترن'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>مزایای ارسال پترن سریع</span>
              </h3>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <p>
                  ✅ <strong>عبور کامل از بلک‌لیست:</strong> به تمامی شماره‌هایی که پیامک‌های تبلیغاتی را مسدود کرده‌اند ارسال می‌شود.
                </p>
                <p>
                  ⚡ <strong>سرعت تحویل زیر ۵ ثانیه:</strong> دارای خطوط خدماتی اشتراکی با بالاترین اولویت در شبکه مخابراتی.
                </p>
                <p>
                  ⚙️ <strong>تعریف قالب:</strong> برای تعریف قالب جدید به پنل <a href="https://app.sms.ir" target="_blank" rel="noreferrer" className="text-teal-600 underline font-bold">sms.ir</a> بخش «ارسال سریع» مراجعه فرمایید.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LOGS & HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در پیام، شماره یا نام..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="sent">ارسال شده (موفق)</option>
                <option value="failed">ناموفق / خطا</option>
              </select>

              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">همه انواع پیام</option>
                <option value="bulk">ارسال گروهی</option>
                <option value="single">ارسال تکی</option>
                <option value="verify_pattern">پترن سریع</option>
                <option value="auto_notification">خودکار سیستم</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportLogsExcel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>خروجی اکسل</span>
              </button>

              {smsLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('آیا از پاکسازی تمام لاگ‌ها اطمینان دارید؟')) {
                      dbStore.clearSmsLogs();
                      refreshLocalData();
                      showToast('تاریخچه پیامک‌ها پاک شد.', 'info');
                    }
                  }}
                  className="p-2 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
                  title="پاکسازی تاریخچه"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3.5 px-4">زمان ارسال</th>
                    <th className="py-3.5 px-4">نوع</th>
                    <th className="py-3.5 px-4">گیرندگان</th>
                    <th className="py-3.5 px-4">متن پیامک</th>
                    <th className="py-3.5 px-4">وضعیت</th>
                    <th className="py-3.5 px-4">ارسال‌کننده</th>
                    <th className="py-3.5 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <span>هیچ تاریخچه پیامکی یافت نشد.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {toPersianDigits(log.sentAt)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap space-x-1 space-x-reverse">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.channel === 'bale' || log.type === 'bale_channel'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : log.type === 'bulk'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : log.type === 'verify_pattern'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}
                          >
                            {log.channel === 'bale' || log.type === 'bale_channel'
                              ? '💬 بله'
                              : log.type === 'bulk'
                              ? '📱 انبوه'
                              : log.type === 'single'
                              ? '📱 تکی'
                              : log.type === 'verify_pattern'
                              ? '⚡ پترن سریع'
                              : '🤖 خودکار'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="font-bold text-slate-800 truncate">
                            {log.recipients.length === 1 ? (
                              <span>
                                {log.recipientNames?.[0] || 'مخاطب'}{' '}
                                <span className="font-mono text-slate-400">({log.recipients[0]})</span>
                              </span>
                            ) : (
                              <span>
                                {toPersianDigits(log.recipients.length)} شماره{' '}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({log.recipients.slice(0, 2).join(', ')}...)
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[320px]">
                          <p className="text-slate-700 truncate" title={log.message}>
                            {log.message}
                          </p>
                        </td>
                        <td className="py-3 px-4 max-w-[220px]">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.status === 'failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {log.status === 'sent' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>ارسال موفق</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>خطا در ارسال</span>
                              </>
                            )}
                          </span>
                          {log.status === 'failed' && log.errorMessage && (
                            <p className="text-[10px] text-rose-600 font-normal mt-1 leading-tight break-words" title={log.errorMessage}>
                              ⚠️ {log.errorMessage}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {log.sentBy}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              dbStore.deleteSmsLog(log.id);
                              refreshLocalData();
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title="حذف لاگ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ========================================================================= */}
      {/* TAB 4: SETTINGS & AUTOMATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Main Settings Form */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-teal-600" />
                  <span>پیکربندی کلید وب‌سرویس و خطوط ارسال sms.ir</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  جهت اتصال برنامه به پنل پیامک، API Key اختصاصی خود را از سایت sms.ir کپی کرده و در کادر زیر وارد نمایید.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      کلید اختصاصی وب‌سرویس (API Key / x-api-key): <span className="text-rose-500">*</span>
                    </label>
                    <a
                      href="https://app.sms.ir/developer/api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-teal-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>دریافت API Key از پنل sms.ir</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="مثال: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        شماره خط فرستنده (Line Number):
                      </label>
                      <button
                        type="button"
                        onClick={handleFetchLines}
                        disabled={isLoadingLines}
                        className="text-[11px] text-teal-600 font-bold hover:underline"
                      >
                        {isLoadingLines ? 'در حال استعلام...' : 'استعلام خطوط اختصاصی'}
                      </button>
                    </div>
                    {availableLines.length > 0 ? (
                      <select
                        value={lineNumberInput}
                        onChange={(e) => setLineNumberInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                      >
                        {availableLines.map((ln) => (
                          <option key={ln} value={ln}>
                            {ln}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="30007732"
                        value={lineNumberInput}
                        onChange={(e) => setLineNumberInput(toEnglishDigits(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      امضای انتهای پیامک‌ها (Footer Signature):
                    </label>
                    <input
                      type="text"
                      placeholder="باشگاه سنگ‌نوردی موج"
                      value={signatureInput}
                      onChange={(e) => setSignatureInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Automatic Triggers Section */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-600" />
                  <span>تنظیمات پیامک‌های هوشمند و خودکار سیستم (Automation)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoRegister}
                      onChange={(e) => setAutoRegister(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">پیامک خوش‌آمدگویی ثبت‌نام</div>
                      <div className="text-[10px] text-slate-500">ارسال خودکار پس از تایید عضویت توسط منشی</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoPayment}
                      onChange={(e) => setAutoPayment(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">پیامک تایید دریافت شهریه</div>
                      <div className="text-[10px] text-slate-500">ارسال رسید پس از ثبت واریزی یا فیش</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoInsurance}
                      onChange={(e) => setAutoInsurance(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">پیامک هشدار و تایید بیمه</div>
                      <div className="text-[10px] text-slate-500">اطلاع‌رسانی تایید یا سررسید بیمه ورزشی</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoDebt}
                      onChange={(e) => setAutoDebt(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">یادآوری خودکار بدهی</div>
                      <div className="text-[10px] text-slate-500">ارسال دوره‌ای پیامک به بدهکاران</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Bale Messenger Integration Section */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <span>پیکربندی ربات پیام‌رسان بله (Bale Bot API)</span>
                  </h3>
                  <a
                    href="https://docs.bale.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>مستندات API بله</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      توکن ربات بله (Bot Token از BotFather بله):
                    </label>
                    <input
                      type="password"
                      placeholder="مثال: 123456789:ABCdefGHIjklMNOpqrsTUVwxyZ..."
                      value={baleTokenInput}
                      onChange={(e) => setBaleTokenInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      شناسه چت پیش‌فرض یا آیدی کانال/گروه بله باشگاه <span className="text-slate-400 font-normal">(اختیاری)</span>:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: @mouj_climbing یا آیدی عددی چت/گروه"
                      value={baleChatInput}
                      onChange={(e) => setBaleChatInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      💡 این فیلد اختیاری است. در صورت خالی بودن، پیام‌های بله مستقیماً به آیدی اختصاصی/چت‌شناسی خود اشخاص یا گیرندگان انتخاب‌شده ارسال خواهد شد.
                    </span>
                  </div>

                  {baleBotInfo && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong>ربات تایید شده:</strong> {baleBotInfo.first_name}{' '}
                        {baleBotInfo.username && <span className="font-mono text-emerald-700">(@{baleBotInfo.username})</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-200 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckCredit(false)}
                    disabled={!apiKeyInput}
                    className="px-4 py-2.5 rounded-2xl border border-teal-500 text-teal-700 hover:bg-teal-50 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    استعلام اعتبار پیامک
                  </button>

                  <button
                    type="button"
                    onClick={handleTestBaleConnection}
                    disabled={!baleTokenInput || isTestingBale}
                    className="px-4 py-2.5 rounded-2xl border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isTestingBale ? 'در حال اتصال...' : 'تست ربات بله'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-600/30 transition-all hover:scale-105"
                >
                  {isSavingSettings ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات پیامک و بله'}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Guide Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-teal-600" />
                <span>راهنمای ۳ مرحله‌ای فعال‌سازی sms.ir</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-black text-teal-700 mb-1">۱. ثبت‌نام یا ورود در سامانه</div>
                  <p className="text-[11px] text-slate-500">
                    به آدرس <a href="https://sms.ir" target="_blank" rel="noreferrer" className="underline font-bold text-teal-600">sms.ir</a> وارد شده و احراز هویت اولیه را انجام دهید.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-black text-teal-700 mb-1">۲. دریافت کلید API Key</div>
                  <p className="text-[11px] text-slate-500">
                    از منوی توسعه‌دهندگان ⬅️ کلیدهای وب‌سرویس، یک کلید جدید ایجاد کرده و مقدار آن را در کادر تنظیمات کپی کنید.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-black text-teal-700 mb-1">۳. شارژ و ارسال پیامک</div>
                  <p className="text-[11px] text-slate-500">
                    پس از شارژ پنل، تمامی بخش‌های ارسال گروهی، تکی و خودکار فعال خواهند بود.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL BEFORE SENDING BULK SMS */}
      {/* ========================================================================= */}
      {isConfirmSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>تایید نهایی ارسال پیامک</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmSendOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">تعداد گیرندگان:</span>
                  <strong className="font-black font-mono text-teal-700">
                    {toPersianDigits(computedRecipients.length)} نفر
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">تعداد صفحات پیامک:</span>
                  <strong className="font-black font-mono text-indigo-700">
                    {toPersianDigits(smsPages)} صفحه
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مجموع پیام‌های کسر شونده:</span>
                  <strong className="font-black font-mono text-emerald-700">
                    {toPersianDigits(computedRecipients.length * Math.max(smsPages, 1))} پیامک
                  </strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800">پیش‌نمایش متن:</span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-sans whitespace-pre-line mt-1 max-h-32 overflow-y-auto">
                  {fullComposedMessage}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmSendOpen(false)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={isSending}
                className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md shadow-teal-600/30 transition-all flex items-center gap-1.5"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال ارسال پیامک‌ها...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>تایید و ارسال به درگاه</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
