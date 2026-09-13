import React, { useState } from 'react';
import { isPlaceholderUrl, NO_PHOTO_SVG } from '../utils/placeholder';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  thumbnailSrc?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Componente de imagem otimizado para a Web.
 * Suporta WebP com fallback inteligente e transição suave de carregamento.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  thumbnailSrc,
  className = '',
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const finalSrc = hasError || !src || isPlaceholderUrl(src) ? NO_PHOTO_SVG : src;
  const isWebp = typeof finalSrc === 'string' && finalSrc.toLowerCase().includes('.webp');

  return (
    <picture className="relative block w-full h-full overflow-hidden">
      {isWebp && !hasError && (
        <source srcSet={finalSrc} type="image/webp" />
      )}
      <img
        src={finalSrc}
        alt={alt || 'Foto do calçado'}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-80 blur-[1px]'
        } ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
    </picture>
  );
};
