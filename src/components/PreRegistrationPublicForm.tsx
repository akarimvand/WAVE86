import React, { useState } from 'react';
import {
  User,
  Phone,
  Activity,
  Award,
  Users,
  CheckCircle2,
  Send,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Heart,
  AlertCircle,
  FileText,
  Sparkles,
  Camera,
  Upload,
  Trash2,
  X,
} from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';
import { isValidIranianNationalId, toPersianDigits, toEnglishDigits } from '../utils/nationalIdValidator';
import { dbStore } from '../services/db';
import { uploadFileToServer } from '../utils/fileUploader';

interface PreRegistrationPublicFormProps {
  onSuccessSubmitted?: () => void;
}

export const PreRegistrationPublicForm: React.FC<PreRegistrationPublicFormProps> = ({ onSuccessSubmitted }) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  // Photo Avatar
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setAvatarError(`حجم تصویر انتخاب شده (${toPersianDigits(sizeMB)} مگابایت) بیشتر از سقف مجاز ۵ مگابایت است.`);
      e.target.value = '';
      return;
    }

    // Directly upload the binary File without any Base64 encoding
    try {
      const res = await uploadFileToServer(file, {
        prefix: 'prereg',
        customName: nationalId || 'applicant',
        subDir: 'profile_img',
      });
      if (res.success && res.url) {
        setAvatarUrl(res.url);
      } else {
        setAvatarError(res.error || 'خطا در آپلود عکس روی سرور');
      }
    } catch {
      setAvatarError('خطا در ارتباط با سرور جهت بارگذاری تصویر');
    }
  };

  // 1. Personal Identity Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [shenasnamehNo, setShenasnamehNo] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [educationOrJob, setEducationOrJob] = useState('');

  // 2. Physical, Gear & Medical
  const [bloodType, setBloodType] = useState('O+');
  const [shoeSize, setShoeSize] = useState('39');
  const [clothingSize, setClothingSize] = useState('M');
  const [medicalConditions, setMedicalConditions] = useState('');

  // 3. Contact & Address
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // 4. Referrer Info
  const [referrerName, setReferrerName] = useState('');
  const [referrerPhone, setReferrerPhone] = useState('');

  // 5. Emergency Contact Info
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('پدر');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // 6. Climbing & Insurance
  const [climbingExperienceLevel, setClimbingExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [insuranceNumber, setInsuranceNumber] = useState('');

  // 7. Parent fields for under 18
  const [isUnder18, setIsUnder18] = useState(false);
  const [parentFullName, setParentFullName] = useState('');
  const [parentNationalId, setParentNationalId] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Validation errors & status
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const steps = [
    { id: 1, title: 'مشخصات هویتی', icon: User },
    { id: 2, title: 'اطلاعات تماس و سکونت', icon: Phone },
    { id: 3, title: 'تجهیزات و سلامت', icon: Activity },
    { id: 4, title: 'تماس اضطراری و سرپرست', icon: Users },
  ];

  const validateStep = (stepNumber: number): boolean => {
    const errs: { [key: string]: string } = { ...errors };

    if (stepNumber === 1) {
      delete errs.firstName;
      delete errs.lastName;
      delete errs.fatherName;
      delete errs.shenasnamehNo;
      delete errs.nationalId;
      delete errs.birthDate;

      if (!firstName.trim()) errs.firstName = 'نام الزامی است';
      if (!lastName.trim()) errs.lastName = 'نام خانوادگی الزامی است';
      if (!fatherName.trim()) errs.fatherName = 'نام پدر الزامی است';
      if (!shenasnamehNo.trim()) errs.shenasnamehNo = 'شماره شناسنامه الزامی است';

      const cleanNationalId = toEnglishDigits(nationalId);
      if (!cleanNationalId) {
        errs.nationalId = 'کد ملی الزامی است';
      } else if (!isValidIranianNationalId(cleanNationalId)) {
        errs.nationalId = 'کد ملی واردشده معتبر نمی‌باشد (چک‌دیجیت صحیح نیست)';
      } else {
        // Check if athlete is already registered in system
        const existingUser = dbStore.getUsers().find((u) => u.nationalId === cleanNationalId);
        if (existingUser) {
          errs.nationalId = `ورزشکار محترم (${existingUser.fullName})، شما قبلاً در سامانه ثبت‌نام شده‌اید و نیازی به فرم جدید ثبت‌نام ندارید. می‌توانید مستقیماً از فرم ورود وارد حساب کاربری خود شوید.`;
        } else {
          const existingPreReg = dbStore.getPreRegistrations().find(
            (pr) => pr.nationalId === cleanNationalId && pr.status !== 'rejected'
          );
          if (existingPreReg) {
            const statusLabel = existingPreReg.status === 'approved' ? 'تأیید شده' : 'در انتظار بررسی';
            errs.nationalId = `درخواست پیش‌ثبت‌نام شما با کد ملی (${toPersianDigits(cleanNationalId)}) قبلاً ثبت شده و در وضعیت «${statusLabel}» قرار دارد. نیازی به تکمیل مجدد نیست.`;
          }
        }
      }

      if (!birthDate) errs.birthDate = 'تاریخ تولد الزامی است';

      setErrors(errs);
      return !errs.firstName && !errs.lastName && !errs.fatherName && !errs.shenasnamehNo && !errs.nationalId && !errs.birthDate;
    }

    if (stepNumber === 2) {
      delete errs.phone;
      delete errs.address;

      const cleanPhone = toEnglishDigits(phone);
      if (!cleanPhone || cleanPhone.length < 10) errs.phone = 'شماره همراه معتبر الزامی است';
      if (!address.trim()) errs.address = 'آدرس کامل محل سکونت الزامی است';

      setErrors(errs);
      return !errs.phone && !errs.address;
    }

    if (stepNumber === 3) {
      setErrors(errs);
      return true;
    }

    if (stepNumber === 4) {
      delete errs.emergencyContactName;
      delete errs.emergencyContactPhone;
      delete errs.parentFullName;
      delete errs.parentNationalId;
      delete errs.parentPhone;

      if (!emergencyContactName.trim()) errs.emergencyContactName = 'نام شخص تماس اضطراری الزامی است';
      const cleanEmergPhone = toEnglishDigits(emergencyContactPhone);
      if (!cleanEmergPhone || cleanEmergPhone.length < 10) errs.emergencyContactPhone = 'شماره همراه اضطراری معتبر الزامی است';

      if (isUnder18) {
        if (!parentFullName.trim()) errs.parentFullName = 'نام و نام خانوادگی سرپرست الزامی است';
        const cleanParentNatId = toEnglishDigits(parentNationalId);
        if (!cleanParentNatId || !isValidIranianNationalId(cleanParentNatId)) {
          errs.parentNationalId = 'کد ملی سرپرست معتبر نمی‌باشد';
        }
        if (!parentPhone.trim()) errs.parentPhone = 'شماره تماس سرپرست الزامی است';
      }

      setErrors(errs);
      return !errs.emergencyContactName && !errs.emergencyContactPhone && (!isUnder18 || (!errs.parentFullName && !errs.parentNationalId && !errs.parentPhone));
    }

    return true;
  };

  const validateAll = (): boolean => {
    const errs: { [key: string]: string } = {};

    let hasStep1Error = false;
    if (!firstName.trim()) { errs.firstName = 'نام الزامی است'; hasStep1Error = true; }
    if (!lastName.trim()) { errs.lastName = 'نام خانوادگی الزامی است'; hasStep1Error = true; }
    if (!fatherName.trim()) { errs.fatherName = 'نام پدر الزامی است'; hasStep1Error = true; }
    if (!shenasnamehNo.trim()) { errs.shenasnamehNo = 'شماره شناسنامه الزامی است'; hasStep1Error = true; }

    const cleanNationalId = toEnglishDigits(nationalId);
    if (!cleanNationalId) {
      errs.nationalId = 'کد ملی الزامی است';
      hasStep1Error = true;
    } else if (!isValidIranianNationalId(cleanNationalId)) {
      errs.nationalId = 'کد ملی واردشده معتبر نمی‌باشد (چک‌دیجیت صحیح نیست)';
      hasStep1Error = true;
    }

    if (!birthDate) { errs.birthDate = 'تاریخ تولد الزامی است'; hasStep1Error = true; }

    let hasStep2Error = false;
    const cleanPhone = toEnglishDigits(phone);
    if (!cleanPhone || cleanPhone.length < 10) { errs.phone = 'شماره همراه معتبر الزامی است'; hasStep2Error = true; }
    if (!address.trim()) { errs.address = 'آدرس کامل محل سکونت الزامی است'; hasStep2Error = true; }

    let hasStep4Error = false;
    if (!emergencyContactName.trim()) { errs.emergencyContactName = 'نام شخص تماس اضطراری الزامی است'; hasStep4Error = true; }
    const cleanEmergPhone = toEnglishDigits(emergencyContactPhone);
    if (!cleanEmergPhone || cleanEmergPhone.length < 10) { errs.emergencyContactPhone = 'شماره همراه اضطراری معتبر الزامی است'; hasStep4Error = true; }

    if (isUnder18) {
      if (!parentFullName.trim()) { errs.parentFullName = 'نام و نام خانوادگی سرپرست الزامی است'; hasStep4Error = true; }
      const cleanParentNatId = toEnglishDigits(parentNationalId);
      if (!cleanParentNatId || !isValidIranianNationalId(cleanParentNatId)) {
        errs.parentNationalId = 'کد ملی سرپرست معتبر نمی‌باشد';
        hasStep4Error = true;
      }
      if (!parentPhone.trim()) { errs.parentPhone = 'شماره تماس سرپرست الزامی است'; hasStep4Error = true; }
    }

    setErrors(errs);

    if (hasStep1Error) {
      setActiveStep(1);
      return false;
    }
    if (hasStep2Error) {
      setActiveStep(2);
      return false;
    }
    if (hasStep4Error) {
      setActiveStep(4);
      return false;
    }

    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrev = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      alert('لطفاً اطلاعات الزامی را در تمام مراحل به درستی تکمیل فرمایید.');
      return;
    }

    const combinedFullName = `${firstName.trim()} ${lastName.trim()}`;

    dbStore.submitPreRegistration({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: combinedFullName,
      fatherName: fatherName.trim(),
      shenasnamehNo: toEnglishDigits(shenasnamehNo).trim(),
      nationalId: toEnglishDigits(nationalId).trim(),
      birthDate,
      gender,
      isUnder18,
      phone: toEnglishDigits(phone).trim(),
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactRelation: emergencyContactRelation.trim(),
      emergencyContactPhone: toEnglishDigits(emergencyContactPhone).trim(),
      bloodType,
      shoeSize,
      clothingSize,
      address: address.trim(),
      medicalConditions: medicalConditions.trim(),
      educationOrJob: educationOrJob.trim(),
      referrerName: referrerName.trim(),
      referrerPhone: toEnglishDigits(referrerPhone).trim(),
      climbingExperienceLevel,
      insuranceNumber: insuranceNumber.trim(),
      avatarUrl: avatarUrl || undefined,
      parentFullName: isUnder18 ? parentFullName.trim() : undefined,
      parentNationalId: isUnder18 ? toEnglishDigits(parentNationalId).trim() : undefined,
      parentPhone: isUnder18 ? toEnglishDigits(parentPhone).trim() : undefined,
    });

    setSubmittedSuccess(true);
    if (onSuccessSubmitted) onSuccessSubmitted();
  };

  if (submittedSuccess) {
    return (
      <div className="bg-white border border-teal-200 rounded-2xl p-8 sm:p-10 text-center shadow-md space-y-6 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 bg-teal-50 border border-teal-200 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900">ثبت‌نام شما با موفقیت انجام شد</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            اطلاعات شما در سیستم «باشگاه سنگ‌نوردی موج» ثبت گردید. پس از بررسی و تأیید مدیریت، حساب کاربری شما فعال خواهد شد.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 text-right font-medium">
          <p>• ورزشکار: <span className="font-bold text-slate-900">{firstName} {lastName}</span></p>
          <p>• کد ملی ثبت‌شده: <span className="font-bold font-mono text-teal-700">{toPersianDigits(nationalId)}</span></p>
          <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-200 mt-2">
            نام کاربری و رمز عبور اولیه شما پس از تأیید برابر با کد ملی‌تان خواهد بود.
          </p>
        </div>

        <button
          onClick={() => {
            setSubmittedSuccess(false);
            setActiveStep(1);
            setFirstName('');
            setLastName('');
            setNationalId('');
            setPhone('');
          }}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
        >
          ثبت‌نام فرد جدید
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800">
              باشگاه سنگ‌نوردی موج
            </span>
            <span className="text-xs text-slate-400 font-bold">• فرم عضویت و اطلاعات اولیه</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">ثبت‌نام و عضویت ورزشکاران</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            لطفاً اطلاعات هویتی، سلامت و شماره تماس‌های ضروری را با دقت وارد فرمایید.
          </p>
        </div>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        {/* Mobile Compact Progress Bar (Visible on < md screens) */}
        <div className="block md:hidden space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5 text-teal-800 font-black">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-[11px]">
                {toPersianDigits(activeStep)}
              </span>
              <span>{steps[activeStep - 1].title}</span>
            </span>
            <span className="text-slate-400 font-semibold text-[11px]">
              مرحله {toPersianDigits(activeStep)} از ۴
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-300"
              style={{ width: `${(activeStep / 4) * 100}%` }}
            />
          </div>

          {/* Step Pill Buttons for Fast Navigation on Mobile */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {steps.map((step) => {
              const isCompleted = activeStep > step.id;
              const isCurrent = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id <= activeStep) {
                      setActiveStep(step.id);
                    } else if (step.id === activeStep + 1 && validateStep(activeStep)) {
                      setActiveStep(step.id);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 border ${
                    isCurrent
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : isCompleted
                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  <span>{isCompleted ? '✓' : toPersianDigits(step.id)}</span>
                  <span className="truncate hidden xs:inline">{step.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Steps Grid (Visible on md+ screens) */}
        <div className="hidden md:grid md:grid-cols-4 gap-2">
          {steps.map((step) => {
            const isCompleted = activeStep > step.id;
            const isCurrent = activeStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id <= activeStep) {
                    setActiveStep(step.id);
                  } else if (step.id === activeStep + 1 && validateStep(activeStep)) {
                    setActiveStep(step.id);
                  }
                }}
                className={`p-3 rounded-xl border text-right transition-all flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : isCompleted
                    ? 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                    : 'bg-slate-50 text-slate-500 border-slate-200 opacity-80'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : isCompleted
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : toPersianDigits(step.id)}
                </div>

                <div className="overflow-hidden">
                  <p className="text-xs font-black truncate">{step.title}</p>
                  <p
                    className={`text-[10px] font-medium truncate ${
                      isCurrent ? 'text-teal-100' : 'text-slate-400'
                    }`}
                  >
                    مرحله {toPersianDigits(step.id)} از ۴
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Content */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs space-y-5 sm:space-y-6">

        {/* Step 1: Personal Identity */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                مرحله ۱: مشخصات هویتی و تصویر پرسنلی
              </h3>
              <span className="text-[11px] text-slate-400 font-bold">* فیلدهای ستاره‌دار الزامی است</span>
            </div>

            {/* AVATAR ERROR ALERT */}
            {avatarError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{avatarError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarError(null)}
                  className="text-rose-500 hover:text-rose-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* AVATAR PHOTO UPLOAD SECTION */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-teal-200 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="تصویر پرسنلی" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>تصویر پرسنلی ورزشکار</span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-bold">
                      حداکثر ۵ مگابایت
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    تصویر رسمی پرتره جهت صدور پرونده و کارت بیمه ورزشی (فرمت‌های JPG، PNG، WEBP)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <label
                  htmlFor="public-form-avatar-upload"
                  className="flex-1 sm:flex-initial px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{avatarUrl ? 'تغییر عکس' : 'آپلود عکس پرسنلی'}</span>
                  <input
                    id="public-form-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('');
                      setAvatarError(null);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                    title="حذف عکس"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">حذف</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }}
                  placeholder="مثال: علی"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.firstName ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                {errors.firstName && <p className="text-[11px] text-rose-500 mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام خانوادگی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }}
                  placeholder="مثال: رضایی"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.lastName ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                {errors.lastName && <p className="text-[11px] text-rose-500 mt-1">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام پدر <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => { setFatherName(e.target.value); clearError('fatherName'); }}
                  placeholder="مثال: محمد"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.fatherName ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                {errors.fatherName && <p className="text-[11px] text-rose-500 mt-1">{errors.fatherName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شماره شناسنامه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={shenasnamehNo}
                  onChange={(e) => { setShenasnamehNo(e.target.value); clearError('shenasnamehNo'); }}
                  placeholder="مثال: 12345"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.shenasnamehNo ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                {errors.shenasnamehNo && <p className="text-[11px] text-rose-500 mt-1">{errors.shenasnamehNo}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  کد ملی (۱۰ رقمی) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={nationalId}
                  onChange={(e) => {
                    setNationalId(e.target.value);
                    clearError('nationalId');
                  }}
                  onBlur={() => {
                    const clean = toEnglishDigits(nationalId).trim();
                    if (clean.length === 10) {
                      const existingUser = dbStore.getUsers().find((u) => u.nationalId === clean);
                      if (existingUser) {
                        setErrors((prev) => ({
                          ...prev,
                          nationalId: `ورزشکار محترم (${existingUser.fullName})، شما قبلاً با کد ملی ${toPersianDigits(clean)} ثبت‌نام شده‌اید و نیازی به فرم جدید ثبت‌نام ندارید. می‌توانید مستقیماً از فرم ورود وارد شوید.`,
                        }));
                      } else {
                        const existingPreReg = dbStore.getPreRegistrations().find(
                          (pr) => pr.nationalId === clean && pr.status !== 'rejected'
                        );
                        if (existingPreReg) {
                          const statusLabel = existingPreReg.status === 'approved' ? 'تأیید شده' : 'در انتظار بررسی';
                          setErrors((prev) => ({
                            ...prev,
                            nationalId: `درخواست پیش‌ثبت‌نام شما با کد ملی (${toPersianDigits(clean)}) قبلاً ثبت شده و در وضعیت «${statusLabel}» قرار دارد. نیازی به تکمیل مجدد نیست.`,
                          }));
                        }
                      }
                    }
                  }}
                  placeholder="مثال: 0012345678"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.nationalId ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                {errors.nationalId && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl mt-2 text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{errors.nationalId}</span>
                  </div>
                )}
              </div>

              <div>
                <JalaliDatePicker
                  label="تاریخ تولد (شمسی)"
                  required
                  value={birthDate}
                  onChange={(val) => { setBirthDate(val); clearError('birthDate'); }}
                  error={errors.birthDate}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">جنسیت *</label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                      gender === 'male'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>آقا (مرد)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                      gender === 'female'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>خانم (زن)</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">تحصیلات و شغل</label>
                <input
                  type="text"
                  value={educationOrJob}
                  onChange={(e) => setEducationOrJob(e.target.value)}
                  placeholder="مثال: کارشناسی ارشد / مهندس نرم‌افزار"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact & Address */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-600" />
                مرحله ۲: اطلاعات تماس، آدرس و معرف
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شماره تلفن همراه متقاضی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearError('phone'); }}
                  placeholder="مثال: 09121234567"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.phone ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام و نام خانوادگی معرف (اختیاری)</label>
                <input
                  type="text"
                  value={referrerName}
                  onChange={(e) => setReferrerName(e.target.value)}
                  placeholder="مثال: مربی احمدی"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره همراه معرف (اختیاری)</label>
                <input
                  type="tel"
                  value={referrerPhone}
                  onChange={(e) => setReferrerPhone(e.target.value)}
                  placeholder="09121112233"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  آدرس دقیق محل سکونت <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); clearError('address'); }}
                  placeholder="استان، شهر، خیابان اصلی، خیابان فرعی، پلاک، واحد"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 resize-none ${
                    errors.address ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                {errors.address && <p className="text-[11px] text-rose-500 mt-1">{errors.address}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Equipment & Health */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                مرحله ۳: سایز تجهیزات، سابقه ورزشی و وضعیت سلامت
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">گروه خونی *</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سایز کفش سنگ‌نوردی *</label>
                <select
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold"
                >
                  {Array.from({ length: 15 }, (_, i) => 34 + i).map((size) => (
                    <option key={size} value={String(size)}>
                      {toPersianDigits(size)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سایز پوشاک ورزشی *</label>
                <select
                  value={clothingSize}
                  onChange={(e) => setClothingSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold"
                >
                  {['S', 'M', 'L', 'XL', '2XL', '3XL'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سطح تجربه سنگ‌نوردی</label>
                <select
                  value={climbingExperienceLevel}
                  onChange={(e) => setClimbingExperienceLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold"
                >
                  <option value="beginner">مبتدی (بدون سابقه / جدید)</option>
                  <option value="intermediate">متوسط (بین ۶ ماه تا ۲ سال)</option>
                  <option value="advanced">پیشرفته (بیش از ۲ سال)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره کارت بیمه ورزشی (در صورت داشتن)</label>
                <input
                  type="text"
                  value={insuranceNumber}
                  onChange={(e) => setInsuranceNumber(e.target.value)}
                  placeholder="مثال: INS-1403"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حساسیت‌های پزشکی، سابقه دارویی یا بیماری خاص
                </label>
                <textarea
                  rows={2}
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  placeholder="در صورت داشتن هرگونه حساسیت دارویی، دیابت، عارضه قلبی یا تنفسی حتماً ذکر نمایید..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Emergency Contact & Parent */}
        {activeStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                مرحله ۴: تماس اضطراری و مشخصات سرپرست
              </h3>
            </div>

            {/* Emergency Contact */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 block">
                🚨 اطلاعات تماس اضطراری (جهت تماس در شرایط ویژه):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام فرد اضطراری <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => { setEmergencyContactName(e.target.value); clearError('emergencyContactName'); }}
                    placeholder="مثال: سعید رضایی"
                    className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-slate-900 focus:ring-2 ${
                      errors.emergencyContactName ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                    }`}
                  />
                  {errors.emergencyContactName && <p className="text-[11px] text-rose-500 mt-1">{errors.emergencyContactName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نسبت با متقاضی *</label>
                  <select
                    value={emergencyContactRelation}
                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 font-bold"
                  >
                    <option value="پدر">پدر</option>
                    <option value="مادر">مادر</option>
                    <option value="همسر">همسر</option>
                    <option value="برادر/خواهر">برادر / خواهر</option>
                    <option value="دوست/هم‌طناب">دوست / هم‌طناب</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره همراه اضطراری <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => { setEmergencyContactPhone(e.target.value); clearError('emergencyContactPhone'); }}
                    placeholder="مثال: 09129876543"
                    className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono text-slate-900 focus:ring-2 ${
                      errors.emergencyContactPhone ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-teal-500'
                    }`}
                  />
                  {errors.emergencyContactPhone && <p className="text-[11px] text-rose-500 mt-1">{errors.emergencyContactPhone}</p>}
                </div>
              </div>
            </div>

            {/* Parent section for under 18 */}
            <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnder18}
                  onChange={(e) => {
                    setIsUnder18(e.target.checked);
                    if (!e.target.checked) {
                      clearError('parentFullName');
                      clearError('parentNationalId');
                      clearError('parentPhone');
                    }
                  }}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-teal-900">
                  ورزشکار زیر ۱۸ سال است (نیاز به اطلاعات و تأیید سرپرست قانونی)
                </span>
              </label>

              {isUnder18 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-teal-200/80">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نام و نام خانوادگی سرپرست *</label>
                    <input
                      type="text"
                      value={parentFullName}
                      onChange={(e) => { setParentFullName(e.target.value); clearError('parentFullName'); }}
                      placeholder="نام کامل والد"
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-slate-900 focus:ring-2 ${
                        errors.parentFullName ? 'border-rose-400' : 'border-slate-200 focus:ring-teal-500'
                      }`}
                    />
                    {errors.parentFullName && <p className="text-[11px] text-rose-500 mt-1">{errors.parentFullName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">کد ملی سرپرست *</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={parentNationalId}
                      onChange={(e) => { setParentNationalId(e.target.value); clearError('parentNationalId'); }}
                      placeholder="کد ملی ۱۰ رقمی"
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono text-slate-900 focus:ring-2 ${
                        errors.parentNationalId ? 'border-rose-400' : 'border-slate-200 focus:ring-teal-500'
                      }`}
                    />
                    {errors.parentNationalId && <p className="text-[11px] text-rose-500 mt-1">{errors.parentNationalId}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شماره همراه سرپرست *</label>
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => { setParentPhone(e.target.value); clearError('parentPhone'); }}
                      placeholder="09121234567"
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono text-slate-900 focus:ring-2 ${
                        errors.parentPhone ? 'border-rose-400' : 'border-slate-200 focus:ring-teal-500'
                      }`}
                    />
                    {errors.parentPhone && <p className="text-[11px] text-rose-500 mt-1">{errors.parentPhone}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-5 border-t border-slate-100">
          {activeStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              مرحله قبل
            </button>
          ) : (
            <div className="hidden sm:block"></div>
          )}

          {activeStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              مرحله بعد
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4" />
              ثبت نهایی و ارسال به مدیریت
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
