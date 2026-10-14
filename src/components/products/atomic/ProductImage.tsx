import React, { useState, useEffect } from 'react';
import { Product } from '../../../types';
import { NO_PHOTO_SVG, isPlaceholderUrl } from '../../../utils/placeholder';
import { recordBrokenPhoto } from '../../../services/brokenPhotoService';

export interface ProductImageProps {
  product?: Partial<Product> | any;
  src?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  variant?: 'card' | 'thumb' | 'detail';
  priority?: boolean;
  onImageError?: (url: string) => void;
}

/**
 * Resolução padronizada e segura de imagens de produtos.
 * Extrai a melhor foto real disponível ignorando placeholders genéricos.
 */
export function extractProductPhotoUrl(product?: Partial<Product> | any): string {
  if (!product) return NO_PHOTO_SVG;

  // 1. Array de imagens cadastradas/gerenciadas no Firestore/Supabase
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstValid = product.images.find((img: any) => typeof img === 'string' && img.trim() && !isPlaceholderUrl(img));
    if (firstValid) return firstValid;
  }

  // 2. URI ou URL direta do ERP MobLink ou Firestore
  const directUrls = [product.foto_uri, product.imageUrl, product.foto_url, product.foto, product.imagem, product.image];
  for (const url of directUrls) {
    if (typeof url === 'string' && url.trim() && !isPlaceholderUrl(url)) {
      return url.trim();
    }
  }

  // 3. Imagens mapeadas por variação de cor
  if (product.colorImages && typeof product.colorImages === 'object') {
    const colorValues = Object.values(product.colorImages).flat().filter(Boolean);
    const firstColorImg = colorValues.find((img: any) => typeof img === 'string' && img.trim() && !isPlaceholderUrl(img));
    if (firstColorImg) return firstColorImg as string;
  }

  if (product.colorImageMap && typeof product.colorImageMap === 'object') {
    const colorMapValues = Object.values(product.colorImageMap).flat().filter(Boolean);
    const firstColorMapImg = colorMapValues.find((img: any) => typeof img === 'string' && img.trim() && !isPlaceholderUrl(img));
    if (firstColorMapImg) return firstColorMapImg as string;
  }

  return NO_PHOTO_SVG;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  product,
  src,
  alt,
  className = '',
  containerClassName = '',
  variant = 'card',
  priority = false,
  onImageError,
}) => {
  const photoUrl = src || extractProductPhotoUrl(product);
  const [hasError, setHasError] = useState(false);

  // Reseta o estado de erro caso a URL do produto mude
  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const altText = alt || product?.name || product?.nome || product?.descricao || 'Calçado Evidência';
  const effectivePhotoUrl = hasError ? NO_PHOTO_SVG : photoUrl;
  const isNoPhoto = effectivePhotoUrl === NO_PHOTO_SVG || isPlaceholderUrl(effectivePhotoUrl);

  const handleError = () => {
    if (!hasError && photoUrl && photoUrl !== NO_PHOTO_SVG) {
      setHasError(true);
      const prodId = String(product?.id || product?.moblinkId || '');
      if (prodId) {
        recordBrokenPhoto(prodId, photoUrl);
      }
      onImageError?.(photoUrl);
    }
  };

  if (variant === 'thumb') {
    return (
      <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 ${containerClassName}`}>
        <img
          src={effectivePhotoUrl}
          alt={altText}
          className={`w-full h-full object-cover ${className}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${containerClassName}`}>
      <img
        src={effectivePhotoUrl}
        alt={altText}
        className={`w-full h-full object-contain ${
          isNoPhoto ? 'opacity-40 grayscale scale-75' : 'drop-shadow-md group-hover:drop-shadow-2xl group-hover:scale-108 group-hover:-rotate-1'
        } transition-all duration-500 ease-out ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={handleError}
      />
    </div>
  );
};
