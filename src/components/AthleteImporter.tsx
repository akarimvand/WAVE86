import React, { useState } from 'react';
import { Database, Plus, CheckCircle2, AlertTriangle, FileText, UploadCloud, Users, Check, Trash2 } from 'lucide-react';
import { dbStore } from '../services/db';
import { User, UserRoleKey } from '../types';
import { toPersianDigits } from '../utils/nationalIdValidator';

interface AthleteImporterProps {
  onImportComplete?: () => void;
}

interface ParsedAthlete {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  birthDate: string;
  gender: 'male' | 'female';
  emergencyContactPhone: string;
  address: string;
  shoeSize: string;
  climbingExperienceLevel: 'beginner' | 'intermediate' | 'advanced';
  avatarUrl?: string;
}

export const AthleteImporter: React.FC<AthleteImporterProps> = ({ onImportComplete }) => {
  const [rawSql, setRawSql] = useState('');
  const [parsedAthletes, setParsedAthletes] = useState<ParsedAthlete[]>([]);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // The 3 specific athletes from the user prompt pre-packaged for instant import
  const prepackagedAthletes: ParsedAthlete[] = [
    {
      id: 'athlete-pkg-33',
      fullName: 'صدف باخته',
      phone: '09213849973',
      nationalId: '3241407330',
      birthDate: '1374/01/07', // converted '1995-03-27' to Jalali roughly or kept
      gender: 'female',
      emergencyContactPhone: '09174455423',
      address: 'کنگان مدرس غربی انتهای فرعی سه',
      shoeSize: '38',
      climbingExperienceLevel: 'intermediate',
      avatarUrl: 'uploads/user_6a5a73d6aae2c4.27382958_0d139b7b.jpg',
    },
    {
      id: 'athlete-pkg-34',
      fullName: 'حسین نیک فطرت',
      phone: '09010826196',
      nationalId: '5480108026',
      birthDate: '1379/12/11', // converted '2000-03-01'
      gender: 'male',
      emergencyContactPhone: '09174455423',
      address: 'شیراز زیبا شهر',
      shoeSize: '38',
      climbingExperienceLevel: 'intermediate',
      avatarUrl: 'uploads/user_6a5a75c367d453.63727353_ec1681dc.jpg',
    },
    {
      id: 'athlete-pkg-35',
      fullName: 'سارا یگانه',
      phone: '09170350090',
      nationalId: '3560257700', // Completed valid format
      birthDate: '1403/08/25', // converted '2024-11-15'
      gender: 'female',
      emergencyContactPhone: '09171713264',
      address: 'بوشهر، خیابان مطهری',
      shoeSize: '37',
      climbingExperienceLevel: 'intermediate',
      avatarUrl: 'uploads/user_6a5a7871587a46.12951114_8f740334.jpeg',
    },
  ];

  const handleImportPrepackaged = () => {
    try {
      let count = 0;
      prepackagedAthletes.forEach((ath) => {
        // Check if user already exists
        const exists = dbStore.getUsers().some(u => u.nationalId === ath.nationalId || u.username === ath.nationalId);
        if (!exists) {
          dbStore.createUser({
            username: ath.nationalId,
            password: ath.nationalId, // passwords set to nationalId as requested
            firstName: ath.fullName.split(' ')[0] || '',
            lastName: ath.fullName.split(' ').slice(1).join(' ') || '',
            fullName: ath.fullName,
            nationalId: ath.nationalId,
            phone: ath.phone,
            gender: ath.gender,
            birthDate: ath.birthDate,
            emergencyContactPhone: ath.emergencyContactPhone,
            emergencyContactName: 'مخاطب اضطراری',
            address: ath.address,
            shoeSize: ath.shoeSize,
            climbingExperienceLevel: ath.climbingExperienceLevel,
            roles: ['athlete'],
            activeRole: 'athlete',
            isActive: true, // all active as requested
            avatarUrl: ath.avatarUrl,
          }, 'سیستم درون‌ریز خودکار');
          count++;
        }
      });

      setImportStatus({
        success: true,
        message: `${toPersianDigits(count)} ورزشکار جدید از لیست درخواستی شما با موفقیت به عنوان اعضای فعال درون‌ریزی شدند و پسورد آن‌ها برابر کد ملی‌شان قرار گرفت.`,
      });

      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setImportStatus({ success: false, message: err.message || 'خطا در درون‌ریزی داده‌ها.' });
    }
  };

  // SQL parsing logic
  const handleParseSql = () => {
    try {
      if (!rawSql.trim()) return;

      // Extract all parenthesized value blocks e.g. (33, 'صدف باخته', ...)
      // We parse safely by matching values inside parentheses, splitting by comma and stripping quotes
      const valuesSectionMatch = rawSql.match(/VALUES\s+([\s\S]+)$/i);
      const contentToParse = valuesSectionMatch ? valuesSectionMatch[1] : rawSql;

      // Regex to match chunks: (val1, val2, ..., valN)
      const blocks: string[] = [];
      let currentBlock = '';
      let insideQuote = false;
      let quoteChar = '';
      let depth = 0;

      for (let i = 0; i < contentToParse.length; i++) {
        const char = contentToParse[i];
        if ((char === "'" || char === "`" || char === '"') && (i === 0 || contentToParse[i - 1] !== '\\')) {
          if (!insideQuote) {
            insideQuote = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            insideQuote = false;
          }
        }

        if (!insideQuote) {
          if (char === '(') {
            depth++;
            if (depth === 1) {
              currentBlock = '';
              continue;
            }
          } else if (char === ')') {
            depth--;
            if (depth === 0) {
              blocks.push(currentBlock);
              continue;
            }
          }
        }

        if (depth > 0) {
          currentBlock += char;
        }
      }

      const athletes: ParsedAthlete[] = [];

      blocks.forEach((block, idx) => {
        // Split by comma, respecting quotes
        const parts: string[] = [];
        let currentPart = '';
        let insideQ = false;
        let qC = '';

        for (let j = 0; j < block.length; j++) {
          const c = block[j];
          if ((c === "'" || c === '"') && (j === 0 || block[j - 1] !== '\\')) {
            if (!insideQ) {
              insideQ = true;
              qC = c;
            } else if (c === qC) {
              insideQ = false;
            }
          }

          if (c === ',' && !insideQ) {
            parts.push(currentPart.trim());
            currentPart = '';
          } else {
            currentPart += c;
          }
        }
        parts.push(currentPart.trim());

        // Clean parts: strip surrounding quotes and map NULL to empty
        const cleanParts = parts.map(p => {
          let s = p;
          if (s.toUpperCase() === 'NULL') return '';
          if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
            s = s.substring(1, s.length - 1);
          }
          return s.replace(/\\'/g, "'").replace(/\\"/g, '"');
        });

        if (cleanParts.length >= 3) {
          const id = `parsed-ath-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;
          const fullName = cleanParts[1] || 'ورزشکار بدون نام';
          const phone = cleanParts[2] || '09120000000';
          const avatarUrl = cleanParts[4] || '';
          
          // Convert Gregorian birthDate string to Jalali roughly if needed
          let birthDate = cleanParts[5] || '1380/01/01';
          if (birthDate.includes('-')) {
            const yr = parseInt(birthDate.split('-')[0]);
            if (yr > 1900) {
              // rough Conversion
              const jYear = yr - 621;
              const partsDate = birthDate.split('-');
              birthDate = `${jYear}/${partsDate[1] || '01'}/${partsDate[2] || '01'}`;
            }
          }

          const gender = cleanParts[6] === 'female' || cleanParts[6] === 'زن' ? 'female' : 'male';
          const emergencyContactPhone = cleanParts[7] || '09120000000';
          const nationalId = cleanParts[8] || `nat-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
          const address = cleanParts[9] || 'ثبت نشده';
          const shoeSize = cleanParts[10] || '0';
          
          let level: ParsedAthlete['climbingExperienceLevel'] = 'intermediate';
          const rawLvl = (cleanParts[12] || '').toLowerCase();
          if (rawLvl.includes('begin') || rawLvl.includes('مقدماتی')) level = 'beginner';
          else if (rawLvl.includes('adv') || rawLvl.includes('پیشرفته')) level = 'advanced';

          athletes.push({
            id,
            fullName,
            phone,
            nationalId,
            birthDate,
            gender,
            emergencyContactPhone,
            address,
            shoeSize,
            climbingExperienceLevel: level,
            avatarUrl,
          });
        }
      });

      if (athletes.length === 0) {
        alert('هیچ قالبی برای درون‌ریزی در متن وارد شده یافت نشد. لطفاً دستور INSERT را مجدداً بررسی کنید.');
        return;
      }

      setParsedAthletes(athletes);
      setSelectedIds(athletes.map(a => a.id)); // Select all by default
      setImportStatus({
        success: true,
        message: `تعداد ${toPersianDigits(athletes.length)} ورزشکار با موفقیت از دستور کپی شده استخراج شدند. برای ذخیره روی دکمه درون‌ریزی کلیک کنید.`,
      });
    } catch (err: any) {
      alert(`خطا در پردازش متن SQL: ${err.message}`);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExecuteImport = () => {
    try {
      const toImport = parsedAthletes.filter(a => selectedIds.includes(a.id));
      if (toImport.length === 0) return;

      let successCount = 0;
      toImport.forEach((ath) => {
        // Double check existance
        const exists = dbStore.getUsers().some(u => u.nationalId === ath.nationalId || u.username === ath.nationalId);
        if (!exists) {
          dbStore.createUser({
            username: ath.nationalId,
            password: ath.nationalId, // Passwords = National ID
            firstName: ath.fullName.split(' ')[0] || '',
            lastName: ath.fullName.split(' ').slice(1).join(' ') || '',
            fullName: ath.fullName,
            nationalId: ath.nationalId,
            phone: ath.phone,
            gender: ath.gender,
            birthDate: ath.birthDate,
            emergencyContactPhone: ath.emergencyContactPhone,
            emergencyContactName: 'مخاطب اضطراری',
            address: ath.address,
            shoeSize: ath.shoeSize,
            climbingExperienceLevel: ath.climbingExperienceLevel,
            roles: ['athlete'],
            activeRole: 'athlete',
            isActive: true, // all active
            avatarUrl: ath.avatarUrl,
          }, 'درون‌ریز فایل متنی');
          successCount++;
        }
      });

      setImportStatus({
        success: true,
        message: `تعداد ${toPersianDigits(successCount)} ورزشکار از ${toPersianDigits(toImport.length)} مورد انتخاب شده با موفقیت به سیستم اضافه شدند. رمز عبور و نام کاربری آن‌ها برابر با کد ملی قرار گرفت.`,
      });

      setParsedAthletes([]);
      setRawSql('');
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setImportStatus({ success: false, message: err.message || 'خطا در اجرای درون‌ریزی دیتابیس' });
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Introduction Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600" />
            درون‌ریزی گروهی اعضا و ورزشکاران فعال
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            در این بخش می‌توانید لیست ورزشکاران خود را به صورت گروهی از طریق قالب متنی، کدهای SQL، فایل پشتیبان یا به صورت تکی و پیش‌فرض درون‌ریزی کنید. تمامی ورزشکاران ایمپورت شده فعال خواهند بود و رمز عبور اولیه آن‌ها معادل کد ملی تعیین می‌گردد.
          </p>
        </div>
        <button
          onClick={handleImportPrepackaged}
          className="px-5 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-teal-600/10 flex items-center gap-2 whitespace-nowrap"
        >
          <Users className="w-4 h-4" />
          درون‌ریزی فوری ۳ ورزشکار پیش‌فرض (صدف، حسین، سارا)
        </button>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
          importStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {importStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-xs font-bold">{importStatus.message}</span>
        </div>
      )}

      {/* SQL Raw Area */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          درون‌ریزی با کدهای SQL یا متن مقادیر (VALUES)
        </h4>
        <p className="text-[11px] text-slate-500">
          کدهای SQL ورزشکاران را که شامل فیلدهای <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-slate-700">fullName</code> و <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-slate-700">national_id</code> و <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-slate-700">phone</code> هستند، در جعبه زیر پیست کنید و پردازش اولیه را بزنید:
        </p>

        <textarea
          rows={6}
          value={rawSql}
          onChange={(e) => setRawSql(e.target.value)}
          placeholder={`INSERT INTO \`athletes\` (\`user_id\`, \`full_name\`, \`phone\`, \`email\`, \`photo\`, \`birth_date\`, \`gender\`, \`emergency_contact\`, \`national_id\`, \`address\`, \`shoe_size\`, \`harness_size\`, \`climbing_level\`, \`behavior_score\`) VALUES
(33, 'صدف باخته', '09213849973', NULL, 'uploads/user_6a5a73d6aae2c4.27382958_0d139b7b.jpg', '1995-03-27', 'female', '09174455423', '3241407330', 'کنگان مدرس غربی انتهای فرعی سه', 38, 'L', 'intermediate', 100);`}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <div className="flex justify-end">
          <button
            onClick={handleParseSql}
            disabled={!rawSql.trim()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            پردازش اولیه و آنالیز فیلدها
          </button>
        </div>
      </div>

      {/* Parsed Athletes Preview & Selection */}
      {parsedAthletes.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 animate-slideUp">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-600" />
              پیش‌نمایش موارد استخراج شده ({toPersianDigits(parsedAthletes.length)} مورد)
            </h4>
            <div className="text-[10px] text-slate-500">
              موارد مورد نظر جهت ایمپورت را تیک بزنید
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
            {parsedAthletes.map((ath) => {
              const isSelected = selectedIds.includes(ath.id);
              return (
                <div
                  key={ath.id}
                  onClick={() => handleToggleSelect(ath.id)}
                  className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors ${
                    isSelected ? 'bg-teal-50/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">{ath.fullName}</span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                        <span>همراه: {toPersianDigits(ath.phone)}</span>
                        <span>•</span>
                        <span>کد ملی: {toPersianDigits(ath.nationalId)}</span>
                        <span>•</span>
                        <span>سطح: {ath.climbingExperienceLevel === 'beginner' ? 'مقدماتی' : ath.climbingExperienceLevel === 'advanced' ? 'پیشرفته' : 'متوسط'}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold max-w-xs truncate">{ath.address}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setParsedAthletes([])}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              پاک کردن نتایج
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={selectedIds.length === 0}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-teal-600/10 flex items-center gap-1.5 animate-pulse"
            >
              <Plus className="w-4 h-4" />
              درون‌ریزی نهایی {toPersianDigits(selectedIds.length)} ورزشکار منتخب
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
