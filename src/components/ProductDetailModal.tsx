import React, { useState } from 'react';
import {
  X,
  Package,
  Edit2,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  TrendingUp,
  Tag,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Info,
  DollarSign,
  Layers,
  Box,
} from 'lucide-react';
import { Product, ShopInvoice } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { dbStore } from '../services/db';
import { uploadFileToServer } from '../utils/fileUploader';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onUpdateStock?: (productId: string, newStock: number) => void;
  onImageUploaded?: () => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onEdit,
  onDelete,
  onAddToCart,
  onUpdateStock,
  onImageUploaded,
}: ProductDetailModalProps) {
  const [stockDelta, setStockDelta] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!product) return null;

  // Calculate stats for this product across all shop invoices
  const allInvoices = dbStore.getShopInvoices();
  let totalUnitsSold = 0;
  let totalRevenue = 0;

  allInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.productId === product.id) {
        totalUnitsSold += item.quantity;
        totalRevenue += item.totalPrice;
      }
    });
  });

  const profitPerItem = product.price - (product.buyPrice || 0);
  const profitMargin = product.price > 0 ? Math.round((profitPerItem / product.price) * 100) : 0;

  const currentStock = (product.stock ?? 0) + stockDelta;
  const isLowStock = currentStock <= (product.minStock ?? 5);
  const isOutOfStock = currentStock <= 0;

  const handleStockChange = (delta: number) => {
    const updated = Math.max(0, (product.stock ?? 0) + delta);
    dbStore.updateProduct(product.id, { stock: updated });
    if (onUpdateStock) onUpdateStock(product.id, updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری (JPG, PNG) انتخاب نمایید.');
      return;
    }

    setIsUploading(true);
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);

    try {
      const res = await uploadFileToServer(file, {
        prefix: 'prod',
        customName: `prod_${product.id}_${Date.now()}`,
        subDir: 'products',
      });

      if (res.success && res.url) {
        dbStore.updateProduct(product.id, { imageUrl: res.url });
        if (onImageUploaded) onImageUploaded();
      } else {
        alert(res.error || 'خطا در آپلود تصویر کالا روی سرور');
      }
    } catch (err: any) {
      console.warn('Image upload error:', err);
      alert('خطا در ارتباط با سرور جهت ذخیره تصویر');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto dir-rtl">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Header bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
              {product.category || 'عمومی'}
            </span>
            <span className="text-slate-400 text-xs font-mono">کد: {product.code || 'PRD-' + product.id.slice(-4)}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Digikala Style Grid */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            {/* Right: Product Image Box */}
            <div className="sm:col-span-5 flex flex-col items-center">
              <div className="relative w-full aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner group flex items-center justify-center">
                {imagePreview || product.imageUrl ? (
                  <img
                    src={imagePreview || product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 space-y-2 p-4 text-center">
                    <Box className="w-14 h-14 stroke-1 text-slate-300" />
                    <span className="text-xs">تصویر محصول ثبت نشده است</span>
                  </div>
                )}

                {/* Status Badges on Image */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {isOutOfStock ? (
                    <span className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg shadow-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> ناموجود
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> رو به اتمام
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> موجود در انبار
                    </span>
                  )}
                </div>

                {/* Upload Image Overlay */}
                <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer p-2 text-center gap-1">
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-bold">
                    {isUploading ? 'درحال آپلود...' : 'تغییر / آپلود تصویر فایل'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {/* Upload image button below */}
              <label className="mt-3 w-full py-2 px-3 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>{isUploading ? 'درحال ذخیره‌سازی...' : 'آپلود تصویر فایل محصول'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* Left: Product Specifications */}
            <div className="sm:col-span-7 space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-snug">{product.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{product.description || 'بدون توضیح اضافی'}</p>
              </div>

              {/* Price & Financial Box */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">قیمت فروش:</span>
                  <span className="text-base font-black text-emerald-700">
                    {toPersianDigits(product.price.toLocaleString('fa-IR'))} تومان
                  </span>
                </div>

                {product.buyPrice ? (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>قیمت خرید (انبار):</span>
                    <span className="font-bold">{toPersianDigits(product.buyPrice.toLocaleString('fa-IR'))} تومان</span>
                  </div>
                ) : null}

                {profitPerItem > 0 && (
                  <div className="flex items-center justify-between text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200 font-bold">
                    <span>سود ناخالص هر عدد:</span>
                    <span>
                      {toPersianDigits(profitPerItem.toLocaleString('fa-IR'))} تومان ({toPersianDigits(profitMargin)}٪)
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Management Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" /> موجودی فعلی انبار:
                  </span>
                  <span className={`text-base font-black ${isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {toPersianDigits(product.stock)} {product.unit || 'عدد'}
                  </span>
                </div>

                {/* Quick Stock Controls */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">تغییر سریع موجودی:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStockChange(-1)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-colors"
                      title="کاهش ۱ عدد"
                    >
                      -۱
                    </button>
                    <button
                      onClick={() => handleStockChange(1)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg font-bold transition-colors"
                      title="افزایش ۱ عدد"
                    >
                      +۱
                    </button>
                    <button
                      onClick={() => handleStockChange(5)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg font-bold transition-colors"
                      title="افزایش ۵ عدد"
                    >
                      +۵
                    </button>
                    <button
                      onClick={() => handleStockChange(10)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg font-bold transition-colors"
                      title="افزایش ۱۰ عدد"
                    >
                      +۱۰
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Analytics / Sales History */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">کل تعداد فروخته‌شده:</span>
                  <span className="font-black text-slate-800 text-sm">{toPersianDigits(totalUnitsSold)} عدد</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">مجموع درآمد فروش:</span>
                  <span className="font-black text-slate-800 text-sm">
                    {toPersianDigits(totalRevenue.toLocaleString('fa-IR'))} تومان
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onAddToCart && !isOutOfStock && (
              <button
                onClick={() => {
                  onAddToCart(product.id);
                  onClose();
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>افزودن به سبد خرید POS</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>ویرایش محصول</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`آیا از حذف محصول "${product.name}" اطمینان دارید؟`)) {
                  onDelete(product.id);
                  onClose();
                }
              }}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
