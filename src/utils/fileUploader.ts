/**
 * Universal file upload utility using standard Multipart Form Data.
 * Files are sent directly to the server without any Base64 encoding.
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  relativeUrl?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

export interface UploadOptions {
  prefix?: string;
  customName?: string;
  subDir?: 'profile_img' | 'receipts' | 'documents' | 'products' | 'general' | 'club' | string;
}

/**
 * Uploads any binary File or Blob directly to /api/upload via multipart/form-data.
 */
export async function uploadFileToServer(
  fileOrBlob: File | Blob,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    
    // If it's a raw Blob, convert to a named File
    let uploadPayload: File;
    if (fileOrBlob instanceof File) {
      uploadPayload = fileOrBlob;
    } else {
      const ext = fileOrBlob.type === 'image/png' ? 'png' : fileOrBlob.type === 'application/pdf' ? 'pdf' : 'jpg';
      const name = `${options.customName || 'file'}.${ext}`;
      uploadPayload = new File([fileOrBlob], name, { type: fileOrBlob.type || 'image/jpeg' });
    }

    formData.append('file', uploadPayload);
    if (options.prefix) formData.append('prefix', options.prefix);
    if (options.customName) formData.append('customName', options.customName);
    if (options.subDir) formData.append('subDir', options.subDir);

    const token = typeof window !== 'undefined' ? sessionStorage.getItem('club_app_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (data.success && data.url) {
      return {
        success: true,
        url: data.url,
        relativeUrl: data.url,
        fileName: data.fileName || uploadPayload.name,
        size: data.size || uploadPayload.size,
      };
    } else {
      return {
        success: false,
        error: data.error || 'خطا در بارگذاری فایل در سرور',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `عدم برقراری ارتباط با سرور: ${err.message || err}`,
    };
  }
}
