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
    const params = req.body || {};
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

    if (geminiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const rawBrand = (params.brand || params.fabricante || '').trim();
        const prompt = `Você é um redator especialista em e-commerce de calçados para a loja "Evidência Calçados".
Escreva uma descrição limpa, atraente, persuasiva e 100% focada no CLIENTE (comprador final) em formato HTML estruturado.

REGRAS CRÍTICAS DE FIDELIDADE E ZERO ESPECULAÇÃO:
1. MARCA DO PRODUTO: "Evidência Calçados" é EXCLUSIVAMENTE o nome da loja/vendedora. NUNCA diga que a marca ou fabricante do calçado é "Evidência Calçados". Se o campo Marca abaixo estiver vazio ou não informado, NÃO invente marca e NÃO mencione marca no texto e nem inclua a linha "Marca:" na Ficha Técnica.
2. DADOS NÃO CONFIRMADOS: Se qualquer informação (Altura do Salto, Palmilha, Solado, Fechamento, Material) não estiver preenchida abaixo ou não houver certeza, NUNCA invente medidas ou nomes falsos. Simplesmente omita o item da Ficha Técnica.
3. LIMPEZA: NUNCA mencione termos técnicos internos como "MobLink", "ERP", "Classificação", "Código Fiscal", "Unidade UND", "Embalagem", "ID", códigos de lote internos ou quantidade de estoque numérico.
4. BENEFÍCIOS REAIS: Foque nos benefícios para quem vai usar (conforto, versatilidade, bem-estar aos pés, facilidade no dia a dia).

Dados Confirmados do Produto:
- Nome: ${params.name}
${rawBrand ? `- Marca: ${rawBrand}` : '- Marca: (Não informada - omitir marca)'}
${params.referenceCode ? `- Referência: ${params.referenceCode}` : ''}
- Categoria: ${params.category || 'Calçados'}
${params.material ? `- Material: ${params.material}` : ''}
${params.webInsights?.cabedal ? `- Material do Cabedal: ${params.webInsights.cabedal}` : ''}
${params.webInsights?.palmilha ? `- Palmilha: ${params.webInsights.palmilha}` : ''}
${params.webInsights?.solado ? `- Solado: ${params.webInsights.solado}` : ''}
${params.webInsights?.alturaSalto ? `- Altura do Salto: ${params.webInsights.alturaSalto}` : ''}
${params.webInsights?.bico ? `- Tipo de Bico: ${params.webInsights.bico}` : ''}
${params.webInsights?.fecho ? `- Fechamento: ${params.webInsights.fecho}` : ''}
${params.webInsights?.ocasiao ? `- Indicação de Uso: ${params.webInsights.ocasiao}` : ''}

Tom Desejado: ${params.tone || 'comercial'} (comercial = envolvente e prático; luxo = refinado e sofisticado; tecnico = foco na ergonomia e conforto do calçado).

Estrutura HTML Obrigatória:
1. <h3> Título atraente (ex: <h3>Conforto e Estilo: [Nome do Produto]</h3>)
2. <p> Storytelling leve (1 parágrafo falando sobre a proposta do modelo e versatilidade de uso. Se não houver marca, fale diretamente do modelo)
3. <h4>✨ Destaques do Produto</h4> (lista <ul> curta com 3-5 tópicos reais sobre conforto, palmilha, solado e calce)
4. <h4>📋 Ficha Técnica</h4> (lista <ul> limpa contendo APENAS os dados confirmados: ${rawBrand ? 'Marca, ' : ''}Modelo, Categoria, Cabedal/Material se informado, Palmilha se informada, Solado se informado, Salto se informado, Garantia do Fabricante e Origem)
5. <h4>🛡️ Garantia & Confiança Evidência Calçados</h4> (parágrafo curto destacando produto 100% original, nota fiscal e Troca Fácil em até 7 dias)

Retorne EXCLUSIVAMENTE os blocos HTML, sem markdown (```html), sem cabeçalhos desnecessários e sem tags <html>/<body>.`;

        const aiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        if (aiRes && aiRes.text) {
          let cleanHtml = aiRes.text.trim();
          if (cleanHtml.startsWith('```html')) cleanHtml = cleanHtml.replace(/^```html\s*/, '').replace(/\s*```$/, '');
          else if (cleanHtml.startsWith('```')) cleanHtml = cleanHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');

          return res.status(200).json({
            success: true,
            description: cleanHtml,
            tone: params.tone || 'comercial',
            provider: 'gemini-2.5-flash',
          });
        }
      } catch (geminiErr) {
        console.warn('[API suggest-product-description] Fallback do Gemini:', geminiErr);
      }
    }

    return res.status(200).json({
      success: false,
      message: 'Fallback para gerador local do cliente',
    });
  } catch (err) {
    console.error('[API suggest-product-description Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro ao sugerir descrição' });
  }
}
