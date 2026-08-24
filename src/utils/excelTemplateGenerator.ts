import * as XLSX from 'xlsx';

/**
 * Generates and triggers download of a standardized pre-registration Excel template.
 */
export function downloadSamplePreRegistrationExcel() {
  // Sample guidance data rows for the admin
  const sampleData = [
    {
      'کد ملی (الزامی و یکتا)': '3241407330',
      'نام کامل': 'صدف باخته',
      'نام پدر': 'علی',
      'شماره شناسنامه': '1234',
      'تلفن همراه': '09213849973',
      'جنسیت (زن / مرد)': 'زن',
      'تاریخ تولد (1374/01/07)': '1374/01/07',
      'تلفن اضطراری': '09174455423',
      'نام مخاطب اضطراری': 'پدر',
      'سایز کفش': '38',
      'سطح سنگ‌نوردی (مقدماتی / متوسط / پیشرفته)': 'متوسط',
      'آدرس': 'کنگان، مدرس غربی، فرعی سه',
    },
    {
      'کد ملی (الزامی و یکتا)': '5480108026',
      'نام کامل': 'حسین نیک فطرت',
      'نام پدر': 'رضا',
      'شماره شناسنامه': '5678',
      'تلفن همراه': '09010826196',
      'جنسیت (زن / مرد)': 'مرد',
      'تاریخ تولد (1374/01/07)': '1379/12/11',
      'تلفن اضطراری': '09174455423',
      'نام مخاطب اضطراری': 'مادر',
      'سایز کفش': '41',
      'سطح سنگ‌نوردی (مقدماتی / متوسط / پیشرفته)': 'پیشرفته',
      'آدرس': 'شیراز، زیباشهر',
    },
    {
      'کد ملی (الزامی و یکتا)': '3560257700',
      'نام کامل': 'سارا یگانه',
      'نام پدر': 'محمد',
      'شماره شناسنامه': '9012',
      'تلفن همراه': '09170350090',
      'جنسیت (زن / مرد)': 'زن',
      'تاریخ تولد (1374/01/07)': '1380/05/15',
      'تلفن اضطراری': '09171713264',
      'نام مخاطب اضطراری': 'همسر',
      'سایز کفش': '37',
      'سطح سنگ‌نوردی (مقدماتی / متوسط / پیشرفته)': 'مقدماتی',
      'آدرس': 'بوشهر، خیابان مطهری',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for best readability
  worksheet['!cols'] = [
    { wch: 22 }, // National ID
    { wch: 20 }, // Full name
    { wch: 12 }, // Father name
    { wch: 15 }, // Shenasnameh
    { wch: 15 }, // Phone
    { wch: 15 }, // Gender
    { wch: 18 }, // Birth Date
    { wch: 15 }, // Emergency phone
    { wch: 18 }, // Emergency contact
    { wch: 10 }, // Shoe size
    { wch: 30 }, // Climbing level
    { wch: 35 }, // Address
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'پیش_ثبت_نام');

  // Trigger download
  XLSX.writeFile(workbook, 'نمونه_فایل_پیش_ثبت_نام_باشگاه_موج.xlsx');
}
