import { hasProductChanged } from '../src/services/moblinkProductsService';
import { Product } from '../src/types';

function runColorTests() {
  console.log('🧪 Iniciando testes de Cores e Mapeamento de Fotos por Cor (hasProductChanged)...');

  const baseProduct: Product = {
    id: 'MOB-101',
    name: 'Bolsa Tiracolo Couro',
    price: 159.90,
    stock: 5,
    images: ['https://example.com/photo1.webp'],
    color: 'Preto',
    cor: 'Preto',
    colorImageMap: {
      'Preto': 'https://example.com/photo1.webp'
    },
    colorImages: {
      'Preto': ['https://example.com/photo1.webp']
    }
  };

  // 1. Sem alterações
  const identicalProduct = { ...baseProduct };
  if (hasProductChanged(baseProduct, identicalProduct)) {
    throw new Error('❌ Falha: Identificou mudança quando os objetos eram idênticos.');
  }
  console.log('  ✅ PASSED: Retorna false quando nada mudou');

  // 2. Mudança de cor principal (cor / color)
  const changedColor = { ...baseProduct, color: 'Marrom', cor: 'Marrom' };
  if (!hasProductChanged(baseProduct, changedColor)) {
    throw new Error('❌ Falha: Não detectou mudança na cor principal do produto.');
  }
  console.log('  ✅ PASSED: Detecta alteração na cor principal do produto');

  // 3. Produto existente sem cor ganha cor
  const prodWithoutColor = { ...baseProduct, color: undefined, cor: undefined };
  if (!hasProductChanged(prodWithoutColor, baseProduct)) {
    throw new Error('❌ Falha: Não detectou adição de cor em produto que estava sem cor.');
  }
  console.log('  ✅ PASSED: Detecta adição de cor em produto que não possuía cor');

  // 4. Mudança no mapeamento de fotos por cor (colorImageMap)
  const changedColorMap = {
    ...baseProduct,
    colorImageMap: {
      'Preto': 'https://example.com/photo1.webp',
      'Marrom': 'https://example.com/photo2.webp'
    }
  };
  if (!hasProductChanged(baseProduct, changedColorMap)) {
    throw new Error('❌ Falha: Não detectou adição de nova cor no colorImageMap.');
  }
  console.log('  ✅ PASSED: Detecta adição de nova cor no colorImageMap');

  // 5. Mudança na lista de fotos por cor (colorImages)
  const changedColorImages = {
    ...baseProduct,
    colorImages: {
      'Preto': ['https://example.com/photo1.webp', 'https://example.com/photo1_angle2.webp']
    }
  };
  if (!hasProductChanged(baseProduct, changedColorImages)) {
    throw new Error('❌ Falha: Não detectou foto adicional em colorImages.');
  }
  console.log('  ✅ PASSED: Detecta foto adicional atribuída a uma cor em colorImages');

  console.log('🎉 Todos os testes de cores e fotos por cor passaram com sucesso!');
}

runColorTests();
