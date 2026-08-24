import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Package,
  AlertTriangle,
  Receipt,
  CheckCircle,
  Clock,
  UserCheck,
  CreditCard,
  DollarSign,
  Calendar,
  X,
  Edit2,
  Trash2,
  ShieldAlert,
  ArrowLeft,
  Printer,
  Check,
  Info,
  Layers,
  ChevronRight,
  User,
  ShoppingCart,
  Eye,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { dbStore } from '../services/db';
import { Product, ShopInvoice, User as UserType } from '../types';
import { getCurrentJalaliDate, formatJalaliDate } from '../utils/jalaliDate';
import { toPersianDigits } from '../utils/nationalIdValidator';
import { ShopInvoiceDetailModal } from './ShopInvoiceDetailModal';
import { JalaliDatePicker } from './JalaliDatePicker';
import { ProductDetailModal } from './ProductDetailModal';
import { uploadFileToServer } from '../utils/fileUploader';
import { ProductImporterModal } from './ProductImporterModal';

interface ShopExpensesViewProps {
  currentUser: UserType | null;
}

export function ShopExpensesView({ currentUser }: ShopExpensesViewProps) {
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'invoices'>('pos');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Digikala style product detail modal state & importer modal state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [productSortBy, setProductSortBy] = useState<'newest' | 'price_desc' | 'price_asc' | 'stock_asc'>('newest');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [isUploadingProdImg, setIsUploadingProdImg] = useState(false);

  // Form product state
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodCategory, setProdCategory] = useState('لوازم جانبی');
  const [prodPrice, setProdPrice] = useState('');
  const [prodBuyPrice, setProdBuyPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodMinStock, setProdMinStock] = useState('5');
  const [prodImage, setProdImage] = useState('');
  const [prodDesc, setProdDesc] = useState('');

  // POS Invoice State
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [athleteSearch, setAthleteSearch] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => formatJalaliDate(getCurrentJalaliDate()));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [posSuccessInvoice, setPosSuccessInvoice] = useState<ShopInvoice | null>(null);
  const [posError, setPosError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Invoices List State
  const [invoices, setInvoices] = useState<ShopInvoice[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [viewingInvoice, setViewingInvoice] = useState<ShopInvoice | null>(null);

  const reloadData = () => {
    setProducts(dbStore.getProducts());
    setInvoices(dbStore.getShopInvoices());
    setUsersList(dbStore.getUsers().filter((u) => {
      const roles = u?.roles || [];
      return roles.includes('athlete') || roles.includes('coach');
    }));
  };

  useEffect(() => {
    reloadData();
    const handleUpdate = () => reloadData();
    window.addEventListener('dbStoreUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('dbStoreUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Categories list
  const categories = Array.from(new Set(products.map((p) => p.category || 'متفرقه')));

  // Selected Athlete details
  const selectedAthlete = usersList.find((u) => u.id === selectedAthleteId);
  const isLinkedParent = selectedAthlete ? dbStore.getParentAthleteLinks().some((l) => l.athleteId === selectedAthlete.id) : false;

  // Cart helper actions
  const addToCart = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === prodId);
      if (existing) {
        if (existing.quantity >= prod.stock) return prev;
        return prev.map((item) => (item.productId === prodId ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { productId: prodId, quantity: 1 }];
    });
  };

  const removeFromCart = (prodId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== prodId));
  };

  const updateCartQty = (prodId: string, delta: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === prodId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > prod.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as { productId: string; quantity: number }[];
    });
  };

  const cartTotalAmount = cart.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);

  // Toggle Athlete Credit permission
  const handleToggleCreditPermission = (athleteId: string, currentVal: boolean) => {
    dbStore.setUserCreditPermission(athleteId, !currentVal);
    reloadData();
  };

  // Open Preview Modal
  const handleOpenPreviewModal = () => {
    setPosError('');
    if (!selectedAthleteId) {
      setPosError('لطفاً ورزشکار خریدار را انتخاب نمایید.');
      return;
    }
    if (cart.length === 0) {
      setPosError('سبد خرید خالی است. حداقل یک محصول انتخاب کنید.');
      return;
    }
    setIsPreviewOpen(true);
  };

  // Confirm and Execute Invoice Creation
  const handleConfirmAndCreateInvoice = () => {
    setPosError('');

    if (!selectedAthleteId || cart.length === 0) {
      setIsPreviewOpen(false);
      return;
    }

    const res = dbStore.createShopInvoice({
      athleteId: selectedAthleteId,
      creatorId: currentUser?.id || 'admin',
      creatorName: currentUser?.fullName || 'مسئول فروشگاه',
      date: invoiceDate,
      items: cart,
      paymentMethod,
      notes: invoiceNotes,
    });

    if (!res.success) {
      setPosError(res.error || 'خطا در ثبت فاکتور');
      setIsPreviewOpen(false);
    } else if (res.invoice) {
      setIsPreviewOpen(false);
      setPosSuccessInvoice(res.invoice);
      setCart([]);
      setInvoiceNotes('');
      reloadData();
    }
  };

  // Pay Invoice
  const handlePayInvoice = (invId: string) => {
    if (confirm('آیا از تسویه و دریافت وجه این فاکتور اطمینان دارید؟')) {
      dbStore.payShopInvoice(invId, 'تسویه توسط مسئول فروشگاه');
      reloadData();
      if (viewingInvoice && viewingInvoice.id === invId) {
        setViewingInvoice({ ...viewingInvoice, paymentStatus: 'paid' });
      }
    }
  };

  // Product Form Handlers
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCode('');
    setProdCategory('لوازم جانبی');
    setProdPrice('');
    setProdBuyPrice('');
    setProdStock('');
    setProdMinStock('5');
    setProdImage('');
    setProdDesc('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdCode(p.code || '');
    setProdCategory(p.category);
    setProdPrice((p.price ?? 0).toString());
    setProdBuyPrice(p.buyPrice ? p.buyPrice.toString() : '');
    setProdStock((p.stock ?? 0).toString());
    setProdMinStock((p.minStock ?? 0).toString());
    setProdImage(p.imageUrl || '');
    setProdDesc(p.description || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodStock) {
      alert('لطفاً نام، قیمت و موجودی محصول را وارد نمایید.');
      return;
    }

    if (editingProduct) {
      dbStore.updateProduct(editingProduct.id, {
        name: prodName,
        code: prodCode,
        category: prodCategory,
        price: Number(prodPrice),
        buyPrice: prodBuyPrice ? Number(prodBuyPrice) : undefined,
        stock: Number(prodStock),
        minStock: Number(prodMinStock) || 0,
        imageUrl: prodImage,
        description: prodDesc,
      });
    } else {
      dbStore.addProduct({
        name: prodName,
        code: prodCode,
        category: prodCategory,
        price: Number(prodPrice),
        buyPrice: prodBuyPrice ? Number(prodBuyPrice) : undefined,
        stock: Number(prodStock),
        minStock: Number(prodMinStock) || 0,
        imageUrl: prodImage,
        description: prodDesc,
        isActive: true,
      });
    }

    setIsProductModalOpen(false);
    reloadData();
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('آیا از حذف این محصول اطمینان دارید؟')) {
      dbStore.deleteProduct(id);
      reloadData();
    }
  };

  const handleFormImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک تصویر معتبر انتخاب کنید.');
      return;
    }

    setIsUploadingProdImg(true);
    try {
      const res = await uploadFileToServer(file, {
        prefix: 'prod',
        customName: `prod_${Date.now()}`,
        subDir: 'general',
      });
      if (res.success && res.url) {
        setProdImage(res.url);
      } else {
        alert(res.error || 'خطا در بارگذاری تصویر کالا روی سرور');
      }
    } catch {
      alert('خطا در ارتباط با سرور جهت بارگذاری تصویر');
    } finally {
      setIsUploadingProdImg(false);
    }
  };

  const handleExportProductsCSV = () => {
    if (products.length === 0) {
      alert('لیست محصولات خالی است.');
      return;
    }
    const csvHeader = 'نام محصول,کد محصول,دسته‌بندی,قیمت فروش (تومان),قیمت خرید (تومان),موجودی,حداقل موجودی,واحد,توضیحات\n';
    const csvRows = products.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.code || ''}"`,
      `"${p.category || 'عمومی'}"`,
      p.price || 0,
      p.buyPrice || 0,
      p.stock || 0,
      p.minStock || 0,
      `"${p.unit || 'عدد'}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
    ].join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `لیست_انبار_محصولات_${formatJalaliDate(getCurrentJalaliDate()).replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering & Sorting Products
  const filteredProducts = products
    .filter((p) => {
      const productName = p?.name || '';
      const productCode = p?.code || '';
      const matchesSearch = productName.toLowerCase().includes(productSearch.toLowerCase()) || productCode.includes(productSearch);
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesLowStock = !filterLowStockOnly || p.stock <= p.minStock;
      return matchesSearch && matchesCat && matchesLowStock;
    })
    .sort((a, b) => {
      if (productSortBy === 'price_desc') return b.price - a.price;
      if (productSortBy === 'price_asc') return a.price - b.price;
      if (productSortBy === 'stock_asc') return a.stock - b.stock;
      return 0; // Default order
    });

  // Low Stock Count
  const lowStockProductsCount = products.filter((p) => p.stock <= p.minStock).length;

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const invNum = inv?.invoiceNumber || '';
    const athName = inv?.athleteName || '';
    const matchesSearch =
      invNum.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      athName.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesStatus =
      invoiceFilterStatus === 'all' ||
      (invoiceFilterStatus === 'paid' && inv.paymentStatus === 'paid') ||
      (invoiceFilterStatus === 'unpaid' && inv.paymentStatus === 'unpaid');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">فروشگاه و بوفه باشگاه سنگنوردی</h1>
            <p className="text-sm text-slate-500 mt-1">
              مدیریت انبار، صدور فاکتورهای فروش نقدی و اعتباری (نسیه) و تسویه بدهی حساب اعضا
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pos'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            صدور فاکتور (POS)
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'products'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Package className="w-4 h-4" />
            مدیریت محصولات
            {lowStockProductsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse absolute -top-0.5 -right-0.5"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'invoices'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            سوابق فاکتورها
          </button>
        </div>
      </div>

      {/* TAB 1: POS - INVOICE CREATION */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Product Selector */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجوی کالا یا بارکد..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Categories Pill Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    همه دسته‌ها
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const inCartItem = cart.find((c) => c.productId === p.id);
                  const isOutOfStock = p.stock <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isOutOfStock
                          ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : inCartItem
                          ? 'border-teal-500 bg-teal-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
                      }`}
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 mb-2">
                          <Package className="w-8 h-8" />
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">
                          {p.category}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-900 mt-1 line-clamp-2">{p.name}</h4>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900">
                            {(p.price ?? 0).toLocaleString('fa-IR')}
                          </span>
                          <span className="text-[10px] text-slate-500 mr-1">تومان</span>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            p.stock <= p.minStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.stock > 0 ? `${p.stock} عدد` : 'اتمام'}
                        </span>
                      </div>

                      {inCartItem && (
                        <div className="absolute top-2 left-2 bg-teal-600 text-white w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow">
                          {inCartItem.quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Invoice Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-600" />
                مشخصات فاکتور و خریدار
              </h3>

              {posError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{posError}</span>
                </div>
              )}

              {/* Select Athlete */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">انتخاب خریدار (ورزشکار)</label>
                <div className="relative">
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- خریدار را انتخاب نمایید --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.nationalId || u.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Credit Permission Info for Selected Athlete */}
                {selectedAthlete && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">وضعیت خرید نسیه / اعتباری:</span>
                      <div className="flex items-center gap-2">
                        {selectedAthlete.allowCreditPurchase ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                            <Check className="w-3 h-3" /> مجاز
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                            <X className="w-3 h-3" /> غیرمجاز
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCreditPermission(
                              selectedAthlete.id,
                              !!selectedAthlete.allowCreditPurchase
                            )
                          }
                          className="text-teal-600 hover:text-teal-800 underline text-[11px]"
                        >
                          تغییر مجوز
                        </button>
                      </div>
                    </div>

                    {isLinkedParent && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        این ورزشکار زیر ۱۸ سال بوده و به حساب والد متصل است. مجوز خرید نسیه توسط والد کنترل می‌شود.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <JalaliDatePicker
                    label="تاریخ فاکتور"
                    value={invoiceDate}
                    onChange={(val) => setInvoiceDate(val)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">روش پرداخت</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'credit')}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  >
                    <option value="cash">پرداخت نقدی / پوز (فوری)</option>
                    <option value="credit">پرداخت نسیه (منظور به حساب)</option>
                  </select>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="border-t border-slate-200 pt-3">
                <h4 className="text-xs font-bold text-slate-700 mb-2">اقلام سبد خرید ({cart.length})</h4>
                {cart.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                    محصولی انتخاب نشده است. از لیست سمت راست کلیک کنید.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cart.map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      if (!prod) return null;
                      return (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="flex-1 pr-1">
                            <p className="font-bold text-slate-800">{prod.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {prod.price.toLocaleString('fa-IR')} تومان × {item.quantity} ={' '}
                              <span className="font-bold text-slate-900">
                                {(prod.price * item.quantity).toLocaleString('fa-IR')} تومان
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.productId, -1)}
                              className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.productId, 1)}
                              className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.productId)}
                              className="text-rose-500 hover:text-rose-700 mr-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900">مبلغ قابل پرداخت فاکتور:</span>
                <span className="text-base font-extrabold text-teal-800">
                  {cartTotalAmount.toLocaleString('fa-IR')} <span className="text-xs font-normal">تومان</span>
                </span>
              </div>

              {/* Notes */}
              <div>
                <input
                  type="text"
                  placeholder="توضیحات یا یادداشت فاکتور (اختیاری)..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Submit / Preview Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenPreviewModal}
                  disabled={cart.length === 0 || !selectedAthleteId}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>پیش‌نمایش و ثبت فاکتور</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS & INVENTORY MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-5">
          {/* Top Bar Actions & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام یا کد محصول..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsImporterOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>درون‌ریزی به فروشگاه (اکسل/CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportProductsCSV}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>خروجی اکسل</span>
                </button>

                {products.length === 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await dbStore.seedDemoProducts();
                      reloadData();
                    }}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Package className="w-4 h-4" />
                    محصولات نمونه
                  </button>
                )}

                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>محصول جدید</span>
                </button>
              </div>
            </div>

            {/* Filter Pills & Sort Selector */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه ({toPersianDigits(products.length)})
                </button>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        selectedCategory === cat
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat} ({toPersianDigits(count)})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-colors flex items-center gap-1 ${
                    filterLowStockOnly
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>فقط رو به اتمام ({toPersianDigits(lowStockProductsCount)})</span>
                </button>

                <select
                  value={productSortBy}
                  onChange={(e: any) => setProductSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-lg px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="newest">مرتب‌سازی: جدیدترین</option>
                  <option value="price_desc">گران‌ترین</option>
                  <option value="price_asc">ارزان‌ترین</option>
                  <option value="stock_asc">کمترین موجودی</option>
                </select>
              </div>
            </div>
          </div>

          {/* Low Stock Warning Box */}
          {lowStockProductsCount > 0 && !filterLowStockOnly && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>هشدار انبار: {toPersianDigits(lowStockProductsCount)} محصول به حداقل سطح موجودی خود رسیده‌اند.</span>
              </div>
              <button
                onClick={() => setFilterLowStockOnly(true)}
                className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950"
              >
                مشاهده لیست
              </button>
            </div>
          )}

          {/* Products Digikala-Style Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((p) => {
              const isLowStock = p.stock <= p.minStock;
              const isOutOfStock = p.stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedDetailProduct(p)}
                  className="group bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-xl hover:border-teal-500/50 transition-all cursor-pointer relative flex flex-col justify-between overflow-hidden"
                >
                  {/* Top Badge Overlay */}
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="bg-slate-100 group-hover:bg-teal-50 text-slate-600 group-hover:text-teal-700 px-2 py-0.5 rounded-md font-bold transition-colors">
                      {p.category}
                    </span>
                    {p.code && <span className="text-slate-400 font-mono">کد: {p.code}</span>}
                  </div>

                  <div className="flex gap-3.5 items-start">
                    {/* Image Preview Box */}
                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}

                      {isOutOfStock ? (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[9px] font-extrabold">
                          ناموجود
                        </div>
                      ) : null}
                    </div>

                    {/* Info */}
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{p.description || 'بدون توضیح'}</p>
                    </div>
                  </div>

                  {/* Digikala Style Bottom Price & Stock Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">قیمت مصرف‌کننده:</span>
                      <p className="text-sm font-black text-slate-900">
                        {toPersianDigits((p.price ?? 0).toLocaleString('fa-IR'))}{' '}
                        <span className="text-[10px] font-normal text-slate-500">تومان</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-800'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {toPersianDigits(p.stock)} {p.unit || 'عدد'}
                      </span>

                      <span className="text-[11px] text-teal-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <Package className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold">هیچ محصولی با معیارهای جستجو یافت نشد.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVOICES HISTORY & SETTLEMENT */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی شماره فاکتور یا خریدار..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInvoiceFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  invoiceFilterStatus === 'all'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه فاکتورها
              </button>
              <button
                onClick={() => setInvoiceFilterStatus('unpaid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  invoiceFilterStatus === 'unpaid'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                نسیه / تسویه نشده
              </button>
              <button
                onClick={() => setInvoiceFilterStatus('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  invoiceFilterStatus === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                تسویه شده
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="p-3">شماره فاکتور</th>
                    <th className="p-3">خریدار</th>
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">روش پرداخت</th>
                    <th className="p-3">مبلغ کل</th>
                    <th className="p-3">وضعیت</th>
                    <th className="p-3">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900 font-mono">{inv.invoiceNumber}</td>
                      <td className="p-3 font-medium text-slate-800">{inv.athleteName}</td>
                      <td className="p-3 text-slate-600">{inv.date}</td>
                      <td className="p-3">
                        {inv.paymentMethod === 'cash' ? (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            نقدی / پوز
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                            نسیه (اعتباری)
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {inv.totalAmount.toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="p-3">
                        {inv.paymentStatus === 'paid' ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> تسویه شده
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> بدهکار / معوق
                          </span>
                        )}
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-[11px]"
                        >
                          مشاهده فاکتور
                        </button>
                        {inv.paymentStatus === 'unpaid' && (
                          <button
                            onClick={() => handlePayInvoice(inv.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                          >
                            تسویه بدهی
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'ویرایش محصول' : 'تعریف محصول جدید'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نام محصول *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">کد / بارکد محصول</label>
                  <input
                    type="text"
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">دسته‌بندی</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="انتخاب یا تایپ دسته‌بندی..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <datalist id="category-suggestions">
                    <option value="نوشیدنی و مکمل" />
                    <option value="تجهیزات و لوازم جانبی" />
                    <option value="خدمات و کرایه" />
                    <option value="پوشاک ورزشی" />
                    <option value="تنقلات و خوراکی" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">قیمت فروش (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">قیمت خرید (تومان)</label>
                  <input
                    type="number"
                    value={prodBuyPrice}
                    onChange={(e) => setProdBuyPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">موجودی اولیه *</label>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">حداقل جهت هشدار</label>
                  <input
                    type="number"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تصویر محصول (آپلود فایل یا آدرس تصویر)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    placeholder="آدرس اینترنتی یا مسیر فایل..."
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 dir-ltr"
                  />
                  <label className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1 shrink-0 border border-teal-200">
                    <Upload className="w-4 h-4 text-teal-600" />
                    <span>{isUploadingProdImg ? 'در حال آپلود...' : 'انتخاب تصویر'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFormImageUpload}
                      disabled={isUploadingProdImg}
                    />
                  </label>
                </div>
                {prodImage && (
                  <div className="mt-2 relative w-16 h-16 border rounded-xl overflow-hidden bg-slate-50">
                    <img src={prodImage} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setProdImage('')}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">توضیحات محصول</label>
                <textarea
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20"
                >
                  ذخیره اطلاعات محصول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Invoice Details / Thermal Print View */}
      {(viewingInvoice || posSuccessInvoice) && (
        <ShopInvoiceDetailModal
          invoice={viewingInvoice || posSuccessInvoice}
          onClose={() => {
            setViewingInvoice(null);
            setPosSuccessInvoice(null);
          }}
          onPayInvoice={handlePayInvoice}
        />
      )}

      {/* MODAL: Preview Invoice Before Confirming */}
      {isPreviewOpen && selectedAthlete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">پیش‌نمایش فاکتور فروشگاه</h3>
                  <p className="text-[11px] text-slate-500">بررسی کامل فاکتور پیش از ثبت نهایی</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Purchaser & Payment Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">خریدار:</span>
                <span className="font-bold text-slate-900">{selectedAthlete.fullName} ({toPersianDigits(selectedAthlete.nationalId)})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">تاریخ صدور:</span>
                <span className="font-bold font-mono text-slate-900">{toPersianDigits(invoiceDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">روش پرداخت:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-md ${paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {paymentMethod === 'cash' ? 'پرداخت نقدی / کارتخوان (تسویه فوری)' : 'نسیه (منظور به حساب)'}
                </span>
              </div>
              {invoiceNotes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">یادداشت فاکتور:</span>
                  <p className="font-medium text-slate-800">{invoiceNotes}</p>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">اقلام و محصولات فاکتور ({cart.length} مورد):</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 grid grid-cols-12 font-bold text-slate-700">
                  <span className="col-span-6">شرح کالا</span>
                  <span className="col-span-2 text-center">تعداد</span>
                  <span className="col-span-4 text-left">مبلغ کل</span>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {cart.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    if (!prod) return null;
                    return (
                      <div key={item.productId} className="p-2.5 grid grid-cols-12 text-slate-800 items-center">
                        <span className="col-span-6 font-medium whitespace-normal break-words pr-1">{prod.name}</span>
                        <span className="col-span-2 text-center font-bold">{toPersianDigits(item.quantity)}</span>
                        <span className="col-span-4 text-left font-bold text-slate-900">
                          {toPersianDigits((prod.price * item.quantity).toLocaleString('fa-IR'))} تومان
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Accounting Effect Banner */}
            <div className="space-y-2">
              <div className="p-3.5 bg-teal-50 rounded-2xl border border-teal-200 flex justify-between items-center text-xs font-bold text-teal-950">
                <span>مبلغ کل قابل پرداخت:</span>
                <span className="text-base font-black text-teal-900">
                  {toPersianDigits(cartTotalAmount.toLocaleString('fa-IR'))} تومان
                </span>
              </div>

              {paymentMethod === 'cash' ? (
                <p className="text-[11px] text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  🟢 <strong>نحوه اثر بر حساب‌های مالی:</strong> با تأیید فاکتور، این سند به صورت تسویه‌شده صادر گشته و یک تراکنش دریافتی موفق در دفتر حسابداری ثبت خواهد شد.
                </p>
              ) : (
                <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  🔴 <strong>نحوه اثر بر حساب‌های مالی:</strong> با تأیید فاکتور، این مبلغ به صورت بدهی و نسیه در بدهکاران ورزشکار منظور می‌گردد. هیچ رکورد پرداختی ثبت یا در انتظار نخواهد ماند تا زمان تسویه دستی.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                انصراف و اصلاح
              </button>
              <button
                type="button"
                onClick={handleConfirmAndCreateInvoice}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>تأیید و ثبت نهایی فاکتور</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGIKALA STYLE PRODUCT DETAIL MODAL */}
      {selectedDetailProduct && (
        <ProductDetailModal
          product={selectedDetailProduct}
          onClose={() => setSelectedDetailProduct(null)}
          onEdit={(p) => {
            setSelectedDetailProduct(null);
            handleOpenEditProduct(p);
          }}
          onDelete={(id) => {
            handleDeleteProduct(id);
            setSelectedDetailProduct(null);
          }}
          onUpdateStock={() => {
            reloadData();
            const updated = dbStore.getProducts().find((p) => p.id === selectedDetailProduct.id);
            setSelectedDetailProduct(updated || null);
          }}
          onImageUploaded={() => {
            reloadData();
            const updated = dbStore.getProducts().find((p) => p.id === selectedDetailProduct.id);
            setSelectedDetailProduct(updated || null);
          }}
        />
      )}

      {/* PRODUCT IMPORTER MODAL */}
      {isImporterOpen && (
        <ProductImporterModal
          onClose={() => setIsImporterOpen(false)}
          onSuccess={() => {
            reloadData();
          }}
        />
      )}
    </div>
  );
}
