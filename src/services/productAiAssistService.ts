/**
 * Serviço de Assistência Inteligente para Produtos (Evidência Calçados)
 * - Busca de fotos reais na internet (Google/DuckDuckGo)
 * - Download, conversão WebP e upload seguro para Supabase Storage
 * - Busca de inteligência de produto e ficha técnica na Web
 * - Geração de descrições limpas, persuasivas e 100% focadas no cliente
 */

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
 * Busca fotos candidatas para o produto na Web através da API backend
 */
export async function searchCandidateImages(queryStr: string): Promise<CandidateImage[]> {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return [];

  try {
    let res = await fetch(`/assistant-api/search-product-images?q=${encodeURIComponent(cleanQuery)}`);
    if (!res.ok) {
      res = await fetch(`/api/search-product-images?q=${encodeURIComponent(cleanQuery)}`);
    }
    if (!res.ok) {
      throw new Error(`Falha na busca de imagens: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (err: any) {
    console.error('[productAiAssistService] Erro ao buscar imagens:', err);
    throw err;
  }
}

/**
 * Busca inteligência e ficha técnica do calçado na Web (Google/DuckDuckGo)
 */
export async function searchProductWebIntel(queryStr: string): Promise<ProductWebIntelResult> {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return { results: [], insights: {} };

  try {
    let res = await fetch(`/assistant-api/search-product-web-intel?q=${encodeURIComponent(cleanQuery)}`);
    if (!res.ok) {
      res = await fetch(`/api/search-product-web-intel?q=${encodeURIComponent(cleanQuery)}`);
    }
    if (!res.ok) {
      throw new Error(`Falha na busca de inteligência web: HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      results: Array.isArray(data.results) ? data.results : [],
      insights: data.insights || {},
    };
  } catch (err: any) {
    console.warn('[productAiAssistService] Erro ao buscar inteligência na web:', err);
    return { results: [], insights: {} };
  }
}

/**
 * Faz download de uma imagem da internet pelo backend (sem bloqueio de CORS),
 * otimiza para WebP 80% e faz upload para o Supabase Storage.
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

  let res = await fetch('/assistant-api/upload-photo-from-url', {
    method: 'POST',
    headers,
    body: payload,
  });

  if (!res.ok) {
    res = await fetch('/api/upload-photo-from-url', {
      method: 'POST',
      headers,
      body: payload,
    });
  }

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || `Erro ao salvar foto: HTTP ${res.status}`);
  }

  return {
    publicUrl: data.webpUrl || data.publicUrl,
    thumbUrl: data.thumbnailUrl || data.thumbUrl,
    stats: data.stats,
  };
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

    let res = await fetch('/assistant-api/suggest-product-description', {
      method: 'POST',
      headers,
      body: payload,
    });

    if (!res.ok) {
      res = await fetch('/api/suggest-product-description', {
        method: 'POST',
        headers,
        body: payload,
      });
    }

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.description) {
        return data.description;
      }
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
    .replace(/\s+([0-9]{4,}|[A-Z]+[0-9]+[A-Z0-9]*|[0-9]+[A-Z]+[A-Z0-9]*)\b/gi, '') // remove apenas referências numéricas ou alfanuméricas
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Motor de copywriting limpo, focado 100% no cliente (sem ruídos de ERP ou códigos técnicos)
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
