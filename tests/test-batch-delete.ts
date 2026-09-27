import assert from 'assert';

/**
 * Teste unitário para validação da exclusão em lote de produtos
 * Simula catálogo grande e verifica resolução de IDs, ausência de travamento e integridade
 */

interface MockProduct {
  id: string;
  moblinkId?: string;
  name: string;
}

function simulateBatchDelete(
  products: MockProduct[],
  idsToDelete: string[]
): { updatedProducts: MockProduct[]; firestoreDocIds: string[]; chunks: string[][] } {
  // 1. Normaliza identificadores
  const idsSet = new Set<string>();
  idsToDelete.forEach(id => {
    if (!id) return;
    const s = String(id).trim();
    idsSet.add(s);
    idsSet.add(s.replace(/^MOB-/, ''));
    if (!s.startsWith('MOB-')) idsSet.add(`MOB-${s}`);
  });

  // 2. Identifica produtos correspondentes
  const matchedProducts = products.filter(p => {
    const pId = String(p.id || '').trim();
    const mobId = String(p.moblinkId || '').trim();
    return idsSet.has(pId) || (mobId !== '' && idsSet.has(mobId));
  });

  // 3. Monta IDs para o Firestore
  const firestoreDocIds = new Set<string>();
  idsToDelete.forEach(id => {
    if (id) firestoreDocIds.add(String(id).trim());
  });
  matchedProducts.forEach(p => {
    if (p.id) firestoreDocIds.add(String(p.id).trim());
    if (p.moblinkId) firestoreDocIds.add(String(p.moblinkId).trim());
  });

  // 4. Filtra em UMA ÚNICA passagem O(N)
  const matchedIdsSet = new Set(matchedProducts.map(p => String(p.id)));
  const updatedProducts = products.filter(p => 
    !matchedIdsSet.has(String(p.id)) && 
    !idsSet.has(String(p.id)) && 
    (!p.moblinkId || !idsSet.has(String(p.moblinkId)))
  );

  // 5. Chunking em lotes de 400
  const docIdsList = Array.from(firestoreDocIds);
  const BATCH_SIZE = 400;
  const chunks: string[][] = [];
  for (let i = 0; i < docIdsList.length; i += BATCH_SIZE) {
    chunks.push(docIdsList.slice(i, i + BATCH_SIZE));
  }

  return { updatedProducts, firestoreDocIds: docIdsList, chunks };
}

console.log('🧪 Iniciando testes de exclusão em lote (Batch Delete)...');

// Caso 1: Testar resolução mista de IDs (id puro, moblinkId e MOB-prefix)
const mockCatalog: MockProduct[] = [
  { id: 'PROD-1', moblinkId: '1001', name: 'Sandália 1' },
  { id: '1002', moblinkId: '1002', name: 'Sandália 2' },
  { id: 'PROD-3', moblinkId: 'MOB-1003', name: 'Sandália 3' },
  { id: 'PROD-4', moblinkId: '1004', name: 'Sandália 4' },
  { id: 'PROD-5', moblinkId: '1005', name: 'Sandália 5' },
];

const deleteResult1 = simulateBatchDelete(mockCatalog, ['1001', 'MOB-1002', '1003']);
assert.strictEqual(deleteResult1.updatedProducts.length, 2, 'Deveriam sobrar apenas 2 produtos');
assert.deepStrictEqual(
  deleteResult1.updatedProducts.map(p => p.id),
  ['PROD-4', 'PROD-5'],
  'Sobraram produtos incorretos'
);
console.log('✅ Caso 1: Resolução mista de IDs passou com sucesso.');

// Caso 2: Testar lote grande (1.000 produtos) e chunking de Firestore (batches <= 400)
const largeCatalog: MockProduct[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `PROD-${i + 1}`,
  moblinkId: `MOB-${i + 1}`,
  name: `Produto Teste ${i + 1}`
}));

const idsToDeleteLarge = Array.from({ length: 650 }, (_, i) => `MOB-${i + 1}`);
const start = performance.now();
const largeResult = simulateBatchDelete(largeCatalog, idsToDeleteLarge);
const durationMs = performance.now() - start;

assert.strictEqual(largeResult.updatedProducts.length, 350, 'Deveriam sobrar 350 produtos');
assert(largeResult.chunks.length >= 2, 'Deveria ter dividido em múltiplos chunks para o Firestore');
largeResult.chunks.forEach((chunk, idx) => {
  assert(chunk.length <= 400, `Chunk ${idx} excedeu o limite seguro de 400 operações (${chunk.length})`);
});
assert(durationMs < 50, `A operação em memória deve ser ultra-rápida (<50ms). Levou: ${durationMs.toFixed(2)}ms`);
console.log(`✅ Caso 2: Exclusão de 650 itens em catálogo de 1.000 executada em ${durationMs.toFixed(2)}ms com ${largeResult.chunks.length} chunks Firestore.`);

console.log('🎉 Todos os testes de Batch Delete passaram com 100% de sucesso!');
