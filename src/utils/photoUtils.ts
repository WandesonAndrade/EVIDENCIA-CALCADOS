import { isPlaceholderUrl } from './placeholder';

/**
 * Checagem de Foto Válida no Produto (Obrigatório para exibição na vitrine da loja).
 * Verifica se um produto possui pelo menos uma imagem/foto real que NÃO seja placeholder.
 *
 * REGRA MANDATÓRIA: Apenas produtos com foto real e estoque positivo aparecem na loja virtual.
 */
export const hasProductValidPhotos = (product: any): boolean => {
  if (!product || typeof product !== 'object') return false;

  // 1. Array de imagens (images)
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (img && typeof img === 'string' && !isPlaceholderUrl(img)) {
        return true;
      }
    }
  }

  // 2. imageUrl
  if (product.imageUrl && typeof product.imageUrl === 'string' && !isPlaceholderUrl(product.imageUrl)) {
    return true;
  }

  // 3. foto_uri / foto_url / foto
  const fotoUri = product.foto_uri || product.foto_url || product.foto;
  if (fotoUri && typeof fotoUri === 'string' && !isPlaceholderUrl(fotoUri)) {
    return true;
  }

  // 4. Mapeamento de fotos por cor (colorImages)
  if (product.colorImages && typeof product.colorImages === 'object') {
    for (const urls of Object.values(product.colorImages)) {
      if (Array.isArray(urls)) {
        for (const u of urls) {
          if (u && typeof u === 'string' && !isPlaceholderUrl(u)) {
            return true;
          }
        }
      }
    }
  }

  // 5. Mapeamento de foto por cor (colorImageMap)
  if (product.colorImageMap && typeof product.colorImageMap === 'object') {
    for (const u of Object.values(product.colorImageMap)) {
      if (u && typeof u === 'string' && !isPlaceholderUrl(u as string)) {
        return true;
      }
    }
  }

  return false;
};

// Alias para compatibilidade com chamadas no singular
export const hasProductValidPhoto = hasProductValidPhotos;

/**
 * Retorna a URL da foto de capa principal real do produto, ou string vazia se não possuir.
 */
export const getProductCoverPhoto = (product: any): string => {
  if (!product || typeof product !== 'object') return '';

  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (img && typeof img === 'string' && !isPlaceholderUrl(img)) {
        return img.trim();
      }
    }
  }

  if (product.imageUrl && typeof product.imageUrl === 'string' && !isPlaceholderUrl(product.imageUrl)) {
    return product.imageUrl.trim();
  }

  const fotoUri = product.foto_uri || product.foto_url || product.foto;
  if (fotoUri && typeof fotoUri === 'string' && !isPlaceholderUrl(fotoUri)) {
    return fotoUri.trim();
  }

  return '';
};
