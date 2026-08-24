# 💰 ماژول مالی، حسابداری و فروشگاه (Finance & Shop Module)

## ۱. ساختار حسابداری و ثبت تراکنش‌ها (`transactions`)

سامانه دارای سیستم دوبل حسابداری سبک ورزشی است که تمامی گردش‌های نقدی و غیرنقدی را ثبت می‌کند:

```mermaid
flowchart TD
    subgraph Inflow["جریان‌های درآمدی (Inflows)"]
        T1["شهریه ثبت‌نام دوره‌ها (tuition)"]
        T2["فروش بوفه و تجهیزات سنگ‌نوردی (shop)"]
        T3["هزینه صدور/تمدید بیمه ورزشی (insurance)"]
        T4["کرایه لوازم (کفش، هارنس، کلاه)"]
        T5["سایر درآمدهای متفرقه (income)"]
    end

    subgraph Outflow["جریان‌های هزینه‌ای (Outflows)"]
        E1["حق‌الزحمه و درصد مربیان"]
        E2["خرید اقلام بوفه و شارژ انبار"]
        E3["تعمیرات دیواره، گیره و تشک‌ها"]
        E4["قبوض و هزینه‌های جاری باشگاه (expense)"]
    end

    subgraph Ledger["دفتر کل و اسناد مالی (transactions)"]
        Doc["ثبت سند با فیلدهای:\namount, type, method, trackingNumber, receiptUrl, createdBy"]
    end

    Inflow --> Doc
    Outflow --> Doc
    Doc --> Reports["گزارش سود و زیان، تراز بدهکاران و بستانکاران"]
```

### روش‌های پرداخت (`method`):
- `cash`: وجه نقد
- `pos`: دستگاه کارتخوان پذیرش
- `card_to_card`: کارت‌به‌کارت بانکی (همراه با پیوست تصویر فیش `receiptUrl` و شماره پیگیری `trackingNumber`)
- `wallet`: کیف پول دیجیتال اعضا

---

## ۲. سیستم مدیریت فروشگاه و بوفه (`products` & `shop_invoices`)

### ۲.۱. ساختار کالاها و انبارداری (`products`)
- **قیمت‌گذاری دوگانه:** ثبت قیمت خرید (`buyPrice`) و قیمت فروش (`price`) جهت محاسبه دقیق سود خالص هر فاکتور.
- **کنترل موجودی و نقطه سفارش:** فیلد `stock` موجودی لحظه‌ای را نگه‌داری می‌کند و با رسیدن به `minStockAlert`، آیکون هشدار کسری کالا در پنل مدیریت روشن می‌شود.

### ۲.۲. فرآیند صدور فاکتور رسمی بوفه (`shop_invoices`)
```mermaid
sequenceDiagram
    autonumber
    actor Staff as منشی / اپراتور بوفه
    participant POS as صندوق فروشگاهی (ShopExpensesView)
    participant DB as پایگاه داده MySQL

    Staff->>POS: انتخاب خریدار (کاربر عضو یا مهمان)
    Staff->>POS: افزودن اقلام با بارکدخوان یا انتخاب کالا
    POS->>POS: محاسبه جمع کل، تخفیف عضویت و مبلغ نهایی (finalAmount)
    Staff->>POS: انتخاب روش پرداخت (کارتخوان / نقد / کسر از مانده حساب)
    POS->>DB: ثبت فاکتور در shop_invoices + اقلام در shop_invoice_items
    POS->>DB: کسر خودکار تعداد خریداری‌شده از ستون stock در جدول products
    POS->>DB: ایجاد خودکار تراکنش مالی متناظر در جدول transactions (type: 'shop')
    POS-->>Staff: صدور پیش‌نمایش چاپی فاکتور رسمی و ذخیره PDF
```
