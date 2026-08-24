import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  JalaliDateObj,
  getCurrentJalaliDate,
  formatJalaliDate,
  parseJalaliString,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS,
  getJalaliMonthDays,
  jalaliToGregorian,
} from '../utils/jalaliDate';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface JalaliDatePickerProps {
  value?: string; // Format "1403/05/12"
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  position?: 'auto' | 'top' | 'bottom';
  align?: 'auto' | 'right' | 'left';
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ...',
  required = false,
  disabled = false,
  error,
  position = 'auto',
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [horizontalAlign, setHorizontalAlign] = useState<'right' | 'left'>('right');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentDate = getCurrentJalaliDate();
  const initialSelected = parseJalaliString(value || '') || currentDate;

  const [viewYear, setViewYear] = useState<number>(initialSelected.jy);
  const [viewMonth, setViewMonth] = useState<number>(initialSelected.jm);

  useEffect(() => {
    if (value) {
      const parsed = parseJalaliString(value);
      if (parsed) {
        setViewYear(parsed.jy);
        setViewMonth(parsed.jm);
      }
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (position === 'top') {
        setOpenUpward(true);
      } else if (position === 'bottom') {
        setOpenUpward(false);
      } else {
        // 'auto' mode: if not enough space below (<320px) and more space above, open upward
        setOpenUpward(spaceBelow < 330 && spaceAbove > 280);
      }

      if (align === 'left') {
        setHorizontalAlign('left');
      } else if (align === 'right') {
        setHorizontalAlign('right');
      } else {
        // 'auto' align: if aligning right-0 causes left side of 288px picker to overflow offscreen
        if (rect.right - 290 < 10) {
          setHorizontalAlign('left');
        } else {
          setHorizontalAlign('right');
        }
      }
    }
  }, [isOpen, position, align]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate years for jump selector (1330 to 1420)
  const yearsRange = Array.from({ length: 90 }, (_, i) => 1330 + i);

  // Calculate day of week for the 1st day of the view month
  const getFirstDayOfWeek = (jy: number, jm: number): number => {
    const gDate = jalaliToGregorian(jy, jm, 1);
    const day = gDate.getDay(); // 0 is Sunday, 6 is Saturday
    // Convert to Shanbeh = 0, Jomeh = 6
    return (day + 1) % 7;
  };

  const totalDays = getJalaliMonthDays(viewYear, viewMonth);
  const startDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  const handleSelectDay = (day: number) => {
    const selectedObj: JalaliDateObj = { jy: viewYear, jm: viewMonth, jd: day };
    const formatted = formatJalaliDate(selectedObj);
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  return (
    <div className="relative w-full text-right" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          readOnly
          disabled={disabled}
          value={value ? toPersianDigits(value) : ''}
          placeholder={placeholder}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm bg-white cursor-pointer transition-colors text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            error ? 'border-red-400 focus:ring-red-300' : 'border-slate-300 hover:border-slate-400'
          } ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
        />
        <CalendarIcon className="w-5 h-5 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {isOpen && (
        <div
          className={`absolute z-[9999] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 text-slate-800 animate-fadeIn ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-1'
          } ${horizontalAlign === 'left' ? 'left-0' : 'right-0'}`}
          style={{ minWidth: '18rem' }}
        >
          {/* Header Controls with Jump Selectors */}
          <div className="flex items-center justify-between gap-1 mb-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-200 rounded-md transition-colors"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>

            <div className="flex items-center gap-1">
              {/* Fast Month Dropdown Jump */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-semibold bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-800 cursor-pointer focus:ring-1 focus:ring-teal-500"
              >
                {PERSIAN_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Fast Year Dropdown Jump */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-semibold bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-800 cursor-pointer focus:ring-1 focus:ring-teal-500"
              >
                {yearsRange.map((y) => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-200 rounded-md transition-colors"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {PERSIAN_WEEKDAYS.map((wd, i) => (
              <div key={i} className="text-[11px] font-medium text-slate-400 py-0.5">
                {wd.charAt(0)}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = formatJalaliDate({ jy: viewYear, jm: viewMonth, jd: dayNum });
              const isSelected = value === dateStr;
              const isToday =
                currentDate.jy === viewYear &&
                currentDate.jm === viewMonth &&
                currentDate.jd === dayNum;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 text-xs font-medium rounded-lg transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-sm font-bold scale-105'
                      : isToday
                      ? 'bg-teal-50 text-teal-700 font-bold border border-teal-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {toPersianDigits(dayNum)}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => {
                const todayFormatted = formatJalaliDate(currentDate);
                onChange(todayFormatted);
                setViewYear(currentDate.jy);
                setViewMonth(currentDate.jm);
                setIsOpen(false);
              }}
              className="text-teal-600 hover:text-teal-800 font-medium"
            >
              امروز ({toPersianDigits(formatJalaliDate(currentDate))})
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                پاک کردن
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
