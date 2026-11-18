import { computeKitStock, calculateKitPricing } from '../src/services/kitService';
import { KitProduct, Product } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ OK: ${msg}`);
  }
}

console.log('🧪 Iniciando testes de cálculo de estoque e precificação de Kits...\n');

// 1. Simulação de produtos
const mockProducts = new Map<string, Product>();

mockProducts.set('prod-1', {
  id: 'prod-1',
  name: 'Camisa Polo Básica',
  description: '',
  price: 100,
  category: 'Roupas',
  images: [],
  sizes: ['P', 'M', 'G'],
  crediarioProprio: false,
  visible: true,
  stockControl: true,
  stock: 10,
  stockBySize: {
    P: 2,
    M: 5,
    G: 3
  }
});

mockProducts.set('prod-2', {
  id: 'prod-2',
  name: 'Bermuda Jeans',
  description: '',
  price: 150,
  category: 'Roupas',
  images: [],
  sizes: ['38', '40', '42'],
  crediarioProprio: false,
  visible: true,
  stockControl: true,
  stock: 4,
  stockBySize: {
    '38': 1,
    '40': 2,
    '42': 1
  }
});

// Teste 1: Kit com estoque geral (sem tamanho fixo)
const kitGeral: KitProduct = {
  id: 'kit-1',
  name: 'Kit Verão',
  description: '',
  images: [],
  items: [
    { productId: 'prod-1', quantity: 2 }, // precisa de 2 de prod-1 (estoque total = 10 -> cabe 5)
    { productId: 'prod-2', quantity: 1 }  // precisa de 1 de prod-2 (estoque total = 4 -> cabe 4)
  ],
  pricingMode: 'sum_with_discount',
  price: 200,
  visible: true,
  createdAt: new Date().toISOString()
};

const stockResult1 = computeKitStock(kitGeral, mockProducts);
assert(stockResult1.stock === 4, `Estoque do kit geral deve ser 4 (limitado por prod-2 = 4). Obtido: ${stockResult1.stock}`);

// Teste 2: Kit com tamanho fixo
const kitTamanhoFixo: KitProduct = {
  id: 'kit-2',
  name: 'Kit Verão Tamanho M / 38',
  description: '',
  images: [],
  items: [
    { productId: 'prod-1', quantity: 1, selectedSize: 'M' }, // M tem 5 -> cabe 5
    { productId: 'prod-2', quantity: 1, selectedSize: '38' }  // 38 tem 1 -> cabe 1
  ],
  pricingMode: 'sum_with_discount',
  price: 200,
  visible: true,
  createdAt: new Date().toISOString()
};

const stockResult2 = computeKitStock(kitTamanhoFixo, mockProducts);
assert(stockResult2.stock === 1, `Estoque do kit com tamanho fixo deve ser 1 (limitado pelo tamanho 38). Obtido: ${stockResult2.stock}`);

// Teste 3: Item esgotado zera o kit
const kitComItemZerado: KitProduct = {
  id: 'kit-3',
  name: 'Kit com item zerado',
  description: '',
  images: [],
  items: [
    { productId: 'prod-1', quantity: 1, selectedSize: 'GG' }, // Não existe GG
    { productId: 'prod-2', quantity: 1, selectedSize: '40' }
  ],
  pricingMode: 'sum_with_discount',
  price: 200,
  visible: true,
  createdAt: new Date().toISOString()
};

const stockResult3 = computeKitStock(kitComItemZerado, mockProducts);
assert(stockResult3.stock === 0, `Estoque do kit com item sem saldo deve ser 0. Obtido: ${stockResult3.stock}`);

// Teste 4: Precificação com desconto geral
const itemsPreco = [
  { productId: 'prod-1', quantity: 2, unitPrice: 100 }, // subtotal 200
  { productId: 'prod-2', quantity: 1, unitPrice: 150 }  // subtotal 150 -> total original = 350
];
const pricingGeral = calculateKitPricing(itemsPreco, 'sum_with_discount', 10, 0);
assert(pricingGeral.originalTotal === 350, `Total original deve ser 350. Obtido: ${pricingGeral.originalTotal}`);
assert(pricingGeral.finalPrice === 315, `Preço final com 10% de desconto geral deve ser 315. Obtido: ${pricingGeral.finalPrice}`);
assert(pricingGeral.totalDiscountAmount === 35, `Valor do desconto deve ser 35. Obtido: ${pricingGeral.totalDiscountAmount}`);

// Teste 5: Precificação com desconto individual em cada item
const itemsPrecoIndividual = [
  { productId: 'prod-1', quantity: 1, unitPrice: 100, itemDiscountPercent: 20 }, // 100 - 20% = 80
  { productId: 'prod-2', quantity: 1, unitPrice: 150, itemDiscountPercent: 10 }  // 150 - 10% = 135
];
const pricingIndividual = calculateKitPricing(itemsPrecoIndividual, 'item_discounts', 0, 0);
assert(pricingIndividual.originalTotal === 250, `Total original individual deve ser 250. Obtido: ${pricingIndividual.originalTotal}`);
assert(pricingIndividual.finalPrice === 215, `Preço final individual (80 + 135) deve ser 215. Obtido: ${pricingIndividual.finalPrice}`);

console.log('\n🎉 Todos os testes de cálculo de estoque e precificação passaram com sucesso!');
