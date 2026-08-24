import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Info, Check, Filter, Trash2 } from 'lucide-react';
import { dbStore } from '../services/db';
import { PreRegistrationRequest } from '../types';
import { downloadSamplePreRegistrationExcel } from '../utils/excelTemplateGenerator';
import { isValidIranianNationalId, toPersianDigits } from '../utils/nationalIdValidator';

interface ExcelPreRegImporterProps {
  onImportComplete?: () => void;
}

export interface ExcelImportRow {
  id: string;
  nationalId: string;
  fullName: string;
  fatherName: string;
  shenasnamehNo: string;
  phone: string;
  gender: 'male' | 'female';
  birthDate: string;
  emergencyContactPhone: string;
  emergencyContactName: string;
  shoeSize: string;
  climbingExperienceLevel: 'beginner' | 'intermediate' | 'advanced';
  address: string;
  // Status fields
  status: 'valid' | 'duplicate_db' | 'duplicate_file' | 'invalid_id' | 'incomplete';
  statusReason: string;
  isSelected: boolean;
}

export const ExcelPreRegImporter: React.FC<ExcelPreRegImporterProps> = ({ onImportComplete }) => {
  const [rows, setRows] = useState<ExcelImportRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'mismatch'>('all');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('فایل اکسل انتخاب‌شده دارای هیچ داده‌ای نمی‌باشد.');
          return;
        }

        // Get existing db records for duplicate checking
        const existingUsers = dbStore.getUsers();
        const existingPreRegs = dbStore.getPreRegistrations();

        const seenNationalIdsInFile = new Set<string>();
        const parsedRows: ExcelImportRow[] = [];

        rawJson.forEach((item, idx) => {
          // Extract values from various potential column headers
          const rawNationalId =
            item['کد ملی (الزامی و یکتا)'] ||
            item['کد ملی'] ||
            item['کدملی'] ||
            item['nationalId'] ||
            item['NationalId'] ||
            '';

          const cleanNationalId = String(rawNationalId).trim().replace(/\D/g, '');

          const fullName =
            item['نام کامل'] ||
            item['نام و نام خانوادگی'] ||
            item['fullName'] ||
            item['FullName'] ||
            '';

          const fatherName = item['نام پدر'] || item['fatherName'] || '';
          const shenasnamehNo = item['شماره شناسنامه'] || item['shenasnamehNo'] || '';
          const phone = String(item['تلفن همراه'] || item['تلفن'] || item['phone'] || '').trim();

          const rawGender = String(item['جنسیت (زن / مرد)'] || item['جنسیت'] || item['gender'] || '').trim();
          const gender: 'male' | 'female' = rawGender.includes('زن') || rawGender.toLowerCase() === 'female' ? 'female' : 'male';

          const birthDate = String(item['تاریخ تولد (1374/01/07)'] || item['تاریخ تولد'] || item['birthDate'] || '1380/01/01').trim();

          const emergencyContactPhone = String(item['تلفن اضطراری'] || item['emergencyContactPhone'] || '').trim();
          const emergencyContactName = String(item['نام مخاطب اضطراری'] || item['emergencyContactName'] || 'پدر/مادر').trim();
          const shoeSize = String(item['سایز کفش'] || item['shoeSize'] || '').trim();

          const rawLevel = String(item['سطح سنگ‌نوردی (مقدماتی / متوسط / پیشرفته)'] || item['سطح سنگ‌نوردی'] || item['climbingExperienceLevel'] || '').trim();
          let climbingLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
          if (rawLevel.includes('پیشرفته') || rawLevel.includes('advanced')) climbingLevel = 'advanced';
          else if (rawLevel.includes('متوسط') || rawLevel.includes('intermediate')) climbingLevel = 'intermediate';

          const address = String(item['آدرس'] || item['address'] || '').trim();

          // VALIDATION LOGIC
          let status: 'valid' | 'duplicate_db' | 'duplicate_file' | 'invalid_id' | 'incomplete' = 'valid';
          let statusReason = 'آماده درون‌ریزی';

          if (!cleanNationalId) {
            status = 'incomplete';
            statusReason = 'کد ملی وارد نشده است';
          } else if (cleanNationalId.length !== 10 || !isValidIranianNationalId(cleanNationalId)) {
            status = 'invalid_id';
            statusReason = 'ساختار کد ملی ۱۰ رقمی معتبر نیست';
          } else if (seenNationalIdsInFile.has(cleanNationalId)) {
            status = 'duplicate_file';
            statusReason = 'کد ملی تکراری درون خود فایل اکسل';
          } else {
            // Check duplicates in DB
            const inUsers = existingUsers.some((u) => u.nationalId === cleanNationalId || u.username === cleanNationalId);
            const inPreRegs = existingPreRegs.some((p) => p.nationalId === cleanNationalId);

            if (inUsers) {
              status = 'duplicate_db';
              statusReason = 'کد ملی تکراری - قبلاً به عنوان عضو باشگاه ثبت شده است';
            } else if (inPreRegs) {
              status = 'duplicate_db';
              statusReason = 'کد ملی تکراری - قبلاً درخواست پیش‌ثبت‌نام برای این کد ملی ثبت گردیده';
            }
          }

          if (status === 'valid' && (!fullName.trim() || !phone.trim())) {
            status = 'incomplete';
            statusReason = 'نام یا تلفن همراه وارد نشده است';
          }

          if (cleanNationalId && status !== 'duplicate_file') {
            seenNationalIdsInFile.add(cleanNationalId);
          }

          parsedRows.push({
            id: `row-${idx}-${Date.now()}`,
            nationalId: cleanNationalId,
            fullName,
            fatherName,
            shenasnamehNo,
            phone,
            gender,
            birthDate,
            emergencyContactPhone,
            emergencyContactName,
            shoeSize,
            climbingExperienceLevel: climbingLevel,
            address,
            status,
            statusReason,
            isSelected: status === 'valid',
          });
        });

        setRows(parsedRows);
        setIsModalOpen(true);
      } catch (err: any) {
        alert(`خطا در خواندن فایل اکسل: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleToggleSelectRow = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isSelected: !r.isSelected } : r))
    );
  };

  const handleConfirmImport = () => {
    // Only import selected rows that have 'valid' status (strictly preventing duplicates)
    const validSelectedRows = rows.filter((r) => r.isSelected && r.status === 'valid');

    if (validSelectedRows.length === 0) {
      alert('هیچ رکورد معتبری برای درون‌ریزی انتخاب نشده است.');
      return;
    }

    try {
      let count = 0;
      validSelectedRows.forEach((r) => {
        dbStore.submitPreRegistration({
          firstName: r.fullName.split(' ')[0] || '',
          lastName: r.fullName.split(' ').slice(1).join(' ') || '',
          fullName: r.fullName,
          fatherName: r.fatherName,
          shenasnamehNo: r.shenasnamehNo,
          nationalId: r.nationalId,
          birthDate: r.birthDate,
          gender: r.gender,
          phone: r.phone,
          emergencyContactName: r.emergencyContactName,
          emergencyContactPhone: r.emergencyContactPhone,
          shoeSize: r.shoeSize,
          climbingExperienceLevel: r.climbingExperienceLevel,
          address: r.address,
          bloodType: '',
          clothingSize: '',
          isUnder18: false,
          referrerName: 'درون‌ریزی فایل اکسل توسط مدیر',
        });
        count++;
      });

      setImportResult({
        success: true,
        message: `تعداد ${toPersianDigits(count)} درخواست پیش‌ثبت‌نام جدید با موفقیت از فایل اکسل درون‌ریزی شدند.`,
      });

      setIsModalOpen(false);
      setRows([]);
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err.message || 'خطا در درون‌ریزی اطلاعات پیش‌ثبت‌نام',
      });
    }
  };

  const filteredRows = rows.filter((r) => {
    if (activeFilter === 'valid') return r.status === 'valid';
    if (activeFilter === 'mismatch') return r.status !== 'valid';
    return true;
  });

  const validCount = rows.filter((r) => r.status === 'valid').length;
  const mismatchCount = rows.filter((r) => r.status !== 'valid').length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4 border-b pb-4 border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            درون‌ریزی هوشمند اطلاعات پیش‌ثبت‌نام از فایل اکسل
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            بارگذاری فایل اکسل متقاضیان همراه با بررسی کد ملی تکراری، ساختار شناسه و گزارش مغایرت رکورد به رکورد
          </p>
        </div>

        <button
          onClick={downloadSamplePreRegistrationExcel}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-slate-200"
        >
          <Download className="w-4 h-4 text-teal-600" />
          دانلود فایل نمونه اکسل استاندارد (.xlsx)
        </button>
      </div>

      {importResult && (
        <div
          className={`p-4 rounded-xl mb-4 text-sm flex items-start gap-3 ${
            importResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {importResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          <div>{importResult.message}</div>
        </div>
      )}

      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-100/80 transition-colors">
        <input
          type="file"
          id="excel-prereg-upload"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <label htmlFor="excel-prereg-upload" className="cursor-pointer flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-gray-800">انتخاب فایل اکسل پیش‌ثبت‌نام (.xlsx)</p>
          <p className="text-xs text-gray-500 mt-1">
            پس از انتخاب فایل، ابتدا گزارش مغایرت و بررسی تکرار کد ملی نمایش داده می‌شود
          </p>
          <span className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all">
            مرور و بارگذاری فایل اکسل
          </span>
        </label>
      </div>

      {/* RECORD-BY-RECORD ANALYSIS MODAL BEFORE IMPORT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                  گزارش مغایرت و بررسی رکورد به رکورد فایل اکسل
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  تعداد کل رکوردهای شناسا‌یی‌شده: {toPersianDigits(rows.length)} مورد
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-200/60 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs & Counter */}
            <div className="px-6 py-3 bg-slate-100/70 border-b border-gray-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeFilter === 'all' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  همه موارد ({toPersianDigits(rows.length)})
                </button>
                <button
                  onClick={() => setActiveFilter('valid')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeFilter === 'valid' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  🟢 قابل درون‌ریزی ({toPersianDigits(validCount)})
                </button>
                <button
                  onClick={() => setActiveFilter('mismatch')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeFilter === 'mismatch' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-rose-800 hover:bg-rose-50'
                  }`}
                >
                  🔴 دارای مغایرت / تکراری ({toPersianDigits(mismatchCount)})
                </button>
              </div>

              <div className="text-gray-600 font-medium">
                انتخاب‌شده جهت ثبت: <strong className="text-teal-700 font-bold">{toPersianDigits(rows.filter((r) => r.isSelected && r.status === 'valid').length)}</strong> رکورد
              </div>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto flex-1">
              {filteredRows.length === 0 ? (
                <div className="text-center py-12 text-gray-500">هیچ رکوردی در این فیلتر قرار ندارد.</div>
              ) : (
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b">
                      <th className="p-2.5 text-center">انتخاب</th>
                      <th className="p-2.5">کد ملی</th>
                      <th className="p-2.5">نام کامل</th>
                      <th className="p-2.5">تلفن همراه</th>
                      <th className="p-2.5">تاریخ تولد</th>
                      <th className="p-2.5">سطح</th>
                      <th className="p-2.5">وضعیت و علت مغایرت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          row.status !== 'valid' ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={row.isSelected && row.status === 'valid'}
                            disabled={row.status !== 'valid'}
                            onChange={() => handleToggleSelectRow(row.id)}
                            className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500 disabled:opacity-30 cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5 font-mono font-bold text-gray-900">
                          {row.nationalId ? toPersianDigits(row.nationalId) : <span className="text-rose-500 font-sans">ناقص</span>}
                        </td>
                        <td className="p-2.5 font-semibold text-gray-800">{row.fullName || '-'}</td>
                        <td className="p-2.5 font-mono text-gray-600">{row.phone ? toPersianDigits(row.phone) : '-'}</td>
                        <td className="p-2.5 text-gray-600">{toPersianDigits(row.birthDate)}</td>
                        <td className="p-2.5 text-gray-600">
                          {row.climbingExperienceLevel === 'beginner' ? 'مقدماتی' : row.climbingExperienceLevel === 'intermediate' ? 'متوسط' : 'پیشرفته'}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              row.status === 'valid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.status === 'duplicate_db' || row.status === 'duplicate_file'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {row.status === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                            {row.statusReason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={rows.filter((r) => r.isSelected && r.status === 'valid').length === 0}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                تأیید و درون‌ریزی {toPersianDigits(rows.filter((r) => r.isSelected && r.status === 'valid').length)} رکورد معتبر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
