function cleanFootwearRawText(raw) {
  return String(raw || '')
    .replace(/([a-z0-9\)])([A-Z][a-z]+:)/g, '$1 \n $2')
    .replace(/(Fecho|Fechamento|Palmilha|Solado|Altura\s+do\s+salto|Salto|Cabedal|Material|Gênero|Marca|Indicado\s+para|Uso|Ocasião|Garantia|Peso|Origem):/gi, '\n$1: ');
}

function extractFootwearInsights(results) {
  const allText = results.map(r => cleanFootwearRawText(`${r.title || ''} ${r.snippet || ''}`)).join('\n');
  const cleanVal = (val) => val ? val.trim().replace(/^[:\-\s]+/, '').replace(/[\s\.\,]+$/, '') : '';

  let alturaSalto = '';
  const saltoExplicit = allText.match(/(?:altura\s+do\s+salto|salto)\s*:\s*(\d+(?:[.,]\d+)?\s*(?:cm|cent[íi]metros?)|[^,;.\n]+)/i);
  if (saltoExplicit) {
    alturaSalto = cleanVal(saltoExplicit[1]);
  } else {
    const saltoCm = allText.match(/(\d+(?:[,.]\d+)?\s*(?:cm|cent[íi]metros?))/i);
    const saltoTipo = allText.match(/(salto\s+(?:bloco|fino|baixo|alto|m[ée]dio|anabela|plataforma|tratorado|raso|geom[ée]trico)[^,.;\n]*)/i);
    if (saltoTipo && saltoCm) {
      alturaSalto = `${cleanVal(saltoTipo[1])} (${cleanVal(saltoCm[1])})`;
    } else if (saltoTipo) {
      alturaSalto = cleanVal(saltoTipo[1]);
    } else if (saltoCm) {
      alturaSalto = cleanVal(saltoCm[1]);
    }
  }

  let bico = '';
  const bicoMatch = allText.match(/(bico\s+(?:redondo|fino|quadrado|folha|aberto))/i);
  if (bicoMatch) bico = cleanVal(bicoMatch[1]);

  let fecho = '';
  const fechoExplicit = allText.match(/(?:fecho|fechamento)\s*:\s*([^,.;\n]+)/i);
  if (fechoExplicit) {
    fecho = cleanVal(fechoExplicit[1]);
  } else {
    const fechoQuick = allText.match(/(tiras?\s+(?:el[áa]sticas?|autocolantes?)|fivela\s+ajust[áa]vel|cadar[çc]o|slip\s+on|calce\s+f[áa]cil)/i);
    if (fechoQuick) fecho = cleanVal(fechoQuick[1]);
  }

  let palmilha = '';
  const palmilhaExplicit = allText.match(/palmilha\s*:\s*([^,.;\n]+)/i);
  if (palmilhaExplicit) {
    palmilha = cleanVal(palmilhaExplicit[1]);
  } else {
    const palmilhaQuick = allText.match(/(palmilha\s+(?:macia|anat[ôo]mica|confort[^\s,.;]*|em\s+eva|espuma|revestida)[^,.;\n]*)/i);
    if (palmilhaQuick) palmilha = cleanVal(palmilhaQuick[1]);
  }

  let solado = '';
  const soladoExplicit = allText.match(/solado\s*:\s*([^,.;\n]+)/i);
  if (soladoExplicit) {
    solado = cleanVal(soladoExplicit[1]);
  } else {
    const soladoQuick = allText.match(/(solado\s+(?:emborrachado|antiderrapante|tratorado|sint[ée]tico|em\s+tr|eva)[^,.;\n]*)/i);
    if (soladoQuick) solado = cleanVal(soladoQuick[1]);
  }

  let cabedal = '';
  const cabedalExplicit = allText.match(/(?:cabedal|material\s+externo)\s*:\s*([^,.;\n]+)/i);
  if (cabedalExplicit) {
    cabedal = cleanVal(cabedalExplicit[1]);
  } else {
    const cabedalQuick = allText.match(/(?:confeccionad[oa]|material)\s+(?:em|de)\s+([^,.;\n]+)/i);
    if (cabedalQuick) cabedal = cleanVal(cabedalQuick[1]);
  }

  let ocasiao = '';
  const ocasiaoMatch = allText.match(/(?:indicado\s+para|uso|ocasi[ãa]o)\s*:\s*([^,.;\n]+)/i);
  if (ocasiaoMatch) ocasiao = cleanVal(ocasiaoMatch[1]);

  const candidateSentences = [];
  results.forEach(r => {
    if (!r.snippet) return;
    const sentences = r.snippet.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const clean = s.trim();
      if (clean.length > 35 && clean.length < 240 && !clean.includes('Frete grátis') && !clean.includes('Shopee') && !clean.includes('R$') && !clean.includes('Compre parcelado')) {
        candidateSentences.push(clean);
      }
    }
  });

  const curatedSummary = candidateSentences.slice(0, 2).join(' ');

  return {
    alturaSalto: alturaSalto || undefined,
    bico: bico || undefined,
    fecho: fecho || undefined,
    palmilha: palmilha || undefined,
    solado: solado || undefined,
    cabedal: cabedal || undefined,
    ocasiao: ocasiao || undefined,
    curatedSummary: curatedSummary || undefined,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const q = String(req.query?.q || '').trim();
    if (!q) {
      return res.status(200).json({ success: true, results: [], insights: {} });
    }

    const limit = parseInt(String(req.query?.limit || '8'), 10) || 8;

    const duckRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    const html = await duckRes.text();
    const results = [];
    const resultBlocks = html.split(/class="result\s/g).slice(1);

    for (const block of resultBlocks) {
      const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      const linkMatch = block.match(/href="([^"]+)"/i);
      const titleMatch = block.match(/<a class="result__a"[^>]*>([\s\S]*?)<\/a>/i);

      if (snippetMatch) {
        const cleanSnippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
        const cleanTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        let source = '';
        let link = linkMatch ? linkMatch[1] : '';

        if (link) {
          try {
            const parsedUrl = new URL(link.startsWith('//') ? `https:${link}` : link);
            const uddg = parsedUrl.searchParams.get('uddg');
            if (uddg) {
              const actualUrl = new URL(uddg);
              source = actualUrl.hostname.replace(/^www\./, '');
              link = uddg;
            } else {
              source = parsedUrl.hostname.replace(/^www\./, '');
            }
          } catch {
            source = 'web';
          }
        }

        results.push({
          title: cleanTitle,
          snippet: cleanSnippet,
          source,
          link,
        });

        if (results.length >= limit) break;
      }
    }

    const insights = extractFootwearInsights(results);

    return res.status(200).json({
      success: true,
      query: q,
      results,
      insights,
    });
  } catch (err) {
    console.error('[API search-product-web-intel Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro na busca de inteligência web' });
  }
}
