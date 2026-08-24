/**
 * Validates Iranian National ID (کد ملی) based on official check-digit checksum algorithm.
 */
export function isValidIranianNationalId(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Clean non-digit characters
  const cleanCode = code.trim().replace(/[0-9]/g, (w) => String.fromCharCode(w.charCodeAt(0)));
  
  if (!/^\d{10}$/.test(cleanCode)) return false;

  // Check for invalid repetitive numbers (e.g., 0000000000, 1111111111)
  if (/^(\d)\1{9}$/.test(cleanCode)) return false;

  const check = parseInt(cleanCode.charAt(9), 10);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCode.charAt(i), 10) * (10 - i);
  }

  const remainder = sum % 11;

  if (remainder < 2) {
    return check === remainder;
  } else {
    return check === 11 - remainder;
  }
}

/**
 * Converts English numbers to Persian digits for display
 */
export function toPersianDigits(num: number | string): string {
  if (num === null || num === undefined) return '';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
}

/**
 * Converts Persian/Arabic digits to English digits
 */
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Format currency numbers with commas in Persian
 */
export function formatToman(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '۰ تومان';
  return toPersianDigits(amount.toLocaleString('fa-IR')) + ' تومان';
}

/**
 * Convert number to Persian words (تبدیل عدد به حروف فارسی)
 */
export function numberToPersianWords(inputNumber: number | string): string {
  if (inputNumber === null || inputNumber === undefined || inputNumber === '') return '';
  const num = typeof inputNumber === 'string' ? parseInt(toEnglishDigits(inputNumber).replace(/\D/g, ''), 10) : inputNumber;
  if (isNaN(num) || num === 0) return 'صفر تومان';
  if (num < 0) return 'منفی ' + numberToPersianWords(Math.abs(num));

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const dahha = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const sadgan = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  const convertChunk = (n: number): string => {
    const parts: string[] = [];
    const c = Math.floor(n / 100);
    const remainder = n % 100;
    const b = Math.floor(remainder / 10);
    const a = remainder % 10;

    if (c > 0) parts.push(sadgan[c]);

    if (remainder >= 10 && remainder < 20) {
      parts.push(dahha[remainder - 10]);
    } else {
      if (b > 0) parts.push(dahgan[b]);
      if (a > 0) parts.push(yekan[a]);
    }

    return parts.join(' و ');
  };

  const chunks: number[] = [];
  let temp = num;
  while (temp > 0) {
    chunks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const words: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const chunkText = convertChunk(chunk);
      const scale = scales[i];
      if (scale) {
        words.push(`${chunkText} ${scale}`);
      } else {
        words.push(chunkText);
      }
    }
  }

  return words.join(' و ') + ' تومان';
}
