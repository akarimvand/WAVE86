import React, { useState } from 'react';
import { X, Printer, Receipt, CheckCircle, Clock, CreditCard, User, Calendar, ShieldCheck, Tag } from 'lucide-react';
import { ShopInvoice } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface ShopInvoiceDetailModalProps {
  invoice: ShopInvoice | null;
  onClose: () => void;
  onPayInvoice?: (invoiceId: string) => void;
}

export function ShopInvoiceDetailModal({ invoice, onClose, onPayInvoice }: ShopInvoiceDetailModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Printable CSS targeting ONLY the thermal receipt during window.print() */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .thermal-printable-area, .thermal-printable-area * {
            visibility: visible !important;
          }
          .thermal-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 8px !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: monospace, system-ui, sans-serif !important;
            direction: rtl !important;
          }
          .no-print, .no-print-modal-container button, .no-print-modal-container .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 my-8 no-print-modal-container dir-rtl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 no-print">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">رسید حرارتی فاکتور</h3>
              <p className="text-[11px] font-mono text-slate-500">{invoice.invoiceNumber}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THERMAL RECEIPT VIEW */}
        <div className="space-y-4 py-2">
          <div className="thermal-printable-area bg-white border-2 border-slate-900 p-4 rounded-none text-slate-900 font-mono text-xs space-y-3 mx-auto w-[290px] shadow-sm select-none dir-rtl">
            {/* Receipt Header */}
            <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-slate-900">
              <p className="font-extrabold text-sm tracking-tight">باشگاه ورزشی و سنگ‌نوردی موج</p>
              <p className="text-[10px] font-bold">*** رسید فروشگاهی (سیاه و سفید) ***</p>
              <p className="text-[10px]">شماره فاکتور: <span className="font-bold">{invoice.invoiceNumber}</span></p>
            </div>

            {/* Receipt Meta Info */}
            <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-slate-900 text-slate-800">
              <div className="flex justify-between">
                <span>خریدار:</span>
                <span className="font-bold">{invoice.athleteName}</span>
              </div>
              <div className="flex justify-between">
                <span>تاریخ ثبت:</span>
                <span>{toPersianDigits(invoice.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>صادرکننده:</span>
                <span>{invoice.creatorName || 'مسئول فروشگاه'}</span>
              </div>
              <div className="flex justify-between">
                <span>روش پرداخت:</span>
                <span className="font-bold">
                  {invoice.paymentMethod === 'cash' ? 'نقدی / کارتخوان' : 'نسیه (منظور به حساب)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>وضعیت تسویه:</span>
                <span className="font-bold">
                  {invoice.paymentStatus === 'paid' ? '[ تسویه شده ]' : '[ بدهکار / معوق ]'}
                </span>
              </div>
            </div>

            {/* Receipt Items Table */}
            <div className="space-y-1 pb-2 border-b-2 border-dashed border-slate-900">
              <div className="flex justify-between text-[11px] font-bold border-b border-slate-900 pb-1 gap-1">
                <span className="flex-1 text-right">نام کالا / شرح</span>
                <span className="w-10 text-center shrink-0">تعداد</span>
                <span className="w-24 text-left shrink-0">جمع (تومان)</span>
              </div>
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] py-1 border-b border-slate-200/60 last:border-b-0 items-start gap-1">
                  <span className="flex-1 text-right font-medium whitespace-normal break-words leading-tight pl-1">{item.productName}</span>
                  <span className="w-10 text-center shrink-0 font-bold">{toPersianDigits(item.quantity)}</span>
                  <span className="w-24 text-left shrink-0 font-bold">
                    {toPersianDigits(item.totalPrice.toLocaleString('fa-IR'))}
                  </span>
                </div>
              ))}
            </div>

            {/* Receipt Totals */}
            <div className="space-y-1 pt-1 pb-2 border-b-2 border-dashed border-slate-900">
              <div className="flex justify-between text-xs font-black">
                <span>جمع کل فاکتور:</span>
                <span>{toPersianDigits(invoice.totalAmount.toLocaleString('fa-IR'))} تومان</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>تخفیف / مالیات:</span>
                <span>۰ تومان</span>
              </div>
              <div className="flex justify-between text-xs font-black pt-1">
                <span>مبلغ پرداختی:</span>
                <span>
                  {invoice.paymentStatus === 'paid'
                    ? `${toPersianDigits(invoice.totalAmount.toLocaleString('fa-IR'))} تومان`
                    : '۰ تومان (بدهکار)'}
                </span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="text-center text-[10px] space-y-1 pt-1">
              <p className="font-bold">با تشکر از اعتماد و خرید شما</p>
              <p className="text-[9px] text-slate-600">باشگاه ورزشی و سنگ‌نوردی موج</p>
            </div>
          </div>
        </div>

        {/* Action Footer Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 no-print">
          {invoice.paymentStatus === 'unpaid' && onPayInvoice ? (
            <button
              onClick={() => {
                onPayInvoice(invoice.id);
                onClose();
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-md shadow-emerald-600/20"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>تسویه بدهی</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-slate-900/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ رسید</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
