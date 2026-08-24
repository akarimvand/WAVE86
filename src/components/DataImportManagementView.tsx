import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileArchive,
  Image as ImageIcon,
  Check,
  Users,
  Eye,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Database,
  FileCheck,
  UserCheck,
  Search,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { downloadSamplePreRegistrationExcel } from '../utils/excelTemplateGenerator';
import { processAndCompressImage, CompressedImageResult } from '../utils/imageCompressor';
import { isValidIranianNationalId, toPersianDigits, toEnglishDigits } from '../utils/nationalIdValidator';
import { uploadFileToServer } from '../utils/fileUploader';
import { PreRegistrationRequest } from '../types';

interface DataImportManagementViewProps {
  onImportComplete?: () => void;
}

export interface ExcelRowValidationResult {
  id: string;
  rowIndex: number;
  fullName: string;
  nationalId: string;
  phone: string;
  gender: 'male' | 'female';
  birthDate: string;
  fatherName?: string;
  shenasnamehNo?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  shoeSize?: string;
  climbingExperienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  address?: string;
  status: 'valid' | 'duplicate_prereg' | 'duplicate_user' | 'duplicate_in_file' | 'invalid_national_id';
  statusMessage: string;
}

export interface ZipImageResult {
  fileNameInZip: string;
  extractedNationalId: string;
  matchedMemberName?: string;
  status: 'success' | 'unlinked' | 'error';
  statusMessage: string;
  sizeFormatted?: string;
  previewUrl?: string;
}

export const DataImportManagementView: React.FC<DataImportManagementViewProps> = ({ onImportComplete }) => {
  const [activeSubTab, setActiveSubTab] = useState<'excel' | 'zip' | 'single_image'>('excel');

  // Excel Upload & Validation Modal State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelValidations, setExcelValidations] = useState<ExcelRowValidationResult[]>([]);
  const [showExcelPreviewModal, setShowExcelPreviewModal] = useState(false);
  const [filterValidationStatus, setFilterValidationStatus] = useState<'all' | 'valid' | 'discrepancy'>('all');
  const [excelImportResultNotice, setExcelImportResultNotice] = useState<string | null>(null);

  // ZIP Bulk Image Upload State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipResults, setZipResults] = useState<ZipImageResult[]>([]);
  const [zipSuccessCount, setZipSuccessCount] = useState<number | null>(null);

  // Single Image Upload State
  const [singleNationalId, setSingleNationalId] = useState('');
  const [singleImageFile, setSingleImageFile] = useState<File | null>(null);
  const [singleUploadStatus, setSingleUploadStatus] = useState<{ success: boolean; message: string; url?: string } | null>(null);
  const [isProcessingSingleImage, setIsProcessingSingleImage] = useState(false);

  // -------------------------------------------------------------
  // 1. EXCEL FILE HANDLING LOGIC
  // -------------------------------------------------------------
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setExcelImportResultNotice(null);
  };

  const handleProcessExcel = async () => {
    if (!excelFile) return;
    setIsProcessingExcel(true);
    setExcelImportResultNotice(null);

    try {
      const buffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        alert('فایل اکسل انتخاب‌شده خالی است.');
        setIsProcessingExcel(false);
        return;
      }

      const existingPreRegs = dbStore.getPreRegistrations();
      const existingUsers = dbStore.getUsers();
      const seenNationalIdsInFile = new Set<string>();

      const validations: ExcelRowValidationResult[] = rawRows.map((row, idx) => {
        // Extract values using various possible header names
        const rawNationalId = String(
          row['کد ملی'] ||
          row['کد ملی (الزامی و یکتا)'] ||
          row['nationalId'] ||
          row['national_id'] ||
          ''
        ).trim();

        const cleanNationalId = toEnglishDigits(rawNationalId).replace(/\D/g, '');

        const fullName = String(
          row['نام کامل'] ||
          row['نام و نام خانوادگی'] ||
          `${row['نام'] || ''} ${row['نام خانوادگی'] || ''}` ||
          row['fullName'] ||
          ''
        ).trim() || `کاربر ردیف ${idx + 1}`;

        const phone = toEnglishDigits(
          String(row['تلفن همراه'] || row['موبایل'] || row['phone'] || '09120000000').trim()
        );

        const rawGender = String(row['جنسیت'] || row['جنسیت (زن / مرد)'] || row['gender'] || '').trim().toLowerCase();
        const gender: 'male' | 'female' = rawGender.includes('زن') || rawGender === 'female' ? 'female' : 'male';

        const birthDate = String(
          row['تاریخ تولد'] || row['تاریخ تولد (1374/01/07)'] || row['birthDate'] || '1380/01/01'
        ).trim();

        const fatherName = String(row['نام پدر'] || row['fatherName'] || '').trim();
        const shenasnamehNo = String(row['شماره شناسنامه'] || row['shenasnamehNo'] || '').trim();
        const emergencyContactName = String(row['نام مخاطب اضطراری'] || row['emergencyContactName'] || '').trim();
        const emergencyContactPhone = String(row['تلفن اضطراری'] || row['emergencyContactPhone'] || '').trim();
        const shoeSize = String(row['سایز کفش'] || row['shoeSize'] || '').trim();
        const address = String(row['آدرس'] || row['address'] || '').trim();

        const rawLevel = String(row['سطح سنگ‌نوردی'] || row['سطح سنگ‌نوردی (مقدماتی / متوسط / پیشرفته)'] || '').trim();
        let climbingExperienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
        if (rawLevel.includes('مقدماتی')) climbingExperienceLevel = 'beginner';
        else if (rawLevel.includes('پیشرفته')) climbingExperienceLevel = 'advanced';

        let status: ExcelRowValidationResult['status'] = 'valid';
        let statusMessage = 'اطلاعات معتبر و آماده ثبت است.';

        // Validation Checks
        if (!cleanNationalId || cleanNationalId.length !== 10) {
          status = 'invalid_national_id';
          statusMessage = 'کد ملی وارد شده ۱۰ رقمی یا معتبر نیست.';
        } else if (seenNationalIdsInFile.has(cleanNationalId)) {
          status = 'duplicate_in_file';
          statusMessage = 'کد ملی تکراری در خود فایل اکسل وجود دارد.';
        } else if (existingPreRegs.some((p) => p.nationalId === cleanNationalId)) {
          status = 'duplicate_prereg';
          statusMessage = 'این کد ملی قبلاً در لیست پیش‌ثبت‌نام‌های سیستم وجود دارد.';
        } else if (existingUsers.some((u) => u.nationalId === cleanNationalId || u.username === cleanNationalId)) {
          status = 'duplicate_user';
          statusMessage = 'این کد ملی متعلق به یکی از اعضای فعلی و فعال سیستم است.';
        }

        if (cleanNationalId && status === 'valid') {
          seenNationalIdsInFile.add(cleanNationalId);
        }

        return {
          id: `excel-row-${idx}-${Date.now()}`,
          rowIndex: idx + 2, // Header is row 1
          fullName,
          nationalId: cleanNationalId,
          phone,
          gender,
          birthDate,
          fatherName,
          shenasnamehNo,
          emergencyContactName,
          emergencyContactPhone,
          shoeSize,
          climbingExperienceLevel,
          address,
          status,
          statusMessage,
        };
      });

      setExcelValidations(validations);
      setShowExcelPreviewModal(true);
    } catch (err: any) {
      alert(`خطا در خواندن فایل اکسل: ${err.message}`);
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const handleConfirmExcelImport = () => {
    const validRows = excelValidations.filter((v) => v.status === 'valid');
    if (validRows.length === 0) {
      alert('هیچ رکورد معتبری برای درون‌ریزی یافت نشد.');
      return;
    }

    let importedCount = 0;
    validRows.forEach((row) => {
      dbStore.submitPreRegistration({
        fullName: row.fullName,
        firstName: row.fullName.split(' ')[0] || '',
        lastName: row.fullName.split(' ').slice(1).join(' ') || '',
        nationalId: row.nationalId,
        phone: row.phone,
        gender: row.gender,
        birthDate: row.birthDate,
        fatherName: row.fatherName,
        shenasnamehNo: row.shenasnamehNo,
        emergencyContactName: row.emergencyContactName,
        emergencyContactPhone: row.emergencyContactPhone,
        shoeSize: row.shoeSize,
        climbingExperienceLevel: row.climbingExperienceLevel,
        address: row.address,
        isUnder18: false,
        bloodType: '',
        clothingSize: '',
        referrerName: 'درون‌ریزی فایل اکسل',
      });
      importedCount++;
    });

    const duplicateCount = excelValidations.length - importedCount;
    setExcelImportResultNotice(
      `درون‌ریزی با موفقیت انجام شد: تعداد ${toPersianDigits(importedCount)} درخواست پیش‌ثبت‌نام جدید ثبت گردید.` +
        (duplicateCount > 0 ? ` تعداد ${toPersianDigits(duplicateCount)} رکورد دارای مغایرت/کد ملی تکراری رد شدند.` : '')
    );

    setShowExcelPreviewModal(false);
    setExcelFile(null);
    if (onImportComplete) onImportComplete();
  };

  // -------------------------------------------------------------
  // 2. ZIP BULK PROFILE IMAGE HANDLING LOGIC
  // -------------------------------------------------------------
  const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipFile(file);
    setZipResults([]);
    setZipSuccessCount(null);
  };

  const handleProcessZip = async () => {
    if (!zipFile) return;
    setIsProcessingZip(true);
    setZipResults([]);
    setZipSuccessCount(null);

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);

      const imageFiles: { name: string; file: JSZip.JSZipObject }[] = [];
      zipContent.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(jpg|jpeg|png|webp|gif)$/i.test(relativePath)) {
          imageFiles.push({ name: relativePath, file: zipEntry });
        }
      });

      if (imageFiles.length === 0) {
        alert('هیچ فایل تصاویری (.jpg, .png, .jpeg) در داخل فایل زیپ پیدا نشد.');
        setIsProcessingZip(false);
        return;
      }

      const existingUsers = dbStore.getUsers();
      const existingPreRegs = dbStore.getPreRegistrations();

      const batchItemsForServer: { nationalId: string; imageBase64: string }[] = [];
      const uiResults: ZipImageResult[] = [];

      for (const item of imageFiles) {
        try {
          // Extract national ID from file name e.g. "3241407330.jpg" or "folder/3241407330.png"
          const baseName = item.name.split('/').pop() || item.name;
          const rawNationalId = baseName.replace(/\.[^/.]+$/, '');
          const cleanNationalId = toEnglishDigits(rawNationalId).replace(/\D/g, '');

          const matchedUser = existingUsers.find((u) => u.nationalId === cleanNationalId || u.username === cleanNationalId);
          const matchedPreReg = existingPreRegs.find((p) => p.nationalId === cleanNationalId);
          const memberName = matchedUser?.fullName || matchedPreReg?.fullName;

          if (!cleanNationalId || cleanNationalId.length !== 10) {
            uiResults.push({
              fileNameInZip: item.name,
              extractedNationalId: cleanNationalId || 'نامعلوم',
              status: 'unlinked',
              statusMessage: 'نام فایل معادل یک کد ملی ۱۰ رقمی نیست.',
            });
            continue;
          }

          // Extract blob from zip
          const blob = await item.file.async('blob');

          // Compress and convert to JPEG <1MB named {nationalId}.jpeg
          const compressed = await processAndCompressImage(blob, cleanNationalId, 1000, 0.85);

          // Upload binary file directly via multipart FormData
          const uploadRes = await uploadFileToServer(compressed.blob, {
            customName: cleanNationalId,
            subDir: 'profile_img',
            prefix: '',
          });

          // Update local dbStore avatar URLs immediately
          const avatarUrl = uploadRes.success && uploadRes.url ? uploadRes.url : `/uploads/profile_img/${compressed.fileName}`;
          if (matchedUser) {
            dbStore.updateUserRoles(matchedUser.id, matchedUser.roles, 'سیستم درون‌ریز عکس');
            matchedUser.avatarUrl = avatarUrl;
          }
          if (matchedPreReg) {
            dbStore.updatePreRegistration(matchedPreReg.id, { avatarUrl }, 'سیستم درون‌ریز عکس');
          }

          uiResults.push({
            fileNameInZip: item.name,
            extractedNationalId: cleanNationalId,
            matchedMemberName: memberName || 'عضو بدون پرونده (صرفاً عکس ذخیره شد)',
            status: uploadRes.success ? 'success' : 'error',
            statusMessage: uploadRes.success
              ? (memberName ? `ارتباط داده شد به پرونده ${memberName}` : 'عکس با موفقیت ذخیره گردید.')
              : (uploadRes.error || 'خطا در بارگذاری روی سرور'),
            sizeFormatted: compressed.sizeFormatted,
            previewUrl: compressed.previewUrl,
          });
        } catch (err: any) {
          uiResults.push({
            fileNameInZip: item.name,
            extractedNationalId: 'خطا',
            status: 'error',
            statusMessage: err.message || 'خطا در پردازش تصویر',
          });
        }
      }

      const successCount = uiResults.filter((r) => r.status === 'success').length;
      setZipSuccessCount(successCount);
      setZipResults(uiResults);
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      alert(`خطا در باز کردن فایل زیپ: ${err.message}`);
    } finally {
      setIsProcessingZip(false);
    }
  };

  // -------------------------------------------------------------
  // 3. SINGLE PROFILE IMAGE HANDLING LOGIC
  // -------------------------------------------------------------
  const handleSingleUpload = async () => {
    if (!singleNationalId.trim()) {
      alert('لطفاً کد ملی کاربر را وارد کنید.');
      return;
    }
    if (!singleImageFile) {
      alert('لطفاً فایل عکس را انتخاب نمایید.');
      return;
    }

    const cleanNationalId = toEnglishDigits(singleNationalId).replace(/\D/g, '');
    if (cleanNationalId.length !== 10) {
      alert('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    setIsProcessingSingleImage(true);
    setSingleUploadStatus(null);

    try {
      // Compress and convert to JPEG < 1MB
      const compressed = await processAndCompressImage(singleImageFile, cleanNationalId, 1000, 0.85);

      // Upload binary file directly via multipart FormData
      const uploadRes = await uploadFileToServer(compressed.blob, {
        customName: cleanNationalId,
        subDir: 'profile_img',
        prefix: '',
      });

      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || 'خطا در ذخیره‌سازی عکس روی سرور.');
      }

      const avatarUrl = uploadRes.url;

      // Update matching user / pre-registration in local dbStore
      const users = dbStore.getUsers();
      const preRegs = dbStore.getPreRegistrations();

      const user = users.find((u) => u.nationalId === cleanNationalId || u.username === cleanNationalId);
      if (user) {
        user.avatarUrl = avatarUrl;
      }
      const pre = preRegs.find((p) => p.nationalId === cleanNationalId);
      if (pre) {
        dbStore.updatePreRegistration(pre.id, { avatarUrl }, 'سیستم مدیریت تصویر');
      }

      setSingleUploadStatus({
        success: true,
        message: `تصویر با پسوند JPEG و حجم ${compressed.sizeFormatted} با موفقیت در سرور ذخیره گردید.`,
        url: compressed.previewUrl,
      });

      setSingleImageFile(null);
      setSingleNationalId('');
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setSingleUploadStatus({
        success: false,
        message: err.message || 'خطا در آپلود عکس کاربر.',
      });
    } finally {
      setIsProcessingSingleImage(false);
    }
  };

  const validCount = excelValidations.filter((v) => v.status === 'valid').length;
  const discrepancyCount = excelValidations.length - validCount;

  const filteredValidations = excelValidations.filter((v) => {
    if (filterValidationStatus === 'valid') return v.status === 'valid';
    if (filterValidationStatus === 'discrepancy') return v.status !== 'valid';
    return true;
  });

  return (
    <div className="space-y-6 dir-rtl">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('excel')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
            activeSubTab === 'excel'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          درون‌ریزی اکسل پیش‌ثبت‌نام
        </button>

        <button
          onClick={() => setActiveSubTab('zip')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
            activeSubTab === 'zip'
              ? 'bg-white text-teal-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileArchive className="w-4 h-4 text-teal-600" />
          درون‌ریزی گروهی عکس‌ها (فایل ZIP)
        </button>

        <button
          onClick={() => setActiveSubTab('single_image')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
            activeSubTab === 'single_image'
              ? 'bg-white text-blue-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-blue-600" />
          ثبت/تغییر تک‌عکس کاربر
        </button>
      </div>

      {/* -----------------------------------------------------------------
          SUB-TAB 1: EXCEL PRE-REGISTRATION IMPORT
      ----------------------------------------------------------------- */}
      {activeSubTab === 'excel' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                درون‌ریزی داده‌های پیش‌ثبت‌نام از فایل اکسل (Excel)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ابتدا فایل نمونه اکسل را دریافت کرده و اطلاعات متقاضیان را مطابق ستون‌های آن تکمیل کنید. قبل از ثبت نهایی، سیستم به صورت هوشمند کدهای ملی تکراری را شناسایی کرده و گزارش مغایرت رکورد به رکورد ارائه می‌دهد.
              </p>
            </div>

            <button
              onClick={downloadSamplePreRegistrationExcel}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              دانلود نمونه فایل اکسل استاندارد (.xlsx)
            </button>
          </div>

          {excelImportResultNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold leading-relaxed">{excelImportResultNotice}</span>
            </div>
          )}

          {/* Excel File Drop Box */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              انتخاب و پردازش فایل اکسل تکمیل‌شده
            </h4>

            <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 transition-colors rounded-2xl p-8 text-center space-y-3 bg-slate-50/50">
              <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">
                  {excelFile ? `فایل انتخاب‌شده: ${excelFile.name}` : 'فایل اکسل (.xlsx یا .xls) را اینجا رها کنید یا انتخاب کنید'}
                </p>
                <p className="text-[11px] text-slate-400">کدهای ملی تکراری مجاز نبوده و پیش از ثبت استعلام می‌شوند.</p>
              </div>

              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelFileSelect}
                className="hidden"
                id="excel-file-input"
              />
              <label
                htmlFor="excel-file-input"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
              >
                انتخاب فایل از رایانه
              </label>
            </div>

            {excelFile && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleProcessExcel}
                  disabled={isProcessingExcel}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/10 flex items-center gap-2"
                >
                  {isProcessingExcel ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      در حال آنالیز کدهای ملی و بررسی مغایرت‌ها...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      آنالیز و نمایش مودال بررسی رکورد به رکورد
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          EXCEL RECORD-BY-RECORD PREVIEW & DISCREPANCY MODAL
      ----------------------------------------------------------------- */}
      {showExcelPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-600" />
                  بررسی رکورد به رکورد و گزارش مغایرت اطلاعات پیش‌ثبت‌نام
                </h3>
                <p className="text-xs text-slate-500">
                  تعداد کل رکوردهای موجود: <span className="font-bold text-slate-900">{toPersianDigits(excelValidations.length)}</span> | موارد معتبر: <span className="font-bold text-emerald-600">{toPersianDigits(validCount)}</span> | دارای مغایرت/تکراری: <span className="font-bold text-rose-600">{toPersianDigits(discrepancyCount)}</span>
                </p>
              </div>

              <button
                onClick={() => setShowExcelPreviewModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-100 flex items-center gap-2">
              <button
                onClick={() => setFilterValidationStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterValidationStatus === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه موارد ({toPersianDigits(excelValidations.length)})
              </button>
              <button
                onClick={() => setFilterValidationStatus('valid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterValidationStatus === 'valid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                آماده ثبت ({toPersianDigits(validCount)})
              </button>
              <button
                onClick={() => setFilterValidationStatus('discrepancy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterValidationStatus === 'discrepancy'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 hover:bg-rose-50'
                }`}
              >
                دارای مغایرت / ردشده ({toPersianDigits(discrepancyCount)})
              </button>
            </div>

            {/* Validation Table */}
            <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100 pb-2 text-[11px]">
                    <th className="py-2 px-2">ردیف</th>
                    <th className="py-2 px-2">نام کامل</th>
                    <th className="py-2 px-2">کد ملی</th>
                    <th className="py-2 px-2">تلفن همراه</th>
                    <th className="py-2 px-2">وضعیت اعتبارسنجی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredValidations.map((row) => {
                    const isValid = row.status === 'valid';
                    return (
                      <tr key={row.id} className={isValid ? 'hover:bg-emerald-50/30' : 'bg-rose-50/30 hover:bg-rose-50/50'}>
                        <td className="py-3 px-2 font-mono text-slate-400 text-[11px]">{toPersianDigits(row.rowIndex)}</td>
                        <td className="py-3 px-2 font-bold text-slate-900">{row.fullName}</td>
                        <td className="py-3 px-2 font-mono text-slate-700">{toPersianDigits(row.nationalId)}</td>
                        <td className="py-3 px-2 font-mono text-slate-600">{toPersianDigits(row.phone)}</td>
                        <td className="py-3 px-2">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              آماده ثبت
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px]">
                                <XCircle className="w-3.5 h-3.5" />
                                مغایرت: {row.statusMessage}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => setShowExcelPreviewModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                انصراف
              </button>

              <button
                onClick={handleConfirmExcelImport}
                disabled={validCount === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                تأیید و درون‌ریزی نهایی {toPersianDigits(validCount)} رکورد معتبر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------
          SUB-TAB 2: ZIP BULK PROFILE IMAGE IMPORT
      ----------------------------------------------------------------- */}
      {activeSubTab === 'zip' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-2">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-teal-600" />
              درون‌ریزی گروهی عکس‌های پروفایل از طریق فایل زیپ (ZIP)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              تمامی عکس‌های پروفایل کاربران یا متقاضیان را در یک فایل ZIP قرار دهید. نام هر عکس باید معادل کد ملی کاربر باشد (مثلاً <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-teal-700">3241407330.jpg</code>). عکس‌ها خودکار تبدیل به پسوند استاندارد <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-teal-700">.jpeg</code> با حجم زیر ۱ مگابایت شده و در پوشه <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">upload/profile_img</code> ذخیره می‌گردند.
            </p>
          </div>

          {zipSuccessCount !== null && (
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
              <span className="text-xs font-bold">
                پردازش فایل زیپ کامل شد: تعداد {toPersianDigits(zipSuccessCount)} عکس با موفقیت به پسوند JPEG فشرده گردید و در پوشه upload/profile_img قرار گرفت.
              </span>
            </div>
          )}

          {/* Zip Drop Area */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 transition-colors rounded-2xl p-8 text-center space-y-3 bg-slate-50/50">
              <FileArchive className="w-12 h-12 text-teal-500 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">
                  {zipFile ? `فایل زیپ انتخاب‌شده: ${zipFile.name}` : 'فایل ZIP حاوی تصاویر اعضا را انتخاب یا رها کنید'}
                </p>
                <p className="text-[11px] text-slate-400">نام تصاویر درون فایل زیپ باید کد ملی ۱۰ رقمی اعضا باشد.</p>
              </div>

              <input
                type="file"
                accept=".zip"
                onChange={handleZipFileSelect}
                className="hidden"
                id="zip-file-input"
              />
              <label
                htmlFor="zip-file-input"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
              >
                انتخاب فایل ZIP
              </label>
            </div>

            {zipFile && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleProcessZip}
                  disabled={isProcessingZip}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-teal-600/10 flex items-center gap-2"
                >
                  {isProcessingZip ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      در حال استخراج و فشرده‌سازی عکس‌ها به فرمت JPEG...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      استخراج زیپ، فشرده‌سازی زیر ۱ مگابایت و ذخیره
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Processed Zip Images Results List */}
          {zipResults.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                نتایج استخراج و انطباق تصاویر ({toPersianDigits(zipResults.length)} فایل)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {zipResults.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      res.status === 'success'
                        ? 'bg-slate-50 border-slate-200/80'
                        : 'bg-rose-50/50 border-rose-200/60'
                    }`}
                  >
                    {res.previewUrl ? (
                      <img
                        src={res.previewUrl}
                        alt="Profile Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 text-slate-500 font-bold text-xs">
                        {toPersianDigits(idx + 1)}
                      </div>
                    )}

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{res.matchedMemberName || res.fileNameInZip}</p>
                      <p className="text-[10px] text-slate-500 font-mono">کد ملی: {toPersianDigits(res.extractedNationalId)}</p>
                      <p className={`text-[10px] font-bold ${res.status === 'success' ? 'text-teal-700' : 'text-rose-600'}`}>
                        {res.statusMessage} {res.sizeFormatted ? `(${res.sizeFormatted})` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -----------------------------------------------------------------
          SUB-TAB 3: SINGLE PROFILE IMAGE UPLOAD
      ----------------------------------------------------------------- */}
      {activeSubTab === 'single_image' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              تغییر یا آپلود مستقیم عکس پروفایل برای یک کد ملی مشخص
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              با وارد کردن کد ملی کاربر و انتخاب عکس، عکس ارسالی به فرمت JPEG تبدیل شده، به حجم زیر ۱ مگابایت فشرده شده و در پوشه <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">upload/profile_img/[nationalId].jpeg</code> ذخیره می‌گردد.
            </p>
          </div>

          {singleUploadStatus && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
              singleUploadStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {singleUploadStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-bold leading-relaxed">{singleUploadStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">کد ملی کاربر (۱۰ رقم):</label>
              <input
                type="text"
                value={singleNationalId}
                onChange={(e) => setSingleNationalId(e.target.value)}
                placeholder="مثال: 3241407330"
                maxLength={10}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">انتخاب تصویر جدید:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSingleImageFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSingleUpload}
              disabled={isProcessingSingleImage || !singleNationalId.trim() || !singleImageFile}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 flex items-center gap-2"
            >
              {isProcessingSingleImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  در حال فشرده‌سازی به JPEG و ذخیره در پوشه upload/profile_img...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  تبدیل به JPEG و آپلود عکس پروفایل
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
