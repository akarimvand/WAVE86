import React, { useState } from 'react';
import {
  LifeBuoy,
  PlusCircle,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Paperclip,
  Send,
  X,
  FileText,
  User as UserIcon,
  ShieldCheck,
  Tag,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  SupportTicket,
  TicketDepartment,
  TicketPriority,
  TicketStatus,
  User as UserType,
} from '../types';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface SupportTicketingViewProps {
  currentUser: UserType;
}

const DEPARTMENT_TITLES: Record<TicketDepartment, string> = {
  general: 'عمومی و پیشنهادات',
  tuition: 'امور مالی و شهریه',
  registration: 'ثبت‌نام و کلاس‌ها',
  insurance: 'بیمه‌نامه ورزشی',
  coaching: 'ارتباط با مربیان',
  technical: 'پشتیبانی فنی و سامانه',
};

const PRIORITY_BADGES: Record<TicketPriority, { label: string; bg: string; text: string }> = {
  low: { label: 'کم', bg: 'bg-slate-100', text: 'text-slate-700' },
  medium: { label: 'متوسط', bg: 'bg-blue-50', text: 'text-blue-700' },
  high: { label: 'مهم', bg: 'bg-amber-50', text: 'text-amber-700' },
  urgent: { label: 'فور‌ی', bg: 'bg-rose-50', text: 'text-rose-700' },
};

const STATUS_BADGES: Record<TicketStatus, { label: string; bg: string; text: string }> = {
  open: { label: 'جدید / باز', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  in_progress: { label: 'در حال بررسی', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  waiting_user: { label: 'منتظر پاسخ کاربر', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  resolved: { label: 'حل‌شده', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700' },
  closed: { label: 'بسته شده', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
};

export const SupportTicketingView: React.FC<SupportTicketingViewProps> = ({ currentUser }) => {
  const isAdminOrStaff = ['super_admin', 'admin', 'secretary', 'accountant'].includes(currentUser.activeRole);

  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    isAdminOrStaff
      ? dbStore.getSupportTickets()
      : dbStore.getSupportTicketsByUser(currentUser.id)
  );

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(() => {
    try {
      const ticketId = sessionStorage.getItem('selectedTicketId');
      if (ticketId) {
        sessionStorage.removeItem('selectedTicketId');
        return dbStore.getSupportTicketById(ticketId) || null;
      }
    } catch {}
    return null;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modal State
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDepartment, setNewDepartment] = useState<TicketDepartment>('general');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [newMessage, setNewMessage] = useState('');
  const [newFileName, setNewFileName] = useState('');

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [replyFileName, setReplyFileName] = useState('');

  const refreshTickets = () => {
    const list = isAdminOrStaff
      ? dbStore.getSupportTickets()
      : dbStore.getSupportTicketsByUser(currentUser.id);
    setTickets(list);

    if (selectedTicket) {
      const updated = dbStore.getSupportTicketById(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    dbStore.createSupportTicket(
      {
        userId: currentUser.id,
        userName: currentUser.fullName,
        userNationalId: currentUser.nationalId,
        userRole: currentUser.activeRole,
        userPhone: currentUser.phone,
        subject: newSubject,
        department: newDepartment,
        priority: newPriority,
      },
      newMessage,
      newFileName || undefined,
      currentUser.fullName
    );

    setIsNewTicketOpen(false);
    setNewSubject('');
    setNewMessage('');
    setNewFileName('');
    refreshTickets();
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    dbStore.addTicketMessage(
      selectedTicket.id,
      replyText,
      currentUser.id,
      currentUser.fullName,
      currentUser.activeRole,
      replyFileName || undefined
    );

    setReplyText('');
    setReplyFileName('');
    refreshTickets();
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    dbStore.updateTicketStatus(selectedTicket.id, newStatus, currentUser.fullName);
    refreshTickets();
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesDept = deptFilter === 'all' || t.department === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-700 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LifeBuoy className="w-6 h-6 text-teal-200" />
            <h1 className="text-2xl font-bold">سامانه پشتیبانی و تیکت‌های باشگاه</h1>
          </div>
          <p className="text-teal-100 text-sm">
            {isAdminOrStaff
              ? 'مدیریت و پاسخ‌گویی به درخواست‌های پشتیبانی ورزشکاران، مربیان و اولیاء'
              : 'ثبت سوالات، درخواست‌های مالی، بیمه و پیگیری از کادر مدیریت باشگاه سنگ‌نوردی موج'}
          </p>
        </div>

        <button
          onClick={() => setIsNewTicketOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-teal-800 hover:bg-teal-50 font-bold rounded-xl shadow-sm transition-all text-sm shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          ثبت تیکت پشتیبانی جدید
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در موضوع، شماره تیکت یا کاربر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            فیلترها:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="open">جدید / باز</option>
            <option value="in_progress">در حال بررسی</option>
            <option value="waiting_user">منتظر پاسخ کاربر</option>
            <option value="resolved">حل‌شده</option>
            <option value="closed">بسته شده</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">همه دپارتمان‌ها</option>
            <option value="general">عمومی و پیشنهادات</option>
            <option value="tuition">امور مالی و شهریه</option>
            <option value="registration">ثبت‌نام و کلاس‌ها</option>
            <option value="insurance">بیمه‌نامه ورزشی</option>
            <option value="coaching">ارتباط با مربیان</option>
            <option value="technical">پشتیبانی فنی</option>
          </select>

          <button
            onClick={refreshTickets}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
            title="بروزرسانی لیست"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Ticket List & Ticket Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Tickets */}
        <div className={`${selectedTicket ? 'lg:col-span-5 hidden lg:block' : 'lg:col-span-12'} space-y-3`}>
          {filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold mb-1">هیچ تیکتی پیدا نشد</p>
              <p className="text-slate-400 text-xs">
                موردی مطابق با فیلترهای انتخابی شما در دیتابیس پشتیبانی ثبت نشده است.
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const statusInfo = STATUS_BADGES[ticket.status];
              const priorityInfo = PRIORITY_BADGES[ticket.priority];
              const isSelected = selectedTicket?.id === ticket.id;

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-teal-500 ring-2 ring-teal-500/10 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                      {toPersianDigits(ticket.ticketNumber)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityInfo.bg} ${priorityInfo.text}`}>
                        {priorityInfo.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{ticket.subject}</h3>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      {ticket.userName}
                    </span>
                    <span className="font-mono text-[11px] dir-ltr text-slate-400">
                      {toPersianDigits(ticket.lastResponseAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Ticket Conversation Thread */}
        {selectedTicket && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px]">
            {/* Ticket Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="lg:hidden p-1 bg-slate-200 text-slate-700 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {toPersianDigits(selectedTicket.ticketNumber)}
                    </span>
                    <h2 className="font-bold text-slate-900 text-sm">{selectedTicket.subject}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>دپارتمان: {DEPARTMENT_TITLES[selectedTicket.department]}</span>
                    <span>|</span>
                    <span>ایجادکننده: {selectedTicket.userName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Admin Actions */}
                {isAdminOrStaff && (
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-bold"
                  >
                    <option value="open">جدید / باز</option>
                    <option value="in_progress">در حال بررسی</option>
                    <option value="waiting_user">منتظر پاسخ کاربر</option>
                    <option value="resolved">حل‌شده</option>
                    <option value="closed">بسته شده</option>
                  </select>
                )}
                
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                  title="بستن گفتگو"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
              {selectedTicket.messages.map((msg) => {
                const isUserMessage = msg.senderId === currentUser.id;
                const isAdminSender = ['admin', 'secretary', 'accountant'].includes(msg.senderRole);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-slate-700">{msg.senderName}</span>
                      {isAdminSender && (
                        <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          پشتیبانی
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        {toPersianDigits(msg.createdAt)}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUserMessage
                          ? 'bg-teal-700 text-white rounded-tl-none shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tr-none shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>

                      {msg.attachmentName && (
                        <div className={`mt-2 pt-2 border-t flex items-center gap-2 text-[11px] ${
                          isUserMessage ? 'border-teal-600 text-teal-100' : 'border-slate-100 text-slate-600'
                        }`}>
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          <span>فایل پیوست:</span>
                          <span className="font-bold underline cursor-pointer">{msg.attachmentName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            {selectedTicket.status === 'closed' ? (
              <div className="p-4 bg-slate-100 text-slate-500 text-xs text-center border-t border-slate-200 rounded-b-2xl">
                این تیکت بسته شده است و امکان ارسال پاسخ جدید در آن وجود ندارد.
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-200 bg-white rounded-b-2xl space-y-2">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ خود را بنویسید..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <label className="flex items-center gap-1 cursor-pointer text-teal-700 hover:text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{replyFileName ? replyFileName : 'افزودن پیوست'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setReplyFileName(file.name);
                        }}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    ارسال پاسخ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-teal-300">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">ثبت تیکت پشتیبانی جدید</h3>
                  <p className="text-[11px] text-slate-300">ارسال مستقیم پیام به تیم مدیریت و مربیان</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">موضوع تیکت *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="عنوان مشخصی برای درخواست خود وارد کنید..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">دپارتمان مربوطه</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value as TicketDepartment)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="general">عمومی و پیشنهادات</option>
                    <option value="tuition">امور مالی و شهریه</option>
                    <option value="registration">ثبت‌نام و کلاس‌ها</option>
                    <option value="insurance">بیمه‌نامه ورزشی</option>
                    <option value="coaching">ارتباط با مربیان</option>
                    <option value="technical">پشتیبانی فنی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اولویت</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="low">کم (پاسخ معمولی)</option>
                    <option value="medium">متوسط (پیش‌فرض)</option>
                    <option value="high">مهم</option>
                    <option value="urgent">فوری</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">متن کامل درخواست *</label>
                <textarea
                  required
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="شرح دقیق مشکل یا درخواست خود را بنویسید..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">پیوست تصویر یا فاکتور (اختیاری)</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer p-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl hover:bg-slate-100 flex items-center justify-center gap-2 text-slate-600">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span>{newFileName ? newFileName : 'انتخاب فایل از سیستم...'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setNewFileName(file.name);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 shadow-sm"
                >
                  ارسال تیکت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
