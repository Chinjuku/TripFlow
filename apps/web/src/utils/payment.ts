import jsQR from 'jsqr';
import { parse } from 'promptparse';

interface SubTag {
  id: string;
  value: string;
}

/**
 * Decodes a PromptPay QR image and extracts the PromptPay ID (phone / national
 * id) from the EMVCo payload. Returns null when the image isn't decodable or
 * isn't a PromptPay payload - callers should keep whatever the user typed.
 *
 * Pure + DOM-only (canvas/Image), no React - lives here per the refactor rule
 * that keeps logic out of `components/feat/`.
 */
export async function extractPromptpayId(dataUrl: string): Promise<string | null> {
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const decoded = jsQR(imageData.data, imageData.width, imageData.height);
  if (!decoded?.data) return null;

  try {
    const parsed = parse(decoded.data);
    const subTag01 = (parsed?.getTag('29')?.subTags as SubTag[] | undefined)?.find(
      (sub) => sub.id === '01',
    );
    if (!subTag01?.value) return null;

    // PromptPay QR encodes phone as 0066XXXXXXXXX - normalize to 0XXXXXXXXX.
    return subTag01.value.startsWith('0066') ? '0' + subTag01.value.substring(4) : subTag01.value;
  } catch {
    // Valid QR image but not a PromptPay EMVCo payload - nothing to extract.
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
