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
      classificacao: '002.002',
      visible: true,
      stock: 5,
      images: ['https://example.com/sandalia.jpg'],
      category: 'Calçados',
      subcategory: 'Sandálias',
    },
    {
      id: '2',
      name: 'RASTEIRA FEMININA MOLECA DOURADA',
      classificacao: '002.002',
      visible: true,
      stock: 8,
      images: ['https://example.com/rasteira.jpg'],
      category: 'Calçados',
      subcategory: 'Rasteiras',
    },
    {
      id: '3',
      name: 'SAPATÊNIS MASCULINO PEGADA COURO',
      classificacao: '002.001',
      visible: true,
      stock: 4,
      images: ['https://example.com/sapatenis.jpg'],
      category: 'Calçados',
      subcategory: 'Sapatênis',
    },
    {
      id: '4',
      name: 'TÊNIS OLYMPIKUS MASCULINO CORRIDA',
      classificacao: '002.001',
      visible: true,
      stock: 12,
      images: ['https://example.com/tenis-masc.jpg'],
      category: 'Calçados',
      subcategory: 'Tênis',
    },
    {
      id: '5',
      name: 'TÊNIS INFANTIL SOUND KIDS LED',
      classificacao: '002.003',
      visible: true,
      stock: 3,
      images: ['https://example.com/sound-kids.jpg'],
      category: 'Calçados',
      subcategory: 'Tênis',
    },
    {
      id: '6',
      name: 'SANDÁLIA BABY INFANTIL PAMPILI',
      classificacao: '002.004',
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

  if (!isProductInAudience(mockProducts[4], 'infantil-masculino')) {
    throw new Error('Falha: Sound Kids (002.003) deveria pertencer a infantil-masculino');
  }
  if (!isProductInAudience(mockProducts[5], 'infantil-feminino')) {
    throw new Error('Falha: Pampili (002.004) deveria pertencer a infantil-feminino');
  }
  if (isProductInAudience(mockProducts[4], 'masculino')) {
    throw new Error('Falha: Sound Kids não deve pertencer a masculino');
  }
  console.log('[PASS] Pertencimento aos públicos infantil-masculino e infantil-feminino');

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

  const infMascSubs = extractAudienceSubcategories(mockProducts as Product[], 'infantil-masculino');
  if (infMascSubs.length !== 1) {
    throw new Error(`Falha: Esperava 1 subcategoria infantil-masculino, obteve ${infMascSubs.length}`);
  }
  const infFemSubs = extractAudienceSubcategories(mockProducts as Product[], 'infantil-feminino');
  if (infFemSubs.length !== 1) {
    throw new Error(`Falha: Esperava 1 subcategoria infantil-feminino, obteve ${infFemSubs.length}`);
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

  // Teste 5: Prioridade absoluta do Público / Gênero definido no Painel Administrativo
  const adminOverriddenToInfantilFem: Partial<Product> = {
    id: '7',
    name: 'SANDÁLIA MOLECA',
    classificacao: '002.002', // ERP dizia feminino adulto, mas Admin definiu Infantil Feminino
    gender: 'Infantil Feminino',
    visible: true,
    stock: 4,
    images: ['https://example.com/inf-fem.jpg'],
    category: 'Calçados',
    subcategory: 'Sandálias',
  };
  if (!isProductInAudience(adminOverriddenToInfantilFem, 'infantil-feminino')) {
    throw new Error('Falha: Produto definido como Infantil Feminino no Admin deveria pertencer ao menu Infantil Feminino');
  }
  if (
    isProductInAudience(adminOverriddenToInfantilFem, 'infantil-masculino') ||
    isProductInAudience(adminOverriddenToInfantilFem, 'feminino')
  ) {
    throw new Error('Falha: Produto definido como Infantil Feminino no Admin não deve vazar para Infantil Masculino ou Feminino adulto');
  }

  const adminOverriddenToUnissex: Partial<Product> = {
    id: '8',
    name: 'TÊNIS ALL STAR CONVERSE',
    classificacao: '002.001',
    gender: 'Unissex',
    visible: true,
    stock: 6,
    images: ['https://example.com/unissex.jpg'],
    category: 'Calçados',
    subcategory: 'Tênis',
  };
  if (!isProductInAudience(adminOverriddenToUnissex, 'unissex')) {
    throw new Error('Falha: Produto definido como Unissex no Admin deveria aparecer em Unissex');
  }

  // Teste 6: Bolsa feminina (013.002) nunca deve cair em Unissex mesmo sem palavra FEMININO no nome
  const bolsaFeminina: Partial<Product> = {
    id: '9',
    name: 'BOLSA CHENSON MONOGRAMA',
    classificacao: '013.002',
    visible: true,
    stock: 3,
    images: ['https://example.com/bolsa.jpg'],
    category: 'Acessórios',
    subcategory: 'Bolsa',
  };
  if (isProductInAudience(bolsaFeminina, 'unissex') || !isProductInAudience(bolsaFeminina, 'feminino')) {
    throw new Error('Falha: Bolsa (013.002) deve pertencer a Feminino e nunca a Unissex');
  }
  console.log('[PASS] Condicionamento estrito ao Público / Gênero do Painel Administrativo');

  console.log('🎉 Todos os testes de navegação e categorias passaram com 100% de sucesso!');
}

runTests();
