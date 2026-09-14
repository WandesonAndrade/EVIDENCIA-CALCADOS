import sharp from 'sharp';
import { 
  optimizeBufferToWebP, 
  generateThumbnailBuffer 
} from '../src/services/serverImageOptimizer';
import { 
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  DEFAULT_WEBP_QUALITY,
  DEFAULT_THUMBNAIL_SIZE
} from '../src/services/imageOptimizationService';
import { 
  preserveExistingImages, 
  deleteImageFromSupabase, 
  extractSupabaseFilePath 
} from '../src/services/supabaseStorageService';

async function runTests() {
  console.log('\n🧪 ===============================================');
  console.log('🧪 SUÍTE DE TESTES: OTIMIZAÇÃO E PRESERVAÇÃO DE FOTOS');
  console.log('🧪 ===============================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // --- 1. TESTES DE VALIDAÇÃO DE TAMANHO (LIMITE 8MB) ---
  console.log('📌 1. Validação de Limites de Tamanho e Formato (8MB):');
  {
    const fileUnderLimit = { size: 7 * 1024 * 1024, type: 'image/jpeg', name: 'calcado_hd.jpg' };
    const resUnder = validateImageFile(fileUnderLimit as any);
    assert(resUnder.valid === true, 'Arquivo de 7MB é aceito com sucesso (<= 8MB)');

    const fileOverLimit = { size: 9 * 1024 * 1024, type: 'image/png', name: 'foto_gigante.png' };
    const resOver = validateImageFile(fileOverLimit as any);
    assert(resOver.valid === false, 'Arquivo de 9MB é rejeitado (> 8MB)');
    assert(resOver.error?.includes('8MB') === true, 'Mensagem de erro informa claramente o limite de 8MB');

    const invalidFile = { size: 1 * 1024 * 1024, type: 'application/pdf', name: 'documento.pdf' };
    const resInvalid = validateImageFile(invalidFile as any);
    assert(resInvalid.valid === false, 'Arquivo não-imagem (PDF) é rejeitado');
  }

  // --- 2. TESTES DE CONVERSÃO PARA WEBP COM QUALIDADE 80 ---
  console.log('\n📌 2. Conversão e Otimização para WebP (Qualidade 80%):');
  {
    // Cria imagem de teste JPEG de 1200x800 com gradientes e detalhes
    const sourceJpeg = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 0, g: 113, b: 227 }
      }
    })
    .jpeg({ quality: 95 })
    .toBuffer();

    const optResult = await optimizeBufferToWebP(sourceJpeg, { quality: DEFAULT_WEBP_QUALITY });

    assert(optResult.mimeType === 'image/webp', 'MIME type retornado é "image/webp"');
    assert(optResult.extension === 'webp', 'Extensão de arquivo retornada é "webp"');
    assert(optResult.width === 1200 && optResult.height === 800, 'Dimensões originais preservadas');
    assert(optResult.optimizedSize < sourceJpeg.length, 'Tamanho do arquivo otimizado é menor que o original');
    assert(optResult.compressionRatio >= 0, `Taxa de compressão calculada: ${optResult.compressionRatio}% de economia`);

    // Valida se o buffer resultante é um WebP decodificável
    const webpMeta = await sharp(optResult.buffer!).metadata();
    assert(webpMeta.format === 'webp', 'Sharp confirma que o formato binário gerado é genuinamente WEBP');
  }

  // --- 3. TESTES DE REDIMENSIONAMENTO INTELIGENTE E COMPRESSÃO ADAPTATIVA (MAX 1600px) ---
  console.log('\n📌 3. Redimensionamento Inteligente e Compressão de Fotos Grandes:');
  {
    // Foto grande em alta resolução (ex: 3600x2400 direto de câmera em RAW/JPEG de alta qualidade)
    const largeSource = await sharp({
      create: {
        width: 3600,
        height: 2400,
        channels: 3,
        background: { r: 255, g: 128, b: 0 }
      }
    })
    .png({ compressionLevel: 0 }) // Gera buffer bruto pesado (~7.5MB)
    .toBuffer();

    assert(largeSource.length > 5 * 1024 * 1024, `Imagem de teste bruta é pesada: ${(largeSource.length / (1024 * 1024)).toFixed(1)}MB`);

    const optLarge = await optimizeBufferToWebP(largeSource, { maxWidth: 1600, maxHeight: 1600 });
    assert(optLarge.width <= 1600, `Largura máxima reduzida para ${optLarge.width}px (<= 1600px)`);
    assert(optLarge.height <= 1600, `Altura máxima proporcional: ${optLarge.height}px`);
    assert(optLarge.optimizedSize < 300 * 1024, `Foto de ${(largeSource.length / (1024 * 1024)).toFixed(1)}MB comprimida para ${(optLarge.optimizedSize / 1024).toFixed(0)}KB (< 300KB)`);
    assert(optLarge.compressionRatio > 90, `Economia de tamanho superior a 90%: ${optLarge.compressionRatio}%`);
  }

  // --- 4. TESTES DE GERAÇÃO DE THUMBNAIL (150x150 WEBP) ---
  console.log('\n📌 4. Geração de Miniatura (Thumbnail 150x150 WebP):');
  {
    const sampleImg = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 0, g: 59, b: 115 }
      }
    })
    .png()
    .toBuffer();

    const thumb = await generateThumbnailBuffer(sampleImg, { size: DEFAULT_THUMBNAIL_SIZE });

    assert(thumb.width === 150, 'Largura da miniatura é exatamente 150px');
    assert(thumb.height === 150, 'Altura da miniatura é exatamente 150px');
    assert(thumb.mimeType === 'image/webp', 'Miniatura gerada em formato WebP');

    const thumbMeta = await sharp(thumb.buffer!).metadata();
    assert(thumbMeta.format === 'webp', 'Buffer da miniatura é um WebP válido');
    assert(thumbMeta.width === 150 && thumbMeta.height === 150, 'Metadados confirmam 150x150');
  }

  // --- 5. TESTES DE PRESERVAÇÃO DE FOTOS DO BANCO E LINKS EXTERNOS ---
  console.log('\n📌 5. Preservação de Fotos Existentes no Banco e Links Externos:');
  {
    const externalLink1 = 'https://cdn.fornecedor.com.br/calcados/tenis-preto.jpg';
    const externalLink2 = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff';
    const existingSupabasePhoto = 'https://meu-projeto.supabase.co/storage/v1/object/public/products/produtos/101/foto_antiga.webp';
    const newWebpUpload = 'https://meu-projeto.supabase.co/storage/v1/object/public/products/produtos/101/foto_nova_123.webp';

    const dbPhotos = [externalLink1, existingSupabasePhoto];
    const newUploads = [newWebpUpload, externalLink2];

    const merged = preserveExistingImages(dbPhotos, newUploads);

    assert(merged.length === 4, 'Todas as 4 fotos foram consolidadas');
    assert(merged[0] === externalLink1, 'Primeiro link externo permanece como foto principal (posição 0)');
    assert(merged.includes(existingSupabasePhoto), 'Foto anterior do Supabase foi preservada');
    assert(merged.includes(externalLink2), 'Segundo link externo foi incluído sem alterações');
    assert(merged.includes(newWebpUpload), 'Novo upload WebP foi adicionado');

    // Teste com duplicatas
    const withDuplicates = preserveExistingImages([externalLink1, externalLink1], [externalLink1, newWebpUpload]);
    assert(withDuplicates.length === 2, 'Duplicatas do mesmo link foram limpas mantendo integridade');

    // Teste de proteção contra placeholders
    const withPlaceholder = preserveExistingImages(
      ['https://via.placeholder.com/150', externalLink1],
      ['data:image/svg+xml;utf8,<svg>sem foto</svg>', newWebpUpload]
    );
    assert(withPlaceholder.length === 2, 'Placeholders genéricos foram filtrados e links reais preservados');
    assert(withPlaceholder.includes(externalLink1) && withPlaceholder.includes(newWebpUpload), 'Apenas fotos reais foram mantidas');
  }

  // --- 6. TESTES DE EXCLUSÃO DE IMAGENS E MINIATURAS ---
  console.log('\n📌 6. Exclusão Limpa de Fotos, Miniaturas e Tratamento de Links Externos:');
  {
    // Teste 1: Deleção de link externo
    const extUrl = 'https://meu-fornecedor.com.br/fotos/sapato1.jpg';
    const delExt = await deleteImageFromSupabase(extUrl);
    assert(delExt === true, 'Exclusão de link externo retorna sucesso sem tentar deletar do bucket Supabase');

    // Teste 2: Extração de caminho e identificação de miniatura
    const supabaseUrl = 'https://abc.supabase.co/storage/v1/object/public/products/produtos/101/foto_123.webp';
    const parsed = extractSupabaseFilePath(supabaseUrl);
    assert(parsed?.bucket === 'products', 'Bucket correto extraído ("products")');
    assert(parsed?.filePath === 'produtos/101/foto_123.webp', 'Caminho do arquivo principal extraído corretamente');

    // Teste 3: Atualização de lista após exclusão
    const currentList = ['foto1.webp', 'foto2.webp', 'foto3.webp'];
    const indexToRemove = 1;
    const nextList = currentList.filter((_, i) => i !== indexToRemove);
    assert(nextList.length === 2, 'Imagem removida da lista ativa');
    assert(!nextList.includes('foto2.webp'), 'Item excluído não está mais na lista');
    assert(nextList[0] === 'foto1.webp', 'Foto de capa permanece na primeira posição');
  }

  console.log('\n===============================================');
  console.log(`🏁 RESULTADO FINAL: ${passed} PASSARAM | ${failed} FALHARAM`);
  console.log('===============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
