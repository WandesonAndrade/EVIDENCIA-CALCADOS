import { isUrbanCaxias, generateLocalLabelNumber, getLocalDeliveryPaymentBadge } from '../src/utils/localDelivery';

function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  console.log('--- TESTES: ELEGIBILIDADE ENTREGA PRÓPRIA (CAXIAS URBANA) ---');

  // 1. CEPs urbanos válidos de Caxias
  assert(isUrbanCaxias({ cep: '65600060' }), 'CEP 65600-060 (Centro Caxias) deve ser urbano');
  assert(isUrbanCaxias({ cep: '65604000' }), 'CEP 65604-000 (Caxias) deve ser urbano');
  assert(isUrbanCaxias({ cep: '65606841' }), 'CEP 65606-841 (Pampulha Caxias) deve ser urbano');
  assert(isUrbanCaxias({ cep: '65609000' }), 'CEP 65609-000 (Caxias) deve ser urbano');

  // 2. CEPs de outras cidades
  assert(!isUrbanCaxias({ cep: '64016010' }), 'CEP 64016-010 (Teresina-PI) NÃO deve ser entrega própria');
  assert(!isUrbanCaxias({ cep: '01001000' }), 'CEP 01001-000 (São Paulo-SP) NÃO deve ser entrega própria');
  assert(!isUrbanCaxias({ cep: '65000000' }), 'CEP 65000-000 (São Luís-MA) NÃO deve ser entrega própria');

  // 3. Verificação por Cidade / UF
  assert(isUrbanCaxias({ city: 'Caxias', uf: 'MA' }), 'Cidade Caxias / MA sem CEP deve ser aceita');
  assert(isUrbanCaxias({ city: 'caxias', uf: 'Maranhão' }), 'Cidade caxias / Maranhão deve ser aceita');
  assert(!isUrbanCaxias({ city: 'Timon', uf: 'MA' }), 'Cidade Timon / MA NÃO deve ser entrega própria');

  // 4. Bloqueio de termos de zona rural / povoados
  assert(!isUrbanCaxias({ cep: '65600000', address: 'Povoado Brejinho s/n' }), 'Povoado em Caxias deve ser excluído da rota urbana');
  assert(!isUrbanCaxias({ cep: '65600000', address: 'Zona Rural - Fazenda Boa Vista' }), 'Zona rural deve ser excluída');

  // 5. Verificação por texto do tipo de entrega
  assert(isUrbanCaxias({ deliveryType: 'Entrega Própria (Caxias Urbana)' }), 'deliveryType com Própria deve ser aceito');

  // 6. Geração de número de romaneio
  const labelNum = generateLocalLabelNumber('12345');
  assert(labelNum.startsWith('EP-') && labelNum.includes('12345'), `Romaneio gerado corretamente: ${labelNum}`);

  // 7. Badge de pagamento
  const badgePaid = getLocalDeliveryPaymentBadge({ paymentStatus: 'Confirmado', total: 150 });
  assert(badgePaid.type === 'PAID' && badgePaid.label.includes('JÁ PAGO'), 'Pedido pago deve mostrar JÁ PAGO');

  const badgeCollect = getLocalDeliveryPaymentBadge({ paymentStatus: 'Pendente', total: 120 });
  assert(badgeCollect.type === 'COLLECT' && badgeCollect.amountToCollect === 120, 'Pedido pendente deve mostrar COBRAR NA ENTREGA');

  console.log(`\nResultado: ${passed} passaram, ${failed} falharam.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

