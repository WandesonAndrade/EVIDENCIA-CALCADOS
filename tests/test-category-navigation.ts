import { 
  isProductInAudience, 
  extractAudienceSubcategories, 
  buildCategoryUrl, 
  matchSubcategorySlug,
  slugifyParam 
} from '../src/components/products/utils/categoryNavigationUtils';
import { Product } from '../src/types';

function runTests() {
  console.log('--- Iniciando Testes de Navegação e Categorias (Feminino / Masculino / Infantil) ---');

  const mockProducts: Partial<Product>[] = [
    {
      id: '1',
      name: 'SANDÁLIA FEMININA VIZZANO SALTO ALTO',
      classificacao: '001.002',
      visible: true,
      stock: 5,
      images: ['https://example.com/sandalia.jpg'],
      category: 'Calçados',
      subcategory: 'Sandálias',
    },
    {
      id: '2',
      name: 'RASTEIRA FEMININA MOLECA DOURADA',
      classificacao: '001.002',
      visible: true,
      stock: 8,
      images: ['https://example.com/rasteira.jpg'],
      category: 'Calçados',
      subcategory: 'Rasteiras',
    },
    {
      id: '3',
      name: 'SAPATÊNIS MASCULINO PEGADA COURO',
      classificacao: '001.001',
      visible: true,
      stock: 4,
      images: ['https://example.com/sapatenis.jpg'],
      category: 'Calçados',
      subcategory: 'Sapatênis',
    },
    {
      id: '4',
      name: 'TÊNIS OLYMPIKUS MASCULINO CORRIDA',
      classificacao: '001.001',
      visible: true,
      stock: 12,
      images: ['https://example.com/tenis-masc.jpg'],
      category: 'Calçados',
      subcategory: 'Tênis',
    },
    {
      id: '5',
      name: 'TÊNIS INFANTIL SOUND KIDS LED',
      classificacao: '001.003',
      visible: true,
      stock: 3,
      images: ['https://example.com/sound-kids.jpg'],
      category: 'Calçados',
      subcategory: 'Tênis',
    },
    {
      id: '6',
      name: 'SANDÁLIA BABY INFANTIL PAMPILI',
      classificacao: '001.004',
      visible: true,
      stock: 2,
      images: ['https://example.com/baby.jpg'],
      category: 'Calçados',
      subcategory: 'Sandálias',
    },
  ];

  // Teste 1: Pertencimento ao público-alvo
  if (!isProductInAudience(mockProducts[0], 'feminino')) {
    throw new Error('Falha: Sandália feminina deveria pertencer a feminino');
  }
  if (isProductInAudience(mockProducts[0], 'masculino')) {
    throw new Error('Falha: Sandália feminina não deve pertencer a masculino');
  }
  console.log('[PASS] Pertencimento ao público feminino');

  if (!isProductInAudience(mockProducts[2], 'masculino')) {
    throw new Error('Falha: Sapatênis masculino deveria pertencer a masculino');
  }
  if (isProductInAudience(mockProducts[2], 'feminino')) {
    throw new Error('Falha: Sapatênis masculino não deve pertencer a feminino');
  }
  console.log('[PASS] Pertencimento ao público masculino');

  if (!isProductInAudience(mockProducts[4], 'infantil')) {
    throw new Error('Falha: Sound Kids deveria pertencer a infantil');
  }
  if (isProductInAudience(mockProducts[4], 'masculino')) {
    throw new Error('Falha: Sound Kids não deve pertencer a masculino');
  }
  console.log('[PASS] Pertencimento ao público infantil');

  // Teste 2: Extração de subcategorias por público
  const femSubs = extractAudienceSubcategories(mockProducts as Product[], 'feminino');
  if (femSubs.length !== 2) {
    throw new Error(`Falha: Esperava 2 subcategorias femininas, obteve ${femSubs.length}`);
  }
  console.log('[PASS] Extração dinâmica de subcategorias femininas');

  const mascSubs = extractAudienceSubcategories(mockProducts as Product[], 'masculino');
  if (mascSubs.length !== 2) {
    throw new Error(`Falha: Esperava 2 subcategorias masculinas, obteve ${mascSubs.length}`);
  }
  console.log('[PASS] Extração dinâmica de subcategorias masculinas');

  const infSubs = extractAudienceSubcategories(mockProducts as Product[], 'infantil');
  if (infSubs.length !== 2) {
    throw new Error(`Falha: Esperava 2 subcategorias infantis, obteve ${infSubs.length}`);
  }
  console.log('[PASS] Extração dinâmica de subcategorias infantis');

  // Teste 3: Slugs e URLs
  const urlFemAll = buildCategoryUrl('feminino', 'TODAS');
  if (urlFemAll !== '?categoria=feminino') {
    throw new Error(`Falha: URL incorreta para Explorar Tudo Feminino: ${urlFemAll}`);
  }
  console.log('[PASS] buildCategoryUrl para Explorar Tudo');

  const urlFemSandalias = buildCategoryUrl('feminino', 'Sandálias');
  if (urlFemSandalias !== '?categoria=feminino&subcategoria=sandalias') {
    throw new Error(`Falha: URL incorreta para Sandálias Femininas: ${urlFemSandalias}`);
  }
  console.log('[PASS] buildCategoryUrl para subcategoria específica');

  // Teste 4: Match de slug de subcategoria
  if (!matchSubcategorySlug('Sandálias', 'sandalias')) {
    throw new Error('Falha: matchSubcategorySlug deveria casar Sandálias com sandalias');
  }
  if (!matchSubcategorySlug('Rasteiras & Papetes', 'rasteiras-papetes')) {
    throw new Error('Falha: matchSubcategorySlug deveria casar Rasteiras & Papetes com rasteiras-papetes');
  }
  console.log('[PASS] matchSubcategorySlug');

  console.log('🎉 Todos os testes de navegação e categorias passaram com 100% de sucesso!');
}

runTests();
