export const NO_PHOTO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none"><rect width="400" height="400" fill="%23F3F4F6"/><path d="M160 220C160 220 180 180 200 180C220 180 240 220 240 220" stroke="%239CA3AF" stroke-width="8" stroke-linecap="round"/><circle cx="160" cy="150" r="15" fill="%239CA3AF"/><rect x="100" y="100" width="200" height="200" rx="20" stroke="%239CA3AF" stroke-width="8" stroke-dasharray="16 16"/><text x="200" y="340" text-anchor="middle" fill="%236B7280" font-family="sans-serif" font-size="18" font-weight="600">Sem Foto</text></svg>`;

export const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return true;
  const clean = url.trim().toLowerCase();
  if (!clean || clean === 'null' || clean === 'undefined' || clean === 'none' || clean === 'sem foto') return true;

  // Rejeita caminhos de disco locais do Windows (C:\...), compartilhamentos de rede (\\...) ou arquivos locais não-web
  if (/^[a-z]:[\\/]/.test(clean) || clean.startsWith('\\\\')) {
    return true;
  }

  // Detect known mock/dummy image generators
  if (
    clean.includes('via.placeholder.com') ||
    clean.includes('placehold.co') ||
    clean.includes('placehold.it') ||
    clean.includes('dummyimage.com')
  ) {
    return true;
  }

  // Detect internal "Sem Foto" SVG placeholder
  if (clean.startsWith('data:image/svg') && (clean.includes('sem%20foto') || clean.includes('sem foto') || clean.includes('sem-foto'))) {
    return true;
  }

  return false;
};

/**
 * Valida estritamente se a URL é uma URL web acessível (HTTP, HTTPS, Supabase, Cloudinary, data:image, blob, etc.)
 * Rejeita qualquer caminho local de sistema de arquivo do ERP ou valor nulo.
 */
export const isValidWebPhotoUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean || clean.length < 5) return false;
  if (isPlaceholderUrl(clean)) return false;

  const lower = clean.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('blob:') ||
    (lower.startsWith('/') && !lower.startsWith('//') && !lower.includes('\\'))
  ) {
    return true;
  }

  return false;
};


