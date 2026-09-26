import assert from 'assert';
import { moblinkCategoriesService, normalizeCategoryName, normalizeSubcategoryName } from '../src/services/moblinkCategoriesService';
import { extractClassificacaoCategoria } from '../src/services/moblinkProductsService';

// Simula a função de extração robusta de classificação
function extractProductClassification(item: any, existingDb?: any): { grupo: string; subgrupo: string; raw: string } {
  let raw = String(
    item?.classificacao ||
    existingDb?.classificacao ||
    item?.codigo_classificacao ||
    existingDb?.codigo_classificacao ||
    item?.cod_classificacao ||
    existingDb?.cod_classificacao ||
    item?.classificacao_erp ||
    existingDb?.classificacao_erp ||
    ''
  ).trim();

  const gId = item?.id_grupo ?? existingDb?.id_grupo;
  const sId = item?.id_subgrupo ?? existingDb?.id_subgrupo;
  if (!raw && gId !== undefined && gId !== null && String(gId).trim() !== '') {
    raw = (sId !== undefined && sId !== null && String(sId).trim() !== '') 
      ? `${String(gId).trim()}.${String(sId).trim()}` 
      : String(gId).trim();
  }

  if (!raw) {
    const catInfo = extractClassificacaoCategoria(existingDb || item);
    if (catInfo.classificacao) {
      raw = catInfo.classificacao.trim();
    }
  }

  if (!raw) {
    const cat = item?.category || item?.categoria || existingDb?.category || existingDb?.categoria || '';
    const sub = item?.subcategory || item?.subcategoria || item?.nome_subgrupo || existingDb?.subcategory || existingDb?.subcategoria || existingDb?.nome_subgrupo || '';
    const reverseCode = moblinkCategoriesService.findClassificacaoByCategory?.(cat, sub);
    if (reverseCode) {
      raw = reverseCode;
    }
  }

  let grupo = '';
  let subgrupo = '';
  if (raw) {
    const parts = raw.split('.');
    grupo = (parts[0] || '').trim();
    subgrupo = (parts[1] || '').trim();
  } else {
    grupo = gId !== undefined && gId !== null ? String(gId).trim() : '';
    subgrupo = sId !== undefined && sId !== null ? String(sId).trim() : '';
  }

  return { grupo, subgrupo, raw };
}

function matchesClassificacaoFilter(
  item: any,
  existingDb: any,
  gFilter: string,
  sFilter: string
): boolean {
  const gQuery = gFilter.trim();
  const sQuery = sFilter.trim();

  if (!gQuery && !sQuery) return true;

  const { grupo, subgrupo, raw } = extractProductClassification(item, existingDb);
  const catInfo = extractClassificacaoCategoria(existingDb || item);

  // Se o usuário digitou o código completo com ponto no campo de grupo (ex: "002.001" ou "2.1")
  if (gQuery.includes('.')) {
    const [qG, qS] = gQuery.split('.');
    const qGNum = parseInt(qG, 10);
    const qSNum = parseInt(qS, 10);
    const itemGNum = parseInt(grupo, 10);
    const itemSNum = parseInt(subgrupo, 10);

    const matchesG = !isNaN(qGNum) && !isNaN(itemGNum) ? qGNum === itemGNum : grupo.includes(qG);
    const matchesS = !qS ? true : (!isNaN(qSNum) && !isNaN(itemSNum) ? qSNum === itemSNum : subgrupo.includes(qS));

    return matchesG && matchesS;
  }

  let matchesGrupo = true;
  if (gQuery) {
    const itemGNum = parseInt(grupo, 10);
    const qGNum = parseInt(gQuery, 10);
    if (!isNaN(itemGNum) && !isNaN(qGNum)) {
      matchesGrupo = itemGNum === qGNum;
    } else {
      matchesGrupo = grupo.toLowerCase().includes(gQuery.toLowerCase()) ||
                     (catInfo.nome_grupo && catInfo.nome_grupo.toLowerCase().includes(gQuery.toLowerCase())) ||
                     (catInfo.category && catInfo.category.toLowerCase().includes(gQuery.toLowerCase()));
    }
  }

  let matchesSubgrupo = true;
  if (sQuery) {
    const itemSNum = parseInt(subgrupo, 10);
    const qSNum = parseInt(sQuery, 10);
    if (!isNaN(itemSNum) && !isNaN(qSNum)) {
      matchesSubgrupo = itemSNum === qSNum;
    } else {
      matchesSubgrupo = subgrupo.toLowerCase().includes(sQuery.toLowerCase()) ||
                        (catInfo.nome_subgrupo && catInfo.nome_subgrupo.toLowerCase().includes(sQuery.toLowerCase())) ||
                        (catInfo.subcategory && catInfo.subcategory.toLowerCase().includes(sQuery.toLowerCase()));
    }
  }

  return matchesGrupo && matchesSubgrupo;
}

console.log('--- Testando Filtro de Classificação ERP ---');

// Cenário 1: Produto com classificacao: "002.001"
const prod1 = { id: '1', name: 'Sapato Masc', classificacao: '002.001' };
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, '002', '001'), true, 'Deve encontrar prod1 com 002 e 001');
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, '2', '1'), true, 'Deve encontrar prod1 com 2 e 1');
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, '002', ''), true, 'Deve encontrar prod1 só com grupo 002');
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, '2', ''), true, 'Deve encontrar prod1 só com grupo 2');
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, '002.001', ''), true, 'Deve encontrar prod1 com código completo digitado no grupo');
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, '002', '002'), false, 'Não deve encontrar prod1 com subgrupo 002');

// Cenário 2: Produto sem classificacao explicita, mas com id_grupo: 2 e id_subgrupo: 1
const prod2 = { id: '2', name: 'Sapato Masc 2', id_grupo: 2, id_subgrupo: 1 };
assert.strictEqual(matchesClassificacaoFilter(prod2, prod2, '002', '001'), true, 'Deve encontrar prod2 por id_grupo numérico');
assert.strictEqual(matchesClassificacaoFilter(prod2, prod2, '2', '1'), true, 'Deve encontrar prod2 por id_grupo numérico sem padding');

// Cenário 3: Produto legado com "001.001"
const prod3 = { id: '3', name: 'Sandália Legada', classificacao: '001.001' };
assert.strictEqual(matchesClassificacaoFilter(prod3, prod3, '001', '001'), true, 'Deve encontrar prod3 legado 001.001');
assert.strictEqual(matchesClassificacaoFilter(prod3, prod3, '1', '1'), true, 'Deve encontrar prod3 legado 1 e 1');

// Cenário 4: Produto sem código nenhum, apenas categoria e subcategoria
const prod4 = { id: '4', name: 'Sandália Feminina Salto', category: 'Calçados', subcategory: 'Feminino' };
assert.strictEqual(matchesClassificacaoFilter(prod4, prod4, '002', '002'), true, 'Deve encontrar prod4 por resolução reversa de Calçados Feminino para 002.002');
assert.strictEqual(matchesClassificacaoFilter(prod4, prod4, '2', '2'), true, 'Deve encontrar prod4 por resolução reversa com 2 e 2');

// Cenário 5: Busca por nome de categoria no filtro de classificação
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, 'Calçados', ''), true, 'Deve encontrar prod1 buscando "Calçados" no campo grupo');
assert.strictEqual(matchesClassificacaoFilter(prod1, prod1, '', 'Masculino'), true, 'Deve encontrar prod1 buscando "Masculino" no campo subgrupo');

console.log('✅ Todos os testes de filtro de classificação passaram!');
