import React, { useState } from 'react';
import {
  ShieldCheck,
  UploadCloud,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  AlertCircle,
  UserCheck,
  Calendar,
  X,
  Eye,
  Check,
  Download,
  ExternalLink,
  FileCheck,
  Edit,
  Trash2,
} from 'lucide-react';
import { InsuranceRequest, User as UserType } from '../types';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { JalaliDatePicker } from './JalaliDatePicker';
import { getCurrentJalaliDate, formatJalaliDate, addYearsToJalaliString } from '../utils/jalaliDate';
import { THEME_PALETTES } from '../utils/theme';
import { uploadFileToServer } from '../utils/fileUploader';

interface SportsInsuranceViewProps {
  currentUser: UserType;
}

export const SportsInsuranceView: React.FC<SportsInsuranceViewProps> = ({ currentUser }) => {
  const isAdminOrSecretary = ['super_admin', 'admin', 'secretary'].includes(currentUser.activeRole);
  const currentClub = dbStore.getClubSettings();
  const activePal = THEME_PALETTES[currentClub.themePalette] || THEME_PALETTES.wave;

  const [requests, setRequests] = useState<InsuranceRequest[]>(() =>
    isAdminOrSecretary
      ? dbStore.getInsuranceRequests()
      : dbStore.getInsuranceRequestsByUser(currentUser.id)
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserType[]>(() => dbStore.getUsers());
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [insuranceNo, setInsuranceNo] = useState('');
  const todayStr = formatJalaliDate(getCurrentJalaliDate());
  const [startDate, setStartDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState(() => addYearsToJalaliString(todayStr, 1));
  const [fileName, setFileName] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Edit Insurance Modal (Admin)
  const [editingReq, setEditingReq] = useState<InsuranceRequest | null>(null);
  const [editInsuranceNo, setEditInsuranceNo] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [editFileName, setEditFileName] = useState('');
  const [editDocumentUrl, setEditDocumentUrl] = useState<string>('');
  const [isEditUploading, setIsEditUploading] = useState(false);

  // Document Viewer Modal
  const [viewDoc, setViewDoc] = useState<InsuranceRequest | null>(null);

  // Reject Modal
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const refreshList = () => {
    const list = isAdminOrSecretary
      ? dbStore.getInsuranceRequests()
      : dbStore.getInsuranceRequestsByUser(currentUser.id);
    setRequests(list);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setExpiryDate(addYearsToJalaliString(val, 1));
  };

  const handleEditStartDateChange = (val: string) => {
    setEditStartDate(val);
    setEditExpiryDate(addYearsToJalaliString(val, 1));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const targetUser = allUsers.find((u) => u.id === selectedUserId) || currentUser;
      const cleanNatId = (targetUser?.nationalId || currentUser.nationalId || '0000000000').replace(/\D/g, '');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanNo = insuranceNo ? insuranceNo.replace(/\D/g, '') : `${Date.now().toString().slice(-4)}`;
      const standardizedName = `${cleanNatId}_insurance_${cleanNo}.${ext}`;

      setFileName(standardizedName);
      setIsUploading(true);
      try {
        const res = await uploadFileToServer(file, {
          prefix: 'insurance',
          customName: `${cleanNatId}_${cleanNo}`,
          subDir: 'documents',
        });
        if (res.success && res.url) {
          setDocumentUrl(res.url);
        } else {
          alert(res.error || 'خطا در بارگذاری مدارک بیمه ورزشی روی سرور');
        }
      } catch {
        alert('خطا در ارتباط با سرور جهت بارگذاری تصویر بیمه');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleOpenSubmitModal = () => {
    const freshUsers = dbStore.getUsers();
    setAllUsers(freshUsers);
    setSelectedUserId(currentUser.id);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceNo.trim()) return;

    const targetUser = allUsers.find((u) => u.id === selectedUserId) || currentUser;

    const newReq = dbStore.submitInsuranceRequest(
      {
        userId: targetUser.id,
        userName: targetUser.fullName,
        userNationalId: targetUser.nationalId,
        insuranceNumber: insuranceNo,
        startDate,
        expiryDate,
        fileName: fileName || 'کارت_بیمه_ورزشی.jpg',
        documentUrl: documentUrl || undefined,
      },
      currentUser.fullName
    );

    if (isAdminOrSecretary) {
      dbStore.approveInsuranceRequest(newReq.id, currentUser.fullName);
    }

    setIsSubmitModalOpen(false);
    setInsuranceNo('');
    setFileName('');
    setDocumentUrl('');
    refreshList();
  };

  const handleApprove = (id: string) => {
    dbStore.approveInsuranceRequest(id, currentUser.fullName);
    refreshList();
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingReq) {
      const cleanNatId = (editingReq.userNationalId || '0000000000').replace(/\D/g, '');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanNo = editInsuranceNo ? editInsuranceNo.replace(/\D/g, '') : `${Date.now().toString().slice(-4)}`;
      const standardizedName = `${cleanNatId}_insurance_${cleanNo}.${ext}`;

      setEditFileName(standardizedName);
      setIsEditUploading(true);
      try {
        const res = await uploadFileToServer(file, {
          prefix: 'insurance',
          customName: `${cleanNatId}_${cleanNo}`,
          subDir: 'documents',
        });
        if (res.success && res.url) {
          setEditDocumentUrl(res.url);
        } else {
          alert(res.error || 'خطا در بارگذاری مدارک بیمه ورزشی روی سرور');
        }
      } catch {
        alert('خطا در ارتباط با سرور جهت بارگذاری تصویر بیمه');
      } finally {
        setIsEditUploading(false);
      }
    }
  };

  const handleOpenEdit = (req: InsuranceRequest) => {
    setEditingReq(req);
    setEditInsuranceNo(req.insuranceNumber);
    setEditStartDate(req.startDate || todayStr);
    setEditExpiryDate(req.expiryDate || addYearsToJalaliString(todayStr, 1));
    setEditStatus(req.status);
    setEditFileName(req.fileName || '');
    setEditDocumentUrl(req.documentUrl || '');
    setIsEditUploading(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    dbStore.updateInsuranceRequest(
      editingReq.id,
      {
        insuranceNumber: editInsuranceNo,
        startDate: editStartDate,
        expiryDate: editExpiryDate,
        status: editStatus,
        fileName: editFileName || editingReq.fileName || 'کارت_بیمه_ورزشی.jpg',
        documentUrl: editDocumentUrl || undefined,
      },
      currentUser.fullName
    );
    setEditingReq(null);
    refreshList();
  };

  const handleDeleteRequest = (id: string, name: string) => {
    if (window.confirm(`آیا از حذف درخواست و مدرک بیمه نامه "${name}" اطمینان دارید؟`)) {
      dbStore.deleteInsuranceRequest(id, currentUser.fullName);
      refreshList();
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReqId) return;
    dbStore.rejectInsuranceRequest(rejectReqId, rejectionReason || 'تصویر ناخوانا یا کارت نامعتبر', currentUser.fullName);
    setRejectReqId(null);
    setRejectionReason('');
    refreshList();
  };

  const filtered = requests.filter((r) => {
    const uName = (r?.userName || '').toLowerCase();
    const insNum = (r?.insuranceNumber || '').toLowerCase();
    const uNatId = r?.userNationalId || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      uName.includes(term) ||
      insNum.includes(term) ||
      uNatId.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-emerald-200" />
            <h1 className="text-2xl font-bold">بایگانی و اعتبار‌سنجی بیمه‌نامه ورزشی</h1>
          </div>
          <p className="text-emerald-100 text-sm">
            طبق قوانین فدراسیون، داشتن بیمه ورزشی معتبر برای فعالیت در سالن صعود و ثبت‌نام در دوره‌ها الزامی است.
          </p>
        </div>

        <button
          onClick={handleOpenSubmitModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-xl shadow-sm transition-all text-sm shrink-0"
        >
          <UploadCloud className="w-5 h-5" />
          ارسال و آپلود بیمه‌نامه جدید
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام، کدملی یا شماره بیمه..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار بررسی مدیریت</option>
            <option value="approved">تأییدشده و فعال</option>
            <option value="rejected">ردشده / نیازمند اصلاح</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">ورزشکار / کاربر</th>
                <th className="p-3.5">شماره کدملی</th>
                <th className="p-3.5">شماره بیمه‌نامه</th>
                <th className="p-3.5">بازه اعتبار (شمسی)</th>
                <th className="p-3.5">فایل مدرک</th>
                <th className="p-3.5 text-center">وضعیت بررسی</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    رکوردی برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-slate-900">{req.userName}</td>
                    <td className="p-3.5 font-mono text-slate-600">{toPersianDigits(req.userNationalId)}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-800">{toPersianDigits(req.insuranceNumber)}</td>
                    <td className="p-3.5 font-mono text-slate-600">
                      از {toPersianDigits(req.startDate)} تا {toPersianDigits(req.expiryDate)}
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => setViewDoc(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:scale-105 shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        <span>{req.fileName || 'مشاهده مدرک بیمه‌نامه'}</span>
                        <Eye className="w-3 h-3 text-teal-500 mr-1" />
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          در انتظار بررسی
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          تأیید شده
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                          title={req.rejectionReason}
                        >
                          <XCircle className="w-3 h-3" />
                          رد شده ({req.rejectionReason})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isAdminOrSecretary && req.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(req.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                              title="تأیید بیمه‌نامه"
                            >
                              <Check className="w-3.5 h-3.5" />
                              تأیید
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectReqId(req.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                              title="رد بیمه‌نامه"
                            >
                              <X className="w-3.5 h-3.5" />
                              رد
                            </button>
                          </>
                        )}
                        {isAdminOrSecretary && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(req)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                              title="ویرایش بیمه‌نامه"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(req.id, req.userName)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                              title="حذف رکورد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {!isAdminOrSecretary && req.status !== 'pending' && (
                          <span className="text-slate-400 text-[11px]">
                            {req.reviewedBy ? `توسط ${req.reviewedBy}` : 'ثبت اولیه'}
                          </span>
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

      {/* Upload Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 overflow-visible relative">
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">ارسال مدارک بیمه‌نامه ورزشی</h3>
                  <p className="text-[11px] text-slate-300">ثبت پرونده و استعلام کارت بیمه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4 text-xs">
              {isAdminOrSecretary && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    انتخاب ورزشکار / متقاضی بیمه‌نامه *
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} {u.nationalId ? `(کد ملی: ${toPersianDigits(u.nationalId)})` : ''} - {u.phone ? toPersianDigits(u.phone) : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">شماره بیمه‌نامه ورزشی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: INS-1403-9081"
                  value={insuranceNo}
                  onChange={(e) => setInsuranceNo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تاریخ صدور (شمسی)</label>
                <JalaliDatePicker value={startDate} onChange={handleStartDateChange} label="" />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تاریخ انقضاء اعتبار (خودکار یک‌ساله) *</label>
                <JalaliDatePicker value={expiryDate} onChange={setExpiryDate} label="" />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">فایل تصویر یا PDF کارت بیمه *</label>
                <label className={`cursor-pointer p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                  isUploading 
                    ? 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-50 border border-dashed border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}>
                  {isUploading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
                      <span>در حال آپلود و ذخیره‌سازی روی هاست...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      <span className="truncate">{fileName ? fileName : 'انتخاب تصویر یا PDF کارت بیمه...'}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                    isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isUploading ? 'درحال آپلود...' : 'ثبت و ذخیره بیمه‌نامه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Insurance Modal */}
      {editingReq && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-visible relative my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">ویرایش پرونده بیمه‌نامه ورزشی</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingReq(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نام ورزشکار:</label>
                  <input
                    type="text"
                    disabled
                    value={editingReq.userName}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد ملی:</label>
                  <input
                    type="text"
                    disabled
                    value={toPersianDigits(editingReq.userNationalId || '-')}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">شماره بیمه‌نامه ورزشی *</label>
                <input
                  type="text"
                  required
                  value={editInsuranceNo}
                  onChange={(e) => setEditInsuranceNo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 font-mono"
                  placeholder="مثلاً: INS-1403-9081"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاریخ شروع (شمسی)</label>
                  <JalaliDatePicker value={editStartDate} onChange={handleEditStartDateChange} label="" />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاریخ انقضاء اعتبار (خودکار یک‌ساله)</label>
                  <JalaliDatePicker value={editExpiryDate} onChange={setEditExpiryDate} label="" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">وضعیت درخواست:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800"
                >
                  <option value="pending">در انتظار بررسی</option>
                  <option value="approved">تأیید شده (فعال)</option>
                  <option value="rejected">رد شده</option>
                </select>
              </div>

              {/* Document File / Re-upload Section */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-slate-700 font-bold mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    سند و مدرک بیمه‌نامه ورزشی (تصویر یا PDF)
                  </span>
                  {editDocumentUrl ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      فایل پیوست موجود
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                      بدون فایل پیوست
                    </span>
                  )}
                </label>

                {editDocumentUrl ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Thumbnail & File Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        {editDocumentUrl.startsWith('data:application/pdf') || editDocumentUrl.endsWith('.pdf') ? (
                          <div
                            onClick={() =>
                              setViewDoc({
                                ...editingReq,
                                insuranceNumber: editInsuranceNo,
                                startDate: editStartDate,
                                expiryDate: editExpiryDate,
                                status: editStatus,
                                fileName: editFileName,
                                documentUrl: editDocumentUrl,
                              })
                            }
                            className="w-14 h-14 rounded-xl bg-rose-100 text-rose-600 flex flex-col items-center justify-center shrink-0 border border-rose-200 cursor-pointer hover:bg-rose-200 transition-colors"
                            title="مشاهده سند PDF"
                          >
                            <FileText className="w-6 h-6" />
                            <span className="text-[9px] font-black mt-0.5">PDF</span>
                          </div>
                        ) : (
                          <div
                            onClick={() =>
                              setViewDoc({
                                ...editingReq,
                                insuranceNumber: editInsuranceNo,
                                startDate: editStartDate,
                                expiryDate: editExpiryDate,
                                status: editStatus,
                                fileName: editFileName,
                                documentUrl: editDocumentUrl,
                              })
                            }
                            className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300 relative group cursor-pointer shadow-xs"
                            title="کلیک برای مشاهده تمام صفحه مدرک"
                          >
                            <img
                              src={editDocumentUrl}
                              alt="پیش‌نمایش مدرک بیمه"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-5 h-5" />
                            </div>
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={editFileName || 'کارت_بیمه_ورزشی'}>
                            {editFileName || 'کارت_بیمه_ورزشی.jpg'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {editDocumentUrl.startsWith('data:application/pdf') || editDocumentUrl.endsWith('.pdf')
                              ? 'سند با فرمت پی‌دی‌اف (PDF)'
                              : 'تصویر کارت بیمه فدراسیون'}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setViewDoc({
                              ...editingReq,
                              insuranceNumber: editInsuranceNo,
                              startDate: editStartDate,
                              expiryDate: editExpiryDate,
                              status: editStatus,
                              fileName: editFileName,
                              documentUrl: editDocumentUrl,
                            })
                          }
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-600" />
                          <span>دیدن فایل</span>
                        </button>

                        <label
                          className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            isEditUploading
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isEditUploading ? (
                            <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{isEditUploading ? 'درحال آپلود...' : 'بارگذاری مجدد'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={handleEditFileChange}
                            disabled={isEditUploading}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setEditDocumentUrl('');
                            setEditFileName('');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="حذف فایل پیوست"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all text-center ${
                      isEditUploading
                        ? 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-600'
                    }`}
                  >
                    {isEditUploading ? (
                      <div className="flex items-center gap-2 py-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
                        <span className="text-xs font-bold text-emerald-700">در حال آپلود و ذخیره‌سازی فایل...</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-2.5 bg-emerald-100/70 rounded-full text-emerald-700">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            انتخاب و بارگذاری مجدد تصویر یا فایل PDF کارت بیمه
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            فرمت‌های مجاز: JPG, PNG, WEBP, PDF (حداکثر ۱۰ مگابایت)
                          </span>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleEditFileChange}
                      disabled={isEditUploading}
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReq(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isEditUploading}
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                    isEditUploading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isEditUploading ? 'در حال آپلود فایل...' : 'ذخیره تغییرات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectReqId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">علت رد بیمه‌نامه</h3>
              <button onClick={() => setRejectReqId(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">دلیل رد درخواست:</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="مثلاً: تصویر ناخوانا است یا انقضای کارت گذشته است..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectReqId(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                >
                  ثبت رد درخواست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/20 rounded-xl text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">مشاهده سند بیمه‌نامه ورزشی</h3>
                  <p className="text-[11px] text-slate-400">نام ورزشکار: {viewDoc.userName}</p>
                </div>
              </div>
              <button
                onClick={() => setViewDoc(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Info Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">شماره بیمه‌نامه</span>
                  <span className="font-mono font-bold text-slate-900">{toPersianDigits(viewDoc.insuranceNumber)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">کد ملی</span>
                  <span className="font-mono font-bold text-slate-900">{toPersianDigits(viewDoc.userNationalId)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">اعتبار تا</span>
                  <span className="font-mono font-bold text-slate-900">{toPersianDigits(viewDoc.expiryDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">وضعیت مدرک</span>
                  {viewDoc.status === 'approved' && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      تأیید شده
                    </span>
                  )}
                  {viewDoc.status === 'pending' && (
                    <span className="text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      در انتظار بررسی
                    </span>
                  )}
                  {viewDoc.status === 'rejected' && (
                    <span className="text-rose-700 font-bold flex items-center gap-1 mt-0.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      رد شده
                    </span>
                  )}
                </div>
              </div>

              {/* Document Media Box */}
              <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden border border-slate-800">
                {viewDoc.documentUrl ? (
                  viewDoc.documentUrl.startsWith('data:application/pdf') || viewDoc.documentUrl.endsWith('.pdf') ? (
                    <iframe
                      src={viewDoc.documentUrl}
                      className="w-full h-80 rounded-xl border border-slate-700"
                      title="سند بیمه‌نامه"
                    />
                  ) : (
                    <div className="relative group max-h-[380px] overflow-hidden rounded-xl">
                      <img
                        src={viewDoc.documentUrl}
                        alt="سند بیمه‌نامه"
                        className="max-h-[360px] w-auto object-contain rounded-xl shadow-lg"
                      />
                    </div>
                  )
                ) : (
                  /* Digital Insurance Card Representation if no direct image binary was present in seed */
                  <div className="w-full max-w-md bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white rounded-2xl p-5 border border-emerald-500/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-300"></div>
                    <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        <div>
                          <h4 className="font-extrabold text-xs text-emerald-200">فدراسیون پزشکی ورزشی ج.ا.ا</h4>
                          <p className="text-[9px] text-emerald-400/80">کارت دیجیتال بیمه ورزشی معتبر</p>
                        </div>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                        {toPersianDigits(viewDoc.insuranceNumber)}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-emerald-900/50 pb-1.5">
                        <span className="text-slate-400">نام بیمه‌شده:</span>
                        <span className="font-bold text-white">{viewDoc.userName}</span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-900/50 pb-1.5">
                        <span className="text-slate-400">کد ملی:</span>
                        <span className="font-mono text-emerald-200">{toPersianDigits(viewDoc.userNationalId)}</span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-900/50 pb-1.5">
                        <span className="text-slate-400">تاریخ اعتبار:</span>
                        <span className="font-mono text-emerald-200">از {toPersianDigits(viewDoc.startDate)} تا {toPersianDigits(viewDoc.expiryDate)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>نام فایل: {viewDoc.fileName || 'کارت_بیمه_ورزشی.jpg'}</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <FileCheck className="w-3.5 h-3.5" /> استعلام سیستمی
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {viewDoc.documentUrl && (
                  <>
                    <a
                      href={viewDoc.documentUrl}
                      download={viewDoc.fileName || 'bimeh.png'}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود فایل اصلی</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const win = window.open();
                        if (win && viewDoc.documentUrl) {
                          win.document.write(`<img src="${viewDoc.documentUrl}" style="max-width:100%" />`);
                        }
                      }}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>باز کردن در تب جدید</span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewDoc(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
