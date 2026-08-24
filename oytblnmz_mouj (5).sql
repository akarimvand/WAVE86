-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 24, 2026 at 03:09 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `oytblnmz_mouj`
--

-- --------------------------------------------------------

--
-- Table structure for table `app_notifications`
--

CREATE TABLE `app_notifications` (
  `id` varchar(100) NOT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `targetAudience` varchar(50) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `isRead` tinyint(1) DEFAULT 0,
  `actionLink` text DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_records`
--

CREATE TABLE `attendance_records` (
  `id` varchar(100) NOT NULL,
  `sessionId` varchar(100) DEFAULT NULL,
  `date` varchar(100) DEFAULT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `checkInTime` varchar(50) DEFAULT NULL,
  `checkOutTime` varchar(50) DEFAULT NULL,
  `recordedBy` varchar(255) DEFAULT NULL,
  `recordedAt` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(100) NOT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `targetEntity` varchar(100) DEFAULT NULL,
  `targetId` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `timestamp` varchar(100) DEFAULT NULL,
  `oldValue` longtext DEFAULT NULL,
  `newValue` longtext DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `userId`, `userName`, `action`, `targetEntity`, `targetId`, `details`, `timestamp`, `oldValue`, `newValue`, `ip`, `userAgent`) VALUES
('audit-1787574064824-43yz74', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787574064821-qzm1', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-1787573638166-9sj8', '2026-08-24T12:21:04.824Z', NULL, '{\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787574244559-lvvpl0', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-dupfix-1787574244553', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-1787573638166-9sj8', '2026-08-24T12:24:04.559Z', NULL, '{\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787574286712-tcu3w6', 'usr-admin-1', 'admin', 'ویرایش کاربر', 'User', 'usr-1787574286684-143aq', 'ویرایش توسط مدیریت', '2026-08-24T12:24:46.712Z', '{\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\"}', '{\"roles\":[\"athlete\"],\"activeRole\":\"athlete\"}', '127.0.0.1', 'node'),
('audit-1787574286721-ejgudn', 'usr-admin-1', 'admin', 'ویرایش کاربر', 'User', 'usr-1787574286684-143aq', 'ویرایش توسط مدیریت', '2026-08-24T12:24:46.721Z', '{\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\"}', '{\"roles\":[\"athlete\"],\"activeRole\":\"athlete\"}', '127.0.0.1', 'node'),
('audit-1787574286735-urqdgc', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787574286734-zokv', 'ثبت‌نام ورزشکار تست الف در سانس sess-cap-1787574286580', '2026-08-24T12:24:46.735Z', NULL, '{\"sessionId\":\"sess-cap-1787574286580\",\"userId\":\"usr-1787574286684-143aq\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787574286751-qu1cfq', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787574286749-njy3', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-flex-1787574286580', '2026-08-24T12:24:46.751Z', NULL, '{\"sessionId\":\"sess-flex-1787574286580\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787574286761-atgbxw', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787574286749-njy3', 'حذف کامل ثبت‌نام مدیر کل مجموعه+ همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:24:46.761Z', '{\"id\":\"enr-1787574286749-njy3\",\"sessionId\":\"sess-flex-1787574286580\",\"userId\":\"usr-admin-1\",\"athleteName\":\"مدیر کل مجموعه+\",\"athletePhone\":\"09121111111\",\"athleteNationalId\":\"0012345678\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"pos\",\"enrolledAt\":\"2026-08-24T12:24:46.749Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:24:46.749Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"200000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787574286767-j9wtmd', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787574286766-ancy', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-flex-1787574286580', '2026-08-24T12:24:46.767Z', NULL, '{\"sessionId\":\"sess-flex-1787574286580\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787574286800-4hghf0', 'usr-admin-1', 'admin', 'ثبت فاکتور فروشگاه', 'ShopInvoice', 'shop-inv-1787574286790', 'فاکتور INV-4286792 به مبلغ ۱۵۰٬۰۰۰ تومان برای مدیر کل مجموعه+ (1 قلم، cash)', '2026-08-24T12:24:46.800Z', NULL, '{\"totalAmount\":150000,\"itemsCount\":1,\"paymentMethod\":\"cash\"}', '127.0.0.1', 'node'),
('audit-1787574286812-clvqsa', 'usr-admin-1', 'admin', 'ثبت فاکتور فروشگاه', 'ShopInvoice', 'shop-inv-1787574286807', 'فاکتور INV-4286808 به مبلغ ۵۰٬۰۰۰ تومان برای مدیر کل مجموعه+ (1 قلم، credit)', '2026-08-24T12:24:46.812Z', NULL, '{\"totalAmount\":50000,\"itemsCount\":1,\"paymentMethod\":\"credit\"}', '127.0.0.1', 'node'),
('audit-1787574286821-89dtqg', 'usr-admin-1', 'admin', 'ابطال تراکنش مالی', 'FinancialTransaction', 'tx-1787574286816-693', 'E2E', '2026-08-24T12:24:46.821Z', '{\"id\":\"tx-1787574286816-693\",\"userId\":\"usr-admin-1\",\"userName\":\"\",\"userNationalId\":\"\",\"amount\":\"7777.00\",\"type\":\"other\",\"method\":\"cash\",\"trackingNumber\":\"\",\"receiptUrl\":\"\",\"receiptFileName\":\"\",\"description\":\"\",\"status\":\"completed\",\"idempotencyKey\":\"e2e-void-1787574286580\",\"voidedAt\":null,\"voidedBy\":null,\"voidReason\":null,\"createdAt\":\"2026-08-24T12:24:46.816Z\",\"createdBy\":\"مدیر سیستم\",\"version\":1}', '{\"status\":\"cancelled\",\"voidedBy\":\"admin\"}', '127.0.0.1', 'node'),
('audit-1787574286841-b7dedp', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787574286766-ancy', 'حذف کامل ثبت‌نام مدیر کل مجموعه+ همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:24:46.841Z', '{\"id\":\"enr-1787574286766-ancy\",\"sessionId\":\"sess-flex-1787574286580\",\"userId\":\"usr-admin-1\",\"athleteName\":\"مدیر کل مجموعه+\",\"athletePhone\":\"09121111111\",\"athleteNationalId\":\"0012345678\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"pos\",\"enrolledAt\":\"2026-08-24T12:24:46.765Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:24:46.765Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"200000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787574286845-2woahd', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787574286734-zokv', 'حذف کامل ثبت‌نام ورزشکار تست الف همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:24:46.845Z', '{\"id\":\"enr-1787574286734-zokv\",\"sessionId\":\"sess-cap-1787574286580\",\"userId\":\"usr-1787574286684-143aq\",\"athleteName\":\"ورزشکار تست الف\",\"athletePhone\":\"09120000001\",\"athleteNationalId\":\"9787574286580\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"cash\",\"enrolledAt\":\"2026-08-24T12:24:46.734Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:24:46.734Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"150000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787574286855-jbrtzu', 'usr-admin-1', 'admin', 'حذف کاربر', 'User', 'usr-1787574286704-q14g1', 'حذف کاربر ورزشکار تست ب توسط مدیریت', '2026-08-24T12:24:46.855Z', '{\"id\":\"usr-1787574286704-q14g1\",\"username\":\"e2e_b_1787574286580\",\"firstName\":\"\",\"lastName\":\"\",\"fullName\":\"ورزشکار تست ب\",\"fatherName\":\"\",\"shenasnamehNo\":\"\",\"nationalId\":\"8787574286580\",\"birthDate\":\"\",\"gender\":\"\",\"phone\":\"09120000002\",\"emergencyContactName\":\"\",\"emergencyContactRelation\":\"\",\"emergencyContactPhone\":\"\",\"bloodType\":\"\",\"shoeSize\":\"\",\"clothingSize\":\"\",\"address\":\"\",\"medicalConditions\":\"\",\"referrerName\":\"\",\"referrerPhone\":\"\",\"educationOrJob\":\"\",\"climbingExperienceLevel\":\"\",\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\",\"isActive\":1,\"insuranceNumber\":\"\",\"insuranceExpiryDate\":\"\",\"isInsuranceValid\":0,\"baleChatId\":\"\",\"avatarUrl\":\"\",\"createdAt\":\"2026-08-24T12:24:46.704Z\",\"updatedAt\":\"2026-08-24T12:24:46.704Z\",\"version\":1,\"mustChangePassword\":0}', NULL, '127.0.0.1', 'node'),
('audit-1787574286859-6ilkns', 'usr-admin-1', 'admin', 'حذف کاربر', 'User', 'usr-1787574286684-143aq', 'حذف کاربر ورزشکار تست الف توسط مدیریت', '2026-08-24T12:24:46.859Z', '{\"id\":\"usr-1787574286684-143aq\",\"username\":\"e2e_a_1787574286580\",\"firstName\":\"\",\"lastName\":\"\",\"fullName\":\"ورزشکار تست الف\",\"fatherName\":\"\",\"shenasnamehNo\":\"\",\"nationalId\":\"9787574286580\",\"birthDate\":\"\",\"gender\":\"\",\"phone\":\"09120000001\",\"emergencyContactName\":\"\",\"emergencyContactRelation\":\"\",\"emergencyContactPhone\":\"\",\"bloodType\":\"\",\"shoeSize\":\"\",\"clothingSize\":\"\",\"address\":\"\",\"medicalConditions\":\"\",\"referrerName\":\"\",\"referrerPhone\":\"\",\"educationOrJob\":\"\",\"climbingExperienceLevel\":\"\",\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\",\"isActive\":1,\"insuranceNumber\":\"\",\"insuranceExpiryDate\":\"\",\"isInsuranceValid\":0,\"baleChatId\":\"\",\"avatarUrl\":\"\",\"createdAt\":\"2026-08-24T12:24:46.700Z\",\"updatedAt\":\"2026-08-24T12:24:46.700Z\",\"version\":3,\"mustChangePassword\":0}', NULL, '127.0.0.1', 'node'),
('audit-1787574405177-91gyqb', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787574405171-9lj5', 'ثبت‌نام حسین نیک فطرت در سانس sess-1787573638166-9sj8', '2026-08-24T12:26:45.177Z', NULL, '{\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"user-1786203971874-2zgl52\",\"status\":\"active\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'),
('audit-1787574500661-5o5oh7', 'usr-admin-1', 'admin', 'ابطال تراکنش مالی', 'FinancialTransaction', 'shop-inv-1787574286790-pay', 'باطل‌سازی توسط مدیر کل / حسابدار', '2026-08-24T12:28:20.661Z', '{\"id\":\"shop-inv-1787574286790-pay\",\"userId\":\"usr-admin-1\",\"userName\":\"مدیر کل مجموعه+\",\"userNationalId\":\"0012345678\",\"amount\":\"150000.00\",\"type\":\"equipment\",\"method\":\"pos\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"description\":\"بابت تسویه فاکتور INV-4286792\",\"status\":\"completed\",\"idempotencyKey\":null,\"voidedAt\":null,\"voidedBy\":null,\"voidReason\":null,\"createdAt\":\"2026-08-24T12:24:46.792Z\",\"createdBy\":\"admin\",\"version\":1}', '{\"status\":\"cancelled\",\"voidedBy\":\"admin\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'),
('audit-1787574523958-s3b675', 'usr-admin-1', 'admin', 'ابطال تراکنش مالی', 'FinancialTransaction', 'shop-inv-1787574286790-charge', 'باطل‌سازی توسط مدیر کل / حسابدار', '2026-08-24T12:28:43.958Z', '{\"id\":\"shop-inv-1787574286790-charge\",\"userId\":\"usr-admin-1\",\"userName\":\"مدیر کل مجموعه+\",\"userNationalId\":\"0012345678\",\"amount\":\"150000.00\",\"type\":\"charge\",\"method\":\"pos\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"description\":\"بابت فاکتور INV-4286792\",\"status\":\"completed\",\"idempotencyKey\":null,\"voidedAt\":null,\"voidedBy\":null,\"voidReason\":null,\"createdAt\":\"2026-08-24T12:24:46.792Z\",\"createdBy\":\"admin\",\"version\":1}', '{\"status\":\"cancelled\",\"voidedBy\":\"admin\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'),
('audit-1787574525901-9febfw', 'usr-admin-1', 'admin', 'ابطال تراکنش مالی', 'FinancialTransaction', 'shop-inv-1787574286807-charge', 'باطل‌سازی توسط مدیر کل / حسابدار', '2026-08-24T12:28:45.901Z', '{\"id\":\"shop-inv-1787574286807-charge\",\"userId\":\"usr-admin-1\",\"userName\":\"مدیر کل مجموعه+\",\"userNationalId\":\"0012345678\",\"amount\":\"50000.00\",\"type\":\"charge\",\"method\":\"cash\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"description\":\"بابت فاکتور INV-4286808\",\"status\":\"completed\",\"idempotencyKey\":null,\"voidedAt\":null,\"voidedBy\":null,\"voidReason\":null,\"createdAt\":\"2026-08-24T12:24:46.808Z\",\"createdBy\":\"admin\",\"version\":1}', '{\"status\":\"cancelled\",\"voidedBy\":\"admin\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'),
('audit-1787574621020-a1ee7y', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787574621014-ofrj', 'ثبت‌نام سارا یگانه در سانس sess-1787573638166-9sj8', '2026-08-24T12:30:21.020Z', NULL, '{\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"user-1786203973812-x100uq\",\"status\":\"active\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'),
('audit-1787574621029-x7lots', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787574621015-5jnw', 'ثبت‌نام امیر علی نیک فطرت در سانس sess-1787573638166-9sj8', '2026-08-24T12:30:21.029Z', NULL, '{\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"user-1786203975346-h8o5tr\",\"status\":\"active\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'),
('audit-1787575350355-fnchzj', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'audit-hard-1787575350104', 'حذف کامل ثبت‌نام [AUDIT] تست همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:42:30.355Z', '{\"id\":\"audit-hard-1787575350104\",\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"usr-admin-1\",\"athleteName\":\"[AUDIT] تست\",\"athletePhone\":\"\",\"athleteNationalId\":\"\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":\"\",\"receiptFileName\":\"\",\"paymentMethod\":\"\",\"enrolledAt\":\"2026-08-24T12:42:30.107Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:42:30.107Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"0.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787575350543-b0npf1', 'usr-admin-1', 'admin', 'لغو ثبت‌نام سانس', 'Enrollment', 'audit-soft-1787575350402', 'لغو ثبت‌نام توسط مدیریت', '2026-08-24T12:42:30.543Z', NULL, '{\"status\":\"canceled\"}', '127.0.0.1', 'node'),
('audit-1787575453923-15xflx', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'audit-hard-1787575453892', 'حذف کامل ثبت‌نام [AUDIT] تست همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:44:13.923Z', '{\"id\":\"audit-hard-1787575453892\",\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"usr-admin-1\",\"athleteName\":\"[AUDIT] تست\",\"athletePhone\":\"\",\"athleteNationalId\":\"\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":\"\",\"receiptFileName\":\"\",\"paymentMethod\":\"\",\"enrolledAt\":\"2026-08-24T12:44:13.895Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:44:13.895Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"0.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787575453937-jsgnqb', 'usr-admin-1', 'admin', 'لغو ثبت‌نام سانس', 'Enrollment', 'audit-soft-1787575453921', 'لغو ثبت‌نام توسط مدیریت', '2026-08-24T12:44:13.937Z', NULL, '{\"status\":\"canceled\"}', '127.0.0.1', 'node'),
('audit-1787575517164-mdyg7a', 'usr-admin-1', 'admin', 'ویرایش کاربر', 'User', 'usr-1787575517134-vkf0e', 'ویرایش توسط مدیریت', '2026-08-24T12:45:17.164Z', '{\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\"}', '{\"roles\":[\"athlete\"],\"activeRole\":\"athlete\"}', '127.0.0.1', 'node'),
('audit-1787575517174-vnhlxq', 'usr-admin-1', 'admin', 'ویرایش کاربر', 'User', 'usr-1787575517134-vkf0e', 'ویرایش توسط مدیریت', '2026-08-24T12:45:17.174Z', '{\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\"}', '{\"roles\":[\"athlete\"],\"activeRole\":\"athlete\"}', '127.0.0.1', 'node'),
('audit-1787575517194-9su514', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787575517193-r1vh', 'ثبت‌نام ورزشکار تست الف در سانس sess-cap-1787575517045', '2026-08-24T12:45:17.194Z', NULL, '{\"sessionId\":\"sess-cap-1787575517045\",\"userId\":\"usr-1787575517134-vkf0e\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787575517213-m01579', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787575517211-jvqa', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-flex-1787575517045', '2026-08-24T12:45:17.213Z', NULL, '{\"sessionId\":\"sess-flex-1787575517045\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787575517226-d42fak', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787575517211-jvqa', 'حذف کامل ثبت‌نام مدیر کل مجموعه+ همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:45:17.226Z', '{\"id\":\"enr-1787575517211-jvqa\",\"sessionId\":\"sess-flex-1787575517045\",\"userId\":\"usr-admin-1\",\"athleteName\":\"مدیر کل مجموعه+\",\"athletePhone\":\"09121111111\",\"athleteNationalId\":\"0012345678\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"pos\",\"enrolledAt\":\"2026-08-24T12:45:17.210Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:45:17.210Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"200000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787575517234-qs8kcn', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787575517232-mg37', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-flex-1787575517045', '2026-08-24T12:45:17.234Z', NULL, '{\"sessionId\":\"sess-flex-1787575517045\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787575517285-86y9mr', 'usr-admin-1', 'admin', 'ثبت فاکتور فروشگاه', 'ShopInvoice', 'shop-inv-1787575517264', 'فاکتور INV-5517266 به مبلغ ۱۵۰٬۰۰۰ تومان برای مدیر کل مجموعه+ (1 قلم، cash)', '2026-08-24T12:45:17.285Z', NULL, '{\"totalAmount\":150000,\"itemsCount\":1,\"paymentMethod\":\"cash\"}', '127.0.0.1', 'node'),
('audit-1787575517298-jb4hgt', 'usr-admin-1', 'admin', 'ثبت فاکتور فروشگاه', 'ShopInvoice', 'shop-inv-1787575517292', 'فاکتور INV-5517293 به مبلغ ۵۰٬۰۰۰ تومان برای مدیر کل مجموعه+ (1 قلم، credit)', '2026-08-24T12:45:17.298Z', NULL, '{\"totalAmount\":50000,\"itemsCount\":1,\"paymentMethod\":\"credit\"}', '127.0.0.1', 'node'),
('audit-1787575517308-wyaxhi', 'usr-admin-1', 'admin', 'ابطال تراکنش مالی', 'FinancialTransaction', 'tx-1787575517303-645', 'E2E', '2026-08-24T12:45:17.308Z', '{\"id\":\"tx-1787575517303-645\",\"userId\":\"usr-admin-1\",\"userName\":\"\",\"userNationalId\":\"\",\"amount\":\"7777.00\",\"type\":\"other\",\"method\":\"cash\",\"trackingNumber\":\"\",\"receiptUrl\":\"\",\"receiptFileName\":\"\",\"description\":\"\",\"status\":\"completed\",\"idempotencyKey\":\"e2e-void-1787575517045\",\"voidedAt\":null,\"voidedBy\":null,\"voidReason\":null,\"createdAt\":\"2026-08-24T12:45:17.303Z\",\"createdBy\":\"مدیر سیستم\",\"version\":1}', '{\"status\":\"cancelled\",\"voidedBy\":\"admin\"}', '127.0.0.1', 'node'),
('audit-1787575517325-vc2mlm', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787575517232-mg37', 'حذف کامل ثبت‌نام مدیر کل مجموعه+ همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:45:17.325Z', '{\"id\":\"enr-1787575517232-mg37\",\"sessionId\":\"sess-flex-1787575517045\",\"userId\":\"usr-admin-1\",\"athleteName\":\"مدیر کل مجموعه+\",\"athletePhone\":\"09121111111\",\"athleteNationalId\":\"0012345678\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"pos\",\"enrolledAt\":\"2026-08-24T12:45:17.232Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:45:17.232Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"200000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787575517328-gponcn', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787575517193-r1vh', 'حذف کامل ثبت‌نام ورزشکار تست الف همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:45:17.328Z', '{\"id\":\"enr-1787575517193-r1vh\",\"sessionId\":\"sess-cap-1787575517045\",\"userId\":\"usr-1787575517134-vkf0e\",\"athleteName\":\"ورزشکار تست الف\",\"athletePhone\":\"09120000001\",\"athleteNationalId\":\"9787575517045\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"cash\",\"enrolledAt\":\"2026-08-24T12:45:17.193Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:45:17.193Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"150000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787575517340-80qorw', 'usr-admin-1', 'admin', 'حذف کاربر', 'User', 'usr-1787575517156-xm4dz', 'حذف کاربر ورزشکار تست ب توسط مدیریت', '2026-08-24T12:45:17.340Z', '{\"id\":\"usr-1787575517156-xm4dz\",\"username\":\"e2e_b_1787575517045\",\"firstName\":\"\",\"lastName\":\"\",\"fullName\":\"ورزشکار تست ب\",\"fatherName\":\"\",\"shenasnamehNo\":\"\",\"nationalId\":\"8787575517045\",\"birthDate\":\"\",\"gender\":\"\",\"phone\":\"09120000002\",\"emergencyContactName\":\"\",\"emergencyContactRelation\":\"\",\"emergencyContactPhone\":\"\",\"bloodType\":\"\",\"shoeSize\":\"\",\"clothingSize\":\"\",\"address\":\"\",\"medicalConditions\":\"\",\"referrerName\":\"\",\"referrerPhone\":\"\",\"educationOrJob\":\"\",\"climbingExperienceLevel\":\"\",\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\",\"isActive\":1,\"insuranceNumber\":\"\",\"insuranceExpiryDate\":\"\",\"isInsuranceValid\":0,\"baleChatId\":\"\",\"avatarUrl\":\"\",\"createdAt\":\"2026-08-24T12:45:17.156Z\",\"updatedAt\":\"2026-08-24T12:45:17.156Z\",\"version\":1,\"mustChangePassword\":0}', NULL, '127.0.0.1', 'node'),
('audit-1787575517344-90rtji', 'usr-admin-1', 'admin', 'حذف کاربر', 'User', 'usr-1787575517134-vkf0e', 'حذف کاربر ورزشکار تست الف توسط مدیریت', '2026-08-24T12:45:17.344Z', '{\"id\":\"usr-1787575517134-vkf0e\",\"username\":\"e2e_a_1787575517045\",\"firstName\":\"\",\"lastName\":\"\",\"fullName\":\"ورزشکار تست الف\",\"fatherName\":\"\",\"shenasnamehNo\":\"\",\"nationalId\":\"9787575517045\",\"birthDate\":\"\",\"gender\":\"\",\"phone\":\"09120000001\",\"emergencyContactName\":\"\",\"emergencyContactRelation\":\"\",\"emergencyContactPhone\":\"\",\"bloodType\":\"\",\"shoeSize\":\"\",\"clothingSize\":\"\",\"address\":\"\",\"medicalConditions\":\"\",\"referrerName\":\"\",\"referrerPhone\":\"\",\"educationOrJob\":\"\",\"climbingExperienceLevel\":\"\",\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\",\"isActive\":1,\"insuranceNumber\":\"\",\"insuranceExpiryDate\":\"\",\"isInsuranceValid\":0,\"baleChatId\":\"\",\"avatarUrl\":\"\",\"createdAt\":\"2026-08-24T12:45:17.150Z\",\"updatedAt\":\"2026-08-24T12:45:17.150Z\",\"version\":3,\"mustChangePassword\":0}', NULL, '127.0.0.1', 'node'),
('audit-1787576034354-3irq6f', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787576034349-yu7r', 'ثبت‌نام مهدیه مومنی در سانس sess-1787573638166-9sj8', '2026-08-24T12:53:54.354Z', NULL, '{\"sessionId\":\"sess-1787573638166-9sj8\",\"userId\":\"user-1786203980498-a3ky8n\",\"status\":\"active\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'),
('audit-1787576323877-116z1g', 'usr-admin-1', 'admin', 'لغو ثبت‌نام سانس', 'Enrollment', 'enr-soft-1787576323865', 'لغو ثبت‌نام توسط مدیریت', '2026-08-24T12:58:43.877Z', NULL, '{\"status\":\"canceled\"}', '127.0.0.1', 'node'),
('audit-1787576359364-x56uin', 'usr-admin-1', 'admin', 'لغو ثبت‌نام سانس', 'Enrollment', 'enr-soft-1787576359357', 'لغو ثبت‌نام توسط مدیریت', '2026-08-24T12:59:19.364Z', NULL, '{\"status\":\"canceled\"}', '127.0.0.1', 'node'),
('audit-1787576396665-eb8jgk', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-final-1787576396656', 'ثبت‌نام مدیر کل مجموعه+ در سانس session-1787576396649-78', '2026-08-24T12:59:56.665Z', NULL, '{\"sessionId\":\"session-1787576396649-78\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787576397469-1s0zsl', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-final-1787576396656', 'حذف کامل ثبت‌نام مدیر کل مجموعه+ همراه سوابق حضور و اقساط مرتبط', '2026-08-24T12:59:57.469Z', '{\"id\":\"enr-final-1787576396656\",\"sessionId\":\"session-1787576396649-78\",\"userId\":\"usr-admin-1\",\"athleteName\":\"مدیر کل مجموعه+\",\"athletePhone\":\"09121111111\",\"athleteNationalId\":\"0012345678\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"pos\",\"enrolledAt\":\"2026-08-24T12:59:56.660Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T12:59:56.660Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"1000000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787576398362-4lolfo', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-soft-1787576398357', 'ثبت‌نام مدیر کل مجموعه+ در سانس session-1787576396649-78', '2026-08-24T12:59:58.362Z', NULL, '{\"sessionId\":\"session-1787576396649-78\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787576398368-az6pqc', 'usr-admin-1', 'admin', 'لغو ثبت‌نام سانس', 'Enrollment', 'enr-soft-1787576398357', 'لغو ثبت‌نام توسط مدیریت', '2026-08-24T12:59:58.368Z', NULL, '{\"status\":\"canceled\"}', '127.0.0.1', 'node'),
('audit-1787576444485-kbxr55', 'usr-admin-1', 'admin', 'ویرایش کاربر', 'User', 'usr-1787576444472-4ftwb', 'ویرایش توسط مدیریت', '2026-08-24T13:00:44.485Z', '{\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\"}', '{\"roles\":[\"athlete\"],\"activeRole\":\"athlete\"}', '127.0.0.1', 'node'),
('audit-1787576444493-azqlqz', 'usr-admin-1', 'admin', 'ویرایش کاربر', 'User', 'usr-1787576444472-4ftwb', 'ویرایش توسط مدیریت', '2026-08-24T13:00:44.493Z', '{\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\"}', '{\"roles\":[\"athlete\"],\"activeRole\":\"athlete\"}', '127.0.0.1', 'node'),
('audit-1787576444509-fmxpwf', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787576444506-2yss', 'ثبت‌نام ورزشکار تست الف در سانس sess-cap-1787576444369', '2026-08-24T13:00:44.509Z', NULL, '{\"sessionId\":\"sess-cap-1787576444369\",\"userId\":\"usr-1787576444472-4ftwb\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787576444523-97iy7y', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787576444522-7scz', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-flex-1787576444369', '2026-08-24T13:00:44.523Z', NULL, '{\"sessionId\":\"sess-flex-1787576444369\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787576444539-mwk01j', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787576444522-7scz', 'حذف کامل ثبت‌نام مدیر کل مجموعه+ همراه سوابق حضور و اقساط مرتبط', '2026-08-24T13:00:44.539Z', '{\"id\":\"enr-1787576444522-7scz\",\"sessionId\":\"sess-flex-1787576444369\",\"userId\":\"usr-admin-1\",\"athleteName\":\"مدیر کل مجموعه+\",\"athletePhone\":\"09121111111\",\"athleteNationalId\":\"0012345678\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"pos\",\"enrolledAt\":\"2026-08-24T13:00:44.521Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T13:00:44.521Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"200000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787576444545-sj8hba', 'usr-admin-1', 'admin', 'ثبت‌نام سانس', 'Enrollment', 'enr-1787576444544-pt5q', 'ثبت‌نام مدیر کل مجموعه+ در سانس sess-flex-1787576444369', '2026-08-24T13:00:44.545Z', NULL, '{\"sessionId\":\"sess-flex-1787576444369\",\"userId\":\"usr-admin-1\",\"status\":\"active\"}', '127.0.0.1', 'node'),
('audit-1787576444574-0c8bme', 'usr-admin-1', 'admin', 'ثبت فاکتور فروشگاه', 'ShopInvoice', 'shop-inv-1787576444567', 'فاکتور INV-6444568 به مبلغ ۱۵۰٬۰۰۰ تومان برای مدیر کل مجموعه+ (1 قلم، cash)', '2026-08-24T13:00:44.574Z', NULL, '{\"totalAmount\":150000,\"itemsCount\":1,\"paymentMethod\":\"cash\"}', '127.0.0.1', 'node'),
('audit-1787576444587-o82cwy', 'usr-admin-1', 'admin', 'ثبت فاکتور فروشگاه', 'ShopInvoice', 'shop-inv-1787576444581', 'فاکتور INV-6444582 به مبلغ ۵۰٬۰۰۰ تومان برای مدیر کل مجموعه+ (1 قلم، credit)', '2026-08-24T13:00:44.587Z', NULL, '{\"totalAmount\":50000,\"itemsCount\":1,\"paymentMethod\":\"credit\"}', '127.0.0.1', 'node'),
('audit-1787576444599-sbi0hh', 'usr-admin-1', 'admin', 'ابطال تراکنش مالی', 'FinancialTransaction', 'tx-1787576444592-710', 'E2E', '2026-08-24T13:00:44.599Z', '{\"id\":\"tx-1787576444592-710\",\"userId\":\"usr-admin-1\",\"userName\":\"\",\"userNationalId\":\"\",\"amount\":\"7777.00\",\"type\":\"other\",\"method\":\"cash\",\"trackingNumber\":\"\",\"receiptUrl\":\"\",\"receiptFileName\":\"\",\"description\":\"\",\"status\":\"completed\",\"idempotencyKey\":\"e2e-void-1787576444369\",\"voidedAt\":null,\"voidedBy\":null,\"voidReason\":null,\"createdAt\":\"2026-08-24T13:00:44.593Z\",\"createdBy\":\"مدیر سیستم\",\"version\":1}', '{\"status\":\"cancelled\",\"voidedBy\":\"admin\"}', '127.0.0.1', 'node'),
('audit-1787576444617-pfyur0', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787576444544-pt5q', 'حذف کامل ثبت‌نام مدیر کل مجموعه+ همراه سوابق حضور و اقساط مرتبط', '2026-08-24T13:00:44.617Z', '{\"id\":\"enr-1787576444544-pt5q\",\"sessionId\":\"sess-flex-1787576444369\",\"userId\":\"usr-admin-1\",\"athleteName\":\"مدیر کل مجموعه+\",\"athletePhone\":\"09121111111\",\"athleteNationalId\":\"0012345678\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"pos\",\"enrolledAt\":\"2026-08-24T13:00:44.544Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T13:00:44.544Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"200000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787576444620-2aloml', 'usr-admin-1', 'admin', 'حذف کامل ثبت‌نام', 'Enrollment', 'enr-1787576444506-2yss', 'حذف کامل ثبت‌نام ورزشکار تست الف همراه سوابق حضور و اقساط مرتبط', '2026-08-24T13:00:44.620Z', '{\"id\":\"enr-1787576444506-2yss\",\"sessionId\":\"sess-cap-1787576444369\",\"userId\":\"usr-1787576444472-4ftwb\",\"athleteName\":\"ورزشکار تست الف\",\"athletePhone\":\"09120000001\",\"athleteNationalId\":\"9787576444369\",\"status\":\"active\",\"paymentStatus\":\"pending\",\"trackingNumber\":\"\",\"receiptUrl\":null,\"receiptFileName\":\"\",\"paymentMethod\":\"cash\",\"enrolledAt\":\"2026-08-24T13:00:44.506Z\",\"expireDate\":\"\",\"startDate\":\"2026-08-24T13:00:44.506Z\",\"endDate\":\"\",\"totalSessionsAllowed\":12,\"usedSessionsCount\":0,\"priceAtEnrollment\":\"150000.00\",\"createdAt\":null,\"updatedAt\":null,\"version\":1}', NULL, '127.0.0.1', 'node'),
('audit-1787576444633-v8vsrp', 'usr-admin-1', 'admin', 'حذف کاربر', 'User', 'usr-1787576444478-p133b', 'حذف کاربر ورزشکار تست ب توسط مدیریت', '2026-08-24T13:00:44.633Z', '{\"id\":\"usr-1787576444478-p133b\",\"username\":\"e2e_b_1787576444369\",\"firstName\":\"\",\"lastName\":\"\",\"fullName\":\"ورزشکار تست ب\",\"fatherName\":\"\",\"shenasnamehNo\":\"\",\"nationalId\":\"8787576444369\",\"birthDate\":\"\",\"gender\":\"\",\"phone\":\"09120000002\",\"emergencyContactName\":\"\",\"emergencyContactRelation\":\"\",\"emergencyContactPhone\":\"\",\"bloodType\":\"\",\"shoeSize\":\"\",\"clothingSize\":\"\",\"address\":\"\",\"medicalConditions\":\"\",\"referrerName\":\"\",\"referrerPhone\":\"\",\"educationOrJob\":\"\",\"climbingExperienceLevel\":\"\",\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\",\"isActive\":1,\"insuranceNumber\":\"\",\"insuranceExpiryDate\":\"\",\"isInsuranceValid\":0,\"baleChatId\":\"\",\"avatarUrl\":\"\",\"createdAt\":\"2026-08-24T13:00:44.478Z\",\"updatedAt\":\"2026-08-24T13:00:44.478Z\",\"version\":1,\"mustChangePassword\":0}', NULL, '127.0.0.1', 'node'),
('audit-1787576444637-xqyuza', 'usr-admin-1', 'admin', 'حذف کاربر', 'User', 'usr-1787576444472-4ftwb', 'حذف کاربر ورزشکار تست الف توسط مدیریت', '2026-08-24T13:00:44.637Z', '{\"id\":\"usr-1787576444472-4ftwb\",\"username\":\"e2e_a_1787576444369\",\"firstName\":\"\",\"lastName\":\"\",\"fullName\":\"ورزشکار تست الف\",\"fatherName\":\"\",\"shenasnamehNo\":\"\",\"nationalId\":\"9787576444369\",\"birthDate\":\"\",\"gender\":\"\",\"phone\":\"09120000001\",\"emergencyContactName\":\"\",\"emergencyContactRelation\":\"\",\"emergencyContactPhone\":\"\",\"bloodType\":\"\",\"shoeSize\":\"\",\"clothingSize\":\"\",\"address\":\"\",\"medicalConditions\":\"\",\"referrerName\":\"\",\"referrerPhone\":\"\",\"educationOrJob\":\"\",\"climbingExperienceLevel\":\"\",\"roles\":\"[\\\"athlete\\\"]\",\"activeRole\":\"athlete\",\"isActive\":1,\"insuranceNumber\":\"\",\"insuranceExpiryDate\":\"\",\"isInsuranceValid\":0,\"baleChatId\":\"\",\"avatarUrl\":\"\",\"createdAt\":\"2026-08-24T13:00:44.472Z\",\"updatedAt\":\"2026-08-24T13:00:44.472Z\",\"version\":3,\"mustChangePassword\":0}', NULL, '127.0.0.1', 'node');

-- --------------------------------------------------------

--
-- Table structure for table `club_announcements`
--

CREATE TABLE `club_announcements` (
  `id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subtitle` text DEFAULT NULL,
  `imageUrl` longtext DEFAULT NULL,
  `discountTag` varchar(100) DEFAULT NULL,
  `startDate` varchar(100) DEFAULT NULL,
  `endDate` varchar(100) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `targetAudience` varchar(50) DEFAULT 'all',
  `createdAt` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `club_settings`
--

CREATE TABLE `club_settings` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `slogan` varchar(255) DEFAULT NULL,
  `logo_Icon` varchar(100) DEFAULT 'mountain',
  `theme_Palette` varchar(50) DEFAULT 'teal',
  `smsApiKey` varchar(255) DEFAULT NULL,
  `smsLineNumber` varchar(50) DEFAULT NULL,
  `smsSignature` varchar(100) DEFAULT NULL,
  `baleBotToken` varchar(255) DEFAULT NULL,
  `baleChannelOrChatId` varchar(100) DEFAULT NULL,
  `settings_json` longtext DEFAULT NULL,
  `updatedAt` varchar(100) DEFAULT NULL,
  `logoIcon` varchar(100) DEFAULT 'mountain',
  `themePalette` varchar(50) DEFAULT 'teal'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `club_settings`
--

INSERT INTO `club_settings` (`id`, `name`, `slogan`, `logo_Icon`, `theme_Palette`, `smsApiKey`, `smsLineNumber`, `smsSignature`, `baleBotToken`, `baleChannelOrChatId`, `settings_json`, `updatedAt`, `logoIcon`, `themePalette`) VALUES
('1', 'باشگاه سنگ‌نوردی موج', 'اوج افتخار، تمرکز و استقامت در سنگ‌نوردی', 'mountain', 'teal', '', '30007732', 'باشگاه موج', '', '', '{\"smsApiKey\":\"\",\"smsLineNumber\":\"30007732\",\"smsSignature\":\"باشگاه موج\",\"baleBotToken\":\"\",\"baleChannelOrChatId\":\"\",\"updatedAt\":\"1405/06/02\"}', '2026-08-24T12:15:05.034Z', 'mountain', 'teal');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `sportType` varchar(100) DEFAULT NULL,
  `coachId` varchar(100) DEFAULT NULL,
  `coachName` varchar(255) DEFAULT NULL,
  `daysOfWeek` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`daysOfWeek`)),
  `startTime` varchar(50) DEFAULT NULL,
  `endTime` varchar(50) DEFAULT NULL,
  `capacity` int(11) DEFAULT 20,
  `monthlyFee` double DEFAULT NULL,
  `sessionsLimit` int(11) DEFAULT 12,
  `isActive` tinyint(1) DEFAULT 1,
  `description` text DEFAULT NULL,
  `startDate` varchar(100) DEFAULT NULL,
  `endDate` varchar(100) DEFAULT NULL,
  `registrationDeadline` varchar(100) DEFAULT NULL,
  `level` varchar(100) DEFAULT NULL,
  `locationRoom` varchar(255) DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `category` varchar(100) DEFAULT NULL,
  `maxCapacity` int(11) DEFAULT 20
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `title`, `sportType`, `coachId`, `coachName`, `daysOfWeek`, `startTime`, `endTime`, `capacity`, `monthlyFee`, `sessionsLimit`, `isActive`, `description`, `startDate`, `endDate`, `registrationDeadline`, `level`, `locationRoom`, `createdAt`, `version`, `category`, `maxCapacity`) VALUES
('sess-1787573638166-9sj8', '5413213', 'سنگ‌نوردی عمومی', 'usr-admin-1', 'مدیر کل مجموعه+', '[\"شنبه\",\"دوشنبه\",\"چهارشنبه\"]', '17:00', '19:00', 15, 1500000, 12, 1, '', '', '', '', '', '', '1405/06/02', 1, 'سنگ‌نوردی عمومی', 20),
('sess-1787576234279', '[E2E-DUP] 1787576234279', 'سنگ‌نوردی عمومی', 'usr-admin-1', 'مدیر', '[\"شنبه\"]', '18:00', '19:30', 15, 1000000, 12, 1, '', '', '', '', '', '', '2026-08-24T12:57:14.279Z', 1, 'سنگ‌نوردی عمومی', 20),
('session-1787576357726-68', '[E2E-DUP] 1787576356916', 'سنگ‌نوردی عمومی', 'usr-admin-1', '', '[\"شنبه\"]', '18:00', '19:30', 15, 1000000, 12, 1, '', '1403/06/01', '1403/07/01', '', '', '', '2026-08-24T12:59:17.726Z', 1, 'سنگ‌نوردی عمومی', 20),
('session-1787576396649-78', '[E2E-DUP] 1787576395798', 'سنگ‌نوردی عمومی', 'usr-admin-1', '', '[\"شنبه\"]', '18:00', '19:30', 15, 1000000, 12, 1, '', '1403/06/01', '1403/07/01', '', '', '', '2026-08-24T12:59:56.649Z', 1, 'سنگ‌نوردی عمومی', 20);

-- --------------------------------------------------------

--
-- Table structure for table `creditors`
--

CREATE TABLE `creditors` (
  `id` varchar(100) NOT NULL,
  `creditorName` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `categoryTitle` varchar(255) DEFAULT NULL,
  `contactPhone` varchar(20) DEFAULT NULL,
  `ibanNumber` varchar(100) DEFAULT NULL,
  `amount` decimal(18,2) DEFAULT 0.00,
  `dueDate` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'unpaid',
  `notes` text DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `debtors`
--

CREATE TABLE `debtors` (
  `id` varchar(100) NOT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `fullName` varchar(255) DEFAULT NULL,
  `nationalId` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `categoryTitle` varchar(255) DEFAULT NULL,
  `amount` decimal(18,2) DEFAULT 0.00,
  `dueDate` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `debtors`
--

INSERT INTO `debtors` (`id`, `userId`, `fullName`, `nationalId`, `phone`, `category`, `categoryTitle`, `amount`, `dueDate`, `status`, `notes`, `createdAt`, `version`) VALUES
('debt-shop-inv-1787575517292', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', '09121111111', 'equipment', 'فاکتور فروشگاه INV-5517293', 50000.00, '2026-08-24T12:45:17.293Z', 'overdue', 'بابت فاکتور INV-5517293', '', 1),
('debt-shop-inv-1787576444581', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', '09121111111', 'equipment', 'فاکتور فروشگاه INV-6444582', 50000.00, '2026-08-24T13:00:44.582Z', 'overdue', 'بابت فاکتور INV-6444582', '', 1);

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` varchar(100) NOT NULL,
  `sessionId` varchar(100) DEFAULT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `athleteName` varchar(255) DEFAULT NULL,
  `athletePhone` varchar(20) DEFAULT NULL,
  `athleteNationalId` varchar(20) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `paymentStatus` varchar(50) DEFAULT 'paid',
  `trackingNumber` varchar(100) DEFAULT NULL,
  `receiptUrl` longtext DEFAULT NULL,
  `receiptFileName` varchar(255) DEFAULT NULL,
  `paymentMethod` varchar(50) DEFAULT NULL,
  `enrolledAt` varchar(100) DEFAULT NULL,
  `expireDate` varchar(100) DEFAULT NULL,
  `startDate` varchar(100) DEFAULT NULL,
  `endDate` varchar(100) DEFAULT NULL,
  `totalSessionsAllowed` int(11) DEFAULT 12,
  `usedSessionsCount` int(11) DEFAULT 0,
  `priceAtEnrollment` decimal(18,2) DEFAULT 0.00,
  `createdAt` varchar(100) DEFAULT NULL,
  `updatedAt` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `enrollments`
--

INSERT INTO `enrollments` (`id`, `sessionId`, `userId`, `athleteName`, `athletePhone`, `athleteNationalId`, `status`, `paymentStatus`, `trackingNumber`, `receiptUrl`, `receiptFileName`, `paymentMethod`, `enrolledAt`, `expireDate`, `startDate`, `endDate`, `totalSessionsAllowed`, `usedSessionsCount`, `priceAtEnrollment`, `createdAt`, `updatedAt`, `version`) VALUES
('enr-1787574405171-9lj5', 'sess-1787573638166-9sj8', 'user-1786203971874-2zgl52', 'حسین نیک فطرت', '09010826196', '5480108026', 'active', 'pending', '', NULL, '', 'pos', '2026-08-24T12:26:45.174Z', '', '2026-08-24T12:26:45.174Z', '', 12, 0, 1500000.00, NULL, NULL, 1),
('enr-1787574621014-ofrj', 'sess-1787573638166-9sj8', 'user-1786203973812-x100uq', 'سارا یگانه', '09170350090', '3560257735', 'active', 'pending', '', NULL, '', 'pos', '2026-08-24T12:30:21.017Z', '', '2026-08-24T12:30:21.017Z', '', 12, 0, 1500000.00, NULL, NULL, 1),
('enr-1787574621015-5jnw', 'sess-1787573638166-9sj8', 'user-1786203975346-h8o5tr', 'امیر علی نیک فطرت', '09174455423', '5489405953', 'active', 'pending', '', NULL, '', 'pos', '2026-08-24T12:30:21.027Z', '', '2026-08-24T12:30:21.027Z', '', 12, 0, 1500000.00, NULL, NULL, 1),
('enr-1787576034349-yu7r', 'sess-1787573638166-9sj8', 'user-1786203980498-a3ky8n', 'مهدیه مومنی', '09172374459', '3560254280', 'active', 'pending', '', NULL, '', 'pos', '2026-08-24T12:53:54.352Z', '', '2026-08-24T12:53:54.352Z', '', 12, 0, 1500000.00, NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `insurance_requests`
--

CREATE TABLE `insurance_requests` (
  `id` varchar(100) NOT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `userNationalId` varchar(20) DEFAULT NULL,
  `insuranceNumber` varchar(100) DEFAULT NULL,
  `startDate` varchar(100) DEFAULT NULL,
  `expiryDate` varchar(100) DEFAULT NULL,
  `documentUrl` longtext DEFAULT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `rejectionReason` text DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL,
  `reviewedAt` varchar(100) DEFAULT NULL,
  `reviewedBy` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parent_athlete_links`
--

CREATE TABLE `parent_athlete_links` (
  `id` varchar(100) NOT NULL,
  `parentId` varchar(100) NOT NULL,
  `athleteId` varchar(100) NOT NULL,
  `relationType` varchar(50) NOT NULL,
  `createdAt` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pre_registrations`
--

CREATE TABLE `pre_registrations` (
  `id` varchar(100) NOT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `fullName` varchar(255) NOT NULL,
  `fatherName` varchar(255) DEFAULT NULL,
  `shenasnamehNo` varchar(50) DEFAULT NULL,
  `nationalId` varchar(20) NOT NULL,
  `birthDate` varchar(50) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `isUnder18` tinyint(1) DEFAULT 0,
  `phone` varchar(20) NOT NULL,
  `emergencyContactName` varchar(255) DEFAULT NULL,
  `emergencyContactRelation` varchar(100) DEFAULT NULL,
  `emergencyContactPhone` varchar(20) DEFAULT NULL,
  `bloodType` varchar(20) DEFAULT NULL,
  `shoeSize` varchar(20) DEFAULT NULL,
  `clothingSize` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `medicalConditions` text DEFAULT NULL,
  `educationOrJob` varchar(255) DEFAULT NULL,
  `referrerName` varchar(255) DEFAULT NULL,
  `referrerPhone` varchar(20) DEFAULT NULL,
  `climbingExperienceLevel` varchar(50) DEFAULT NULL,
  `insuranceNumber` varchar(100) DEFAULT NULL,
  `parentFullName` varchar(255) DEFAULT NULL,
  `parentNationalId` varchar(20) DEFAULT NULL,
  `parentPhone` varchar(20) DEFAULT NULL,
  `avatarUrl` longtext DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `rejectionReason` text DEFAULT NULL,
  `assignedRoles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`assignedRoles`)),
  `createdUserId` varchar(100) DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL,
  `reviewedAt` varchar(100) DEFAULT NULL,
  `reviewedBy` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pre_registrations`
--

INSERT INTO `pre_registrations` (`id`, `firstName`, `lastName`, `fullName`, `fatherName`, `shenasnamehNo`, `nationalId`, `birthDate`, `gender`, `isUnder18`, `phone`, `emergencyContactName`, `emergencyContactRelation`, `emergencyContactPhone`, `bloodType`, `shoeSize`, `clothingSize`, `address`, `medicalConditions`, `educationOrJob`, `referrerName`, `referrerPhone`, `climbingExperienceLevel`, `insuranceNumber`, `parentFullName`, `parentNationalId`, `parentPhone`, `avatarUrl`, `status`, `rejectionReason`, `assignedRoles`, `createdUserId`, `createdAt`, `reviewedAt`, `reviewedBy`) VALUES
('33', 'صدف', 'باخته', 'صدف باخته', '', '', '3241407330', '1995-03-27', 'female', 0, '09213849973', '', '', '09174455423', '', '38', 'L', 'کنگان مدرس غربی انتهای فرعی سه', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5a73d6aae2c4.27382958_0d139b7b.jpg', 'approved', '', '[\"athlete\"]', 'user-1787390875057-na8piu', '', '1405/05/31', 'مدیر ارشد'),
('34', 'حسین', 'نیک فطرت', 'حسین نیک فطرت', '', '', '5480108026', '2000-03-01', 'male', 0, '09010826196', '', '', '09174455423', '', '0', '1', 'شیراز زیبا شهر', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5a75c367d453.63727353_ec1681dc.jpg', 'approved', '', '[\"admin\",\"coach\"]', 'user-1786203971874-2zgl52', '', '1405/05/29', 'مدیر ارشد'),
('35', 'سارا', 'یگانه', 'سارا یگانه', '', '', '3560257735', '2024-11-15', 'female', 0, '09170350090', '', '', '09171713264', '', '0', 'M', 'خ معلم-خ بهار فرعی ۴', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5a7871587a46.12951114_8f740334.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786203973812-x100uq', '', '1405/05/29', 'مدیر ارشد'),
('37', 'امیر علی', 'نیک فطرت', 'امیر علی نیک فطرت', '', '', '5489405953', '2026-07-14', 'male', 1, '09174455423', '', '', '09178716467', '', '40', 'm', 'بندر کنگان میدان پریشانی خیابان مدرس غربی انتهای فرعی 3 ساختمان دو قلو سمت چپ طبقه 2', '', '', '', '', 'intermediate', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786203975346-h8o5tr', '', '1405/05/29', 'مدیر ارشد'),
('38', 'امین', 'رحیم پور', 'امین رحیم پور', '', '', '2281955151', '2026-07-24', 'male', 1, '09170526228', '', '', '09355209420', '', '42', 'L', 'شیراز', '', '', '', '', 'intermediate', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786203976890-cuq7z8', '', '1405/05/29', 'مدیر ارشد'),
('39', 'امیرحسام', 'بحرانی', 'امیرحسام بحرانی', '', '', '3560510856', '2017-08-27', 'male', 1, '09173750343', '', '', '09176426912', '', '0', 'M', 'کنگان مدرس شرقی فرعی چهار', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5ca4aef14321.43857490_8bdd961c.jpg', 'approved', '', '[\"athlete\"]', 'user-1786203978713-h0oce4', '', '1405/05/29', 'مدیر ارشد'),
('40', 'مهدیه', 'مومنی', 'مهدیه مومنی', '', '', '3560254280', '2003-07-28', 'female', 0, '09172374459', '', '', '09177780262', '', '43', 'M', 'خیابان آزادی فرعی ده', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786203980498-a3ky8n', '', '1405/05/29', 'مدیر ارشد'),
('41', 'دلنیا', 'امیدی', 'دلنیا امیدی', '', '', '2286923612', '2015-06-28', 'female', 1, '09903297708', '', '', '09366720589', '', '0', 'M', 'خیابان یاس، فرعی هشتم', '', '', '', '', 'professional', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786203981858-g4m37l', '', '1405/05/29', 'مدیر ارشد'),
('42', 'علیرضا', 'غلامی', 'علیرضا غلامی', '', '', '3550161689', '2002-01-20', 'male', 0, '09175255240', '', '', '09039751085', '', '0', 'L', 'کنگان خیابان حافظ فرعی ۵', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5ca79ca2e918.46374515_0ab5ad62.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786203983306-b9pv57', '', '1405/05/29', 'مدیر ارشد'),
('43', 'دلوان', 'امیدی', 'دلوان امیدی', '', '', '3560546087', '2020-01-27', 'female', 1, '09903297708', '', '', '09903297708', '', '0', 'S', 'خیابان یاس، فرعی هشتم', '', '', '', '', 'advanced', '', '', '', '', 'uploads/user_6a5ca8bbe0cc44.22216455_bc04f2b9.jpg', 'approved', '', '[\"athlete\"]', 'user-1786203984698-fud8ir', '', '1405/05/29', 'مدیر ارشد'),
('44', 'داریوش', 'پور سعید', 'داریوش پور سعید', '', '', '0781866022', '2012-09-21', 'male', 1, '09158199361', '', '', '09158199361', '', '38', 'M', 'خیابان شهید رجایی فرعی هفتم', '', '', '', '', 'professional', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786203986194-5zbcoq', '', '1405/05/29', 'مدیر ارشد'),
('45', 'شایان', 'استوار', 'شایان استوار', '', '', '2285832941', '2011-12-13', 'male', 1, '09231251819', '', '', '09231251819', '', '0', 'M', 'خیابان شهید رجایی', '', '', '', '', 'professional', '', '', '', '', 'uploads/user_6a5ca98bd84ac0.77908976_f10f95f1.jpg', 'approved', '', '[\"athlete\"]', 'user-1786203989546-8cqtl3', '', '1405/05/29', 'مدیر ارشد'),
('46', 'پوریا', 'عسگری', 'پوریا عسگری', '', '', '3560451663', '2014-05-08', 'male', 1, '09132843158', '', '', '09132843158', '', '38', 'M', 'کنگان خیابان برق فرعی دهم ساختمان ارغوان', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5cd8c943c042.14010718_66b61109.jpg', 'approved', '', '[\"athlete\"]', 'user-1786203991162-bo3ene', '', '1405/05/29', 'مدیر ارشد'),
('47', 'محمدمهدی', 'دراهکی', 'محمدمهدی دراهکی', '', '', '3570290379', '2016-11-02', 'male', 1, '09164236864', '', '', '09176441862', '', '36', 'M', 'استان بوشهر، شهرستان دیر، شهر دیر، خیابان شهید موسی دراهکی، پلاک 24', '', '', '', '', 'intermediate', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786203992578-v94tmr', '', '1405/05/29', 'مدیر ارشد'),
('48', 'حسام الدین', 'احمدی', 'حسام الدین احمدی', '', '', '2451886072', '1981-04-19', 'male', 0, '09129171382', '', '', '09197058599', '', '0', 'L', 'کنگان پالایشگاه نهم', '', '', '', '', 'intermediate', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786203994434-ooyfmm', '', '1405/05/29', 'مدیر ارشد'),
('49', 'آراد', 'شفیعی', 'آراد شفیعی', '', '', '1811505341', '2016-07-12', 'male', 1, '09394019017', '', '', '09106482477', '', '0', 'M', 'مدرس غربی انتهای فرعی۴', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5ceca4c7ea13.45889657_c46b5681.jpg', 'approved', '', '[\"athlete\"]', 'user-1786203996017-ifc258', '', '1405/05/29', 'مدیر ارشد'),
('50', 'پویان', 'محمدنژاد ملکوتی', 'پویان محمدنژاد ملکوتی', '', '', '2210742986', '2019-09-28', 'male', 1, '09112277064', '', '', '09114740258', '', '32', 'M', 'بوشهر، کنگان، خیابان برق ، فرعی ۵، ساختمان ترنم', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5d0c0922e8b6.91024284_92837cf8.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204002290-qu51f1', '', '1405/05/29', 'مدیر ارشد'),
('54', 'سورنا', 'فخرایی', 'سورنا فخرایی', '', '', '3570299163', '2017-06-06', 'male', 1, '09173752497', '', '', '09364590336', '', '0', 'M', 'کنگان ، مدرس غربی ، فرعی ششم', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5d3fa88faae6.67915246_dc264149.jpg', 'approved', '', '[\"athlete\"]', 'user-1786203997450-vgly3z', '', '1405/05/29', 'مدیر ارشد'),
('55', 'بهراد', 'حسنی', 'بهراد حسنی', '', '', '0027215504', '2026-07-07', 'male', 1, '09173409235', '', '', '09173402259', '', '0', 'M', 'کنگان قائم دو فرعی ۳۰', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5d5b86e64008.45505706_85fcbd8e.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204000514-qawtke', '', '1405/05/29', 'مدیر ارشد'),
('56', 'رادین', 'حسنی', 'رادین حسنی', '', '', '0027740560', '2017-11-21', 'male', 1, '09173409235', '', '', '09173402259', '', '0', 'M', 'کنگان قائم ۲فرعی ۳۰', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5d5c443f8879.57765518_b1a05dec.jpg', 'approved', '', '[\"athlete\"]', 'user-1786203999010-8tlcp3', '', '1405/05/29', 'مدیر ارشد'),
('57', 'تیام', 'نیک شعار', 'تیام نیک شعار', '', '', '3560520568', '2018-05-26', 'female', 1, '09902880945', '', '', '09178720450', '', '36', 's', 'کنگان بلوار ساحلی فرعی ۲۵ منزل نامداری', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5ddc740f7871.54675579_8ee66ae5.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786204003762-61juwz', '', '1405/05/29', 'مدیر ارشد'),
('58', 'وانیا', 'فرزانه', 'وانیافرزانه', '', '', '2287953035', '2018-05-24', 'female', 1, '09122200725', '', '', '09177771799', '', '35', '?', 'کنگان.غدیر', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5ddf6f9d33f1.55603341_63fa7b95.png', 'approved', '', '[\"athlete\"]', 'user-1786204005201-9c1roo', '', '1405/05/29', 'مدیر ارشد'),
('59', 'احسان', 'فروتن', 'احسان فروتن', '', '', '2500138941', '1990-05-23', 'male', 0, '09304876599', '', '', '09304876599', '', '0', '۴۰', 'کنگان خیابان معلم فرعی بهار', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5df7894d21e2.74054757_306bd3f1.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204006521-bq36ks', '', '1405/05/29', 'مدیر ارشد'),
('60', 'یاس', 'رئیسی نژاد', 'یاس رئیسی نژاد', '', '', '2287342141', '2016-08-24', 'female', 1, '09173416365', '', '', '09362958266', '', '34', 'M', 'کنگان ایثار ۳فرعی ۱۴', '', '', '', '', 'advanced', '', '', '', '', 'uploads/user_6a5dff9063f0e4.13229436_f0110d23.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204007881-wzr48h', '', '1405/05/29', 'مدیر ارشد'),
('61', 'حسین', 'اسماعیلی', 'حسین اسماعیلی', '', '', '3560063922', '1991-03-26', 'male', 0, '09171032719', '', '', '09177757313', '', '0', 'M', 'کنگان خ سلامت نبش فرعی ۱۰', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5e00b9b88893.95970561_255d164c.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786204009355-047slz', '', '1405/05/29', 'مدیر ارشد'),
('62', 'زهرا', 'احمدی', 'زهرا احمدی', '', '', '3560503841', '2017-06-17', 'female', 1, '09385125097', '', '', '09337713010', '', '0', 'M', 'کنگان انتهای فرعی ۱۴', '', '', '', '', 'intermediate', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204010834-pa874a', '', '1405/05/29', 'مدیر ارشد'),
('63', 'دلسا', 'قایدی', 'دلسا قایدی', '', '', '3511007313', '2018-06-25', 'female', 1, '09173778503', '', '', '09173750526', '', '0', 'M', 'کنگان،ایثار ۳،ساختمان باران', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204013890-b0iq6a', '', '1405/05/29', 'مدیر ارشد'),
('64', 'محدثه', 'درا', 'محدثه درا', '', '', '3510992504', '2018-01-11', 'female', 1, '09175109334', '', '', '09170119734', '', '0', 'S', 'بوشهر_کنگان_خیابان برق_فرعی۶', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5e142d9a3545.98660665_780c3569.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204012241-6o500e', '', '1405/05/29', 'مدیر ارشد'),
('65', 'آرام', 'مقیمی', 'آرام مقیمی', '', '', '2481230345', '2021-03-08', 'female', 1, '09171328343', '', '', '09177324197', '', '34', 'M', 'خیابان یاس فرعی 14', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204015346-2x4ohs', '', '1405/05/29', 'مدیر ارشد'),
('66', 'یسنا', 'درویشی', 'یسنا درویشی', '', '', '2288128968', '2018-11-21', 'female', 1, '09176428520', '', '', '09177701854', '', '0', 'M', 'کنگان ،انتهای خیابان تختی ،۳۰ متری عرضی رو به کوه ساختمان باران', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5e1597c5a327.16871919_3406e333.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204017074-ym7j1u', '', '1405/05/29', 'مدیر ارشد'),
('67', 'رادمان', 'عالیخانی', 'رادمان عالیخانی', '', '', '4062705303', '2017-09-02', 'male', 1, '09160523423', '', '', '09163602505', '', '0', 'د', 'خیابان برق فرعی چهارم ساختمان نجلا واحد یک', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5e1dbeea1342.26748674_7a3778fc.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786204019338-1ckmxd', '', '1405/05/29', 'مدیر ارشد'),
('68', 'ماهان', 'حسن زاده', 'ماهان حسن زاده', '', '', '4611699031', '2016-08-15', 'male', 1, '09162269213', '', '', '09162269213', '', '0', 'M', 'کنگان خیابان برق', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5e36622d1cc2.78858732_4cebe174.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204020666-xrzbmh', '', '1405/05/29', 'مدیر ارشد'),
('69', 'آوین', 'ملکی', 'آوین ملکی', '', '', '2288170573', '2026-06-22', 'female', 1, '09164585147', '', '', '09174242771', '', '0', 'N', 'کنگان \r\nفرهنگیان خیابان سلامت', '', '', '', '', 'professional', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204022138-stc6ns', '', '1405/05/29', 'مدیر ارشد'),
('70', 'امیرحسن', 'مهدوی', 'امیرحسن مهدوی', '', '', '4710600783', '1996-05-25', 'male', 0, '09304543322', '', '', '09126110116', '', '0', 'M', 'شیراز-فرهنگشهر- فرزانگان ۳۵۲', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a5e7384bf5fe6.70407354_b492c13b.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786204023666-swczlu', '', '1405/05/29', 'مدیر ارشد'),
('71', 'کیان', 'اپرا', 'کیان اپرا', '', '', '3560459230', '2014-10-16', 'male', 1, '09171786473', '', '', '09176657301', '', '35', 'M', 'خیابان ملاصدرا', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5e8ca66b68e9.70478063_2cdfc6f1.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204025075-b6htg7', '', '1405/05/29', 'مدیر ارشد'),
('72', 'آبتین', 'ملکی', 'آبتین ملکی', '', '', '2286536244', '2026-06-22', 'male', 1, '09174242771', '', '', '09164585147', '', '0', 'M', 'کنگان \r\nفرهنگیان خیابان سلامت', '', '', '', '', 'professional', '', '', '', '', 'uploads/user_6a5f639277b777.40786177_e917fd50.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204026250-gfu8hx', '', '1405/05/29', 'مدیر ارشد'),
('73', 'نفس', 'مقصودی', 'نفس مقصودی', '', '', '3510975091', '2017-07-31', 'female', 1, '09179299445', '', '', '09397531582', '', '0', 'M', 'کنگان. خ معلم. فرعی ۲۱', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5f7f56a63d96.33587723_f744dc9f.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204027433-e4zf29', '', '1405/05/29', 'مدیر ارشد'),
('74', 'فردین', 'بحرانی', 'فردین بحرانی', '', '', '3570318818', '2018-12-30', 'male', 1, '09173724675', '', '', '09177769473', '', '35', '34', 'کنگان شهرک فرهنگیان خیابان شهید مصلح فرعی ۲ بعد سوپر مارکت عسل', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a5f81e8b11621.22413046_a70a96b1.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786204028810-o5963n', '', '1405/05/29', 'مدیر ارشد'),
('75', 'سارا', 'ربیعه', 'سارا ربیعه', '', '', '3560467594', '2015-05-02', 'female', 1, '09107107104', '', '', '09177864825', '', '3', 'm', 'استان بوشهر شهرستان کنگان خیابان ایثار 3فرعی 28', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a60a033030223.57664277_aa8b68e7.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204030218-6iruz7', '', '1405/05/29', 'مدیر ارشد'),
('76', 'شهریار', 'طهماسبی کنگانی', 'شهریارطهماسبی کنگانی', '', '', '3560524611', '2018-08-27', 'male', 1, '09177795293', '', '', '09177795293', '', '0', 'M', 'کنگان-کوچه بانک رفاه-کوچه سوم', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a60c835a215f8.13976908_53d44710.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204031410-sm5p8p', '', '1405/05/29', 'مدیر ارشد'),
('77', 'دایانا', 'هنرجو', 'دایانا هنرجو', '', '', '1748646540', '2016-11-07', 'female', 1, '09304302600', '', '', '09304302600', '', '36', 'S', 'کنگان- شهرک فرهنگیان - خیابان مصلح فرعی 2', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204032898-g8yu6t', '', '1405/05/29', 'مدیر ارشد'),
('78', 'درسانا', 'هنرجو', 'درسانا هنرجو', '', '', '1748936697', '2017-08-19', 'female', 1, '09100375621', '', '', '09100375621', '', '34', 'S', 'کنگان- شهرک فرهنگیان - خیابان مصلح فرعی 2', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204034482-o0iu1o', '', '1405/05/29', 'مدیر ارشد'),
('79', 'محمد طه', 'عارف نیا', 'محمد طه عارف نیا', '', '', '1811172075', '2011-07-30', 'male', 1, '09942875968', '', '', '09942875968', '', '0', 'Xl', 'طالقانی شهید بحرینی پور فرعی ۳', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204036010-pst1qx', '', '1405/05/29', 'مدیر ارشد'),
('80', 'دانیال', 'گلابی', 'دانیال گلابی', '', '', '3490384806', '1998-08-17', 'male', 0, '09367656204', '', '', '09367656204', '', '42', 'M', 'کنگان-خیابان تختی-فرعی۶', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204037137-2v3z12', '', '1405/05/29', 'مدیر ارشد'),
('81', 'کیان', 'رستگار فرد', 'کیان رستگار فرد', '', '', '3540473599', '2017-12-17', 'male', 1, '09178798232', '', '', '09170158876', '', '32', 'S', 'کنگان،بنک،مسکن مهر جنب کلانتری 13فرعی2', '', '', '', '', 'advanced', '', '', '', '', 'uploads/user_6a6215ca0ca8e3.57247640_8b64ed66.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204038250-j73lev', '', '1405/05/29', 'مدیر ارشد'),
('82', 'علی', 'خردیار', 'علی خردیار', '', '', '2372443542', '1985-03-21', 'male', 0, '09176322318', '', '', '09176322318', '', '0', 'L', 'کنگان- خیابان ملاصدرا- فرعی ۶', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a62500c7f5ac9.48613919_1a78f221.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204039522-894b3x', '', '1405/05/29', 'مدیر ارشد'),
('83', 'پریا', 'رهپیما', 'پریا رهپیما', '', '', '2284621791', '2007-08-18', 'female', 1, '09367935008', '', '', '09367935008', '', '0', 'M', 'خیالان طالقانی فرعی ۱۰', '', '', '', '', 'professional', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204040634-f4t66p', '', '1405/05/29', 'مدیر ارشد'),
('84', 'عاطفه', 'گودرزی', 'عاطفه گودرزی', '', '', '1270153374', '1989-07-12', 'female', 0, '09132121173', '', '', '09163996617', '', '0', 'M', 'جم.بلوار فرودگاه. کوچه بهشت ۱۳ . پلاک ۲۰', '', '', '', '', 'beginner', '', '', '', '', 'uploads/user_6a64a5f134a8b2.32254760_85cfb18f.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204041890-15i79a', '', '1405/05/29', 'مدیر ارشد'),
('85', 'زهرا', 'قرخلو', 'زهرا قرخلو', '', '', '1199944998', '1989-02-06', 'female', 0, '09132752610', '', '', '09132752610', '', '0', 'M', 'کنگان ایثار یک', '', '', '', '', 'advanced', '', '', '', '', 'uploads/user_6a650de34b4516.89554293_372d102a.jpeg', 'approved', '', '[\"athlete\"]', 'user-1786204043034-h31m7p', '', '1405/05/29', 'مدیر ارشد'),
('86', 'آیهان', 'گرجی فرد', 'آیهان گرجی فرد', '', '', '2288344199', '2019-07-24', 'male', 1, '09353015650', '', '', '09905459210', '', '32', 'S', 'بوشهر -کنگان خیابون یاس فرعی ۱۰', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a68476a8a83b2.60834813_a2e67373.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204044258-hwsatm', '', '1405/05/29', 'مدیر ارشد'),
('87', 'سجاد', 'خالویی', 'سجاد خالویی', '', '', '2380901260', '2026-07-28', 'male', 1, '09907304580', '', '', '09179613050', '', '0', 'S', 'کنگان خیابان ایثار ۳ فرعی ۳', '', '', '', '', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786204045434-oj3wvz', '', '1405/05/29', 'مدیر ارشد'),
('88', 'محمدحسین', 'کنگانی', 'محمدحسین کنگانی', '', '', '3560476100', '2015-11-06', 'male', 1, '09388134100', '', '', '09901144977', '', '36', 'S', 'خیابان طالقانی کوچه ۵۶ کوچه بن بست', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a68c3672849e3.38848129_d8f3dc0b.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204046915-entttb', '', '1405/05/29', 'مدیر ارشد'),
('89', 'نیکا', 'کنگانی', 'نیکا کنگانی', '', '', '3560493145', '2016-10-27', 'female', 1, '09177772483', '', '', '09176283619', '', '36', 'M', 'مدرس غربی\r\nخ خوارزمی \r\nفرعی6', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a6a0f4d348a33.47525632_2d09608e.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204048331-7z8rt0', '', '1405/05/29', 'مدیر ارشد'),
('90', 'آریا', 'کنگانی', 'آریا کنگانی', '', '', '3560527678', '2018-10-27', 'male', 1, '09177772483', '', '', '09176283619', '', '35', 'M', 'استان بوشهر \r\nشهرستان کنگان \r\nمدرس غربی خیابان خوارزمی فرعی 6', '', '', '', '', 'intermediate', '', '', '', '', 'uploads/user_6a6a11365458e9.14901323_bb2163e7.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204049642-ux9t3m', '', '1405/05/29', 'مدیر ارشد'),
('91', 'فاطیما', 'عزیزی', 'فاطیما عزیزی', '', '', '3243880807', '2010-02-22', 'female', 1, '09188887192', '', '', '09188561194', '', '0', 'L', 'جم-شهرک پردیس-بلوک خیام-کوی سوم-واحد ۲۴۹', '', '', '', '', 'advanced', '', '', '', '', 'uploads/user_6a6d7f877204d3.34666092_091b5a03.jpg', 'approved', '', '[\"athlete\"]', 'user-1786204050922-ufml72', '', '1405/05/29', 'مدیر ارشد'),
('prereg-1786343992605-uppvsi', 'فرید', 'فهیمی زاده', 'فرید فهیمی زاده', 'قطب الدین', '‏‪356-042-6987‬‏', '3560426987', '1391/12/28', 'male', 1, '09934513506', 'فهیمه رنجبر', 'مادر', '09172152715', 'O+', '39', 'M', 'خیابان شهید بهزادی فرعی 2', '', 'محصل', 'حسن نیک فطرت', '09926163119', 'beginner', '', 'فهیمه رنجبر', '3569415732', '09172152715', '', 'approved', '', '[\"athlete\"]', 'user-1786368129292-crub22', '1405/05/19', '1405/05/29', 'مدیر ارشد'),
('prereg-1786351684730-2pxn46', 'پارسا', 'امیدوار', 'پارسا امیدوار', 'رضا', '3560490707', '3560490707', '1395/06/18', 'male', 1, '09177897494', 'رضا', 'پدر', '09171862998', 'A+', '36', 'M', 'بوشهر کنگان خیابان سلمان فارسی فرعی چهارم', 'ندارد', 'دانش اموز', '', '09171862998', 'intermediate', '', 'رضا امیدوار', '2372569643', '09171862998', '', 'approved', '', '[\"athlete\"]', 'user-1786368126578-uiznqa', '1405/05/19', '1405/05/29', 'مدیر ارشد'),
('prereg-1786367871550-5jk2t1', 'حنا', 'ملک زاده', 'حنا ملک زاده', 'علی', '5500125184', '5500125184', '1395/03/11', 'female', 1, '09174812264', 'مادر', 'پدر', '09174812264', 'A+', '35', 'M', 'بوشهر،کنگان،خیابان استخر،فرعی سوم', '', '', 'نیک فطرت', '09164715806', 'beginner', '', 'علی ملک زاده', '5509945168', '09174812264', '', 'approved', '', '[\"athlete\"]', 'user-1786368123544-k1eoms', '1405/05/19', '1405/05/29', 'مدیر ارشد'),
('prereg-1786431217196-d4uuge', 'رایان', 'رحیمی', 'رایان رحیمی', 'حمزه', '2286711801', '2286711801', '1393/08/08', 'male', 1, '09013079398', '۰۹۰۳۵۲۴۲۱۷۷', 'پدر', '09013079398', 'O+', '39', 'M', 'استان بوشهر ، کنگان ، بلوار ایثارگران،فرعی۲۶', '', 'محصل', 'الهه ارون', '', 'beginner', '', 'حنزه رحیمی', '2511559005', '09177823724', '/upload/profile_image/________________1786430948795.heic', 'approved', '', '[\"athlete\"]', 'user-1786450689093-m12det', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786431432728-sucx0k', 'فرحان', 'رحیمی', 'فرحان رحیمی', 'حمزه', '2500770532', '2500770532', '1390/07/18', 'male', 1, '09033005424', '۰۹۰۳۵۲۴۲۱۷۷', 'پدر', '09013079398', 'O+', '46', 'XL', 'استان بوشهر ، کنگان ، بلوار ایثارگران،فرعی۲۶', '', 'محصل', 'الهه ارون', '', 'intermediate', '', 'حنزه رحیمی', '2511559005', '09177823724', '/upload/profile_image/2I1A4048_1786431392708.jpg', 'approved', '', '[\"athlete\"]', 'user-1786450701736-pumzks', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786444974620-ssreub', 'احمد', 'سطحانیان', 'احمد سطحانیان', 'محمود', '3560497426', '3560497426', '1395/10/26', 'male', 1, '09379691381', 'محمود سطحانیان', 'پدر', '09361512441', 'O+', '37', 'S', 'شهرستان کنگان خ وحدت کوچه فرهنگ', '', 'محصل', '', '', 'advanced', '', 'محمود سطحانیان', '3569917541', '09361512441', '/upload/profile_image/3560497426.jpg', 'approved', '', '[\"athlete\"]', 'user-1786450706767-9bm9ro', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786451964024-jh7nfm', 'علی', 'آسایش', 'علی آسایش', 'مصطفی', '3560486688', '3560486688', '1395/04/07', 'male', 1, '09179076306', 'مصطفی آسایش', 'پدر', '09179076303', 'A+', '38', 'M', 'بندر کنگان شهرک بهشتی', '', '', '', '', 'beginner', '', 'مصطفی آسایش', '5159913610', '09179076303', '', 'approved', '', '[\"athlete\"]', 'user-1787072325919-9msn48', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786453550353-1u4jum', 'هیرسا', 'هاشمی', 'هیرسا هاشمی', 'حامد', '2380898741', '2380898741', '1397/09/27', 'male', 1, '09174863373', '۰۹۱۷۴۸۶۳۳۷۳', 'مادر', '09171243373', 'O+', '39', 'M', 'استان بوشهر شهرستان کنگان خط محرم خیابان شهید حسن پور درب پنجم', 'آلرژی به عود', '', '', '09174863373', 'beginner', '', 'حامد هاشمی', '2391688849', '09171243373', '', 'approved', '', '[\"athlete\"]', 'user-1787072328319-9zo28o', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786455538924-o0rrd5', 'محمد متین', 'جوکار', 'محمد متین جوکار', 'بهنام', '2287320865', '2287320865', '1395/05/19', 'male', 1, '09171075529', 'یلدا جهرمی', 'مادر', '09171075529', 'O+', '39', 'S', 'استان بوشهر شهرستان کنگان خیابان هلال احمر ساختمان رستم۲ طبقه۳ واحد۷', '', 'محصل', 'مربی نیک فطرت', '09926163115', 'beginner', '2287320865', 'بهنام جوکار', '5149661945', '09173366386', '', 'approved', '', '[\"athlete\"]', 'user-1786455942646-2l5uxh', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786455674428-ieuute', 'محمد ماهان', 'جوکار', 'محمد ماهان جوکار', 'بهنام', '2288376694', '2288376694', '1398/06/07', 'male', 1, '09171075529', 'یلدا جهرمی', 'مادر', '09171075529', 'A+', '34', 'S', 'استان بوشهر شهرستان کنگان خیابان هلال احمر ساختمان رستم۲ طبقه۳ واحد۷', '', 'محصل', 'مربی نیک فطرت', '09926163115', 'beginner', '2288376694', 'بهنام جوکار', '5149661945', '09173366386', '', 'approved', '', '[\"athlete\"]', 'user-1786456115752-c3ljnd', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786462310547-6ughjd', 'امید', 'مفرج مکاری', 'امید مفرج مکاری', 'محمد', '3560531276', '3560531276', '1397/10/23', 'male', 1, '09379173352', 'محمد مفرج مکاری', 'پدر', '09379173352', 'O+', '35', 'S', 'بوشهر کنگان خیابان فرمانداری فرعی اول', '', 'محصل', 'نیک فطرت', '09926163115', 'beginner', '', 'محمد مفرج مکاری', '3560015030', '09379173352', '', 'approved', '', '[\"athlete\"]', 'user-1786517724507-83rfy3', '1405/05/20', '1405/05/29', 'مدیر ارشد'),
('prereg-1786519958029-kvacdn', 'ویانا', 'بهادری فر', 'ویانا بهادری فر', 'علی', '3560536006', '3560536006', '1398/02/17', 'female', 0, '09164233680', 'فاطمه توفان', 'مادر', '09164233680', 'O+', '34', 'S', 'شهرک‌شقایق(خیابان بیمارستان) فرعی۸', '', 'محصل', 'نیک فطرت', '09926163115', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786522521106-shmqr9', '1405/05/21', '1405/05/29', 'مدیر ارشد'),
('prereg-1786520891917-dcuoik', 'مهراد', 'شاهدی', 'مهراد شاهدی', 'علی', '2287351647', '2287351647', '1398/02/17', 'male', 0, '09173706318', 'فاطمه توفان', 'مادر', '09164233680', 'A+', '35', 'S', 'بوشهر دیر بردستان خیابان دانش آموز', 'سابقه آسم', 'محصل', 'نیک فطرت', '09926163115', 'beginner', '', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1786522527174-rsk0wr', '1405/05/21', '1405/05/29', 'مدیر ارشد'),
('prereg-1786684154223-tz4qfu', 'آرشا', 'پناهی', 'آرشا پناهی', 'علی', '2286750981', '2286750981', '1393/09/23', 'male', 1, '09032868433', 'نوشین نوری', 'مادر', '09032868433', 'O+', '39', 'L', 'بوشهر کنگان بلوار رازی فرعی6', '', 'محصل', '', '', 'intermediate', '2286750981', 'نوشین نوری', '2300088320', '09032868433', '', 'approved', '', '[\"athlete\"]', 'user-1786685463853-dpqbga', '1405/05/23', '1405/05/29', 'مدیر ارشد'),
('prereg-1786684932496-k4p1sz', 'روژان', 'صحافی زاده', 'روژان صحافی زاده', 'اسماعیل', '3560482836', '3560482836', '1395/01/11', 'female', 1, '09916801040', 'نوشین نوری', 'مادر', '09032868433', 'O+', '38', 'M', 'بوشهر کنگان خیابان برق فرعی 7', '', 'محصل', '', '', 'beginner', '', 'نوشین نوری', '2300088320', '09032868433', '', 'approved', '', '[\"athlete\"]', 'user-1786685466433-ghjs6r', '1405/05/23', '1405/05/29', 'مدیر ارشد'),
('prereg-1786685155458-x8qi2e', 'مدیسا', 'چوبینه', 'مدیسا چوبینه', 'میثم', '2288088575', '2288088575', '1397/07/19', 'female', 1, '09177247545', 'نوشین نوری', 'مادر', '09032868433', 'O+', '36', 'S', 'بوشهر کنگان خیابان برق فرعی 11', '', 'محصل', '', '', 'beginner', '', 'نوشین نوری', '2300088320', '09032868433', '', 'approved', '', '[\"athlete\"]', 'user-1786685468984-7dc8o8', '1405/05/23', '1405/05/29', 'مدیر ارشد'),
('prereg-1786797319890-0uso5s', 'رستا', 'مزارعی', 'رستا مزارعی', 'احمد', '2287000496', '2287000496', '1394/06/16', 'female', 1, '09365977161', 'احمد مزارعی', 'پدر', '09176304386', 'O+', '36', 'S', 'بوشهر کنگان ایثار۳', '', 'محصل', '', '', 'intermediate', '', 'احمد مزارعی', '2291868276', '09176304386', '', 'approved', '', '[\"athlete\"]', 'user-1786886692964-jk15da', '1405/05/24', '1405/05/29', 'مدیر ارشد'),
('prereg-1786886360639-biqdj4', 'علی', 'شهریاری', 'علی شهریاری', 'محسن', '2287118403', '2287118403', '1394/10/12', 'male', 1, '09177082967', 'محسن شهریاری', 'پدر', '09177082967', 'O+', '39', 'M', 'بندر کنگان بلوار مدرس شرقی فرعی ۹ انتهای کوچه سمت راست\nکد پستی : ۷۵۵۱۴۳۷۲۶۵', '', 'محصل', '', '', 'intermediate', '', 'محسن شهریاری', '2410103030', '09177082967', '', 'approved', '', '[\"athlete\"]', 'user-1786886695886-te6v70', '1405/05/25', '1405/05/29', 'مدیر ارشد'),
('prereg-1786886587453-qsylw1', 'السا', 'شهریاری', 'السا شهریاری', 'محسن', '2286613516', '2286613516', '1393/04/24', 'female', 1, '09177082967', 'محسن شهریاری', 'پدر', '09177082967', 'O+', '39', 'M', 'بندر کنگان بلوار مدرس شرقی فرعی ۹ انتهای کوچه سمت راست\nکد پستی : ۷۵۵۱۴۳۷۲۶۵', '', 'محصل', '', '', 'intermediate', '', 'محسن شهریاری', '2410103030', '09177082967', '', 'approved', '', '[\"athlete\"]', 'user-1786886704235-pxg7gd', '1405/05/25', '1405/05/29', 'مدیر ارشد'),
('prereg-1787072812325-kc62f1', 'امین', 'ناصری', 'امین ناصری', 'حاجی آقا', '3047', '1971700827', '1362/06/28', 'male', 0, '09900587168', 'فرهاد', 'پدر', '09133103802', 'O+', '43', '2XL', 'جم', '', 'برنامه نویس', '', '', 'beginner', '8745112', '', '', '', '', 'approved', '', '[\"athlete\"]', 'user-1787255017117-2zj0mw', '1405/05/27', '1405/05/29', 'مدیر ارشد'),
('prereg-1787145284627-t2vmv7', 'لیانا', 'رحیمی', 'لیانا رحیمی', 'مرتضی', '2287572473', '2287572473', '1393/01/01', 'female', 1, '09171109575', 'مرتضی رحیمی', 'پدر', '09171109575', 'O+', '35', 'S', 'بوشهر کنگان', '', 'محصل', '', '', 'advanced', '', 'مرتضی رحیمی', '2281559130', '09308294466', '', 'approved', '', '[\"athlete\"]', 'user-1787255019062-heehs6', '1405/05/28', '1405/05/29', 'مدیر ارشد');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` varchar(100) NOT NULL,
  `code` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `price` decimal(18,2) DEFAULT 0.00,
  `buyPrice` decimal(18,2) DEFAULT 0.00,
  `stock` int(11) DEFAULT 0,
  `minStock` int(11) DEFAULT 5,
  `minStockAlert` int(11) DEFAULT 5,
  `unit` varchar(50) DEFAULT NULL,
  `imageUrl` longtext DEFAULT NULL,
  `description` text DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `createdAt` varchar(100) DEFAULT NULL,
  `updatedAt` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` varchar(100) NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `isSystem` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `key_name`, `title`, `description`, `permissions`, `isSystem`) VALUES
('role-accountant', 'accountant', 'حسابدار', 'مدیریت فاکتورها، صندوق، بدهکاران و بستانکاران', '[]', 1),
('role-admin', 'admin', 'admin', '', '[]', 1),
('role-athlete', 'athlete', 'athlete', '', '[]', 1),
('role-coach', 'coach', 'coach', '', '[]', 1),
('role-parent', 'parent', 'والدین', 'پیگیری و مدیریت کامل فرزندان ثبت‌نام شده', '[]', 1),
('role-secretary', 'secretary', 'منشی باشگاه', 'ثبت‌نام، بررسی مدارک، بیمه ورزشی و حضور غیاب', '[]', 1),
('role-super-admin', 'super_admin', 'مدیر کل (Super Admin)', 'دسترسی کامل به تمامی بخش‌ها و تنظیمات سیستم', '[]', 1);

-- --------------------------------------------------------

--
-- Table structure for table `schema_migrations`
--

CREATE TABLE `schema_migrations` (
  `id` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `appliedAt` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schema_migrations`
--

INSERT INTO `schema_migrations` (`id`, `description`, `appliedAt`) VALUES
('005_foreign_keys_indexes.sql', '005_foreign_keys_indexes.sql', '2026-08-24T10:47:16.830Z');

-- --------------------------------------------------------

--
-- Table structure for table `shop_invoices`
--

CREATE TABLE `shop_invoices` (
  `id` varchar(100) NOT NULL,
  `invoiceNumber` varchar(100) DEFAULT NULL,
  `athleteId` varchar(100) DEFAULT NULL,
  `athleteName` varchar(255) DEFAULT NULL,
  `creatorId` varchar(100) DEFAULT NULL,
  `creatorName` varchar(255) DEFAULT NULL,
  `date` varchar(100) DEFAULT NULL,
  `items` longtext DEFAULT NULL,
  `totalAmount` decimal(18,2) DEFAULT 0.00,
  `paymentMethod` varchar(50) DEFAULT NULL,
  `paymentStatus` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `shop_invoices`
--

INSERT INTO `shop_invoices` (`id`, `invoiceNumber`, `athleteId`, `athleteName`, `creatorId`, `creatorName`, `date`, `items`, `totalAmount`, `paymentMethod`, `paymentStatus`, `notes`, `createdAt`) VALUES
('shop-inv-1787574286790', 'INV-4286792', 'usr-admin-1', 'مدیر کل مجموعه+', 'usr-admin-1', 'E2E', '2026-08-24T12:24:46.792Z', '[{\"id\":\"shop-inv-1787574286790-item-0\",\"productId\":\"prod-1787574286787-926\",\"productName\":\"[E2E] کالای تست\",\"category\":\"تست\",\"unitPrice\":50000,\"buyPrice\":30000,\"quantity\":3,\"totalPrice\":150000}]', 150000.00, 'cash', 'paid', '', '2026-08-24T12:24:46.792Z'),
('shop-inv-1787574286807', 'INV-4286808', 'usr-admin-1', 'مدیر کل مجموعه+', 'usr-admin-1', 'admin', '2026-08-24T12:24:46.808Z', '[{\"id\":\"shop-inv-1787574286807-item-0\",\"productId\":\"prod-1787574286787-926\",\"productName\":\"[E2E] کالای تست\",\"category\":\"تست\",\"unitPrice\":50000,\"buyPrice\":30000,\"quantity\":1,\"totalPrice\":50000}]', 50000.00, 'credit', 'unpaid', '', '2026-08-24T12:24:46.808Z'),
('shop-inv-1787575517264', 'INV-5517266', 'usr-admin-1', 'مدیر کل مجموعه+', 'usr-admin-1', 'E2E', '2026-08-24T12:45:17.266Z', '[{\"id\":\"shop-inv-1787575517264-item-0\",\"productId\":\"prod-1787575517258-345\",\"productName\":\"[E2E] کالای تست\",\"category\":\"تست\",\"unitPrice\":50000,\"buyPrice\":30000,\"quantity\":3,\"totalPrice\":150000}]', 150000.00, 'cash', 'paid', '', '2026-08-24T12:45:17.266Z'),
('shop-inv-1787575517292', 'INV-5517293', 'usr-admin-1', 'مدیر کل مجموعه+', 'usr-admin-1', 'admin', '2026-08-24T12:45:17.293Z', '[{\"id\":\"shop-inv-1787575517292-item-0\",\"productId\":\"prod-1787575517258-345\",\"productName\":\"[E2E] کالای تست\",\"category\":\"تست\",\"unitPrice\":50000,\"buyPrice\":30000,\"quantity\":1,\"totalPrice\":50000}]', 50000.00, 'credit', 'unpaid', '', '2026-08-24T12:45:17.293Z'),
('shop-inv-1787576444567', 'INV-6444568', 'usr-admin-1', 'مدیر کل مجموعه+', 'usr-admin-1', 'E2E', '2026-08-24T13:00:44.568Z', '[{\"id\":\"shop-inv-1787576444567-item-0\",\"productId\":\"prod-1787576444562-346\",\"productName\":\"[E2E] کالای تست\",\"category\":\"تست\",\"unitPrice\":50000,\"buyPrice\":30000,\"quantity\":3,\"totalPrice\":150000}]', 150000.00, 'cash', 'paid', '', '2026-08-24T13:00:44.568Z'),
('shop-inv-1787576444581', 'INV-6444582', 'usr-admin-1', 'مدیر کل مجموعه+', 'usr-admin-1', 'admin', '2026-08-24T13:00:44.582Z', '[{\"id\":\"shop-inv-1787576444581-item-0\",\"productId\":\"prod-1787576444562-346\",\"productName\":\"[E2E] کالای تست\",\"category\":\"تست\",\"unitPrice\":50000,\"buyPrice\":30000,\"quantity\":1,\"totalPrice\":50000}]', 50000.00, 'credit', 'unpaid', '', '2026-08-24T13:00:44.582Z');

-- --------------------------------------------------------

--
-- Table structure for table `shop_invoice_items`
--

CREATE TABLE `shop_invoice_items` (
  `id` varchar(100) NOT NULL,
  `invoiceId` varchar(100) NOT NULL,
  `productId` varchar(100) DEFAULT NULL,
  `productName` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `unitPrice` decimal(18,2) NOT NULL DEFAULT 0.00,
  `buyPrice` decimal(18,2) NOT NULL DEFAULT 0.00,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `totalPrice` decimal(18,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `shop_invoice_items`
--

INSERT INTO `shop_invoice_items` (`id`, `invoiceId`, `productId`, `productName`, `category`, `unitPrice`, `buyPrice`, `quantity`, `totalPrice`) VALUES
('shop-inv-1787574286790-item-0', 'shop-inv-1787574286790', 'prod-1787574286787-926', '[E2E] کالای تست', 'تست', 50000.00, 30000.00, 3, 150000.00),
('shop-inv-1787574286807-item-0', 'shop-inv-1787574286807', 'prod-1787574286787-926', '[E2E] کالای تست', 'تست', 50000.00, 30000.00, 1, 50000.00),
('shop-inv-1787575517264-item-0', 'shop-inv-1787575517264', 'prod-1787575517258-345', '[E2E] کالای تست', 'تست', 50000.00, 30000.00, 3, 150000.00),
('shop-inv-1787575517292-item-0', 'shop-inv-1787575517292', 'prod-1787575517258-345', '[E2E] کالای تست', 'تست', 50000.00, 30000.00, 1, 50000.00),
('shop-inv-1787576444567-item-0', 'shop-inv-1787576444567', 'prod-1787576444562-346', '[E2E] کالای تست', 'تست', 50000.00, 30000.00, 3, 150000.00),
('shop-inv-1787576444581-item-0', 'shop-inv-1787576444581', 'prod-1787576444562-346', '[E2E] کالای تست', 'تست', 50000.00, 30000.00, 1, 50000.00);

-- --------------------------------------------------------

--
-- Table structure for table `sms_logs`
--

CREATE TABLE `sms_logs` (
  `id` varchar(100) NOT NULL,
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recipients`)),
  `recipientNames` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recipientNames`)),
  `message` text DEFAULT NULL,
  `channel` varchar(50) DEFAULT 'sms',
  `type` varchar(50) DEFAULT NULL,
  `targetGroup` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'sent',
  `cost` decimal(18,2) DEFAULT 0.00,
  `packId` varchar(100) DEFAULT NULL,
  `messageIds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`messageIds`)),
  `sentBy` varchar(255) DEFAULT NULL,
  `sentAt` varchar(100) DEFAULT NULL,
  `errorMessage` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` varchar(100) NOT NULL,
  `ticketNumber` varchar(100) DEFAULT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `userNationalId` varchar(20) DEFAULT NULL,
  `userRole` varchar(50) DEFAULT NULL,
  `userPhone` varchar(20) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `priority` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `lastResponseAt` varchar(100) DEFAULT NULL,
  `hasUnreadAdminMessage` tinyint(1) DEFAULT 0,
  `hasUnreadUserMessage` tinyint(1) DEFAULT 0,
  `createdAt` varchar(100) DEFAULT NULL,
  `messages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`messages`)),
  `category` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` varchar(100) NOT NULL,
  `userId` varchar(100) DEFAULT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `userNationalId` varchar(20) DEFAULT NULL,
  `amount` decimal(18,2) DEFAULT 0.00,
  `type` varchar(50) DEFAULT NULL,
  `method` varchar(50) DEFAULT NULL,
  `trackingNumber` varchar(100) DEFAULT NULL,
  `receiptUrl` longtext DEFAULT NULL,
  `receiptFileName` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `idempotencyKey` varchar(100) DEFAULT NULL,
  `voidedAt` varchar(100) DEFAULT NULL,
  `voidedBy` varchar(255) DEFAULT NULL,
  `voidReason` text DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `userId`, `userName`, `userNationalId`, `amount`, `type`, `method`, `trackingNumber`, `receiptUrl`, `receiptFileName`, `description`, `status`, `idempotencyKey`, `voidedAt`, `voidedBy`, `voidReason`, `createdAt`, `createdBy`, `version`) VALUES
('shop-inv-1787575517264-charge', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', 150000.00, 'charge', 'pos', '', NULL, '', 'بابت فاکتور INV-5517266', 'completed', NULL, NULL, NULL, NULL, '2026-08-24T12:45:17.266Z', 'admin', 1),
('shop-inv-1787575517264-pay', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', 150000.00, 'equipment', 'pos', '', NULL, '', 'بابت تسویه فاکتور INV-5517266', 'completed', NULL, NULL, NULL, NULL, '2026-08-24T12:45:17.266Z', 'admin', 1),
('shop-inv-1787575517292-charge', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', 50000.00, 'charge', 'cash', '', NULL, '', 'بابت فاکتور INV-5517293', 'completed', NULL, NULL, NULL, NULL, '2026-08-24T12:45:17.293Z', 'admin', 1),
('shop-inv-1787576444567-charge', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', 150000.00, 'charge', 'pos', '', NULL, '', 'بابت فاکتور INV-6444568', 'completed', NULL, NULL, NULL, NULL, '2026-08-24T13:00:44.568Z', 'admin', 1),
('shop-inv-1787576444567-pay', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', 150000.00, 'equipment', 'pos', '', NULL, '', 'بابت تسویه فاکتور INV-6444568', 'completed', NULL, NULL, NULL, NULL, '2026-08-24T13:00:44.568Z', 'admin', 1),
('shop-inv-1787576444581-charge', 'usr-admin-1', 'مدیر کل مجموعه+', '0012345678', 50000.00, 'charge', 'cash', '', NULL, '', 'بابت فاکتور INV-6444582', 'completed', NULL, NULL, NULL, NULL, '2026-08-24T13:00:44.582Z', 'admin', 1),
('trx-1787574684502-gmw6', 'user-1786203973812-x100uq', 'سارا یگانه', '3560257735', 1500000.00, 'tuition', 'pos', '', '', '', 'پرداخت بابت شهریه ماهیانه دوره', 'completed', 'trx-1787574684502-gmw6', NULL, NULL, NULL, '1405/06/02', 'مدیر کل مجموعه+ (مدیر ارشد)', 1),
('tx-1787575517303-645', 'usr-admin-1', '', '', 7777.00, 'other', 'cash', '', '', '', '', 'cancelled', 'e2e-void-1787575517045', '2026-08-24T12:45:17.307Z', 'admin', 'E2E', '2026-08-24T12:45:17.303Z', 'مدیر سیستم', 1),
('tx-1787576444592-710', 'usr-admin-1', '', '', 7777.00, 'other', 'cash', '', '', '', '', 'cancelled', 'e2e-void-1787576444369', '2026-08-24T13:00:44.598Z', 'admin', 'E2E', '2026-08-24T13:00:44.593Z', 'مدیر سیستم', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `fullName` varchar(255) NOT NULL,
  `fatherName` varchar(255) DEFAULT NULL,
  `shenasnamehNo` varchar(50) DEFAULT NULL,
  `nationalId` varchar(20) DEFAULT NULL,
  `birthDate` varchar(50) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `emergencyContactName` varchar(255) DEFAULT NULL,
  `emergencyContactRelation` varchar(100) DEFAULT NULL,
  `emergencyContactPhone` varchar(20) DEFAULT NULL,
  `bloodType` varchar(20) DEFAULT NULL,
  `shoeSize` varchar(20) DEFAULT NULL,
  `clothingSize` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `medicalConditions` text DEFAULT NULL,
  `referrerName` varchar(255) DEFAULT NULL,
  `referrerPhone` varchar(20) DEFAULT NULL,
  `educationOrJob` varchar(255) DEFAULT NULL,
  `climbingExperienceLevel` varchar(50) DEFAULT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`roles`)),
  `activeRole` varchar(50) DEFAULT 'athlete',
  `isActive` tinyint(1) DEFAULT 1,
  `insuranceNumber` varchar(100) DEFAULT NULL,
  `insuranceExpiryDate` varchar(50) DEFAULT NULL,
  `isInsuranceValid` tinyint(1) DEFAULT 0,
  `baleChatId` varchar(100) DEFAULT NULL,
  `avatarUrl` longtext DEFAULT NULL,
  `createdAt` varchar(100) DEFAULT NULL,
  `updatedAt` varchar(100) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `mustChangePassword` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `firstName`, `lastName`, `fullName`, `fatherName`, `shenasnamehNo`, `nationalId`, `birthDate`, `gender`, `phone`, `emergencyContactName`, `emergencyContactRelation`, `emergencyContactPhone`, `bloodType`, `shoeSize`, `clothingSize`, `address`, `medicalConditions`, `referrerName`, `referrerPhone`, `educationOrJob`, `climbingExperienceLevel`, `roles`, `activeRole`, `isActive`, `insuranceNumber`, `insuranceExpiryDate`, `isInsuranceValid`, `baleChatId`, `avatarUrl`, `createdAt`, `updatedAt`, `version`, `mustChangePassword`) VALUES
('user-1786203971874-2zgl52', '5480108026', '$2b$08$l4tvvr0RNi9Wa4gr8hTNf.LvqGquoPaWwcPlhhO65M1uR4.teaiuW', 'حسین', 'نیک فطرت', 'حسین نیک فطرت', '', '', '5480108026', '2000-03-01', 'male', '09010826196', '', '', '09174455423', '', '0', '1', 'شیراز زیبا شهر', '', '', '', '', 'intermediate', '[\"coach\"]', 'coach', 1, '', '', 0, '', 'uploads/user_6a5a75c367d453.63727353_ec1681dc.jpg', '1405/05/17', '2026-08-23T07:32:25.697Z', 1, 0),
('user-1786203973812-x100uq', '3560257735', '$2b$08$BgjmmCj4E7gsEROwcB1Z0Ow8u3Sak5q7Lhi9UsoeD9yIIG8EZC8vq', 'سارا', 'یگانه', 'سارا یگانه', '', '', '3560257735', '2024-11-15', 'female', '09170350090', '', '', '09171713264', '', '0', 'M', 'خ معلم-خ بهار فرعی ۴', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5a7871587a46.12951114_8f740334.jpeg', '1405/05/17', '2026-08-23T05:15:58.770Z', 1, 0),
('user-1786203975346-h8o5tr', '5489405953', '5489405953', 'امیر علی', 'نیک فطرت', 'امیر علی نیک فطرت', '', '', '5489405953', '2026-07-14', 'male', '09174455423', '', '', '09178716467', '', '40', 'm', 'بندر کنگان میدان پریشانی خیابان مدرس غربی انتهای فرعی 3 ساختمان دو قلو سمت چپ طبقه 2', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203976890-cuq7z8', '2281955151', '2281955151', 'امین', 'رحیم پور', 'امین رحیم پور', '', '', '2281955151', '2026-07-24', 'male', '09170526228', '', '', '09355209420', '', '42', 'L', 'شیراز', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203978713-h0oce4', '3560510856', '$2b$08$7It7XCh1m18zuyaeZ6FBAOXVkPcemmsP0cUC7XEF8mgLq6E6cDLAy', 'امیرحسام', 'بحرانی', 'امیرحسام بحرانی', '', '', '3560510856', '2017-08-27', 'male', '09173750343', '', '', '09176426912', '', '0', 'M', 'کنگان مدرس شرقی فرعی چهار', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '1111', '1406/03/18', 1, '', '/upload/profile_image/3560510856.jpg', '1405/05/17', '2026-08-23T07:02:05.115Z', 1, 0),
('user-1786203980498-a3ky8n', '3560254280', '3560254280', 'مهدیه', 'مومنی', 'مهدیه مومنی', '', '', '3560254280', '2003-07-28', 'female', '09172374459', '', '', '09177780262', '', '43', 'M', 'خیابان آزادی فرعی ده', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203981858-g4m37l', '2286923612', '2286923612', 'دلنیا', 'امیدی', 'دلنیا امیدی', '', '', '2286923612', '2015-06-28', 'female', '09903297708', '', '', '09366720589', '', '0', 'M', 'خیابان یاس، فرعی هشتم', '', '', '', '', 'professional', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203983306-b9pv57', '3550161689', '3550161689', 'علیرضا', 'غلامی', 'علیرضا غلامی', '', '', '3550161689', '2002-01-20', 'male', '09175255240', '', '', '09039751085', 'B+', '44', 'L', 'کنگان خیابان حافظ فرعی ۵', 'فاقد بیماری خاص', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5ca79ca2e918.46374515_0ab5ad62.jpeg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203984698-fud8ir', '3560546087', '$2b$08$rv7cKumKDWGAoCuHH.GPB.gPxyz3bGp0RSqP.foda3f2z0k5y1hT.', 'دلوان', 'امیدی', 'دلوان امیدی', '', '', '3560546087', '2020-01-27', 'female', '09903297708', '', '', '09903297708', '', '0', 'S', 'خیابان یاس، فرعی هشتم', '', '', '', '', 'advanced', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5ca8bbe0cc44.22216455_bc04f2b9.jpg', '1405/05/17', '2026-08-23T05:59:39.426Z', 1, 0),
('user-1786203986194-5zbcoq', '0781866022', '0781866022', 'داریوش', 'پور سعید', 'داریوش پور سعید', '', '', '0781866022', '2012-09-21', 'male', '09158199361', '', '', '09158199361', '', '38', 'M', 'خیابان شهید رجایی فرعی هفتم', '', '', '', '', 'professional', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203989546-8cqtl3', '2285832941', '2285832941', 'شایان', 'استوار', 'شایان استوار', '', '', '2285832941', '2011-12-13', 'male', '09231251819', '', '', '09231251819', '', '0', 'M', 'خیابان شهید رجایی', '', '', '', '', 'professional', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5ca98bd84ac0.77908976_f10f95f1.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203991162-bo3ene', '3560451663', '3560451663', 'پوریا', 'عسگری', 'پوریا عسگری', '', '', '3560451663', '2014-05-08', 'male', '09132843158', '', '', '09132843158', '', '38', 'M', 'کنگان خیابان برق فرعی دهم ساختمان ارغوان', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5cd8c943c042.14010718_66b61109.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203992578-v94tmr', '3570290379', '3570290379', 'محمدمهدی', 'دراهکی', 'محمدمهدی دراهکی', '', '', '3570290379', '2016-11-02', 'male', '09164236864', '', '', '09176441862', '', '36', 'M', 'استان بوشهر، شهرستان دیر، شهر دیر، خیابان شهید موسی دراهکی، پلاک 24', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203994434-ooyfmm', '2451886072', '2451886072', 'حسام الدین', 'احمدی', 'حسام الدین احمدی', '', '', '2451886072', '1981-04-19', 'male', '09129171382', '', '', '09197058599', '', '0', 'L', 'کنگان پالایشگاه نهم', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203996017-ifc258', '1811505341', '1811505341', 'آراد', 'شفیعی', 'آراد شفیعی', '', '', '1811505341', '2016-07-12', 'male', '09394019017', '', '', '09106482477', '', '0', 'M', 'مدرس غربی انتهای فرعی۴', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5ceca4c7ea13.45889657_c46b5681.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203997450-vgly3z', '3570299163', '3570299163', 'سورنا', 'فخرایی', 'سورنا فخرایی', '', '', '3570299163', '2017-06-06', 'male', '09173752497', 'پدر ', '', '09364590336', 'O+', '۳۹', 'M', 'کنگان ، مدرس غربی ، فرعی ششم', 'فاقد بیماری خاص', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '8787', '1406/03/03', 1, '', '/upload/profile_image/3570299163.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786203999010-8tlcp3', '0027740560', '0027740560', 'رادین', 'حسنی', 'رادین حسنی', '', '', '0027740560', '2017-11-21', 'male', '09173409235', '', '', '09173402259', '', '0', 'M', 'کنگان قائم ۲فرعی ۳۰', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5d5c443f8879.57765518_b1a05dec.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204000514-qawtke', '0027215504', '0027215504', 'بهراد', 'حسنی', 'بهراد حسنی', '', '', '0027215504', '2026-07-07', 'male', '09173409235', '', '', '09173402259', '', '0', 'M', 'کنگان قائم دو فرعی ۳۰', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5d5b86e64008.45505706_85fcbd8e.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204002290-qu51f1', '2210742986', '2210742986', 'پویان', 'محمدنژاد ملکوتی', 'پویان محمدنژاد ملکوتی', '', '', '2210742986', '2019-09-28', 'male', '09112277064', '', '', '09114740258', '', '32', 'M', 'بوشهر، کنگان، خیابان برق ، فرعی ۵، ساختمان ترنم', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5d0c0922e8b6.91024284_92837cf8.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204003762-61juwz', '3560520568', '3560520568', 'تیام', 'نیک شعار', 'تیام نیک شعار', '', '', '3560520568', '2018-05-26', 'female', '09902880945', '', '', '09178720450', '', '36', 's', 'کنگان بلوار ساحلی فرعی ۲۵ منزل نامداری', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5ddc740f7871.54675579_8ee66ae5.jpeg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204005201-9c1roo', '2287953035', '2287953035', 'وانیا', 'فرزانه', 'وانیافرزانه', '', '', '2287953035', '2018-05-24', 'female', '09122200725', '', '', '09177771799', '', '35', '?', 'کنگان.غدیر', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5ddf6f9d33f1.55603341_63fa7b95.png', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204006521-bq36ks', '2500138941', '2500138941', 'احسان', 'فروتن', 'احسان فروتن', '', '', '2500138941', '1990-05-23', 'male', '09304876599', '', '', '09304876599', '', '0', '۴۰', 'کنگان خیابان معلم فرعی بهار', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5df7894d21e2.74054757_306bd3f1.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204007881-wzr48h', '2287342141', '2287342141', 'یاس', 'رئیسی نژاد', 'یاس رئیسی نژاد', '', '', '2287342141', '2016-08-24', 'female', '09173416365', '', '', '09362958266', '', '34', 'M', 'کنگان ایثار ۳فرعی ۱۴', '', '', '', '', 'advanced', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5dff9063f0e4.13229436_f0110d23.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204009355-047slz', '3560063922', '3560063922', 'حسین', 'اسماعیلی', 'حسین اسماعیلی', '', '', '3560063922', '1991-03-26', 'male', '09171032719', '', '', '09177757313', '', '0', 'M', 'کنگان خ سلامت نبش فرعی ۱۰', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5e00b9b88893.95970561_255d164c.jpeg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204010834-pa874a', '3560503841', '3560503841', 'زهرا', 'احمدی', 'زهرا احمدی', '', '', '3560503841', '2017-06-17', 'female', '09385125097', '', '', '09337713010', '', '0', 'M', 'کنگان انتهای فرعی ۱۴', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204012241-6o500e', '3510992504', '3510992504', 'محدثه', 'درا', 'محدثه درا', '', '', '3510992504', '2018-01-11', 'female', '09175109334', '', '', '09170119734', '', '0', 'S', 'بوشهر_کنگان_خیابان برق_فرعی۶', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5e142d9a3545.98660665_780c3569.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204013890-b0iq6a', '3511007313', '3511007313', 'دلسا', 'قایدی', 'دلسا قایدی', '', '', '3511007313', '2018-06-25', 'female', '09173778503', '', '', '09173750526', '', '0', 'M', 'کنگان،ایثار ۳،ساختمان باران', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204015346-2x4ohs', '2481230345', '2481230345', 'آرام', 'مقیمی', 'آرام مقیمی', '', '', '2481230345', '2021-03-08', 'female', '09171328343', '', '', '09177324197', '', '34', 'M', 'خیابان یاس فرعی 14', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204017074-ym7j1u', '2288128968', '2288128968', 'یسنا', 'درویشی', 'یسنا درویشی', '', '', '2288128968', '2018-11-21', 'female', '09176428520', '', '', '09177701854', '', '0', 'M', 'کنگان ،انتهای خیابان تختی ،۳۰ متری عرضی رو به کوه ساختمان باران', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5e1597c5a327.16871919_3406e333.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204019338-1ckmxd', '4062705303', '4062705303', 'رادمان', 'عالیخانی', 'رادمان عالیخانی', '', '', '4062705303', '2017-09-02', 'male', '09160523423', '', '', '09163602505', '', '0', 'د', 'خیابان برق فرعی چهارم ساختمان نجلا واحد یک', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5e1dbeea1342.26748674_7a3778fc.jpeg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204020666-xrzbmh', '4611699031', '4611699031', 'ماهان', 'حسن زاده', 'ماهان حسن زاده', '', '', '4611699031', '2016-08-15', 'male', '09162269213', '', '', '09162269213', '', '0', 'M', 'کنگان خیابان برق', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5e36622d1cc2.78858732_4cebe174.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204022138-stc6ns', '2288170573', '2288170573', 'آوین', 'ملکی', 'آوین ملکی', '', '', '2288170573', '2026-06-22', 'female', '09164585147', '', '', '09174242771', '', '0', 'N', 'کنگان \r\nفرهنگیان خیابان سلامت', '', '', '', '', 'professional', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204023666-swczlu', '4710600783', '4710600783', 'امیرحسن', 'مهدوی', 'امیرحسن مهدوی', '', '', '4710600783', '1996-05-25', 'male', '09304543322', '', '', '09126110116', '', '0', 'M', 'شیراز-فرهنگشهر- فرزانگان ۳۵۲', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5e7384bf5fe6.70407354_b492c13b.jpeg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204025075-b6htg7', '3560459230', '3560459230', 'کیان', 'اپرا', 'کیان اپرا', '', '', '3560459230', '2014-10-16', 'male', '09171786473', '', '', '09176657301', '', '35', 'M', 'خیابان ملاصدرا', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5e8ca66b68e9.70478063_2cdfc6f1.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204026250-gfu8hx', '2286536244', '2286536244', 'آبتین', 'ملکی', 'آبتین ملکی', '', '', '2286536244', '2026-06-22', 'male', '09174242771', '', '', '09164585147', '', '0', 'M', 'کنگان \r\nفرهنگیان خیابان سلامت', '', '', '', '', 'professional', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5f639277b777.40786177_e917fd50.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204027433-e4zf29', '3510975091', '3510975091', 'نفس', 'مقصودی', 'نفس مقصودی', '', '', '3510975091', '2017-07-31', 'female', '09179299445', '', '', '09397531582', '', '0', 'M', 'کنگان. خ معلم. فرعی ۲۱', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5f7f56a63d96.33587723_f744dc9f.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204028810-o5963n', '3570318818', '3570318818', 'فردین', 'بحرانی', 'فردین بحرانی', '', '', '3570318818', '2018-12-30', 'male', '09173724675', '', '', '09177769473', '', '35', '34', 'کنگان شهرک فرهنگیان خیابان شهید مصلح فرعی ۲ بعد سوپر مارکت عسل', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a5f81e8b11621.22413046_a70a96b1.jpeg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204030218-6iruz7', '3560467594', '3560467594', 'سارا', 'ربیعه', 'سارا ربیعه', '', '', '3560467594', '2015-05-02', 'female', '09107107104', '', '', '09177864825', '', '3', 'm', 'استان بوشهر شهرستان کنگان خیابان ایثار 3فرعی 28', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '14051119', '1405/11/19', 1, '', 'uploads/user_6a60a033030223.57664277_aa8b68e7.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204031410-sm5p8p', '3560524611', '3560524611', 'شهریار', 'طهماسبی کنگانی', 'شهریارطهماسبی کنگانی', '', '', '3560524611', '2018-08-27', 'male', '09177795293', '', '', '09177795293', '', '0', 'M', 'کنگان-کوچه بانک رفاه-کوچه سوم', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a60c835a215f8.13976908_53d44710.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204032898-g8yu6t', '1748646540', '$2b$08$xqvEPdhwUKVO.RcbHnWdb.PjBMhWMce0IQq2iZlu4Gs02SQFsjs06', 'دایانا', 'هنرجو', 'دایانا هنرجو', '', '', '1748646540', '2016-11-07', 'female', '09304302600', '', '', '09304302600', '', '36', 'S', 'کنگان- شهرک فرهنگیان - خیابان مصلح فرعی 2', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '2026-08-23T07:02:45.041Z', 1, 0),
('user-1786204034482-o0iu1o', '1748936697', '1748936697', 'درسانا', 'هنرجو', 'درسانا هنرجو', '', '', '1748936697', '2017-08-19', 'female', '09100375621', '', '', '09100375621', '', '34', 'S', 'کنگان- شهرک فرهنگیان - خیابان مصلح فرعی 2', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204036010-pst1qx', '1811172075', '1811172075', 'محمد طه', 'عارف نیا', 'محمد طه عارف نیا', '', '', '1811172075', '2011-07-30', 'male', '09942875968', '', '', '09942875968', '', '0', 'Xl', 'طالقانی شهید بحرینی پور فرعی ۳', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204037137-2v3z12', '3490384806', '3490384806', 'دانیال', 'گلابی', 'دانیال گلابی', '', '', '3490384806', '1998-08-17', 'male', '09367656204', '', '', '09367656204', '', '42', 'M', 'کنگان-خیابان تختی-فرعی۶', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204038250-j73lev', '3540473599', '3540473599', 'کیان', 'رستگار فرد', 'کیان رستگار فرد', '', '', '3540473599', '2017-12-17', 'male', '09178798232', '', '', '09170158876', '', '32', 'S', 'کنگان،بنک،مسکن مهر جنب کلانتری 13فرعی2', '', '', '', '', 'advanced', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a6215ca0ca8e3.57247640_8b64ed66.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204039522-894b3x', '2372443542', '2372443542', 'علی', 'خردیار', 'علی خردیار', '', '', '2372443542', '1985-03-21', 'male', '09176322318', '', '', '09176322318', '', '0', 'L', 'کنگان- خیابان ملاصدرا- فرعی ۶', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '/upload/profile_image/2372443542.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204040634-f4t66p', '2284621791', '2284621791', 'پریا', 'رهپیما', 'پریا رهپیما', '', '', '2284621791', '2007-08-18', 'female', '09367935008', '', '', '09367935008', '', '0', 'M', 'خیالان طالقانی فرعی ۱۰', '', '', '', '', 'professional', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204041890-15i79a', '1270153374', '1270153374', 'عاطفه', 'گودرزی', 'عاطفه گودرزی', '', '', '1270153374', '1989-07-12', 'female', '09132121173', '', '', '09163996617', '', '0', 'M', 'جم.بلوار فرودگاه. کوچه بهشت ۱۳ . پلاک ۲۰', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a64a5f134a8b2.32254760_85cfb18f.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204043034-h31m7p', '1199944998', '1199944998', 'زهرا', 'قرخلو', 'زهرا قرخلو', '', '', '1199944998', '1989-02-06', 'female', '09132752610', '', '', '09132752610', '', '0', 'M', 'کنگان ایثار یک', '', '', '', '', 'advanced', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a650de34b4516.89554293_372d102a.jpeg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204044258-hwsatm', '2288344199', '2288344199', 'آیهان', 'گرجی فرد', 'آیهان گرجی فرد', '', '', '2288344199', '2019-07-24', 'male', '09353015650', '', '', '09905459210', '', '32', 'S', 'بوشهر -کنگان خیابون یاس فرعی ۱۰', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a68476a8a83b2.60834813_a2e67373.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204045434-oj3wvz', '2380901260', '2380901260', 'سجاد', 'خالویی', 'سجاد خالویی', '', '', '2380901260', '2026-07-28', 'male', '09907304580', '', '', '09179613050', '', '0', 'S', 'کنگان خیابان ایثار ۳ فرعی ۳', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204046915-entttb', '3560476100', '3560476100', 'محمدحسین', 'کنگانی', 'محمدحسین کنگانی', '', '', '3560476100', '2015-11-06', 'male', '09388134100', '', '', '09901144977', '', '36', 'S', 'خیابان طالقانی کوچه ۵۶ کوچه بن بست', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a68c3672849e3.38848129_d8f3dc0b.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204048331-7z8rt0', '3560493145', '3560493145', 'نیکا', 'کنگانی', 'نیکا کنگانی', '', '', '3560493145', '2016-10-27', 'female', '09177772483', '', '', '09176283619', '', '36', 'M', 'مدرس غربی\r\nخ خوارزمی \r\nفرعی6', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a6a0f4d348a33.47525632_2d09608e.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204049642-ux9t3m', '3560527678', '3560527678', 'آریا', 'کنگانی', 'آریا کنگانی', '', '', '3560527678', '2018-10-27', 'male', '09177772483', '', '', '09176283619', '', '35', 'M', 'استان بوشهر \r\nشهرستان کنگان \r\nمدرس غربی خیابان خوارزمی فرعی 6', '', '', '', '', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a6a11365458e9.14901323_bb2163e7.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786204050922-ufml72', '3243880807', '3243880807', 'فاطیما', 'عزیزی', 'فاطیما عزیزی', '', '', '3243880807', '2010-02-22', 'female', '09188887192', '', '', '09188561194', '', '0', 'L', 'جم-شهرک پردیس-بلوک خیام-کوی سوم-واحد ۲۴۹', '', '', '', '', 'advanced', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', 'uploads/user_6a6d7f877204d3.34666092_091b5a03.jpg', '1405/05/17', '1405/05/29', 1, 0),
('user-1786368123544-k1eoms', '5500125184', '$2b$08$AvdkeViV0W19GabAqtvtluFau5a7z/x.SHBukzud18mD6/PTrlg6u', 'حنا', 'ملک زاده', 'حنا ملک زاده', 'علی', '5500125184', '5500125184', '1395/03/11', 'female', '09174812264', 'مادر', 'پدر', '09174812264', 'A+', '35', 'M', 'بوشهر،کنگان،خیابان استخر،فرعی سوم', '', 'نیک فطرت', '09164715806', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/19', '2026-08-22T12:00:03.245Z', 1, 0),
('user-1786368123544-tqdqx9', '5509945168', '5509945168', '', '', 'علی ملک زاده', '', '', '5509945168', '', '', '09174812264', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/19', '1405/05/19', 1, 0),
('user-1786368126578-uiznqa', '3560490707', '3560490707', 'پارسا', 'امیدوار', 'پارسا امیدوار', 'رضا', '3560490707', '3560490707', '1395/06/18', 'male', '09177897494', 'رضا', 'پدر', '09171862998', 'A+', '36', 'M', 'بوشهر کنگان خیابان سلمان فارسی فرعی چهارم', 'ندارد', '', '09171862998', 'دانش اموز', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/19', '1405/05/29', 1, 0),
('user-1786368126579-43aww2', '2372569643', '2372569643', '', '', 'رضا امیدوار', '', '', '2372569643', '', '', '09171862998', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/19', '1405/05/19', 1, 0),
('user-1786368129292-crub22', '3560426987', '3560426987', 'فرید', 'فهیمی زاده', 'فرید فهیمی زاده', 'قطب الدین', '‏‪356-042-6987‬‏', '3560426987', '1391/12/28', 'male', '09934513506', 'فهیمه رنجبر', 'مادر', '09172152715', 'O+', '39', 'M', 'خیابان شهید بهزادی فرعی 2', '', 'حسن نیک فطرت', '09926163119', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/19', '1405/05/29', 1, 0),
('user-1786368129292-x7ixn2', '3569415732', '3569415732', '', '', 'فهیمه رنجبر', '', '', '3569415732', '', '', '09172152715', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/19', '1405/05/19', 1, 0),
('user-1786450689093-m12det', '2286711801', '2286711801', 'رایان', 'رحیمی', 'رایان رحیمی', 'حمزه', '2286711801', '2286711801', '1393/08/08', 'male', '09013079398', '۰۹۰۳۵۲۴۲۱۷۷', 'پدر', '09013079398', 'O+', '39', 'M', 'استان بوشهر ، کنگان ، بلوار ایثارگران،فرعی۲۶', '', 'الهه ارون', '', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '/upload/profile_image/________________1786430948795.heic', '1405/05/20', '1405/05/29', 1, 0),
('user-1786450689099-u7h6tp', '2511559005', '2511559005', '', '', 'حنزه رحیمی', '', '', '2511559005', '', '', '09177823724', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/20', '1405/05/20', 1, 0),
('user-1786450701736-pumzks', '2500770532', '2500770532', 'فرحان', 'رحیمی', 'فرحان رحیمی', 'حمزه', '2500770532', '2500770532', '1390/07/18', 'male', '09033005424', '۰۹۰۳۵۲۴۲۱۷۷', 'پدر', '09013079398', 'O+', '46', 'XL', 'استان بوشهر ، کنگان ، بلوار ایثارگران،فرعی۲۶', '', 'الهه ارون', '', 'محصل', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '/upload/profile_image/2I1A4048_1786431392708.jpg', '1405/05/20', '1405/05/29', 1, 0),
('user-1786450706767-9bm9ro', '3560497426', '3560497426', 'احمد', 'سطحانیان', 'احمد سطحانیان', 'محمود', '3560497426', '3560497426', '1395/10/26', 'male', '09379691381', 'محمود سطحانیان', 'پدر', '09361512441', 'O+', '37', 'S', 'شهرستان کنگان خ وحدت کوچه فرهنگ', '', '', '', 'محصل', 'advanced', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '/upload/profile_image/3560497426.jpg', '1405/05/20', '1405/05/29', 1, 0),
('user-1786450706767-lxdxce', '3569917541', '3569917541', '', '', 'محمود سطحانیان', '', '', '3569917541', '', '', '09361512441', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/20', '1405/05/20', 1, 0),
('user-1786455942646-2l5uxh', '2287320865', '2287320865', 'محمد متین', 'جوکار', 'محمد متین جوکار', 'بهنام', '2287320865', '2287320865', '1395/05/19', 'male', '09171075529', 'یلدا جهرمی', 'مادر', '09171075529', 'O+', '39', 'S', 'استان بوشهر شهرستان کنگان خیابان هلال احمر ساختمان رستم۲ طبقه۳ واحد۷', '', 'مربی نیک فطرت', '09926163115', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '2287320865', '', 0, '', '', '1405/05/20', '1405/05/29', 1, 0),
('user-1786455942646-4q94g1', '5149661945', '5149661945', 'بهنام', 'جوکار', 'بهنام جوکار', '', '', '5149661945', '', '', '09173366386', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/20', '1405/05/20', 1, 0),
('user-1786456115752-c3ljnd', '2288376694', '2288376694', 'محمد ماهان', 'جوکار', 'محمد ماهان جوکار', 'بهنام', '2288376694', '2288376694', '1398/06/07', 'male', '09171075529', 'یلدا جهرمی', 'مادر', '09171075529', 'A+', '34', 'S', 'استان بوشهر شهرستان کنگان خیابان هلال احمر ساختمان رستم۲ طبقه۳ واحد۷', '', 'مربی نیک فطرت', '09926163115', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '2288376694', '', 0, '', '', '1405/05/20', '1405/05/29', 1, 0),
('user-1786517724507-83rfy3', '3560531276', '3560531276', 'امید', 'مفرج مکاری', 'امید مفرج مکاری', 'محمد', '3560531276', '3560531276', '1397/10/23', 'male', '09379173352', 'محمد مفرج مکاری', 'پدر', '09379173352', 'O+', '35', 'S', 'بوشهر کنگان خیابان فرمانداری فرعی اول', '', 'نیک فطرت', '09926163115', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/21', '1405/05/29', 1, 0),
('user-1786517724511-431cmr', '3560015030', '3560015030', 'محمد', 'مفرج مکاری', 'محمد مفرج مکاری', '', '', '3560015030', '', '', '09379173352', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/21', '1405/05/21', 1, 0),
('user-1786522521106-shmqr9', '3560536006', '3560536006', 'ویانا', 'بهادری فر', 'ویانا بهادری فر', 'علی', '3560536006', '3560536006', '1398/02/17', 'female', '09164233680', 'فاطمه توفان', 'مادر', '09164233680', 'O+', '34', 'S', 'شهرک‌شقایق(خیابان بیمارستان) فرعی۸', '', 'نیک فطرت', '09926163115', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/21', '1405/05/29', 1, 0),
('user-1786522527174-rsk0wr', '2287351647', '2287351647', 'مهراد', 'شاهدی', 'مهراد شاهدی', 'علی', '2287351647', '2287351647', '1395/06/18', 'male', '09173706318', 'علی شاهدی', 'پدر', '09173706318', 'A+', '35', 'S', 'بوشهر دیر بردستان خیابان دانش آموز', 'سابقه آسم', 'نیک فطرت', '09926163115', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/21', '1405/05/29', 1, 0),
('user-1786522527175-nwlkin', '3679973649', '3679973649', 'علی', 'شاهدی', 'علی شاهدی ', '', '', '3679973649', '', '', '09173706318', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/21', '1405/05/21', 1, 0),
('user-1786685463853-dpqbga', '2286750981', '2286750981', 'آرشا', 'پناهی', 'آرشا پناهی', 'علی', '2286750981', '2286750981', '1393/09/23', 'male', '09032868433', 'نوشین نوری', 'مادر', '09032868433', 'O+', '39', 'L', 'بوشهر کنگان بلوار رازی فرعی6', '', '', '', 'محصل', 'intermediate', '[\"athlete\"]', 'athlete', 1, '2286750981', '', 0, '', '', '1405/05/23', '1405/05/29', 1, 0),
('user-1786685463855-rda601', '2300088320', '2300088320', 'نوشین', 'نوری', 'نوشین نوری', '', '', '2300088320', '', '', '09032868433', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/23', '1405/05/23', 1, 0),
('user-1786685466433-ghjs6r', '3560482836', '3560482836', 'روژان', 'صحافی زاده', 'روژان صحافی زاده', 'اسماعیل', '3560482836', '3560482836', '1395/01/11', 'female', '09916801040', 'نوشین نوری', 'مادر', '09032868433', 'O+', '38', 'M', 'بوشهر کنگان خیابان برق فرعی 7', '', '', '', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/23', '1405/05/29', 1, 0),
('user-1786685468984-7dc8o8', '2288088575', '2288088575', 'مدیسا', 'چوبینه', 'مدیسا چوبینه', 'میثم', '2288088575', '2288088575', '1397/07/19', 'female', '09177247545', 'نوشین نوری', 'مادر', '09032868433', 'O+', '36', 'S', 'بوشهر کنگان خیابان برق فرعی 11', '', '', '', 'محصل', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/23', '1405/05/29', 1, 0),
('user-1786886692964-jk15da', '2287000496', '2287000496', 'رستا', 'مزارعی', 'رستا مزارعی', 'احمد', '2287000496', '2287000496', '1394/06/16', 'female', '09365977161', 'احمد مزارعی', 'پدر', '09176304386', 'O+', '36', 'S', 'بوشهر کنگان ایثار۳', '', '', '', 'محصل', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/25', '1405/05/29', 1, 0),
('user-1786886692965-hbb3qp', '2291868276', '2291868276', 'احمد', 'مزارعی', 'احمد مزارعی', '', '', '2291868276', '', '', '09176304386', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/25', '1405/05/25', 1, 0),
('user-1786886695886-rcf43i', '2410103030', '2410103030', 'محسن', 'شهریاری', 'محسن شهریاری', '', '', '2410103030', '', '', '09177082967', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/25', '1405/05/25', 1, 0),
('user-1786886695886-te6v70', '2287118403', '$2b$08$2NIM4gpqjMA24yaGlb4pHuUFQsjrWUJune.dnDRiPdvpWMwrk2S1e', 'علی', 'شهریاری', 'علی شهریاری', 'محسن', '2287118403', '2287118403', '1394/10/12', 'male', '09177082967', 'محسن شهریاری', 'پدر', '09177082967', 'O+', '39', 'M', 'بندر کنگان بلوار مدرس شرقی فرعی ۹ انتهای کوچه سمت راست\nکد پستی : ۷۵۵۱۴۳۷۲۶۵', '', '', '', 'محصل', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/25', '2026-08-22T10:20:22.236Z', 1, 0),
('user-1786886704235-pxg7gd', '2286613516', '$2b$08$778WgJ62gl8nqrtg1OTKaejFjnNA0E7Ee.6i8CmpUFhGvgdEX6.fy', 'السا', 'شهریاری', 'السا شهریاری', 'محسن', '2286613516', '2286613516', '1393/04/24', 'female', '09177082967', 'محسن شهریاری', 'پدر', '09177082967', 'O+', '39', 'M', 'بندر کنگان بلوار مدرس شرقی فرعی ۹ انتهای کوچه سمت راست\nکد پستی : ۷۵۵۱۴۳۷۲۶۵', '', '', '', 'محصل', 'intermediate', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/25', '2026-08-22T10:21:02.477Z', 1, 0),
('user-1787072325919-9msn48', '3560486688', '$2b$08$uZx1WvCCG.tAvHbgr616sOa6CrBTpu.1ZwwAtvgjM1HOSE9UAd1mC', 'علی', 'آسایش', 'علی آسایش', 'مصطفی', '3560486688', '3560486688', '1395/04/07', 'male', '09179076306', 'مصطفی آسایش', 'پدر', '09179076303', 'A+', '38', 'M', 'بندر کنگان شهرک بهشتی', '', '', '', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/27', '2026-08-22T10:20:58.149Z', 1, 0),
('user-1787072325922-p0687r', '5159913610', '$2b$08$5VBxjGOpO4IlTgEyUowO.OeGVye1o65t2jcEOVMVeh7ZHMXKcqb.a', 'مصطفی', 'آسایش', 'مصطفی آسایش', '', '', '5159913610', '', '', '09179076303', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/27', '2026-08-22T10:20:47.373Z', 1, 0),
('user-1787072328319-9zo28o', '2380898741', '$2b$08$jTmLDZXDmJDTIs8sVl6z/uENjDuCvskdEk.7JGYhIlqqMSJmN5F9m', 'هیرسا', 'هاشمی', 'هیرسا هاشمی', 'حامد', '2380898741', '2380898741', '1397/09/27', 'male', '09174863373', '۰۹۱۷۴۸۶۳۳۷۳', 'مادر', '09171243373', 'O+', '39', 'M', 'استان بوشهر شهرستان کنگان خط محرم خیابان شهید حسن پور درب پنجم', 'آلرژی به عود', '', '09174863373', '', 'beginner', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/27', '2026-08-22T10:20:26.501Z', 1, 0),
('user-1787072328322-dq6p75', '2391688849', '$2b$08$ZOclviH6pWfKklsT46No6Ot9uPoKE/IlNci9L4brP.QYKENaRZBNO', 'حامد', 'هاشمی', 'حامد هاشمی', '', '', '2391688849', '', '', '09171243373', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/27', '2026-08-22T10:20:53.629Z', 1, 0),
('user-1787255017117-2zj0mw', '1971700827', '$2b$08$/LkrYP/C4jEK8I3BFtUBm.KC2/q3jUcCJokZQILtsDqCZ5ONNmyoW', 'امین', 'ناصری', 'امین ناصری', 'حاجی آقا', '3047', '1971700827', '1362/06/28', 'male', '09900587168', 'فرهاد', 'پدر', '09133103802', 'O+', '43', '2XL', 'جم', '', '', '', 'برنامه نویس', 'beginner', '[\"athlete\"]', 'athlete', 1, '8745112', '', 0, '', '', '1405/05/29', '2026-08-22T10:20:14.197Z', 1, 0),
('user-1787255019062-heehs6', '2287572473', '$2b$08$mPYzNW.Ky0nOfnokLaStDug1czvLpR0RhHErb/fi0iB1BDR0UqeQC', 'لیانا', 'رحیمی', 'لیانا رحیمی', 'مرتضی', '2287572473', '2287572473', '1393/01/01', 'female', '09171109575', 'مرتضی رحیمی', 'پدر', '09171109575', 'O+', '35', 'S', 'بوشهر کنگان', '', '', '', 'محصل', 'advanced', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '1405/05/29', '2026-08-22T10:20:02.605Z', 1, 0),
('user-1787255019062-o6bb9w', '2281559130', '$2b$08$5b.abdZ60K97q7sWHPhyVOEj6VkIFICAhz.MYIAVlmBC2t6kNSdl6', '', '', 'مرتضی رحیمی', '', '', '2281559130', '', '', '09308294466', '', '', '', '', '', '', '', '', '', '', '', '', '[\"parent\"]', 'parent', 1, '', '', 0, '', '', '1405/05/29', '2026-08-22T10:19:56.941Z', 1, 0),
('user-1787390875057-na8piu', '3241407330', '$2b$08$BUAy9Eb1eP54tmPfqL2WbeZ.w/UzUDFxascShAssxxz19UuNg2lmW', 'صدف', 'باخته', 'صدف باخته', '', '', '3241407330', '1995-03-27', 'female', '09213849973', '', '', '09174455423', '', '38', 'L', 'کنگان مدرس غربی انتهای فرعی سه', '', '', '', '', 'intermediate', '[\"coach\",\"secretary\"]', 'coach', 1, '', '', 0, '', 'uploads/user_6a5a73d6aae2c4.27382958_0d139b7b.jpg', '1405/05/31', '2026-08-23T07:32:28.847Z', 1, 0),
('usr-1787560441604-g727o', 'e2e_a_1787560441468', '$2b$08$pl4Yfj3ashX7T1TS94viw.FqLcXgqIGZbNG6rqk2oI5HLOkW8jeCK', '', '', 'ورزشکار تست الف', '', '', '9787560441468', '', '', '09120000001', '', '', '', '', '', '', '', '', '', '', '', '', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '2026-08-24T08:34:01.620Z', '2026-08-24T08:34:01.620Z', 3, 0),
('usr-1787560441625-vgq20', 'e2e_b_1787560441468', '$2b$08$pl4Yfj3ashX7T1TS94viw.FqLcXgqIGZbNG6rqk2oI5HLOkW8jeCK', '', '', 'ورزشکار تست ب', '', '', '8787560441468', '', '', '09120000002', '', '', '', '', '', '', '', '', '', '', '', '', '[\"athlete\"]', 'athlete', 1, '', '', 0, '', '', '2026-08-24T08:34:01.625Z', '2026-08-24T08:34:01.625Z', 1, 0),
('usr-admin-1', 'admin', '$2b$08$E8.sSfKr5Ruj/jZoZqtfyODb/X4.g1JKFfLbdHZ0kGZGR5jWXP6DS', '', '', 'مدیر کل مجموعه+', '+', '', '0012345678', '', '', '09121111111', '', '', '', '', '', '', '', '', '', '', '', '', '[\"super_admin\",\"athlete\",\"secretary\",\"coach\",\"accountant\"]', 'super_admin', 1, '111111', '1406/03/18', 1, '', '/uploads/profile_image_0012345678.jpg', '1403/01/01', '1405/05/31', 9, 0);

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `user_id` varchar(100) NOT NULL,
  `role_key` varchar(100) NOT NULL,
  `assigned_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`user_id`, `role_key`, `assigned_at`) VALUES
('user-1786203971874-2zgl52', 'coach', '2026-08-24T10:47:16.368Z'),
('user-1786203973812-x100uq', 'athlete', '2026-08-24T10:47:16.370Z'),
('user-1786203975346-h8o5tr', 'athlete', '2026-08-24T10:47:16.372Z'),
('user-1786203976890-cuq7z8', 'athlete', '2026-08-24T10:47:16.373Z'),
('user-1786203978713-h0oce4', 'athlete', '2026-08-24T10:47:16.375Z'),
('user-1786203980498-a3ky8n', 'athlete', '2026-08-24T10:47:16.376Z'),
('user-1786203981858-g4m37l', 'athlete', '2026-08-24T10:47:16.377Z'),
('user-1786203983306-b9pv57', 'athlete', '2026-08-24T10:47:16.379Z'),
('user-1786203984698-fud8ir', 'athlete', '2026-08-24T10:47:16.380Z'),
('user-1786203986194-5zbcoq', 'athlete', '2026-08-24T10:47:16.381Z'),
('user-1786203989546-8cqtl3', 'athlete', '2026-08-24T10:47:16.382Z'),
('user-1786203991162-bo3ene', 'athlete', '2026-08-24T10:47:16.384Z'),
('user-1786203992578-v94tmr', 'athlete', '2026-08-24T10:47:16.384Z'),
('user-1786203994434-ooyfmm', 'athlete', '2026-08-24T10:47:16.385Z'),
('user-1786203996017-ifc258', 'athlete', '2026-08-24T10:47:16.387Z'),
('user-1786203997450-vgly3z', 'athlete', '2026-08-24T10:47:16.388Z'),
('user-1786203999010-8tlcp3', 'athlete', '2026-08-24T10:47:16.389Z'),
('user-1786204000514-qawtke', 'athlete', '2026-08-24T10:47:16.390Z'),
('user-1786204002290-qu51f1', 'athlete', '2026-08-24T10:47:16.392Z'),
('user-1786204003762-61juwz', 'athlete', '2026-08-24T10:47:16.393Z'),
('user-1786204005201-9c1roo', 'athlete', '2026-08-24T10:47:16.394Z'),
('user-1786204006521-bq36ks', 'athlete', '2026-08-24T10:47:16.395Z'),
('user-1786204007881-wzr48h', 'athlete', '2026-08-24T10:47:16.396Z'),
('user-1786204009355-047slz', 'athlete', '2026-08-24T10:47:16.397Z'),
('user-1786204010834-pa874a', 'athlete', '2026-08-24T10:47:16.398Z'),
('user-1786204012241-6o500e', 'athlete', '2026-08-24T10:47:16.399Z'),
('user-1786204013890-b0iq6a', 'athlete', '2026-08-24T10:47:16.400Z'),
('user-1786204015346-2x4ohs', 'athlete', '2026-08-24T10:47:16.401Z'),
('user-1786204017074-ym7j1u', 'athlete', '2026-08-24T10:47:16.402Z'),
('user-1786204019338-1ckmxd', 'athlete', '2026-08-24T10:47:16.403Z'),
('user-1786204020666-xrzbmh', 'athlete', '2026-08-24T10:47:16.404Z'),
('user-1786204022138-stc6ns', 'athlete', '2026-08-24T10:47:16.405Z'),
('user-1786204023666-swczlu', 'athlete', '2026-08-24T10:47:16.406Z'),
('user-1786204025075-b6htg7', 'athlete', '2026-08-24T10:47:16.407Z'),
('user-1786204026250-gfu8hx', 'athlete', '2026-08-24T10:47:16.408Z'),
('user-1786204027433-e4zf29', 'athlete', '2026-08-24T10:47:16.409Z'),
('user-1786204028810-o5963n', 'athlete', '2026-08-24T10:47:16.410Z'),
('user-1786204030218-6iruz7', 'athlete', '2026-08-24T10:47:16.411Z'),
('user-1786204031410-sm5p8p', 'athlete', '2026-08-24T10:47:16.412Z'),
('user-1786204032898-g8yu6t', 'athlete', '2026-08-24T10:47:16.413Z'),
('user-1786204034482-o0iu1o', 'athlete', '2026-08-24T10:47:16.414Z'),
('user-1786204036010-pst1qx', 'athlete', '2026-08-24T10:47:16.415Z'),
('user-1786204037137-2v3z12', 'athlete', '2026-08-24T10:47:16.416Z'),
('user-1786204038250-j73lev', 'athlete', '2026-08-24T10:47:16.417Z'),
('user-1786204039522-894b3x', 'athlete', '2026-08-24T10:47:16.417Z'),
('user-1786204040634-f4t66p', 'athlete', '2026-08-24T10:47:16.418Z'),
('user-1786204041890-15i79a', 'athlete', '2026-08-24T10:47:16.419Z'),
('user-1786204043034-h31m7p', 'athlete', '2026-08-24T10:47:16.420Z'),
('user-1786204044258-hwsatm', 'athlete', '2026-08-24T10:47:16.421Z'),
('user-1786204045434-oj3wvz', 'athlete', '2026-08-24T10:47:16.422Z'),
('user-1786204046915-entttb', 'athlete', '2026-08-24T10:47:16.423Z'),
('user-1786204048331-7z8rt0', 'athlete', '2026-08-24T10:47:16.424Z'),
('user-1786204049642-ux9t3m', 'athlete', '2026-08-24T10:47:16.425Z'),
('user-1786204050922-ufml72', 'athlete', '2026-08-24T10:47:16.426Z'),
('user-1786368123544-k1eoms', 'athlete', '2026-08-24T10:47:16.427Z'),
('user-1786368123544-tqdqx9', 'parent', '2026-08-24T10:47:16.428Z'),
('user-1786368126578-uiznqa', 'athlete', '2026-08-24T10:47:16.429Z'),
('user-1786368126579-43aww2', 'parent', '2026-08-24T10:47:16.430Z'),
('user-1786368129292-crub22', 'athlete', '2026-08-24T10:47:16.431Z'),
('user-1786368129292-x7ixn2', 'parent', '2026-08-24T10:47:16.432Z'),
('user-1786450689093-m12det', 'athlete', '2026-08-24T10:47:16.433Z'),
('user-1786450689099-u7h6tp', 'parent', '2026-08-24T10:47:16.434Z'),
('user-1786450701736-pumzks', 'athlete', '2026-08-24T10:47:16.435Z'),
('user-1786450706767-9bm9ro', 'athlete', '2026-08-24T10:47:16.436Z'),
('user-1786450706767-lxdxce', 'parent', '2026-08-24T10:47:16.437Z'),
('user-1786455942646-2l5uxh', 'athlete', '2026-08-24T10:47:16.438Z'),
('user-1786455942646-4q94g1', 'parent', '2026-08-24T10:47:16.439Z'),
('user-1786456115752-c3ljnd', 'athlete', '2026-08-24T10:47:16.440Z'),
('user-1786517724507-83rfy3', 'athlete', '2026-08-24T10:47:16.441Z'),
('user-1786517724511-431cmr', 'parent', '2026-08-24T10:47:16.442Z'),
('user-1786522521106-shmqr9', 'athlete', '2026-08-24T10:47:16.443Z'),
('user-1786522527174-rsk0wr', 'athlete', '2026-08-24T10:47:16.443Z'),
('user-1786522527175-nwlkin', 'parent', '2026-08-24T10:47:16.444Z'),
('user-1786685463853-dpqbga', 'athlete', '2026-08-24T10:47:16.445Z'),
('user-1786685463855-rda601', 'parent', '2026-08-24T10:47:16.446Z'),
('user-1786685466433-ghjs6r', 'athlete', '2026-08-24T10:47:16.448Z'),
('user-1786685468984-7dc8o8', 'athlete', '2026-08-24T10:47:16.449Z'),
('user-1786886692964-jk15da', 'athlete', '2026-08-24T10:47:16.450Z'),
('user-1786886692965-hbb3qp', 'parent', '2026-08-24T10:47:16.451Z'),
('user-1786886695886-rcf43i', 'parent', '2026-08-24T10:47:16.452Z'),
('user-1786886695886-te6v70', 'athlete', '2026-08-24T10:47:16.453Z'),
('user-1786886704235-pxg7gd', 'athlete', '2026-08-24T10:47:16.454Z'),
('user-1787072325919-9msn48', 'athlete', '2026-08-24T10:47:16.455Z'),
('user-1787072325922-p0687r', 'parent', '2026-08-24T10:47:16.456Z'),
('user-1787072328319-9zo28o', 'athlete', '2026-08-24T10:47:16.457Z'),
('user-1787072328322-dq6p75', 'parent', '2026-08-24T10:47:16.458Z'),
('user-1787255017117-2zj0mw', 'athlete', '2026-08-24T10:47:16.459Z'),
('user-1787255019062-heehs6', 'athlete', '2026-08-24T10:47:16.460Z'),
('user-1787255019062-o6bb9w', 'parent', '2026-08-24T10:47:16.461Z'),
('user-1787390875057-na8piu', 'coach', '2026-08-24T10:47:16.462Z'),
('user-1787390875057-na8piu', 'secretary', '2026-08-24T10:47:16.462Z'),
('usr-1787560441604-g727o', 'athlete', '2026-08-24T10:47:16.463Z'),
('usr-1787560441625-vgq20', 'athlete', '2026-08-24T10:47:16.464Z'),
('usr-admin-1', 'accountant', '2026-08-24T10:47:16.470Z'),
('usr-admin-1', 'athlete', '2026-08-24T10:47:16.468Z'),
('usr-admin-1', 'coach', '2026-08-24T10:47:16.469Z'),
('usr-admin-1', 'secretary', '2026-08-24T10:47:16.469Z'),
('usr-admin-1', 'super_admin', '2026-08-24T10:47:16.466Z');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `app_notifications`
--
ALTER TABLE `app_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_user` (`userId`),
  ADD KEY `idx_notif_read` (`isRead`),
  ADD KEY `idx_notif_user_read` (`userId`,`isRead`);

--
-- Indexes for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_att_user_date` (`userId`,`date`),
  ADD KEY `idx_att_session` (`sessionId`),
  ADD KEY `idx_att_date` (`date`),
  ADD KEY `idx_att_session_date` (`sessionId`,`date`),
  ADD KEY `idx_att_userid` (`userId`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_user` (`userId`),
  ADD KEY `idx_audit_timestamp` (`timestamp`),
  ADD KEY `idx_audit_userid` (`userId`);

--
-- Indexes for table `club_announcements`
--
ALTER TABLE `club_announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `club_settings`
--
ALTER TABLE `club_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_courses_coach` (`coachId`),
  ADD KEY `idx_courses_status` (`isActive`);

--
-- Indexes for table `creditors`
--
ALTER TABLE `creditors`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `debtors`
--
ALTER TABLE `debtors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_debtors_user` (`userId`),
  ADD KEY `idx_debtors_status` (`status`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_enrollments_user` (`userId`),
  ADD KEY `idx_enrollments_session` (`sessionId`),
  ADD KEY `idx_enrollments_status` (`status`),
  ADD KEY `idx_enr_session` (`sessionId`),
  ADD KEY `idx_enr_user_status` (`userId`,`status`);

--
-- Indexes for table `insurance_requests`
--
ALTER TABLE `insurance_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ins_user` (`userId`),
  ADD KEY `idx_ins_status` (`status`);

--
-- Indexes for table `parent_athlete_links`
--
ALTER TABLE `parent_athlete_links`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_parent_link` (`parentId`,`athleteId`),
  ADD KEY `fk_links_athlete` (`athleteId`);

--
-- Indexes for table `pre_registrations`
--
ALTER TABLE `pre_registrations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pre_nationalId` (`nationalId`),
  ADD KEY `idx_pre_status` (`status`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prod_code` (`code`),
  ADD KEY `idx_prod_active` (`isActive`),
  ADD KEY `idx_products_code` (`code`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `schema_migrations`
--
ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shop_invoices`
--
ALTER TABLE `shop_invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoice_athlete` (`athleteId`),
  ADD KEY `idx_invoice_date` (`date`),
  ADD KEY `idx_inv_createdat` (`createdAt`),
  ADD KEY `idx_inv_athlete` (`athleteId`);

--
-- Indexes for table `shop_invoice_items`
--
ALTER TABLE `shop_invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_items_invoice` (`invoiceId`);

--
-- Indexes for table `sms_logs`
--
ALTER TABLE `sms_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sms_sentAt` (`sentAt`),
  ADD KEY `idx_sms_channel` (`channel`);

--
-- Indexes for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tickets_user` (`userId`),
  ADD KEY `idx_tickets_status` (`status`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_transactions_idempotencyKey` (`idempotencyKey`),
  ADD KEY `idx_trans_user` (`userId`),
  ADD KEY `idx_trans_type` (`type`),
  ADD KEY `idx_trans_created` (`createdAt`),
  ADD KEY `idx_tx_createdat` (`createdAt`),
  ADD KEY `idx_tx_status` (`status`),
  ADD KEY `idx_tx_userid` (`userId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `nationalId` (`nationalId`),
  ADD KEY `idx_users_phone` (`phone`),
  ADD KEY `idx_users_status` (`isActive`),
  ADD KEY `idx_users_activeRole` (`activeRole`),
  ADD KEY `idx_users_fullname` (`fullName`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_id`,`role_key`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `app_notifications`
--
ALTER TABLE `app_notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `debtors`
--
ALTER TABLE `debtors`
  ADD CONSTRAINT `fk_debtors_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollments_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `insurance_requests`
--
ALTER TABLE `insurance_requests`
  ADD CONSTRAINT `fk_insurance_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `parent_athlete_links`
--
ALTER TABLE `parent_athlete_links`
  ADD CONSTRAINT `fk_links_athlete` FOREIGN KEY (`athleteId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_links_parent` FOREIGN KEY (`parentId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `shop_invoice_items`
--
ALTER TABLE `shop_invoice_items`
  ADD CONSTRAINT `fk_items_invoice` FOREIGN KEY (`invoiceId`) REFERENCES `shop_invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `shop_invoice_items_ibfk_1` FOREIGN KEY (`invoiceId`) REFERENCES `shop_invoices` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
