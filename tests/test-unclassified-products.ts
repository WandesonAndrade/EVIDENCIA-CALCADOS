import assert from 'assert';
import { moblinkCategoriesService } from '../src/services/moblinkCategoriesService';
import { extractClassificacaoCategoria } from '../src/services/moblinkProductsService';

function run() {
  console.log('--- Iniciando Testes de Produtos Sem Classificação Definida ---');

  // 1. Código oficial 002.002 deve ser reconhecido como Calçados Feminino
  const femResolved = moblinkCategoriesService.resolveClassificacao('002.002');
  assert.strictEqual(femResolved.category, 'Calçados');
  assert.strictEqual(femResolved.subcategory, 'Feminino');
  assert.strictEqual(femResolved.isDefined, true);
  console.log('[PASS] Código oficial 002.002 reconhecido como Calçados > Feminino');

  // 2. Código inexistente nas categorias/grupos (001.001) deve ser Sem Classificação Definida
  const unkResolved = moblinkCategoriesService.resolveClassificacao('001.001');
  assert.strictEqual(unkResolved.category, 'Sem Classificação Definida');
  assert.strictEqual(unkResolved.subcategory, '');
  assert.strictEqual(unkResolved.isDefined, false);
  console.log('[PASS] Código 001.001 classificado como Sem Classificação Definida');

  // 3. Qualquer outro código inexistente (ex: 999.999)
  const nonExistent = moblinkCategoriesService.resolveClassificacao('999.999');
  assert.strictEqual(nonExistent.category, 'Sem Classificação Definida');
  assert.strictEqual(nonExistent.isDefined, false);
  console.log('[PASS] Código 999.999 classificado como Sem Classificação Definida');

  // 4. Teste com extractClassificacaoCategoria em produto real do ERP com 001.001
  const itemMock001 = {
    id: '100',
    descricao: 'SANDALIA VIA GATA 5021305 OFF-WHITE',
    classificacao: '001.001'
  };
  const catInfo001 = extractClassificacaoCategoria(itemMock001);
  assert.strictEqual(catInfo001.category, 'Sem Classificação Definida');
  assert.strictEqual(catInfo001.subcategory, '');
  assert.strictEqual(catInfo001.nome_grupo, 'Sem Classificação Definida');
  assert.strictEqual(catInfo001.classificacao, '001.001');
  assert.strictEqual(catInfo001.isDefined, false);
  console.log('[PASS] Produto com classificação 001.001 extrai category: "Sem Classificação Definida" preservando o código bruto');

  // 5. Teste com produto que possui código oficial 002.001 (Masculino)
  const itemMock002 = {
    id: '200',
    descricao: 'SAPATÊNIS DEMOCRATA COURO',
    classificacao: '002.001'
  };
  const catInfo002 = extractClassificacaoCategoria(itemMock002);
  assert.strictEqual(catInfo002.category, 'Calçados');
  assert.strictEqual(catInfo002.subcategory, 'Masculino');
  assert.strictEqual(catInfo002.isDefined, true);
  console.log('[PASS] Produto com classificação 002.001 extrai category: "Calçados > Masculino"');

  console.log('🎉 Todos os testes de Sem Classificação Definida passaram com 100% de sucesso!');
}

run();
