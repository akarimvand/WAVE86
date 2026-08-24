import React, { useState } from 'react';
import {
  FileText,
  UserCheck,
  UserX,
  Edit,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ShieldAlert,
  Users,
  Eye,
  Check,
  Send,
  MessageSquare,
  AlertTriangle,
  Clock,
  Key,
  Database,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { JalaliDatePicker } from './JalaliDatePicker';
import { PreRegistrationRequest, UserRoleKey, INITIAL_ROLES } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { AthleteImporter } from './AthleteImporter';
import { DataImportManagementView } from './DataImportManagementView';

interface PreRegistrationAdminPanelProps {
  onDataUpdated?: () => void;
}

export const PreRegistrationAdminPanel: React.FC<PreRegistrationAdminPanelProps> = ({ onDataUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'import'>('requests');
  const [requests, setRequests] = useState<PreRegistrationRequest[]>(dbStore.getPreRegistrations());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected request for detail review / edit / approve modal
  const [selectedReq, setSelectedReq] = useState<PreRegistrationRequest | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PreRegistrationRequest>>({});

  // Roles to assign during approval
  const [assignedRoles, setAssignedRoles] = useState<UserRoleKey[]>(['athlete']);

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Approval result notice (simulated SMS)
  const [approvalResultNotice, setApprovalResultNotice] = useState<{
    username: string;
    tempPass: string;
    fullName: string;
    parentCreated?: boolean;
  } | null>(null);



  const refreshData = () => {
    setRequests([...dbStore.getPreRegistrations()]);
    if (onDataUpdated) onDataUpdated();
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const fName = r?.fullName || '';
    const nId = r?.nationalId || '';
    const ph = r?.phone || '';
    const matchesSearch =
      fName.includes(searchTerm) ||
      nId.includes(searchTerm) ||
      ph.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const handleOpenDetail = (req: PreRegistrationRequest) => {
    setSelectedReq(req);
    setEditForm(req);
    setAssignedRoles(req.assignedRoles && req.assignedRoles.length > 0 ? req.assignedRoles : ['athlete']);
    setIsEditMode(false);
  };

  const handleSaveEdits = () => {
    if (!selectedReq) return;
    dbStore.updatePreRegistration(selectedReq.id, editForm, 'مدیر ارشد');
    setIsEditMode(false);
    refreshData();
    // Update local selected item
    setSelectedReq({ ...selectedReq, ...editForm });
  };

  const handleApprove = () => {
    if (!selectedReq) return;
    try {
      const result = dbStore.approvePreRegistration(selectedReq.id, assignedRoles, 'مدیر ارشد');
      setApprovalResultNotice({
        fullName: selectedReq.fullName,
        username: result.user.username,
        tempPass: result.tempPassword,
        parentCreated: result.parentCreated,
      });
      setSelectedReq(null);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'خطا در تأیید درخواست');
    }
  };

  const handleReject = () => {
    if (!selectedReq || !rejectionReason.trim()) return;
    dbStore.rejectPreRegistration(selectedReq.id, rejectionReason.trim(), 'مدیر ارشد');
    setIsRejectModalOpen(false);
    setRejectionReason('');
    setSelectedReq(null);
    refreshData();
  };

  const handleToggleRoleSelection = (roleKey: UserRoleKey) => {
    if (assignedRoles.includes(roleKey)) {
      if (assignedRoles.length === 1) return; // Keep at least 1 role
      setAssignedRoles(assignedRoles.filter((r) => r !== roleKey));
    } else {
      setAssignedRoles([...assignedRoles, roleKey]);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* SubTab Navigation */}
      <div className="flex flex-col sm:flex-row border-b border-slate-200 bg-white p-1.5 rounded-2xl shadow-2xs gap-2">
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'requests'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>لیست و مدیریت درخواست‌های پیش‌ثبت‌نام ({toPersianDigits(requests.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('import')}
          className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'import'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4 shrink-0" />
          <span>درون‌ریزی داده‌ها (فایل اکسل + عکس‌های ZIP)</span>
        </button>
      </div>

      {activeSubTab === 'import' ? (
        <div className="space-y-6">
          <DataImportManagementView onImportComplete={refreshData} />
          <AthleteImporter onImportComplete={refreshData} />
        </div>
      ) : (
        <>
          {/* Header Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat Box 1: Pending Requests */}
        <div
          onClick={() => setFilterStatus('pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            filterStatus === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-slate-200/80 hover:border-amber-200'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">درخواست‌های در انتظار بررسی</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{toPersianDigits(pendingCount)}</span>
              <span className="text-xs text-amber-700 font-bold">مورد جدید</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Stat Box 2: Approved Users */}
        <div
          onClick={() => setFilterStatus('approved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            filterStatus === 'approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200/80 hover:border-emerald-200'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">تأییدشده و فعال</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{toPersianDigits(approvedCount)}</span>
              <span className="text-xs text-emerald-700 font-bold">عضو جدید</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Stat Box 3: Rejected */}
        <div
          onClick={() => setFilterStatus('rejected')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            filterStatus === 'rejected'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-slate-200/80 hover:border-rose-200'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">رد شده</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">{toPersianDigits(rejectedCount)}</span>
              <span className="text-xs text-rose-700 font-bold">درخواست</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Approval Success Result Alert Notice (Simulated SMS) */}
      {approvalResultNotice && (
        <div className="p-5 bg-teal-50 border border-teal-200 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-2xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs text-slate-800">
              <span className="font-black text-teal-900 text-sm">
                پیامک و اکانت برای «{approvalResultNotice.fullName}» صادر گردید:
              </span>
              <div className="flex flex-wrap items-center gap-3 font-mono font-bold text-teal-800">
                <span>نام کاربری: {toPersianDigits(approvalResultNotice.username)}</span>
                <span>|</span>
                <span>رمز عبور موقت: {toPersianDigits(approvalResultNotice.tempPass)}</span>
              </div>
              {approvalResultNotice.parentCreated && (
                <p className="text-teal-700 font-medium text-[11px]">
                  ✓ حساب سرپرست/والد نیز به‌صورت خودکار ایجاد و به فرزند متصل گردید.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setApprovalResultNotice(null)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap self-end sm:self-center"
          >
            متوجه شدم
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو با نام، کد ملی یا شماره همراه..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">


            <span className="text-xs text-slate-500 font-bold whitespace-nowrap">فیلتر:</span>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none max-w-full">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه ({toPersianDigits(requests.length)})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                در انتظار ({toPersianDigits(pendingCount)})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  filterStatus === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تأییدشده ({toPersianDigits(approvedCount)})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  filterStatus === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ردشده ({toPersianDigits(rejectedCount)})
              </button>
            </div>
          </div>
        </div>

        {/* Requests List (Mobile Cards + Desktop Table) */}
        <div className="block sm:hidden space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="p-6 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-200">
              هیچ درخواستی با مشخصات فیلترشده یافت نشد.
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div key={req.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{req.fullName}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">نام پدر: {req.fatherName}</p>
                  </div>
                  <div>
                    {req.status === 'pending' && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        در انتظار
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        تأیید شده
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        رد شده
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/60 font-mono">
                  <div>کد ملی: <span className="font-bold text-slate-800 dir-ltr">{toPersianDigits(req.nationalId)}</span></div>
                  <div>همراه: <span className="font-bold text-slate-800 dir-ltr">{toPersianDigits(req.phone)}</span></div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">تاریخ: {toPersianDigits(req.createdAt)}</span>
                  <button
                    onClick={() => handleOpenDetail(req)}
                    className="px-3 py-1.5 bg-teal-600 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>بررسی پرونده</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Requests Table (Desktop) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">نام و نام خانوادگی</th>
                <th className="p-3">نام پدر</th>
                <th className="p-3">کد ملی</th>
                <th className="p-3">شماره همراه</th>
                <th className="p-3">وضعیت سن</th>
                <th className="p-3">تاریخ ثبت</th>
                <th className="p-3">وضعیت بررسی</th>
                <th className="p-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                    هیچ درخواستی با مشخصات فیلترشده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{req.fullName}</td>
                    <td className="p-3 text-slate-600">{req.fatherName}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{toPersianDigits(req.nationalId)}</td>
                    <td className="p-3 font-mono text-slate-600">{toPersianDigits(req.phone)}</td>
                    <td className="p-3">
                      {req.isUnder18 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          زیر ۱۸ سال ({req.parentFullName || 'دارای سرپرست'})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          بالای ۱۸ سال
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-500">{toPersianDigits(req.createdAt)}</td>
                    <td className="p-3">
                      {req.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-max">
                          <Clock className="w-3.5 h-3.5" />
                          در انتظار
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max">
                          <CheckCircle className="w-3.5 h-3.5" />
                          تأیید شده
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-max">
                          <XCircle className="w-3.5 h-3.5" />
                          رد شده
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenDetail(req)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-xs transition-colors border border-teal-200 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        بررسی پرونده
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail / Review / Edit Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  بررسی پرونده پیش‌ثبت‌نام: {selectedReq.fullName}
                </h3>
                <p className="text-xs text-slate-500">تاریخ درخواست: {toPersianDigits(selectedReq.createdAt)}</p>
              </div>

              <button
                onClick={() => setSelectedReq(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Editable Form vs View Mode */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {isEditMode ? 'حالت ویرایش اطلاعات (توسط مدیر):' : 'اطلاعات هویتی متقاضی:'}
                </span>

                <button
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5 text-teal-600" />
                  {isEditMode ? 'انصراف از ویرایش' : 'ویرایش/اصلاح اطلاعات'}
                </button>
              </div>

              {isEditMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نام:</label>
                    <input
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) => {
                        const fn = e.target.value;
                        const ln = editForm.lastName || '';
                        setEditForm({ ...editForm, firstName: fn, fullName: `${fn} ${ln}`.trim() });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نام خانوادگی:</label>
                    <input
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) => {
                        const ln = e.target.value;
                        const fn = editForm.firstName || '';
                        setEditForm({ ...editForm, lastName: ln, fullName: `${fn} ${ln}`.trim() });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نام پدر:</label>
                    <input
                      type="text"
                      value={editForm.fatherName || ''}
                      onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">شماره شناسنامه:</label>
                    <input
                      type="text"
                      value={editForm.shenasnamehNo || ''}
                      onChange={(e) => setEditForm({ ...editForm, shenasnamehNo: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">کد ملی:</label>
                    <input
                      type="text"
                      value={editForm.nationalId || ''}
                      onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">تاریخ تولد (شمسی):</label>
                    <JalaliDatePicker
                      value={editForm.birthDate || ''}
                      onChange={(val) => setEditForm({ ...editForm, birthDate: val })}
                      placeholder="انتخاب تاریخ تولد..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">جنسیت:</label>
                    <select
                      value={editForm.gender || 'male'}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="male">مرد</option>
                      <option value="female">زن</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">شماره همراه:</label>
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">تحصیلات و شغل:</label>
                    <input
                      type="text"
                      value={editForm.educationOrJob || ''}
                      onChange={(e) => setEditForm({ ...editForm, educationOrJob: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">گروه خونی:</label>
                    <select
                      value={editForm.bloodType || 'O+'}
                      onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">سایز کفش سنگ:</label>
                    <input
                      type="text"
                      value={editForm.shoeSize || '39'}
                      onChange={(e) => setEditForm({ ...editForm, shoeSize: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">سایز پوشاک:</label>
                    <input
                      type="text"
                      value={editForm.clothingSize || 'M'}
                      onChange={(e) => setEditForm({ ...editForm, clothingSize: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نام فرد تماس اضطراری:</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactName || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نسبت تماس اضطراری:</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactRelation || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactRelation: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">تلفن اضطراری:</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نام معرف:</label>
                    <input
                      type="text"
                      value={editForm.referrerName || ''}
                      onChange={(e) => setEditForm({ ...editForm, referrerName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">شماره معرف:</label>
                    <input
                      type="text"
                      value={editForm.referrerPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, referrerPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">شماره بیمه ورزشی:</label>
                    <input
                      type="text"
                      value={editForm.insuranceNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, insuranceNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="block text-slate-600 font-bold mb-1">آدرس دقیق محل سکونت:</label>
                    <textarea
                      rows={2}
                      value={editForm.address || ''}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="block text-slate-600 font-bold mb-1">سوابق پزشکی / حساسیت دارویی:</label>
                    <textarea
                      rows={2}
                      value={editForm.medicalConditions || ''}
                      onChange={(e) => setEditForm({ ...editForm, medicalConditions: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  {/* Parent info if under 18 */}
                  <div className="col-span-full p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900">
                      <input
                        type="checkbox"
                        checked={editForm.isUnder18 || false}
                        onChange={(e) => setEditForm({ ...editForm, isUnder18: e.target.checked })}
                      />
                      متقاضی زیر ۱۸ سال است (نیاز به سرپرست)
                    </label>

                    {editForm.isUnder18 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">نام سرپرست:</label>
                          <input
                            type="text"
                            value={editForm.parentFullName || ''}
                            onChange={(e) => setEditForm({ ...editForm, parentFullName: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">کد ملی سرپرست:</label>
                          <input
                            type="text"
                            value={editForm.parentNationalId || ''}
                            onChange={(e) => setEditForm({ ...editForm, parentNationalId: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">تماس سرپرست:</label>
                          <input
                            type="text"
                            value={editForm.parentPhone || ''}
                            onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-full flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveEdits}
                      className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      ذخیره تمام اصلاحات
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800">
                  <div>
                    <span className="text-slate-400 block">نام و نام خانوادگی:</span>
                    <span className="font-bold">{selectedReq.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">نام پدر:</span>
                    <span className="font-bold">{selectedReq.fatherName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">شماره شناسنامه:</span>
                    <span className="font-bold font-mono">{toPersianDigits(selectedReq.shenasnamehNo || '-')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">کد ملی:</span>
                    <span className="font-bold font-mono">{toPersianDigits(selectedReq.nationalId)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">تاریخ تولد:</span>
                    <span className="font-bold font-mono">{toPersianDigits(selectedReq.birthDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">جنسیت:</span>
                    <span className="font-bold">{selectedReq.gender === 'female' ? 'زن' : 'مرد'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">شماره همراه:</span>
                    <span className="font-bold font-mono">{toPersianDigits(selectedReq.phone)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">گروه خونی:</span>
                    <span className="font-bold">{selectedReq.bloodType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">سایز کفش سنگ / لباس:</span>
                    <span className="font-bold">{toPersianDigits(selectedReq.shoeSize)} / {selectedReq.clothingSize}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">تماس ضروری:</span>
                    <span className="font-bold">{selectedReq.emergencyContactName} ({selectedReq.emergencyContactRelation || 'فرد ضروری'})</span>
                    <span className="block font-mono text-teal-800 font-bold">{toPersianDigits(selectedReq.emergencyContactPhone)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">نام و تماس معرف:</span>
                    <span className="font-bold">{selectedReq.referrerName || '-'}</span>
                    {selectedReq.referrerPhone && (
                      <span className="block font-mono text-slate-600">{toPersianDigits(selectedReq.referrerPhone)}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block">تحصیلات و شغل:</span>
                    <span className="font-bold">{selectedReq.educationOrJob || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">سطح تجربه / شماره بیمه:</span>
                    <span className="font-bold">
                      {selectedReq.climbingExperienceLevel === 'beginner' ? 'مبتدی' : selectedReq.climbingExperienceLevel === 'intermediate' ? 'متوسط' : 'پیشرفته'}
                      {' '}| بیمه: {selectedReq.insuranceNumber || 'ندارد'}
                    </span>
                  </div>
                  <div className="col-span-full">
                    <span className="text-slate-400 block">آدرس محل سکونت:</span>
                    <span className="font-bold text-slate-800">{selectedReq.address}</span>
                  </div>
                  {selectedReq.medicalConditions && (
                    <div className="col-span-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-amber-800 font-bold block mb-0.5">⚠️ حساسیت‌های پزشکی و دارویی:</span>
                      <span className="text-amber-900 font-bold">{selectedReq.medicalConditions}</span>
                    </div>
                  )}
                  {selectedReq.isUnder18 && selectedReq.parentFullName && (
                    <div className="col-span-full p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 font-bold space-y-1">
                      <p>• سرپرست قانونی: {selectedReq.parentFullName}</p>
                      <p>• کد ملی سرپرست: {toPersianDigits(selectedReq.parentNationalId || '')} | تماس: {toPersianDigits(selectedReq.parentPhone || '')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role Assignment Selector during Approval */}
            {selectedReq.status === 'pending' && (
              <div className="space-y-2 p-4 bg-teal-50/60 rounded-2xl border border-teal-200">
                <label className="block text-xs font-bold text-teal-900">
                  تعیین نقش(های) کاربر پس از تأیید (امکان انتخاب چند نقشی):
                </label>
                <div className="flex flex-wrap gap-2">
                  {INITIAL_ROLES.map((role) => {
                    const isSelected = assignedRoles.includes(role.key);
                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => handleToggleRoleSelection(role.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {role.title}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-teal-800 mt-1">
                  * با تأیید، اکانت کاربری با نام کاربری <span className="font-mono font-bold">{toPersianDigits(selectedReq.nationalId)}</span> و رمز عبور اولیه همان کد ملی صادر می‌گردد.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                بستن
              </button>

              {selectedReq.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                  >
                    <UserX className="w-4 h-4" />
                    رد درخواست
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-teal-600/20 flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    تأیید درخواست و صدور اکانت
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              رد درخواست پیش‌ثبت‌نام «{selectedReq.fullName}»
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">دلیل رد درخواست *</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="علت رد درخواست را جهت ثبت در پرونده وارد کنید..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                انصراف
              </button>

              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                تأیید رد درخواست
              </button>
            </div>
          </div>
        </div>
      )}


        </>
      )}
    </div>
  );
};
