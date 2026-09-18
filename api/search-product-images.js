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
      return res.status(200).json({ success: true, results: [] });
    }

    const limit = parseInt(String(req.query?.limit || '12'), 10) || 12;

    const vqdRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    const html = await vqdRes.text();
    const vqdMatch = html.match(/vqd=["']?([0-9-]+)["']?/) || html.match(/vqd=([0-9-]+)/);
    const vqd = vqdMatch ? vqdMatch[1] : null;

    if (!vqd) {
      return res.status(200).json({ success: true, results: [] });
    }

    const imgUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,&p=1`;
    const imgRes = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
    });

    const data = await imgRes.json();
    const results = (data.results || [])
      .filter((r) => r.image && !r.image.endsWith('.svg') && !r.image.includes('favicon'))
      .slice(0, limit)
      .map((r) => ({
        title: r.title,
        image: r.image,
        thumbnail: r.thumbnail || r.image,
        source: r.url,
        width: r.width,
        height: r.height,
      }));

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('[API search-product-images Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro na busca de imagens' });
  }
}
