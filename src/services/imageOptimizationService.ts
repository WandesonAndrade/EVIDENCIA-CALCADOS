/**
 * Image Optimization Service (Browser / Web) - Evidência Calçados
 * Converte imagens no navegador usando HTML5 Canvas para WebP com qualidade 80,
 * gera miniaturas de 150px e valida limites de tamanho (5MB).
 * 100% compatível com Vite e empacotamento web (zero dependências Node nativas).
 */

export interface OptimizationResult {
  blob?: Blob;
  buffer?: any;
  mimeType: 'image/webp';
  extension: 'webp';
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

export interface ThumbnailResult {
  blob?: Blob;
  buffer?: any;
  mimeType: 'image/webp';
  extension: 'webp';
  width: number;
  height: number;
  size: number;
}

export const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
export const DEFAULT_WEBP_QUALITY = 0.80; // 80% qualidade
export const DEFAULT_THUMBNAIL_SIZE = 150; // 150x150 px
export const MAX_DIMENSION = 1600; // Máximo 1600px largura/altura para e-commerce

/**
 * Valida se um arquivo é uma imagem válida e respeita o limite de 8MB
 */
export function validateImageFile(file: File | { size: number; type?: string; name?: string }): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Nenhum arquivo fornecido.' };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `A imagem possui ${sizeMb}MB. O limite máximo permitido para upload é de 8MB.`
    };
  }

  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.gif', '.heic'];
  const hasValidExt = validExtensions.some(ext => name.endsWith(ext));
  const hasValidMime = mime.startsWith('image/');

  if (!hasValidMime && !hasValidExt && name) {
    return {
      valid: false,
      error: 'Formato de arquivo inválido. Por favor, envie uma imagem (JPG, PNG, WEBP ou HEIC).'
    };
  }

  return { valid: true };
}

/**
 * Converte imagem no Navegador (HTML5 Canvas) para WebP com compressão adaptativa
 */
export async function optimizeBrowserImageToWebP(
  input: File | Blob,
  options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }
): Promise<OptimizationResult> {
  const originalSize = input.size;

  // Compressão adaptativa inteligente: se a foto original for muito pesada (> 4MB),
  // ajusta suavemente a qualidade inicial (0.78) para garantir carregamento ultra-rápido sem perda visual
  let quality = options?.quality ?? (originalSize > 4 * 1024 * 1024 ? 0.78 : DEFAULT_WEBP_QUALITY);
  const maxW = options?.maxWidth || MAX_DIMENSION;
  const maxH = options?.maxHeight || MAX_DIMENSION;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao decodificar a imagem'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto 2D do Canvas'));
          return;
        }

        // Suavização de alta fidelidade para manter texturas de couro nítidas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const handleBlobResult = (blob: Blob | null) => {
          if (!blob) {
            reject(new Error('Falha ao gerar Blob WebP no Canvas'));
            return;
          }

          // Se a foto ainda for maior que 500KB e não for a segunda passagem, comprime levemente mais (qualidade 0.72)
          if (blob.size > 500 * 1024 && quality > 0.73) {
            canvas.toBlob(
              (secondBlob) => {
                const finalBlob = secondBlob || blob;
                const optimizedSize = finalBlob.size;
                const ratio = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

                resolve({
                  blob: finalBlob,
                  mimeType: 'image/webp',
                  extension: 'webp',
                  width,
                  height,
                  originalSize,
                  optimizedSize,
                  compressionRatio: ratio
                });
              },
              'image/webp',
              0.72
            );
            return;
          }

          const optimizedSize = blob.size;
          const ratio = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

          resolve({
            blob,
            mimeType: 'image/webp',
            extension: 'webp',
            width,
            height,
            originalSize,
            optimizedSize,
            compressionRatio: ratio
          });
        };

        canvas.toBlob(handleBlobResult, 'image/webp', quality);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(input);
  });
}

/**
 * Gera thumbnail 150x150 no Navegador (HTML5 Canvas) em WebP
 */
export async function generateBrowserThumbnail(
  input: File | Blob,
  options?: {
    size?: number;
    quality?: number;
  }
): Promise<ThumbnailResult> {
  const size = options?.size || DEFAULT_THUMBNAIL_SIZE;
  const quality = options?.quality ?? 0.75;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo para miniatura'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao decodificar imagem para miniatura'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Não foi possível obter contexto 2D do Canvas'));
          return;
        }

        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao gerar Thumbnail WebP'));
              return;
            }

            resolve({
              blob,
              mimeType: 'image/webp',
              extension: 'webp',
              width: size,
              height: size,
              size: blob.size
            });
          },
          'image/webp',
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(input);
  });
}

/**
 * Função de otimização de imagem para WebP no Frontend
 */
export async function optimizeImageToWebP(
  input: File | Blob,
  options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }
): Promise<OptimizationResult> {
  return optimizeBrowserImageToWebP(input, options);
}

/**
 * Função de geração de thumbnail 150x150 em WebP no Frontend
 */
export async function generateThumbnailWebP(
  input: File | Blob,
  options?: {
    size?: number;
    quality?: number;
  }
): Promise<ThumbnailResult> {
  return generateBrowserThumbnail(input, options);
}
