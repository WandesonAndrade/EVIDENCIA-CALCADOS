/**
 * Serviço de Assistência Inteligente para Produtos (Evidência Calçados)
 * - Busca de fotos reais na internet (Google/DuckDuckGo) com resiliência para produção/serverless
 * - Download, conversão WebP e upload seguro para Supabase Storage
 * - Busca de inteligência de produto e ficha técnica na Web
 * - Geração de descrições limpas, persuasivas e 100% focadas no cliente (tom comercial com zero especulação)
 */

import { uploadImageToSupabase } from './supabaseStorageService';

export interface CandidateImage {
  title: string;
  image: string;
  thumbnail: string;
  width?: number;
  height?: number;
  source?: string;
}

export interface FootwearWebInsights {
  alturaSalto?: string;
  bico?: string;
  fecho?: string;
  palmilha?: string;
  solado?: string;
  cabedal?: string;
  ocasiao?: string;
  curatedSummary?: string;
}

export interface ProductWebIntelResult {
  results: Array<{ title: string; snippet: string; source: string; link: string }>;
  insights: FootwearWebInsights;
}

export interface ProductDescriptionParams {
  name: string;
  brand?: string;
  fabricante?: string;
  category?: string;
  subcategory?: string;
  classificacao?: string;
  color?: string;
  colors?: string[];
  material?: string;
  price?: number;
  precoVista?: number;
  precoCartao?: number;
  referenceCode?: string;
  barcode?: string;
  sizes?: (string | number)[];
  complDescr?: string;
  fichaTecnica?: string;
  unidade?: string;
  embalagem?: string;
  peso?: number | string;
  stock?: number;
  gradeVariations?: Array<{ tamanho?: string; cor?: string; saldo_loja?: number }>;
  existingDescription?: string;
  tone?: 'comercial' | 'luxo' | 'tecnico';
  webSnippets?: string[];
  webInsights?: FootwearWebInsights;
  webIntelSummary?: string;
}

/**
 * Utilitário seguro para efetuar requisições fetch garantindo que respostas HTML (ex: index.html da SPA)
 * não quebrem o JSON.parse com 'Unexpected token <'
 */
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<!DOCTYPE')) {
        return null; // É o fallback SPA do index.html
      }
      try {
        return JSON.parse(trimmed) as T;
      } catch {
        return null;
      }
    }

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fallback no navegador para busca de fotos caso a rota de backend não esteja disponível
 */
async function searchCandidateImagesClientFallback(queryStr: string): Promise<CandidateImage[]> {
  try {
    // Tenta consulta direta via DuckDuckGo Instant Answer / Images
    const directUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(queryStr)}&format=json&pretty=1`;
    const res = await fetch(directUrl);
    if (res.ok) {
      const data = await res.json();
      const images: CandidateImage[] = [];

      if (data.Image) {
        images.push({
          title: data.Heading || queryStr,
          image: data.Image.startsWith('http') ? data.Image : `https://duckduckgo.com${data.Image}`,
          thumbnail: data.Image.startsWith('http') ? data.Image : `https://duckduckgo.com${data.Image}`,
          source: data.AbstractURL || 'duckduckgo.com',
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.forEach((topic: any) => {
          if (topic.Icon && topic.Icon.URL) {
            const iconUrl = topic.Icon.URL.startsWith('http') ? topic.Icon.URL : `https://duckduckgo.com${topic.Icon.URL}`;
            images.push({
              title: topic.Text || queryStr,
              image: iconUrl,
              thumbnail: iconUrl,
              source: topic.FirstURL || 'web',
            });
          }
        });
      }

      if (images.length > 0) return images;
    }
  } catch (err) {
    console.warn('[productAiAssistService] Fallback de imagem no cliente falhou:', err);
  }

  return [];
}

/**
 * Busca fotos candidatas para o produto na Web através da API backend ou fallback resiliente
 */
export async function searchCandidateImages(queryStr: string): Promise<CandidateImage[]> {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return [];

  try {
    // 1. Tenta endpoint prioritário
    let data = await safeFetchJson<{ success?: boolean; results?: CandidateImage[] }>(
      `/api/search-product-images?q=${encodeURIComponent(cleanQuery)}`
    );

    // 2. Tenta rota legada se a anterior não respondeu JSON
    if (!data || !Array.isArray(data.results)) {
      data = await safeFetchJson<{ success?: boolean; results?: CandidateImage[] }>(
        `/assistant-api/search-product-images?q=${encodeURIComponent(cleanQuery)}`
      );
    }

    if (data && Array.isArray(data.results) && data.results.length > 0) {
      return data.results;
    }

    // 3. Fallback no cliente
    const fallbackResults = await searchCandidateImagesClientFallback(cleanQuery);
    return fallbackResults;
  } catch (err: any) {
    console.warn('[productAiAssistService] Aviso ao buscar imagens:', err);
    return [];
  }
}

/**
 * Busca inteligência e ficha técnica do calçado na Web (Google/DuckDuckGo)
 */
export async function searchProductWebIntel(queryStr: string): Promise<ProductWebIntelResult> {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return { results: [], insights: {} };

  try {
    let data = await safeFetchJson<{ success?: boolean; results?: any[]; insights?: FootwearWebInsights }>(
      `/api/search-product-web-intel?q=${encodeURIComponent(cleanQuery)}`
    );

    if (!data || !data.success) {
      data = await safeFetchJson<{ success?: boolean; results?: any[]; insights?: FootwearWebInsights }>(
        `/assistant-api/search-product-web-intel?q=${encodeURIComponent(cleanQuery)}`
      );
    }

    if (data && data.success) {
      return {
        results: Array.isArray(data.results) ? data.results : [],
        insights: data.insights || {},
      };
    }
  } catch (err: any) {
    console.warn('[productAiAssistService] Erro ao buscar inteligência na web:', err);
  }

  return { results: [], insights: {} };
}

/**
 * Faz download de uma imagem da internet pelo backend (sem bloqueio de CORS),
 * otimiza para WebP 80% e faz upload para o Supabase Storage.
 * Possui contingência nativa no navegador caso o backend esteja indisponível.
 */
export async function uploadPhotoFromUrl(
  imageUrl: string,
  productId: string
): Promise<{
  publicUrl: string;
  thumbUrl?: string;
  stats?: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
  };
}> {
  if (!imageUrl || !productId) {
    throw new Error('URL da imagem e ID do produto são obrigatórios.');
  }

  const payload = JSON.stringify({ imageUrl, productId });
  const headers = { 'Content-Type': 'application/json' };

  try {
    // 1. Tenta endpoint backend principal
    let data = await safeFetchJson<{
      success?: boolean;
      webpUrl?: string;
      publicUrl?: string;
      thumbnailUrl?: string;
      thumbUrl?: string;
      stats?: any;
    }>('/api/upload-photo-from-url', {
      method: 'POST',
      headers,
      body: payload,
    });

    if (!data || !data.success) {
      data = await safeFetchJson('/assistant-api/upload-photo-from-url', {
        method: 'POST',
        headers,
        body: payload,
      });
    }

    if (data && data.success) {
      return {
        publicUrl: data.webpUrl || data.publicUrl || '',
        thumbUrl: data.thumbnailUrl || data.thumbUrl,
        stats: data.stats,
      };
    }
  } catch (err) {
    console.warn('[productAiAssistService] Upload via backend falhou, usando contingência do cliente:', err);
  }

  // 2. Contingência direta no navegador via Supabase Storage SDK
  try {
    const cleanProdId = String(productId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 8);
    const customFileName = `web_foto_${timestamp}_${randomHash}`;

    // Baixa como blob no navegador
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Não foi possível baixar a imagem da fonte: HTTP ${imgRes.status}`);
    }
    const blob = await imgRes.blob();

    // Faz upload direto para o Supabase Storage com conversão WebP
    const publicUrl = await uploadImageToSupabase(blob, {
      folder: `produtos/${cleanProdId}/`,
      customFileName,
      generateThumbnail: true,
    });

    return {
      publicUrl,
      thumbUrl: publicUrl,
    };
  } catch (clientErr: any) {
    console.error('[productAiAssistService] Falha final no upload da imagem:', clientErr);
    throw new Error(clientErr.message || 'Erro ao processar e salvar a imagem.');
  }
}

/**
 * Gera uma descrição rica para o produto usando IA ou o motor de copywriting especialista em calçados
 */
export async function generateSuggestedDescription(
  params: ProductDescriptionParams
): Promise<string> {
  try {
    const payload = JSON.stringify(params);
    const headers = { 'Content-Type': 'application/json' };

    let data = await safeFetchJson<{ success?: boolean; description?: string }>(
      '/api/suggest-product-description',
      {
        method: 'POST',
        headers,
        body: payload,
      }
    );

    if (!data || !data.success || !data.description) {
      data = await safeFetchJson<{ success?: boolean; description?: string }>(
        '/assistant-api/suggest-product-description',
        {
          method: 'POST',
          headers,
          body: payload,
        }
      );
    }

    if (data && data.success && data.description) {
      return data.description;
    }
  } catch (err) {
    console.warn('[productAiAssistService] Backend description suggestion fallback to local engine:', err);
  }

  return generateLocalRichDescription(params);
}

/**
 * Limpa o nome do produto removendo códigos internos e sufixos repetitivos
 */
function cleanUserFacingProductName(rawName: string): string {
  return rawName
    .trim()
    .replace(/\s+([0-9]{4,}|[A-Z]+[0-9]+[A-Z0-9]*|[0-9]+[A-Z]+[A-Z0-9]*)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Motor de copywriting limpo, focado 100% no cliente (sem ruídos de ERP ou códigos técnicos e zero especulação de marca)
 */
export function generateLocalRichDescription(params: ProductDescriptionParams): string {
  const {
    name,
    brand = '',
    fabricante = '',
    category = 'Calçados',
    material = '',
    referenceCode = '',
    tone = 'comercial',
    webInsights = {},
  } = params;

  const cleanName = cleanUserFacingProductName(name);
  const effectiveBrand = (brand || fabricante || '').trim();
  const effectiveMaterial = (webInsights.cabedal || material || '').trim();
  const cleanRef = referenceCode && referenceCode.length < 20 ? referenceCode.trim() : '';

  let headline = '';
  let intro = '';

  const brandPhrase = effectiveBrand ? ` da conceituada marca <strong>${effectiveBrand}</strong>` : '';
  const brandLuxoPhrase = effectiveBrand ? ` da <strong>${effectiveBrand}</strong>` : '';
  const brandTecnicoPhrase = effectiveBrand ? ` da <strong>${effectiveBrand}</strong>` : '';

  // Storytelling limpo e focado no calce e ocasião
  if (tone === 'luxo') {
    headline = `<h3>Sofisticação e Exclusividade: ${cleanName}</h3>`;
    intro = `<p>Desenvolvido para quem busca elegância e presença marcante, o <strong>${cleanName}</strong>${brandLuxoPhrase} une design contemporâneo a um acabamento impecável. Perfeito para compor produções refinadas, garante conforto absoluto e ergonomia durante todo o uso.</p>`;
  } else if (tone === 'tecnico') {
    headline = `<h3>Ficha Técnica & Conforto: ${cleanName}</h3>`;
    intro = `<p>O <strong>${cleanName}</strong>${brandTecnicoPhrase} é confeccionado com rigorosos padrões de qualidade e durabilidade. Desenvolvido para proporcionar ajuste anatômico perfeito aos pés, leveza ao caminhar e alta resistência para o uso diário.</p>`;
  } else {
    headline = `<h3>Conforto e Estilo: ${cleanName}</h3>`;
    intro = `<p>Conheça o <strong>${cleanName}</strong>${brandPhrase}! Versátil e moderno, este modelo foi pensado para acompanhar a sua rotina com o máximo de conforto, elegância e praticidade a cada passo.</p>`;
  }

  // Destaques relevantes e confirmados
  const highlightsList: string[] = [];

  highlightsList.push('<li><strong>Design Moderno:</strong> Combina facilmente com diversos looks e ocasiões.</li>');

  if (webInsights.palmilha) {
    highlightsList.push(`<li><strong>Palmilha Confortável:</strong> ${webInsights.palmilha} (absorção de impacto e maciez prolongada).</li>`);
  } else {
    highlightsList.push('<li><strong>Palmilha Macia:</strong> Amortecimento suave que ameniza o impacto das passadas.</li>');
  }

  if (webInsights.solado) {
    highlightsList.push(`<li><strong>Solado Seguro:</strong> ${webInsights.solado} (aderência, flexibilidade e estabilidade).</li>`);
  } else {
    highlightsList.push('<li><strong>Solado Antiderrapante:</strong> Segurança e estabilidade ao caminhar.</li>');
  }

  if (webInsights.alturaSalto) {
    highlightsList.push(`<li><strong>Salto:</strong> ${webInsights.alturaSalto} (postura elegante com distribuição equilibrada do peso).</li>`);
  }

  if (webInsights.bico) {
    highlightsList.push(`<li><strong>Bico:</strong> ${webInsights.bico}.</li>`);
  }

  if (webInsights.fecho) {
    highlightsList.push(`<li><strong>Fechamento Prático:</strong> ${webInsights.fecho} (calce fácil e ajuste firme).</li>`);
  }

  if (webInsights.ocasiao) {
    highlightsList.push(`<li><strong>Indicação de Uso:</strong> ${webInsights.ocasiao}.</li>`);
  }

  if (effectiveMaterial) {
    highlightsList.push(`<li><strong>Acabamento:</strong> ${effectiveMaterial} com toque agradável e alta durabilidade.</li>`);
  }

  const highlights = `
<h4>✨ Destaques do Produto</h4>
<ul>
  ${highlightsList.join('\n  ')}
</ul>`;

  // Ficha Técnica limpa (somente com dados reais confirmados)
  const specsList: string[] = [];
  if (effectiveBrand) {
    specsList.push(`<li><strong>Marca:</strong> ${effectiveBrand}</li>`);
  }
  specsList.push(`<li><strong>Modelo:</strong> ${cleanName}</li>`);
  if (cleanRef) {
    specsList.push(`<li><strong>Referência:</strong> ${cleanRef}</li>`);
  }
  if (category) {
    specsList.push(`<li><strong>Categoria:</strong> ${category}</li>`);
  }
  
  if (effectiveMaterial) {
    specsList.push(`<li><strong>Material do Cabedal:</strong> ${effectiveMaterial}</li>`);
  }
  if (webInsights.palmilha) {
    specsList.push(`<li><strong>Palmilha:</strong> ${webInsights.palmilha}</li>`);
  }
  if (webInsights.solado) {
    specsList.push(`<li><strong>Solado:</strong> ${webInsights.solado}</li>`);
  }
  if (webInsights.alturaSalto) {
    specsList.push(`<li><strong>Altura do Salto:</strong> ${webInsights.alturaSalto}</li>`);
  }
  if (webInsights.bico) {
    specsList.push(`<li><strong>Tipo de Bico:</strong> ${webInsights.bico}</li>`);
  }
  if (webInsights.fecho) {
    specsList.push(`<li><strong>Fechamento:</strong> ${webInsights.fecho}</li>`);
  }
  specsList.push('<li><strong>Garantia do Fabricante:</strong> Contra defeitos de fabricação</li>');
  specsList.push('<li><strong>Origem:</strong> Produto 100% Original com Nota Fiscal</li>');

  const specs = `
<h4>📋 Ficha Técnica</h4>
<ul>
  ${specsList.join('\n  ')}
</ul>`;

  // Garantia & Troca Fácil
  const warranty = `
<h4>🛡️ Garantia & Confiança Evidência Calçados</h4>
<p>Compre com tranquilidade na <strong>Evidência Calçados</strong>. Garantimos a originalidade de todos os produtos com nota fiscal e suporte exclusivo de <strong>Troca Fácil em até 7 dias</strong> após o recebimento.</p>`;

  return [headline, intro, highlights, specs, warranty]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}
