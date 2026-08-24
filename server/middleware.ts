import { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

// JWT Secret: MUST be provided via environment in production.
// If missing, an ephemeral random secret is used (invalidates sessions on restart) with a loud warning.
// Never fall back to a hardcoded fixed secret.
export const JWT_SECRET: string = (() => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (envSecret && envSecret.length > 0) {
    console.warn('[Security] JWT_SECRET is set but shorter than 16 characters. Using an ephemeral random secret instead.');
  } else {
    console.warn('[Security] JWT_SECRET environment variable is NOT set. Using an ephemeral random secret — sessions will NOT survive restarts. Set JWT_SECRET in production!');
  }
  return require('crypto').randomBytes(48).toString('hex');
})();
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export interface AuthenticatedUser {
  id: string;
  username: string;
  nationalId?: string;
  fullName?: string;
  roles: string[];
  activeRole?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function configureSecurityMiddlewares(app: Express) {
  // Trust proxy for reverse proxy environments (e.g. Cloud Run, Nginx)
  app.set('trust proxy', 1);

  // Helmet security headers configured safely for SPA, local media, and iframe previews
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
          frameAncestors: ["'self'", "*"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Rate Limiter for general API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1500, // Limit each IP to 1500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
      trustProxy: false,
    },
    message: {
      success: false,
      error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه بعد مجدداً تلاش کنید.',
    },
  });

  // Stricter Rate Limiter for Authentication endpoints (Brute Force Protection)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 login attempts per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
      trustProxy: false,
    },
    message: {
      success: false,
      error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.',
    },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/login', authLimiter);
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nationalId: user.nationalId,
      fullName: user.fullName,
      roles: user.roles || ['athlete'],
      activeRole: user.activeRole || 'athlete',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
export function authenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'دسترسی غیرمجاز: لطفاً ابتدا وارد حساب کاربری خود شوید (Token Missing).',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'فرمت توکن احراز هویت نامعتبر است.',
    });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'توکن نامعتبر یا منقضی شده است. لطفاً دوباره وارد شوید.',
    });
  }
}

/**
 * Optional JWT: decodes token if present, but allows request if absent (useful for hybrid/flexible routes)
 */
export function optionalJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    } catch {}
  }
  next();
}

/**
 * Middleware for Role-Based Access Control (RBAC)
 */
export function requireRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If not authenticated
    if (!req.user) {
      // In dev mode without auth header, check if we allow default admin fallback or reject
      return res.status(403).json({
        success: false,
        error: 'شما مجوز لازم برای انجام این عملیات را ندارید.',
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role) || req.user?.activeRole === role);

    if (!hasRole && !userRoles.includes('admin') && !userRoles.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        error: `شما به عنوان "${req.user.activeRole || userRoles.join(', ')}" دسترسی به این بخش ندارید. دسترسی‌های مجاز: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Validation Middleware for common API payloads
 */
export function validateRequestBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'بدنه درخواست نامعتبر است.' });
    }

    const missingFields = requiredFields.filter((field) => {
      const val = req.body[field];
      return val === undefined || val === null || val === '';
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `فیلدهای الزامی زیر وارد نشده‌اند: ${missingFields.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Magic Bytes validator for uploaded files & Base64 payload security
 */
export function validateFileMagicBytes(buffer: Buffer): { isValid: boolean; mimeType: string | null; ext: string | null } {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, mimeType: null, ext: null };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { isValid: true, mimeType: 'image/png', ext: 'png' };
  }

  // GIF: 47 49 46 38 ('GIF8')
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { isValid: true, mimeType: 'image/gif', ext: 'gif' };
  }

  // PDF: 25 50 44 46 ('%PDF')
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { isValid: true, mimeType: 'application/pdf', ext: 'pdf' };
  }

  // WebP: RIFF ... WEBP (0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { isValid: true, mimeType: 'image/webp', ext: 'webp' };
  }

  return { isValid: false, mimeType: null, ext: null };
}

/**
 * Central Error Handler Middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[API Error] ${req.method} ${req.url}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'خطای داخلی در سرور رخ داده است.';

  res.status(statusCode).json({
    success: false,
    dbConnected: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
