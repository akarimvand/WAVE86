import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, validateFileMagicBytes, authenticateJwt, optionalJwt, requireRoles } from '../middleware';

const router = Router();
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
export const PROFILE_IMG_DIR = path.resolve(UPLOAD_DIR, 'profile_img');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILE_IMG_DIR)) {
  fs.mkdirSync(PROFILE_IMG_DIR, { recursive: true });
}

// Multer Disk Storage setup with sanitization
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.body?.subDir || (req.query?.subDir as string);
    if (subDir === 'profile_img') {
      cb(null, PROFILE_IMG_DIR);
    } else {
      cb(null, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(ext) ? ext : '.bin';
    const prefix = req.body?.prefix ? `${String(req.body.prefix).replace(/[^a-zA-Z0-9_-]/g, '')}_` : '';
    const customName = req.body?.customName ? String(req.body.customName).replace(/[^a-zA-Z0-9_-]/g, '') : '';
    
    if (customName) {
      cb(null, `${prefix}${customName}${safeExt}`);
    } else {
      const uniqueName = `${prefix}file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExt}`;
      cb(null, uniqueName);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع فایل ارسالی مجاز نیست. فرمت‌های مجاز: JPG, PNG, WEBP, GIF, PDF'));
    }
  },
});

/**
 * Helper to safely convert base64 image/file strings to disk files
 */
export function convertBase64ToLocalFile(
  base64Data: string,
  prefix: string = 'file',
  customName?: string,
  targetSubDir?: string
): string {
  if (!base64Data || typeof base64Data !== 'string') return '';
  if (
    base64Data.startsWith('/uploads/') ||
    base64Data.startsWith('/upload/') ||
    base64Data.startsWith('http://') ||
    base64Data.startsWith('https://')
  ) {
    return base64Data;
  }

  const match = base64Data.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
  if (!match) return base64Data;

  const dataBuffer = Buffer.from(match[2], 'base64');
  if (dataBuffer.length > MAX_FILE_SIZE_BYTES) {
    console.warn(`[Upload Warning] File size exceeds limit: ${dataBuffer.length} bytes`);
    return '';
  }

  const { isValid, ext } = validateFileMagicBytes(dataBuffer);
  if (!isValid) {
    console.warn('[Upload Warning] Magic byte check failed for base64 file');
    return '';
  }

  try {
    const dir = targetSubDir ? path.resolve(UPLOAD_DIR, targetSubDir) : UPLOAD_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sanitizedCustom = customName ? customName.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = sanitizedCustom
      ? `${safePrefix ? safePrefix + '_' : ''}${sanitizedCustom}.${ext}`
      : `${safePrefix ? safePrefix + '_' : ''}${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, dataBuffer);
    return targetSubDir ? `/uploads/${targetSubDir}/${filename}` : `/uploads/${filename}`;
  } catch (e) {
    console.error('[Upload Error] Failed to write base64 file to disk:', e);
    return '';
  }
}

/**
 * POST /api/upload & POST /api/upload/file (Multipart form-data upload)
 */
const staffGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary', 'coach', 'accountant'])];
const adminGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary'])];

const handleSingleFileUpload = (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'هیچ فایلی ارسال نشده است.' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const { isValid } = validateFileMagicBytes(fileBuffer);

    if (!isValid) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'محتوای فایل ارسالی با فرمت مجاز تطابق ندارد.' });
    }

    const subDir = req.body?.subDir || (req.query?.subDir as string);
    const fileUrl = subDir === 'profile_img'
      ? `/uploads/profile_img/${req.file.filename}`
      : `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      relativeUrl: fileUrl,
      fileName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در بارگذاری فایل: ${err.message || err}` });
  }
};

router.post('/', optionalJwt, upload.single('file'), handleSingleFileUpload);
router.post('/file', optionalJwt, upload.single('file'), handleSingleFileUpload);

/**
 * POST /api/upload/multiple (Multipart batch file upload)
 */
router.post('/multiple', optionalJwt, upload.array('files', 100), (req: any, res: any) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'هیچ فایلی ارسال نشده است.' });
    }

    const uploadedUrls: string[] = [];
    for (const f of files) {
      const fileBuffer = fs.readFileSync(f.path);
      const { isValid } = validateFileMagicBytes(fileBuffer);
      if (isValid) {
        uploadedUrls.push(`/uploads/${f.filename}`);
      } else {
        fs.unlinkSync(f.path);
      }
    }

    res.json({
      success: true,
      count: uploadedUrls.length,
      urls: uploadedUrls,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در بارگذاری دسته‌ای فایل‌ها: ${err.message || err}` });
  }
});

/**
 * POST /api/upload/base64 & /api/upload/general
 */
const handleGeneralBase64Upload = (req: any, res: any) => {
  try {
    const base64Data = req.body.base64Data || req.body.fileBase64 || req.body.dataUrl || req.body.imageDataUrl;
    const prefix = req.body.prefix || req.body.folderType || 'media';
    const customName = req.body.customName || req.body.nationalId;

    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'داده Base64 ارسال نشده است.' });
    }

    const url = convertBase64ToLocalFile(base64Data, prefix, customName);
    if (!url) {
      return res.status(400).json({ success: false, error: 'فایل نامعتبر است یا حجم آن بیش از ۵ مگابایت می‌باشد.' });
    }

    res.json({ success: true, url, relativeUrl: url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در پردازش فایل: ${err.message || err}` });
  }
};

router.post('/base64', authenticateJwt, handleGeneralBase64Upload);
router.post('/general', authenticateJwt, handleGeneralBase64Upload);

/**
 * POST /api/upload/product-image
 */
router.post('/product-image', ...adminGuard, (req, res) => {
  try {
    const base64Data = req.body.imageDataUrl || req.body.base64Data;
    const customName = req.body.customName;
    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'داده تصویر کالا ارسال نشده است.' });
    }

    const url = convertBase64ToLocalFile(base64Data, 'prod', customName);
    res.json({ success: true, url, relativeUrl: url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در آپلود عکس کالا: ${err.message || err}` });
  }
});

/**
 * POST /api/upload/profile-image
 */
router.post('/profile-image', authenticateJwt, (req, res) => {
  try {
    const base64Data = req.body.imageDataUrl || req.body.base64Data;
    const nationalId = req.body.nationalId || req.body.customName || 'user';
    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'داده تصویر پروفایل ارسال نشده است.' });
    }

    const url = convertBase64ToLocalFile(base64Data, 'profile', nationalId, 'profile_img');
    res.json({ success: true, url, relativeUrl: url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در آپلود عکس کاربر: ${err.message || err}` });
  }
});

/**
 * POST /api/upload/bulk-profile-images & /api/upload/batch-profile-images
 */
const handleBulkProfileImages = (req: any, res: any) => {
  try {
    const images = req.body.images || [];
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, error: 'لیست تصاویر ارسال نشده است.' });
    }

    let savedCount = 0;
    for (const item of images) {
      const nationalId = item.nationalId ? item.nationalId.replace(/[^a-zA-Z0-9_-]/g, '') : null;
      const dataUrl = item.imageDataUrl || item.dataUrl;

      if (nationalId && dataUrl) {
        const url = convertBase64ToLocalFile(dataUrl, '', nationalId, 'profile_img');
        if (url) savedCount++;
      }
    }

    res.json({
      success: true,
      message: `${savedCount} تصویر با موفقیت بر روی سرور ذخیره شد.`,
      count: savedCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `خطا در آپلود دسته‌ای تصاویر: ${err.message || err}` });
  }
};

router.post('/bulk-profile-images', ...adminGuard, handleBulkProfileImages);
router.post('/batch-profile-images', ...adminGuard, handleBulkProfileImages);

export default router;
