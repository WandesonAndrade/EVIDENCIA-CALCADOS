import { matchProductSearch, normalizeSearchTerm } from '../src/components/products/utils/productFilterUtils';
import { Product } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("[FAIL] " + message);
    process.exit(1);
  } else {
    console.log("[PASS] " + message);
  }
}

console.log('--- Iniciando Testes de Busca Inteligente ---');

const mockProduct: Product = {
  id: 'mob-10020',
  moblinkId: '10020',
  sku: '7891230000000',
  barcode: '7891230000000',
  name: 'TENIS SOUND KIDS INFANTIL PRETO/VERM',
  description: 'Tênis infantil Sound Kids macio e resistente',
  price: 129.90,
  category: 'CALÇADOS',
  subcategory: 'Tênis',
  brand: 'Sound Kids',
  color: 'Preto',
  sizes: ['28', '29', '30', '31', '32'],
  visible: true,
  images: ['https://example.com/photo.jpg'],
  stock: 10,
  stockControl: true,
  crediarioProprio: true
};

// 1. Busca por nome direto
assert(matchProductSearch(mockProduct, 'TENIS SOUND'), 'Busca por nome completo / parcial');

// 2. Busca case insensitive e sem acentos
assert(matchProductSearch(mockProduct, 'tênis sound kids'), 'Busca com acento e minúsculas');

// 3. Busca por Modelo Base
assert(matchProductSearch(mockProduct, 'Sound Kids'), 'Busca por Modelo Base extraído');

// 4. Busca por ID MobLink
assert(matchProductSearch(mockProduct, '10020'), 'Busca por ID MobLink');

// 5. Busca por SKU / Código de Barras
assert(matchProductSearch(mockProduct, '7891230000000'), 'Busca por SKU / Código de Barras');

// 6. Busca por Marca
assert(matchProductSearch(mockProduct, 'sound'), 'Busca por Marca');

// 7. Busca por Tamanho / Numeração
assert(matchProductSearch(mockProduct, '28'), 'Busca por numeração existente 28');
assert(!matchProductSearch(mockProduct, '45'), 'Não deve retornar numeração inexistente 45');

// 8. Busca por múltiplos termos combinados (Tokens)
assert(matchProductSearch(mockProduct, 'sound preto 28'), 'Busca multi-termos (marca + cor + tamanho)');

console.log('🎉 Todos os testes de busca inteligente passaram com sucesso!');
