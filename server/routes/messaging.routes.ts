import { Router } from 'express';
import { getClubSettings } from '../db';
import { validateRequestBody, authenticateJwt, requireRoles } from '../middleware';

const router = Router();
const staffGuard = [authenticateJwt, requireRoles(['super_admin', 'admin', 'secretary'])];

// SMS.ir Base URLs
const SMS_IR_CREDIT_URL = 'https://api.sms.ir/v1/credit';
const SMS_IR_LINES_URL = 'https://api.sms.ir/v1/line';
const SMS_IR_BULK_URL = 'https://api.sms.ir/v1/send/bulk';
const SMS_IR_VERIFY_URL = 'https://api.sms.ir/v1/send/verify';

/**
 * POST /api/sms/credit
 */
router.post('/credit', ...staffGuard, async (req, res) => {
  const currentSettings = getClubSettings();
  const apiKey = req.body?.apiKey || currentSettings?.smsApiKey || process.env.SMS_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'کلید وب‌سرویس SMS.ir تعریف نشده است.' });
  }

  try {
    const response = await fetch(SMS_IR_CREDIT_URL, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (response.ok && (data.status === 1 || data.status === 200 || data.data !== undefined)) {
      const creditValue = typeof data.data === 'number' ? data.data : data.data?.credit || 0;
      return res.json({ success: true, credit: creditValue, raw: data });
    } else {
      return res.status(400).json({ success: false, error: data.message || 'خطا در احراز هویت پیامک' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'خطای شبکه در ارتباط با SMS.ir' });
  }
});

/**
 * POST /api/sms/lines
 */
router.post('/lines', ...staffGuard, async (req, res) => {
  const currentSettings = getClubSettings();
  const apiKey = req.body?.apiKey || currentSettings?.smsApiKey || process.env.SMS_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'کلید وب‌سرویس پیامک وارد نشده است.' });
  }

  try {
    const response = await fetch(SMS_IR_LINES_URL, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (response.ok && Array.isArray(data.data)) {
      const lines = data.data.map((item: any) => String(item.lineNumber || item.number || item));
      return res.json({ success: true, lines });
    } else {
      return res.status(400).json({ success: false, error: data.message || 'خطا در دریافت خطوط پیامک' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'خطای سرور' });
  }
});

/**
 * POST /api/sms/send-bulk
 */
router.post('/send-bulk', ...staffGuard, validateRequestBody(['messageText', 'mobiles']), async (req, res) => {
  const currentSettings = getClubSettings();
  const { apiKey: customKey, lineNumber: customLine, messageText, mobiles } = req.body;
  const apiKey = customKey || currentSettings?.smsApiKey || process.env.SMS_API_KEY;
  const lineNumber = customLine || currentSettings?.smsLineNumber || '30007732';

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'کلید وب‌سرویس پیامک تنظیم نشده است.' });
  }
  if (!Array.isArray(mobiles) || mobiles.length === 0) {
    return res.status(400).json({ success: false, error: 'لیست شماره‌های گیرنده خالی است.' });
  }

  try {
    const response = await fetch(SMS_IR_BULK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        lineNumber: Number(lineNumber) || lineNumber,
        messageText,
        mobiles: mobiles.map((m: string) => m.trim()),
      }),
    });

    const data = await response.json();
    if (response.ok && (data.status === 1 || data.status === 200 || data.data)) {
      return res.json({
        success: true,
        packId: data.data?.packId,
        messageIds: data.data?.messageIds,
        cost: data.data?.cost,
      });
    } else {
      return res.status(400).json({ success: false, error: data.message || 'خطا در ارسال پیامک انبوه' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'خطای شبکه در ارسال پیامک' });
  }
});

/**
 * POST /api/sms/send-verify
 */
router.post('/send-verify', ...staffGuard, validateRequestBody(['mobile', 'templateId', 'parameters']), async (req, res) => {
  const currentSettings = getClubSettings();
  const { apiKey: customKey, mobile, templateId, parameters } = req.body;
  const apiKey = customKey || currentSettings?.smsApiKey || process.env.SMS_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'کلید پیامک تنظیم نشده است.' });
  }

  try {
    const response = await fetch(SMS_IR_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        mobile: mobile.trim(),
        templateId: Number(templateId) || templateId,
        parameters: Array.isArray(parameters) ? parameters : [],
      }),
    });

    const data = await response.json();
    if (response.ok && (data.status === 1 || data.status === 200 || data.data)) {
      return res.json({ success: true, messageId: data.data?.messageId, cost: data.data?.cost });
    } else {
      return res.status(400).json({ success: false, error: data.message || 'خطا در ارسال پترن پیامکی' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'خطای شبکه' });
  }
});

// ==========================================
// BALE MESSENGER BOT
// ==========================================

/**
 * POST /api/bale/test-connection
 */
router.post('/bale/test-connection', ...staffGuard, async (req, res) => {
  const currentSettings = getClubSettings();
  const botToken = req.body?.botToken || currentSettings?.baleBotToken;

  if (!botToken) {
    return res.status(400).json({ success: false, error: 'توکن بات بله تعریف نشده است.' });
  }

  try {
    const url = `https://tapi.bale.ai/bot${botToken}/getMe`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();

    if (response.ok && data.ok) {
      return res.json({
        success: true,
        message: `اتصال به بات "${data.result.first_name}" (@${data.result.username}) با موفقیت برقرار شد.`,
        botInfo: data.result,
      });
    } else {
      return res.status(400).json({ success: false, error: data.description || 'توکن بات نامعتبر است.' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'خطا در اتصال به سرورهای بله' });
  }
});

/**
 * POST /api/bale/send-message
 */
router.post('/bale/send-message', ...staffGuard, validateRequestBody(['text']), async (req, res) => {
  const currentSettings = getClubSettings();
  const botToken = req.body?.botToken || currentSettings?.baleBotToken;
  const chatId = req.body?.chatId || currentSettings?.baleChannelOrChatId;

  if (!botToken) {
    return res.status(400).json({ success: false, error: 'توکن بات بله تنظیم نشده است.' });
  }
  if (!chatId) {
    return res.status(400).json({ success: false, error: 'شناسه چت یا کانال بله مشخص نشده است.' });
  }

  try {
    const url = `https://tapi.bale.ai/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: req.body.text,
      }),
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      return res.json({ success: true, messageId: data.result?.message_id, data });
    } else {
      return res.status(400).json({ success: false, error: data.description || 'خطا در ارسال پیام به بله' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'خطای شبکه' });
  }
});

export default router;
