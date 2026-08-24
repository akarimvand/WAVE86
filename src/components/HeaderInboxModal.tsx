import React, { useState } from 'react';
import {
  Inbox,
  Bell,
  LifeBuoy,
  Megaphone,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  MessageSquare,
  ExternalLink,
  ChevronLeft,
  Check,
  Trash2,
} from 'lucide-react';
import { AppNotification, SupportTicket, ClubAnnouncement, User as UserType } from '../types';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { TabType } from './Sidebar';

interface HeaderInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  onNavigateTab: (tab: TabType) => void;
}

export const HeaderInboxModal: React.FC<HeaderInboxModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'all' | 'tickets' | 'notifs' | 'announcements'>('all');

  const isAdminOrStaff = currentUser && ['super_admin', 'admin', 'secretary', 'accountant'].includes(currentUser.activeRole);

  // Fetch data
  const userNotifs: AppNotification[] = currentUser
    ? dbStore.getNotificationsForUser(currentUser.id, currentUser.activeRole)
    : dbStore.getNotificationsForUser('public', 'athlete');

  const userTickets: SupportTicket[] = currentUser
    ? isAdminOrStaff
      ? dbStore.getSupportTickets()
      : dbStore.getSupportTicketsByUser(currentUser.id)
    : [];

  const announcements: ClubAnnouncement[] = dbStore.getAnnouncementsForUser(currentUser?.activeRole);

  // Filter unread tickets
  const unreadTickets = userTickets.filter((t) =>
    isAdminOrStaff ? t.hasUnreadAdminMessage : t.hasUnreadUserMessage
  );

  const unreadNotifs = userNotifs.filter((n) => !n.isRead);
  const readNotifsCount = userNotifs.filter((n) => n.isRead).length;

  const handleMarkAllRead = () => {
    if (currentUser) {
      dbStore.markAllNotificationsAsRead(currentUser.id, currentUser.activeRole);
      userTickets.forEach((t) => {
        dbStore.markTicketAsRead(t.id, isAdminOrStaff ? 'admin' : 'user');
      });
    }
    // Force rerender by quick toggle or closure
    onClose();
  };

  const handleDeleteAllRead = () => {
    if (currentUser) {
      dbStore.deleteReadNotifications(currentUser.id, currentUser.activeRole);
    }
    // Force rerender by quick toggle or closure
    onClose();
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    dbStore.markTicketAsRead(ticket.id, isAdminOrStaff ? 'admin' : 'user');
    sessionStorage.setItem('selectedTicketId', ticket.id);
    onNavigateTab('support-tickets');
    onClose();
  };

  const handleNotifClick = (notif: AppNotification) => {
    dbStore.markNotificationAsRead(notif.id, currentUser?.id);
    
    // Check if notification is related to a support ticket
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

    if (notif.actionLink) {
      onNavigateTab(notif.actionLink as TabType);
    } else {
      onNavigateTab('user-portal');
    }
    onClose();
  };

  const handleAnnouncementClick = () => {
    onNavigateTab('user-portal');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs dir-rtl animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 animate-pulse text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">صندوق ورودی و پیام‌ها (اینباکس)</h2>
              <p className="text-xs text-slate-500 font-bold">
                اعلان‌های سیستم، پاسخ‌های تیکت پشتیبانی و اطلاعیه‌های جدید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {readNotifsCount > 0 && (
              <button
                onClick={handleDeleteAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-200 shrink-0"
                title="حذف پیام‌های خوانده‌شده"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>حذف خوانده‌شده‌ها</span>
              </button>
            )}

            {(unreadNotifs.length > 0 || unreadTickets.length > 0) && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-xl text-xs font-bold transition-all border border-teal-200 shrink-0"
                title="خوانده‌شده کردن تمام پیام‌ها"
              >
                <Check className="w-3.5 h-3.5" />
                <span>علامت‌گذاری همه به عنوان خوانده‌شده</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>همه پیام‌ها</span>
            {(unreadNotifs.length + unreadTickets.length > 0) && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {toPersianDigits(unreadNotifs.length + unreadTickets.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'tickets'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5 text-teal-400" />
            <span>پاسخ‌های تیکت</span>
            {unreadTickets.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {toPersianDigits(unreadTickets.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notifs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'notifs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span>اعلان‌های اختصاصی</span>
            {unreadNotifs.length > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {toPersianDigits(unreadNotifs.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-400" />
            <span>اطلاعیه‌های عمومی</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded-md">
              {toPersianDigits(announcements.length)}
            </span>
          </button>
        </div>

        {/* Modal List Area */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* TAB: ALL */}
          {activeTab === 'all' && (
            <>
              {unreadTickets.length === 0 && unreadNotifs.length === 0 && userTickets.length === 0 && userNotifs.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">پیام یا اعلانی وجود ندارد.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Unread Ticket Responses */}
                  {userTickets.map((ticket) => {
                    const isUnread = isAdminOrStaff ? ticket.hasUnreadAdminMessage : ticket.hasUnreadUserMessage;
                    const lastMsg = ticket.messages[ticket.messages.length - 1];

                    return (
                      <div
                        key={ticket.id}
                        onClick={() => handleTicketClick(ticket)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.005] active:scale-[0.99] flex items-start gap-3 ${
                          isUnread
                            ? 'bg-teal-50/70 border-teal-300 shadow-sm ring-1 ring-teal-400/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                          <LifeBuoy className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                              {ticket.subject}
                              {isUnread && (
                                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                                  پاسخ جدید
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                              {ticket.lastResponseAt}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-bold line-clamp-1 mb-1">
                            {lastMsg ? `${lastMsg.senderName}: ${lastMsg.message}` : ticket.subject}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>شماره تیکت: {toPersianDigits(ticket.ticketNumber)}</span>
                            <span className="text-teal-700 hover:underline flex items-center gap-0.5">
                              مشاهده تیکت <ChevronLeft className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* System Notifications */}
                  {userNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.005] active:scale-[0.99] flex items-start gap-3 ${
                        !notif.isRead
                          ? 'bg-indigo-50/70 border-indigo-200 shadow-sm ring-1 ring-indigo-300/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                            {notif.title}
                            {!notif.isRead && (
                              <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                جدید
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {notif.createdAt}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-bold leading-relaxed mb-1">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB: TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-3">
              {userTickets.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">هیچ تیکت پشتیبانی ثبت نشده است.</p>
                </div>
              ) : (
                userTickets.map((ticket) => {
                  const isUnread = isAdminOrStaff ? ticket.hasUnreadAdminMessage : ticket.hasUnreadUserMessage;
                  const lastMsg = ticket.messages[ticket.messages.length - 1];

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isUnread
                          ? 'bg-teal-50 border-teal-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                        <LifeBuoy className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {ticket.subject}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400">
                            {ticket.lastResponseAt}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-bold line-clamp-2 mb-1">
                          {lastMsg ? `${lastMsg.senderName}: ${lastMsg.message}` : ticket.subject}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>شماره: {toPersianDigits(ticket.ticketNumber)}</span>
                          <span className="text-teal-700 font-black">مشاهده و پاسخ →</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB: NOTIFS */}
          {activeTab === 'notifs' && (
            <div className="space-y-3">
              {userNotifs.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">اعلانی وجود ندارد.</p>
                </div>
              ) : (
                userNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      !notif.isRead
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs font-black text-slate-900 truncate">{notif.title}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{notif.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">اطلاعیه جدیدی منتشر نشده است.</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={handleAnnouncementClick}
                    className="p-3.5 bg-white border border-slate-200 hover:border-amber-300 rounded-2xl transition-all cursor-pointer flex items-center gap-3"
                  >
                    {ann.imageUrl ? (
                      <img
                        src={ann.imageUrl}
                        alt={ann.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <Megaphone className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs font-black text-slate-900 truncate">{ann.title}</h4>
                        {ann.discountTag && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            {ann.discountTag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-bold line-clamp-1">{ann.subtitle}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{ann.createdAt}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs font-bold text-slate-500 shrink-0">
          برای دسترسی سریع به تمام بخش‌ها، روی هر پیام کلیک کنید.
        </div>
      </div>
    </div>
  );
};
