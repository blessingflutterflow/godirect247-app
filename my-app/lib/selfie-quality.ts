// Client-side selfie clarity heuristic.
// We can't run real face recognition in the browser without a heavy model,
// so we use cheap signals (resolution, brightness spread, edge variance) to
// reject obviously bad selfies — black screens, blurry shots, solid colours.

export interface SelfieQualityResult {
  ok: boolean;
  reason?: string;
}

const MIN_WIDTH = 240;
const MIN_HEIGHT = 240;
const MIN_BRIGHTNESS_STDDEV = 18;
const MIN_EDGE_VARIANCE = 35;
const MIN_BYTES = 8000;
const MIN_AVERAGE_BRIGHTNESS = 25;
const MAX_AVERAGE_BRIGHTNESS = 240;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read selfie image.'));
    img.src = dataUrl;
  });
}

function approxBase64Bytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return dataUrl.length;
  const base64 = dataUrl.slice(commaIndex + 1);
  return Math.floor(base64.length * 0.75);
}

export async function assessSelfieQuality(dataUrl: string): Promise<SelfieQualityResult> {
  if (!dataUrl.startsWith('data:image/')) {
    return { ok: false, reason: 'Please upload a valid image.' };
  }

  if (approxBase64Bytes(dataUrl) < MIN_BYTES) {
    return { ok: false, reason: 'Selfie is too small. Please retake a clearer photo.' };
  }

  const img = await loadImage(dataUrl);
  if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
    return { ok: false, reason: 'Selfie resolution is too low. Please retake closer to the camera.' };
  }

  // Downsize for analysis so this stays cheap on phones.
  const analysisSize = 160;
  const scale = Math.min(1, analysisSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { ok: false, reason: 'Could not analyse selfie. Please try again.' };
  }
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Convert to grayscale, then compute mean / stddev / edge variance.
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = value;
    sum += value;
  }
  const mean = sum / gray.length;

  if (mean < MIN_AVERAGE_BRIGHTNESS) {
    return { ok: false, reason: 'Selfie is too dark. Please retake in better light.' };
  }
  if (mean > MAX_AVERAGE_BRIGHTNESS) {
    return { ok: false, reason: 'Selfie is too bright. Please retake without direct light on the camera.' };
  }

  let varianceSum = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const diff = gray[i] - mean;
    varianceSum += diff * diff;
  }
  const stddev = Math.sqrt(varianceSum / gray.length);
  if (stddev < MIN_BRIGHTNESS_STDDEV) {
    return { ok: false, reason: 'Selfie looks blank or one solid colour. Please retake with your face visible.' };
  }

  // Laplacian-style edge variance (3x3 kernel: center 4, neighbours -1).
  let edgeSum = 0;
  let edgeSquared = 0;
  let edgeCount = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const value =
        4 * gray[idx] -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - w] -
        gray[idx + w];
      edgeSum += value;
      edgeSquared += value * value;
      edgeCount += 1;
    }
  }
  const edgeMean = edgeCount > 0 ? edgeSum / edgeCount : 0;
  const edgeVariance = edgeCount > 0 ? edgeSquared / edgeCount - edgeMean * edgeMean : 0;
  if (edgeVariance < MIN_EDGE_VARIANCE) {
    return { ok: false, reason: 'Selfie looks blurry. Please hold still and retake a sharper photo.' };
  }

  return { ok: true };
}
