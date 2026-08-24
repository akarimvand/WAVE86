import React, { useState } from 'react';
import { Award, Calendar, CheckCircle2, AlertCircle, Plus, Search, ShieldCheck } from 'lucide-react';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';

export const InsurancePackagesView: React.FC = () => {
  const users = dbStore.getUsers();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.includes(searchTerm) ||
      u.nationalId.includes(searchTerm) ||
      u.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">مدیریت کارت‌های بیمه ورزشی و دوره‌های تمرینی</h2>
            <p className="text-xs text-slate-500 mt-1">
              استعلام اعتبار کارت بیمه فدراسیون پزشکی ورزشی اعضا و ثبت تاریخ انقضا و دوره‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            سیستم اعتبارسنجی بیمه فعال
          </span>
        </div>
      </div>

      {/* Users & Insurance Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو نام اعضا، کد ملی یا شماره همراه..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">نام کاربر</th>
                <th className="p-3">کد ملی</th>
                <th className="p-3">شماره بیمه ورزشی</th>
                <th className="p-3">تاریخ انقضای بیمه</th>
                <th className="p-3">وضعیت اعتبار</th>
                <th className="p-3">نقش‌های فعال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isValid = u.isInsuranceValid ?? true;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{toPersianDigits(u.nationalId)}</td>
                    <td className="p-3 font-mono text-slate-800">{u.insuranceNumber || 'INS-140300'}</td>
                    <td className="p-3 font-mono text-slate-600">
                      {toPersianDigits(u.insuranceExpiryDate || '1404/12/29')}
                    </td>
                    <td className="p-3">
                      {isValid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          معتبر
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-max">
                          <AlertCircle className="w-3.5 h-3.5" />
                          منقضی شده
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
