import React, { useState } from 'react';
import JSZip from 'jszip';
import { UploadCloud, FileArchive, Image as ImageIcon, CheckCircle2, AlertTriangle, RefreshCw, Check, Info, Users } from 'lucide-react';
import { processAndCompressImage, CompressedImageResult } from '../utils/imageCompressor';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { uploadFileToServer } from '../utils/fileUploader';

interface ZipProfilePhotoImporterProps {
  onComplete?: () => void;
}

interface ExtractedPhotoItem {
  id: string;
  originalFileName: string;
  extractedNationalId: string;
  compressedResult?: CompressedImageResult;
  status: 'valid' | 'invalid_id' | 'error';
  statusMessage: string;
  matchedUserName?: string;
  matchedType?: 'user' | 'prereg' | 'none';
}

export const ZipProfilePhotoImporter: React.FC<ZipProfilePhotoImporterProps> = ({ onComplete }) => {
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [items, setItems] = useState<ExtractedPhotoItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('لطفاً یک فایل با پسوند ZIP انتخاب نمایید.');
      return;
    }

    setZipFileName(file.name);
    setIsProcessingZip(true);
    setUploadResult(null);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      const extractedItems: ExtractedPhotoItem[] = [];

      // Get all user and pre-registration records for matching
      const users = dbStore.getUsers();
      const preRegs = dbStore.getPreRegistrations();

      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

      for (const [filename, fileObj] of Object.entries(contents.files)) {
        if (fileObj.dir) continue;

        const lowerName = filename.toLowerCase();
        const isImage = imageExtensions.some((ext) => lowerName.endsWith(ext));
        if (!isImage) continue;

        // Clean base filename without path
        const baseName = filename.split('/').pop() || filename;

        // Match 10-digit national ID in filename (e.g. 3241407330.jpg or photo_3241407330.png)
        const digitsMatch = baseName.match(/\b\d{10}\b/) || baseName.match(/\d{10}/);
        const extractedId = digitsMatch ? digitsMatch[0] : '';

        if (!extractedId) {
          extractedItems.push({
            id: Math.random().toString(),
            originalFileName: baseName,
            extractedNationalId: '',
            status: 'invalid_id',
            statusMessage: 'کد ملی ۱۰ رقمی در نام فایل یافت نشد',
          });
          continue;
        }

        // Extract file as binary Blob directly
        const blob = await fileObj.async('blob');

        // Compress image under 1MB & convert to JPEG using HTML5 Canvas
        const compressed = await processAndCompressImage(blob, extractedId, 1000, 0.85);

        // Find match in system
        let matchedName = '';
        let matchedType: 'user' | 'prereg' | 'none' = 'none';

        const matchedUser = users.find((u) => u.nationalId === extractedId || u.username === extractedId);
        if (matchedUser) {
          matchedName = matchedUser.fullName;
          matchedType = 'user';
        } else {
          const matchedPreReg = preRegs.find((p) => p.nationalId === extractedId);
          if (matchedPreReg) {
            matchedName = matchedPreReg.fullName;
            matchedType = 'prereg';
          }
        }

        extractedItems.push({
          id: Math.random().toString(),
          originalFileName: baseName,
          extractedNationalId: extractedId,
          compressedResult: compressed,
          status: 'valid',
          statusMessage: matchedName
            ? `تطبیق با پرونده ${matchedType === 'user' ? 'عضو' : 'پیش‌ثبت‌نام'}: ${matchedName}`
            : 'کاربر با این کد ملی هنوز ثبت نشده (ذخیره عکس برای آینده)',
          matchedUserName: matchedName,
          matchedType,
        });
      }

      setItems(extractedItems);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(`خطا در استخراج فایل زیپ: ${err.message || 'فایل آسیب‌دیده است.'}`);
    } finally {
      setIsProcessingZip(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const handleConfirmBulkUpload = async () => {
    const validItems = items.filter((item) => item.status === 'valid' && item.compressedResult);
    if (validItems.length === 0) {
      alert('هیچ تصویر معتبری برای درون‌ریزی وجود ندارد.');
      return;
    }

    setIsUploading(true);

    try {
      let savedCount = 0;
      let dbUpdatedCount = 0;

      // Upload binary files sequentially via Multipart FormData
      for (const item of validItems) {
        if (item.compressedResult?.blob) {
          const res = await uploadFileToServer(item.compressedResult.blob, {
            customName: item.extractedNationalId,
            subDir: 'profile_img',
            prefix: '',
          });

          if (res.success && res.url) {
            savedCount++;
            const count = dbStore.updateAvatarByNationalId(item.extractedNationalId, res.url);
            dbUpdatedCount += count;
          }
        }
      }

      setUploadResult({
        success: true,
        message: `تعداد ${toPersianDigits(savedCount)} عکس پروفایل با موفقیت در پوشه سرور ذخیره گردید و ${toPersianDigits(dbUpdatedCount)} پرونده کاربر به‌روزرسانی شد.`,
      });

      setIsModalOpen(false);
      if (onComplete) onComplete();
    } catch (err: any) {
      setUploadResult({
        success: false,
        message: err.message || 'خطا در آپلود عکس‌ها به سرور',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b pb-4 border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-teal-600" />
            درون‌ریزی انبوه عکس‌های پروفایل (فایل ZIP)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            آپلود یکباره تمامی عکس‌های پرسنلی کاربران با نام‌گذاری کد ملی با پسوند jpg یا png در یک فایل زیپ
          </p>
        </div>
      </div>

      {uploadResult && (
        <div
          className={`p-4 rounded-xl mb-4 text-sm flex items-start gap-3 ${
            uploadResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {uploadResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          <div>{uploadResult.message}</div>
        </div>
      )}

      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-100/80 transition-colors">
        <input
          type="file"
          id="zip-profile-upload"
          accept=".zip"
          onChange={handleZipFileChange}
          disabled={isProcessingZip}
          className="hidden"
        />
        <label htmlFor="zip-profile-upload" className="cursor-pointer flex flex-col items-center justify-center">
          {isProcessingZip ? (
            <div className="flex flex-col items-center">
              <RefreshCw className="w-10 h-10 text-teal-600 animate-spin mb-2" />
              <p className="text-sm font-semibold text-gray-700">در حال استخراج و فشرده‌سازی عکس‌ها...</p>
              <p className="text-xs text-gray-500 mt-1">تصاویر به پسوند jpeg و حجم زیر ۱ مگابایت تبدیل می‌شوند</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-gray-800">انتخاب فایل ZIP حاوی عکس‌های پرسنلی</p>
              <p className="text-xs text-gray-500 mt-1">
                نام فایل‌های داخل زیپ باید کد ملی باشد (مثلاً <span dir="ltr" className="font-mono bg-gray-200 px-1 rounded">3241407330.jpg</span>)
              </p>
              <span className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all">
                مرور و انتخاب فایل ZIP
              </span>
            </>
          )}
        </label>
      </div>

      {/* MODAL REPORT BEFORE IMPORT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-teal-600" />
                  بررسی و گزارش تطبیق عکس‌های استخراج‌شده از زیپ
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  فایل: {zipFileName} | کل عکس‌ها: {toPersianDigits(items.length)}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-200/60 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-3 bg-teal-50/60 border-b border-teal-100/60 flex items-center justify-between text-xs text-teal-900">
              <div className="flex items-center gap-4">
                <span>
                  🟢 معتبر و قابل درون‌ریزی: <strong>{toPersianDigits(items.filter((i) => i.status === 'valid').length)}</strong>
                </span>
                <span>
                  👤 تطبیق با اعضای سیستم: <strong>{toPersianDigits(items.filter((i) => i.matchedType !== 'none').length)}</strong>
                </span>
                <span>
                  🔴 عدم شناسایی کد ملی: <strong>{toPersianDigits(items.filter((i) => i.status !== 'valid').length)}</strong>
                </span>
              </div>
            </div>

            {/* Modal Content / Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-semibold border-b">
                    <th className="p-2 text-center">تصویر</th>
                    <th className="p-2">نام فایل اصلی</th>
                    <th className="p-2">کد ملی استخراج‌شده</th>
                    <th className="p-2">حجم جدید (JPEG)</th>
                    <th className="p-2">وضعیت و پرونده مربوطه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-center">
                        {item.compressedResult ? (
                          <img
                            src={item.compressedResult.previewUrl}
                            alt={item.extractedNationalId}
                            className="w-10 h-10 object-cover rounded-full mx-auto border border-gray-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto text-gray-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-2 font-mono dir-ltr text-left text-gray-600">{item.originalFileName}</td>
                      <td className="p-2 font-mono font-bold text-gray-900">
                        {item.extractedNationalId ? toPersianDigits(item.extractedNationalId) : <span className="text-rose-500 font-sans">یافت نشد</span>}
                      </td>
                      <td className="p-2 text-gray-500">
                        {item.compressedResult ? item.compressedResult.sizeFormatted : '-'}
                      </td>
                      <td className="p-2">
                        {item.status === 'valid' ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                item.matchedType === 'user'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.matchedType === 'prereg'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.statusMessage}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            {item.statusMessage}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmBulkUpload}
                disabled={isUploading || items.filter((i) => i.status === 'valid').length === 0}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    در حال ذخیره‌سازی تصاویر در پوشه upload/profile_img...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    تأیید و ذخیره {toPersianDigits(items.filter((i) => i.status === 'valid').length)} عکس در سرور
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
