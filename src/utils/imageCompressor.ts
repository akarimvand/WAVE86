/**
 * Utility for converting image files or binary blobs into compressed JPEG Blob objects under 1MB.
 * Completely free of Base64 encoding. Uses native browser Blob & Canvas APIs.
 */

export interface CompressedImageResult {
  nationalId: string;
  fileName: string;
  blob: Blob;
  previewUrl: string; // Object URL (blob:http...) for temporary DOM display, never saved to DB
  sizeBytes: number;
  sizeFormatted: string;
}

/**
 * Compresses and converts an image File or Blob to JPEG format < 1MB using HTML5 Canvas toBlob.
 * @param source File or Blob of the image
 * @param nationalId Clean 10-digit national ID to name the output file
 * @param maxDimension Maximum width/height in pixels (default: 1000px)
 * @param quality Compression quality 0.1 to 1.0 (default: 0.85)
 */
export async function processAndCompressImage(
  source: File | Blob,
  nationalId: string,
  maxDimension = 1000,
  quality = 0.85
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const cleanNationalId = nationalId.trim().replace(/\D/g, '');
    const fileName = `${cleanNationalId || 'profile'}.jpeg`;

    const objectUrl = URL.createObjectURL(source);
    const img = new Image();

    img.onload = () => {
      // Clean up the initial temporary object URL
      URL.revokeObjectURL(objectUrl);

      try {
        let { width, height } = img;

        // Calculate aspect ratio scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('خطا در ایجاد Canvas مرورگر جهت پردازش تصویر'));
          return;
        }

        // Draw image onto canvas with white background (for transparent PNG/WEBP conversion)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert directly to Blob without Base64
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('خطا در فشرده‌سازی و تبدیل تصویر به فرمت استاندارد'));
              return;
            }

            const sizeBytes = blob.size;
            const sizeFormatted = (sizeBytes / 1024).toFixed(1) + ' KB';
            const previewUrl = URL.createObjectURL(blob);

            resolve({
              nationalId: cleanNationalId,
              fileName,
              blob,
              previewUrl,
              sizeBytes,
              sizeFormatted,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (err: any) {
        reject(new Error(`خطا در پردازش تصویر: ${err.message}`));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('فرمت یا محتوای فایل تصویر معتبر نمی‌باشد.'));
    };

    img.src = objectUrl;
  });
}
