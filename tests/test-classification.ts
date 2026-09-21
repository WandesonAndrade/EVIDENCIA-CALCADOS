import { moblinkCategoriesService } from '../src/services/moblinkCategoriesService';
import { extractClassificacaoCategoria } from '../src/services/moblinkProductsService';
import { isProductInAudience } from '../src/components/products/utils/categoryNavigationUtils';
import { Category, Product } from '../src/types';

function runClassificationTests() {
  console.log('--- Iniciando Testes de Classificação ERP e Categorias da Loja ---');

  // Árvore de categorias simulada da loja (com códigos reais do ERP)
  const storeCategories: Category[] = [
    {
      id: 'calcados',
      code: '001',
      name: 'Calçados',
      subcategories: [
        { id: '001.001', subCode: '001', name: 'Sandálias' },
        { id: '001.002', subCode: '002', name: 'Sapatilhas' },
        { id: '001.010', subCode: '010', name: 'Sapatênis' },
      ],
    },
    {
      id: 'confeccoes',
      code: '003',
      name: 'Confecções',
      subcategories: [
        { id: '003.001', subCode: '001', name: 'Camisas' },
      ],
    },
  ];

  // 1. Atualizar índice a partir das categorias da loja
  moblinkCategoriesService.updateIndexFromStoreCategories(storeCategories);

  // Teste 1.1: Código 001.001 cadastrado como 'Sandálias' na loja
  const resSandalias = moblinkCategoriesService.resolveClassificacao('001.001', storeCategories);
  if (resSandalias.category !== 'Calçados' || resSandalias.subcategory !== 'Sandálias') {
    throw new Error(`Falha: 001.001 deveria ser Calçados > Sandálias, mas foi ${resSandalias.category} > ${resSandalias.subcategory}`);
  }
  if (resSandalias.isInvalid) {
    throw new Error('Falha: 001.001 não deveria ser classificado como inválido');
  }
  console.log('[PASS] 001.001 resolvido dinamicamente da loja como Calçados > Sandálias (e não Masculino arbitrário)');

  // Teste 1.2: Código macro 001 sem subcategoria
  const resMacro = moblinkCategoriesService.resolveClassificacao('001', storeCategories);
  if (resMacro.category !== 'Calçados' || resMacro.isInvalid) {
    throw new Error('Falha no grupo macro 001');
  }
  console.log('[PASS] Grupo macro 001 resolvido corretamente como Calçados');

  // Teste 1.3: Código com subcategoria não cadastrada na loja (ex: 001.999) -> Classificação Inválida
  const resSubInvalida = moblinkCategoriesService.resolveClassificacao('001.999', storeCategories);
  if (!resSubInvalida.isInvalid || resSubInvalida.subcategory !== 'Classificação Inválida') {
    throw new Error(`Falha: 001.999 deveria ser marcado como Classificação Inválida, obtido: ${JSON.stringify(resSubInvalida)}`);
  }
  console.log('[PASS] Código 001.999 não cadastrado identificado como Classificação Inválida');

  // Teste 1.4: Código completamente desconhecido na loja (ex: 999.888) -> Classificação Inválida
  const resTotalInvalida = moblinkCategoriesService.resolveClassificacao('999.888', storeCategories);
  if (!resTotalInvalida.isInvalid || resTotalInvalida.category !== 'Classificação Inválida') {
    throw new Error(`Falha: 999.888 deveria ser marcado como Classificação Inválida, obtido: ${JSON.stringify(resTotalInvalida)}`);
  }
  console.log('[PASS] Código 999.888 completamente desconhecido marcado como Classificação Inválida');

  // Teste 2: extractClassificacaoCategoria com produto real
  const sandaliaProd = {
    nome: 'SANDÁLIA FEMININA MOLECA SALTO BLOCO',
    classificacao: '001.001',
    nome_subgrupo: 'Sandálias',
  };
  const catExtracted = extractClassificacaoCategoria(sandaliaProd, storeCategories);
  if (catExtracted.subcategory === 'Masculino') {
    throw new Error('Falha crítica: Sandália feminina Moleca foi forçada para Masculino!');
  }
  if (catExtracted.subcategory !== 'Sandálias') {
    throw new Error(`Falha: esperava subcategoria Sandálias, obteve: ${catExtracted.subcategory}`);
  }
  console.log('[PASS] extractClassificacaoCategoria preservou Sandálias e não forçou Masculino');

  // Teste 3: isProductInAudience com código 001.001
  const mockFemProduct: Partial<Product> = {
    name: 'SANDÁLIA FEMININA RASTEIRA BEIRA RIO',
    classificacao: '001.001',
    category: 'Calçados',
    subcategory: 'Sandálias',
  };
  if (!isProductInAudience(mockFemProduct, 'feminino')) {
    throw new Error('Falha: Sandália com 001.001 deve pertencer ao público feminino');
  }
  if (isProductInAudience(mockFemProduct, 'masculino')) {
    throw new Error('Falha: Sandália com 001.001 NÃO deve pertencer ao público masculino');
  }
  console.log('[PASS] Sandália feminina com 001.001 pertence a feminino e é rejeitada de masculino na vitrine');

  console.log('🎉 Todos os testes de Classificação ERP e Categorias da Loja passaram com 100% de sucesso!');
}

runClassificationTests();
