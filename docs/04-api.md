# ۰۴ — مرجع REST API

پیشوند همه مسیرها: `/api` — پاسخ استاندارد: `{success, dbConnected?, error?|data?}`
احراز هویت: هدر `Authorization: Bearer <JWT>` — انقضای توکن: ۳۰ روز.

## auth (`/api/auth`)
| Method & Path | دسترسی | توضیح |
|---|---|---|
| POST /login | عمومی (50 req/15m) | ورود با username **یا nationalId**؛ auto-upgrade رمز legacy به bcrypt |
| GET /me | JWT | پروفایل کاربر جاری (بدون password) |
| POST /change-password | JWT | oldPassword/newPassword + ریست mustChangePassword |

## users (`/api/users`)
| Method & Path | دسترسی | توضیح |
|---|---|---|
| GET / | staff | لیست + pagination/search/filter |
| GET /:id | JWT (خود یا staff) | پروفایل فردی |
| POST / | admin | ایجاد کاربر (nationalId الزامی) |
| PUT/PATCH /:id | JWT (خود یا staff) | Optimistic Locking با version ⇒ **409** در تداخل |
| DELETE /:id | admin | حذف + Audit Trail |
| POST /hash-all-passwords | super_admin | هش دسته‌جمعی رمزهای plaintext |
| POST /pre-register | **عمومی** | پیش‌ثبت‌نام ۴ مرحله‌ای |

## mysql-sync (`/api/mysql`)
| Method & Path | دسترسی | توضیح |
|---|---|---|
| POST /sync | ⚠️ **فقط JWT (هر نقشی!)** | Upsert کل State در یک تراکنش — یافته بحرانی C1 ممیزی |
| POST /sync-detailed | super_admin/admin | sync جدول‌به‌جدول + لاگ تشخیصی |
| GET /full-data | optionalJwt | کل DB + PII-Filter سه‌سطحی (بخش ۰۳) |

## finance (`/api/finance`) — financeGuard
POST /transactions (Idempotency-Key + duplicate:true) · DELETE /transactions/:id (**soft-void**) ·
GET transactions|invoices|debtors|creditors · DELETE debtors/:id · creditors/:id · POST /invoices (فاکتور+کسر موجودی اتمیک)

## courses (`/api/courses`) — JWT/RBAC متغیر
GET/POST/DELETE sessions · POST enrollments (ظرفیت اتمیک FOR UPDATE) · DELETE enrollments/:id (soft cancel) · POST attendance/batch (upsert اتمیک) · DELETE attendance/:id

## club (`/api/club`) · messaging (`/api/sms`,`/api/bale`) — staffGuard
announcements/settings/notifications/tickets/insurance/attendance CRUD · sms credit/lines/send-bulk/send-verify → پروکسی SMS.ir با کلید از settings/env

## upload (`/api/upload`)
| Path | دسترسی |
|---|---|
| POST / و /file (multipart) | ⚠️ optionalJwt |
| POST /multiple | optionalJwt |
| POST /base64 · /general · /profile-image | JWT |
| POST /product-image · /bulk-profile-images | adminGuard |

## backup (`/api/backup`) — adminGuard
POST save · save-to-host · GET list · list-host · download/:filename · download-host/:filename · POST restore · restore-host · DELETE delete/:filename · delete-host/:filename

## install (`/api/install`)
| Path | دسترسی | توضیح |
|---|---|---|
| GET /status | عمومی | وضعیت نصب + افشای host/port/database/user |
| POST /test-db · /save-config | عمومی تا قبل از نصب، سپس super_admin | ⚠️ پنجره ربودن نصب روی deployment تازه |

## سایر
- `GET /api/health` — همیشه `status:'ok'` حتی وقتی MySQL قطع است (mysql: connected/disconnected)
- `app.all('/api/*')` نامشخص ⇒ 404 JSON فارسی
