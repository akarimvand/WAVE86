-- ============================================================
-- اسکریپت داده‌های نمونه برای «باشگاه سنگ‌نوردی موج»
-- شامل محصولات بوفه، تجهیزات، تنظیمات پیش‌فرض، اطلاعیه‌ها و دوره‌های آموزشی نمونه
-- طبق درخواست شما: هیچ کاربر نمونه‌ای جز یک مدیر با پسورد ۱۲۳ در دیتابیس ساخته نمی‌شود.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE `moj_climbing_db`;

-- ۱. پاکسازی داده‌های فرعی نمونه قبلی برای ایجاد حالت شروع به کار تمیز
DELETE FROM `enrollments`;
DELETE FROM `transactions`;
DELETE FROM `attendance_records`;
DELETE FROM `debtors`;
DELETE FROM `creditors`;
DELETE FROM `insurance_requests`;
DELETE FROM `support_tickets`;
DELETE FROM `app_notifications`;
DELETE FROM `products`;
DELETE FROM `shop_invoice_items`;
DELETE FROM `shop_invoices`;
DELETE FROM `courses`;
DELETE FROM `club_announcements`;
DELETE FROM `pre_registrations`;
DELETE FROM `parent_athlete_links`;

-- پاکسازی جدول کاربران و ثبت تنها و تنها یک مدیر (Admin) با پسورد ۱۲۳
DELETE FROM `users`;

INSERT INTO `users` (
  `id`, 
  `username`, 
  `password`, 
  `fullName`, 
  `nationalId`, 
  `phone`, 
  `roles`, 
  `activeRole`, 
  `isActive`, 
  `createdAt`
) VALUES (
  'usr-admin-1', 
  'admin', 
  '123', 
  'مدیر کل مجموعه', 
  '0012345678', 
  '09121111111', 
  '["super_admin","athlete","secretary","coach","accountant"]', 
  'super_admin', 
  1, 
  '1403/01/01'
);

-- ۲. درج محصولات نمونه بوفه و تجهیزات باشگاه (Products)
INSERT INTO `products` (`id`, `name`, `category`, `price`, `stock`, `minStockAlert`, `unit`, `imageUrl`, `description`, `isActive`, `createdAt`) VALUES
('prod-1', 'کفش سنگ‌نوردی La Sportiva مدل Solution', 'تجهیزات', 6800000, 4, 2, 'جفت', '', 'کفش سنگ‌نوردی حرفه‌ای مناسب صعودهای ورزشی و بولدرینگ سخت با چسبندگی فوق‌العاده', 1, '1405/01/10'),
('prod-2', 'هارنس پرتیج Petzl Adjama', 'تجهیزات', 3900000, 6, 2, 'عدد', '', 'هارنس قابل تنظیم بسیار راحت و مقاوم با تقسیم وزن عالی مناسب صعودهای دیواره‌نوردی و ورزشی', 1, '1405/01/10'),
('prod-3', 'پودر سنگ‌نوردی Beal حجم ۱۰۰ گرم', 'تجهیزات', 250000, 25, 5, 'بسته', '', 'پودر کربنات منیزیم با کیفیت بالا برای جلوگیری از تعریق دست و چسبندگی عالی', 1, '1405/01/12'),
('prod-4', 'کیسه پودر طرح موج', 'تجهیزات', 350000, 15, 3, 'عدد', '', 'کیسه پودر دست‌ساز با دهانه سفت، آستر مخملی و کمربند اختصاصی باشگاه سنگ‌نوردی موج', 1, '1405/01/12'),
('prod-5', 'آب معدنی کوچک دماوند', 'بوفه', 8000, 120, 20, 'بطری', '', 'آب معدنی خنک برای ورزشکاران حین تمرین', 1, '1405/01/01'),
('prod-6', 'نوشابه ورزشی هایپ (Hype)', 'بوفه', 95000, 45, 10, 'قوطی', '', 'نوشابه انرژی‌زا و ایزوتونیک مناسب ریکاوری حین تمرینات شدید سنگ‌نوردی', 1, '1405/01/01');

-- ۳. درج دوره‌ها و سانس‌های تمرینی نمونه (Courses)
-- برای انتساب مربی، از آیدی مدیر کل مجموعه استفاده شده است که نقش مربی را نیز داراست.
INSERT INTO `courses` (`id`, `title`, `sportType`, `coachId`, `coachName`, `daysOfWeek`, `startTime`, `endTime`, `capacity`, `monthlyFee`, `isActive`, `description`, `startDate`, `endDate`, `registrationDeadline`, `level`, `locationRoom`, `createdAt`) VALUES
('crs-101', 'دوره آموزش مقدماتی سنگ‌نوردی سالنی (عمومی)', 'سنگ‌نوردی سالنی', 'usr-admin-1', 'مدیر کل مجموعه', '[1, 3, 5]', '18:00', '20:00', 15, 850000, 1, 'کلاس مقدماتی آموزش صعود قرقره، ابزارشناسی، گره‌ها و تکنیک‌های پایه سنگ‌نوردی سالنی', '1405/02/01', '1405/03/01', '1405/01/28', 'مقدماتی', 'دیواره اصلی - سالن موج', '1405/01/15'),
('crs-102', 'سانس بولدرینگ پیشرفته عمومی', 'بولدرینگ', 'usr-admin-1', 'مدیر کل مجموعه', '[0, 2, 4]', '19:30', '21:30', 20, 1100000, 1, 'سانس اختصاصی تمرینات بولدرینگ، طراحی مسیر، تقویت قدرت استاتیک و دینامیک صعود', '1405/02/01', '1405/03/01', '1405/01/29', 'پیشرفته', 'منطقه بولدرینگ - سالن موج', '1405/01/15');

-- ۴. بستانکاران سالن (Creditors)
INSERT INTO `creditors` (`id`, `creditorName`, `category`, `categoryTitle`, `contactPhone`, `ibanNumber`, `amount`, `dueDate`, `status`, `notes`, `createdAt`) VALUES
('cred-1', 'تجهیزات ورزشی پگاه (صالحی)', 'equipment', 'خرید طناب و کارابین‌های دیواره سالن', '02188889999', 'IR120120000000001234567890', 15000000, '1405/03/15', 'unpaid', 'صورت‌حساب فاکتور خرید ۱۰ حلقه طناب بئال ۵۰ متری', '1405/02/10');

-- ۵. اطلاعیه‌ها و اسلایدرها (Club Announcements)
INSERT INTO `club_announcements` (`id`, `title`, `subtitle`, `imageUrl`, `discountTag`, `startDate`, `endDate`, `isActive`, `targetAudience`, `createdAt`) VALUES
('ann-1', 'افتتاح بخش بولدرینگ دیواره جدید باشگاه سنگ‌نوردی موج', 'بزرگترین و متنوع‌ترین دیواره تمرینی بولدرینگ با بیش از ۶۰ مسیر استاندارد آماده صعود سنگ‌نوردان موج است.', '', '1405/01/15', '1405/12/29', '', 1, 'all', '1405/01/15'),
('ann-2', 'تخفیف ویژه جشنواره بهاره خرید تجهیزات فنی', '۲۰ درصد تخفیف ویژه هنرجویان فعال باشگاه موج بابت خرید پودر، کیسه پودر و انواع کفش سنگ‌نوردی و هارنس', '۲۰٪ تخفیف', '1405/02/05', '1405/02/20', '', 1, 'all', '1405/02/01');

-- ۶. تنظیمات پیش‌فرض باشگاه (Club Settings)
DELETE FROM `club_settings`;
INSERT INTO `club_settings` (`id`, `name`, `slogan`, `logo_Icon`, `theme_Palette`, `settings_json`, `updatedAt`) VALUES
('1', 'باشگاه سنگ‌نوردی موج', 'اوج هیجان، صعود و سلامتی در مجهزترین خانه سنگ‌نوردی', 'mountain', 'teal', '{"workingHours":"شنبه تا پنجشنبه ساعت ۱۴ الی ۲۲","contactPhone":"02144445555","address":"تهران، خیابان آزادی، جنب سالن ورزشی آزادی، باشگاه موج","rules":"رعایت پوشش ورزشی مناسب و داشتن کارت بیمه ورزشی معتبر برای کلیه سنگ‌نوردان الزامی است."}', '1405/02/01');

SET FOREIGN_KEY_CHECKS = 1;
