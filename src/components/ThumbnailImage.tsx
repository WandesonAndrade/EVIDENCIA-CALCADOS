import React, { useState } from 'react';
import { isPlaceholderUrl, NO_PHOTO_SVG } from '../utils/placeholder';

export interface ThumbnailImageProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

/**
 * Componente dedicado para exibição de miniaturas (150px) em WebP
 * Ideal para tabelas administrativas, carrinho, buscas e listas compactas.
 */
export const ThumbnailImage: React.FC<ThumbnailImageProps> = ({
  src,
  alt = 'Miniatura do produto',
  size = 150,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const finalSrc = hasError || !src || isPlaceholderUrl(src) ? NO_PHOTO_SVG : src;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 ${className}`}
    >
      <img
        src={finalSrc}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
