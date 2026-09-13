import sharp from 'sharp';
import { 
  OptimizationResult, 
  ThumbnailResult, 
  DEFAULT_WEBP_QUALITY, 
  DEFAULT_THUMBNAIL_SIZE, 
  MAX_DIMENSION 
} from './imageOptimizationService';

/**
 * Converte Buffer Node.js para WebP usando sharp (para backend e testes)
 */
export async function optimizeBufferToWebP(
  inputBuffer: Buffer,
  options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }
): Promise<OptimizationResult> {
  const quality = Math.round((options?.quality ?? DEFAULT_WEBP_QUALITY) * 100);
  const maxW = options?.maxWidth || MAX_DIMENSION;
  const maxH = options?.maxHeight || MAX_DIMENSION;

  const originalSize = inputBuffer.length;
  let pipeline = sharp(inputBuffer).rotate();
  const meta = await pipeline.metadata();

  if ((meta.width && meta.width > maxW) || (meta.height && meta.height > maxH)) {
    pipeline = pipeline.resize(maxW, maxH, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  let webpBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();

  // Compressão adaptativa para fotos muito pesadas (> 4MB ou > 500KB no resultado inicial)
  if (webpBuffer.length > 500 * 1024 && quality > 72) {
    webpBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(Math.min(maxW, 1400), Math.min(maxH, 1400), {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();
  }

  const webpMeta = await sharp(webpBuffer).metadata();
  const optimizedSize = webpBuffer.length;
  const ratio = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

  return {
    buffer: webpBuffer,
    mimeType: 'image/webp',
    extension: 'webp',
    width: webpMeta.width || 0,
    height: webpMeta.height || 0,
    originalSize,
    optimizedSize,
    compressionRatio: ratio
  };
}

/**
 * Gera thumbnail 150x150 em WebP a partir de Buffer Node.js usando sharp
 */
export async function generateThumbnailBuffer(
  inputBuffer: Buffer,
  options?: {
    size?: number;
    quality?: number;
  }
): Promise<ThumbnailResult> {
  const size = options?.size || DEFAULT_THUMBNAIL_SIZE;
  const quality = Math.round((options?.quality ?? 0.75) * 100);

  const thumbBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(size, size, {
      fit: 'cover',
      position: 'centre'
    })
    .webp({ quality, effort: 3 })
    .toBuffer();

  return {
    buffer: thumbBuffer,
    mimeType: 'image/webp',
    extension: 'webp',
    width: size,
    height: size,
    size: thumbBuffer.length
  };
}
