import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface ProductImporterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedProductItem {
  name: string;
  code?: string;
  category: string;
  price: number;
  buyPrice?: number;
  stock: number;
  minStock: number;
  unit?: string;
  description?: string;
  isValid: boolean;
  error?: string;
}

export function ProductImporterModal({ onClose, onSuccess }: ProductImporterModalProps) {
  const [parsedData, setParsedData] = useState<ParsedProductItem[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvHeader = 'نام محصول,کد محصول,دسته‌بندی,قیمت فروش (تومان),قیمت خرید (تومان),موجودی اولیه,حداقل موجودی,واحد,توضیحات\n';
    const csvRows = [
      'پروتئین بار کاله,PRD-101,نوشیدنی و مکمل,45000,35000,50,10,عدد,بار پروتئینی 70 گرمی شکلاتی',
      'قهوه اسپرسو بوفه,PRD-102,نوشیدنی و مکمل,40000,15000,100,20,فنجان,قهوه اسپرسو دبل شات',
      'پودر چاک سنگ‌نوردی,PRD-103,تجهیزات و لوازم جانبی,220000,170000,25,5,بسته,پودر منیزیم 300 گرمی',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'نمونه_جدول_درون_ریزی_محصولات.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse Uploaded CSV / TXT File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileInfo({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
      if (lines.length < 2) {
        alert('فایل انتخابی خالی است یا ساختار سطرها درست نمی‌باشد.');
        return;
      }

      const items: ParsedProductItem[] = [];

      // Skip header line (index 0)
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((col) => col.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 3) continue;

        const name = cols[0] || '';
        const code = cols[1] || '';
        const category = cols[2] || 'عمومی';
        const price = parseInt(cols[3] || '0', 10) || 0;
        const buyPrice = parseInt(cols[4] || '0', 10) || 0;
        const stock = parseInt(cols[5] || '0', 10) || 0;
        const minStock = parseInt(cols[6] || '5', 10) || 5;
        const unit = cols[7] || 'عدد';
        const description = cols[8] || '';

        const isValid = name.length > 0 && price >= 0;

        items.push({
          name,
          code,
          category,
          price,
          buyPrice,
          stock,
          minStock,
          unit,
          description,
          isValid,
          error: !isValid ? 'نام یا قیمت معتبر نیست' : undefined,
        });
      }

      setParsedData(items);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Perform Import
  const handleExecuteImport = async () => {
    const validItems = parsedData.filter((item) => item.isValid);
    if (validItems.length === 0) {
      alert('هیچ محصول معتبری برای درون‌ریزی یافت نشد.');
      return;
    }

    setIsProcessing(true);

    let addedCount = 0;
    validItems.forEach((item) => {
      dbStore.addProduct({
        name: item.name,
        code: item.code,
        category: item.category,
        price: item.price,
        buyPrice: item.buyPrice,
        stock: item.stock,
        minStock: item.minStock,
        unit: item.unit,
        description: item.description,
        isActive: true,
      });
      addedCount++;
    });

    setIsProcessing(false);
    setImportResult({ count: addedCount });
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto dir-rtl">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">درون‌ریزی گروهی محصولات (اکسل / CSV)</h3>
              <p className="text-[11px] text-slate-400">افزودن و به‌روزرسانی آسان لیست کالاهای فروشگاه</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {importResult ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-black text-emerald-900">عملیات درون‌ریزی با موفقیت انجام شد!</h4>
              <p className="text-xs text-emerald-800 font-bold">
                تعداد {toPersianDigits(importResult.count)} محصول جدید به انبار اضافه گردید.
              </p>
            </div>
          ) : (
            <>
              {/* Instructions & Template Download */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>راهنمای ساختار فایل:</span>
                  </p>
                  <p className="text-slate-600">
                    فایل باید دارای ستون‌های (نام محصول، کد، دسته‌بندی، قیمت فروش، قیمت خرید، موجودی، حداقل موجودی) باشد.
                  </p>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>دانلود فایل اکسل نمونه</span>
                </button>
              </div>

              {/* Upload Drop Zone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                <Upload className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 transition-colors mb-2" />
                <span className="text-xs font-black text-slate-800">
                  {fileInfo ? fileInfo.name : 'انتخاب یا رهاسازی فایل اکسل / CSV محصولات'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  {fileInfo ? `حجم فایل: ${fileInfo.size}` : 'فرمت‌های پشتیبانی شده: CSV, UTF-8 Text'}
                </span>
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Parsed Preview Table */}
              {parsedData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>پیش‌نمایش داده‌های استخراج شده:</span>
                    <span className="text-emerald-700">
                      {toPersianDigits(parsedData.filter((i) => i.isValid).length)} محصول معتبر از {toPersianDigits(parsedData.length)}
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl text-xs">
                    <table className="w-full text-right border-collapse">
                      <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">نام محصول</th>
                          <th className="p-2.5">کد</th>
                          <th className="p-2.5">دسته‌بندی</th>
                          <th className="p-2.5">قیمت فروش</th>
                          <th className="p-2.5">موجودی</th>
                          <th className="p-2.5 text-center">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedData.map((item, idx) => (
                          <tr key={idx} className={item.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                            <td className="p-2.5 font-bold text-slate-800">{item.name || '---'}</td>
                            <td className="p-2.5 font-mono text-slate-500">{item.code || '-'}</td>
                            <td className="p-2.5 text-slate-600">{item.category}</td>
                            <td className="p-2.5 font-black text-emerald-700">
                              {toPersianDigits(item.price.toLocaleString('fa-IR'))} تومان
                            </td>
                            <td className="p-2.5 font-bold text-slate-800">{toPersianDigits(item.stock)}</td>
                            <td className="p-2.5 text-center">
                              {item.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> آماده
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="w-3 h-3" /> نامعتبر
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!importResult && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              انصراف
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={parsedData.filter((i) => i.isValid).length === 0 || isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>درحال درون‌ریزی...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>
                    ثبت درون‌ریزی ({toPersianDigits(parsedData.filter((i) => i.isValid).length)} محصول)
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
