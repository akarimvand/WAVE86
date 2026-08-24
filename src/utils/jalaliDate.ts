/**
 * Pure local Jalali (Shamsi) Date converter and helper utility.
 */

export interface JalaliDateObj {
  jy: number; // Jalali Year (e.g. 1403)
  jm: number; // Jalali Month (1..12)
  jd: number; // Jalali Day (1..31)
}

const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDateObj {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

export function isJalaliLeapYear(jy: number): boolean {
  return ((((((jy - ((jy > 0) ? 474 : 473)) % 2820) + 2820) % 2820) + 474) * 31) % 128 < 31;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  let jy2 = jy - 979;
  let gy = 1600;
  let days = (365 * jy2) + (Math.floor(jy2 / 33) * 8) + Math.floor(((jy2 % 33) + 3) / 4) + 78 + jd;
  if (jm < 7) {
    days += (jm - 1) * 31;
  } else {
    days += ((jm - 7) * 30) + 186;
  }
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gm = 0;
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return new Date(gy, gm - 1, gd);
}

export function addYearsToJalaliString(dateStr: string, yearsToAdd: number = 1): string {
  const parsed = parseJalaliString(dateStr);
  if (!parsed) return dateStr;
  const targetJy = parsed.jy + yearsToAdd;
  const maxDays = getJalaliMonthDays(targetJy, parsed.jm);
  const targetJd = Math.min(parsed.jd, maxDays);
  return formatJalaliDate({ jy: targetJy, jm: parsed.jm, jd: targetJd });
}

export function getCurrentJalaliDate(): JalaliDateObj {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function formatJalaliDate(jDate: JalaliDateObj | string | any, format: 'YYYY/MM/DD' | 'full' = 'YYYY/MM/DD'): string {
  if (!jDate) return '';
  if (typeof jDate === 'string') {
    return jDate;
  }
  if (typeof jDate === 'object' && jDate !== null && typeof jDate.jy === 'number') {
    const mm = String(jDate.jm).padStart(2, '0');
    const dd = String(jDate.jd).padStart(2, '0');
    if (format === 'full') {
      return `${jDate.jd} ${PERSIAN_MONTH_NAMES[(jDate.jm || 1) - 1] || ''} ${jDate.jy}`;
    }
    return `${jDate.jy}/${mm}/${dd}`;
  }
  return String(jDate);
}

export function parseJalaliString(str: any): JalaliDateObj | null {
  if (!str) return null;
  if (typeof str === 'object' && str !== null && typeof str.jy === 'number' && typeof str.jm === 'number' && typeof str.jd === 'number') {
    return { jy: str.jy, jm: str.jm, jd: str.jd };
  }
  const dateStr = typeof str === 'string' ? str : String(str);
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);
  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return null;
  return { jy, jm, jd };
}

export function addMonthsToJalali(dateStr: string, monthsToAdd: number = 1): string {
  const parsed = parseJalaliString(dateStr);
  if (!parsed) return dateStr;
  let totalMonths = parsed.jm + monthsToAdd - 1;
  let targetJy = parsed.jy + Math.floor(totalMonths / 12);
  let targetJm = (totalMonths % 12) + 1;
  if (targetJm <= 0) {
    targetJm += 12;
    targetJy -= 1;
  }
  const maxDays = getJalaliMonthDays(targetJy, targetJm);
  const targetJd = Math.min(parsed.jd, maxDays);
  return formatJalaliDate({ jy: targetJy, jm: targetJm, jd: targetJd });
}

export function isUserUnder18(birthDateStr?: string): boolean {
  if (!birthDateStr) return false;
  const parsed = parseJalaliString(birthDateStr);
  if (!parsed) return false;
  const now = getCurrentJalaliDate();
  let age = now.jy - parsed.jy;
  if (now.jm < parsed.jm || (now.jm === parsed.jm && now.jd < parsed.jd)) {
    age -= 1;
  }
  return age < 18;
}
