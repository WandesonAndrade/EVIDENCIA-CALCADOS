/**
 * Testes Automatizados da Feature de Autenticação por CPF (Onboarding, Login e Reset)
 * Evidência Calçados - QA Test Suite
 */

import { cleanCpf, formatCpf, isValidCpf } from '../src/features/cpf-auth/cpfUtils';
import { getFriendlyAuthErrorMessage } from '../src/features/cpf-auth/authErrors';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASSED: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${testName}`);
    failed++;
  }
}

async function runCpfAuthTests() {
  console.log('\n🧪 [SUITE CPF-AUTH 1] Utilitários e Validação de CPF');

  // Testes de cleanCpf
  assert(cleanCpf('123.456.789-01') === '12345678901', 'cleanCpf remove pontuação e traço');
  assert(cleanCpf('  12345678901  ') === '12345678901', 'cleanCpf remove espaços em branco');
  assert(cleanCpf('abc-123.456!') === '123456', 'cleanCpf descarta caracteres não numéricos');
  assert(cleanCpf('') === '', 'cleanCpf com string vazia retorna vazio');

  // Testes de formatCpf
  assert(formatCpf('12345678901') === '123.456.789-01', 'formatCpf formata 11 dígitos no padrão 000.000.000-00');
  assert(formatCpf('123') === '123', 'formatCpf com 3 dígitos não adiciona ponto');
  assert(formatCpf('1234') === '123.4', 'formatCpf com 4 dígitos adiciona primeiro ponto');

  // Testes de isValidCpf (algorítmico)
  // CPFs inválidos conhecidos
  assert(!isValidCpf('00000000000'), 'isValidCpf rejeita sequência repetida 00000000000');
  assert(!isValidCpf('11111111111'), 'isValidCpf rejeita sequência repetida 11111111111');
  assert(!isValidCpf('12345678900'), 'isValidCpf rejeita CPF com dígitos verificadores incorretos');
  assert(!isValidCpf('123'), 'isValidCpf rejeita CPF curto');

  // CPFs válidos conhecidos (algoritmicamente válidos)
  assert(isValidCpf('52998224725'), 'isValidCpf valida CPF válido 52998224725');
  assert(isValidCpf('529.982.247-25'), 'isValidCpf valida CPF formatado 529.982.247-25');
  assert(isValidCpf('12345678909'), 'isValidCpf valida CPF válido 12345678909');

  console.log('\n🧪 [SUITE CPF-AUTH 2] Mapeamento Amigável de Erros do Firebase');

  assert(
    getFriendlyAuthErrorMessage({ code: 'auth/email-already-in-use' }).includes('já está sendo utilizado'),
    'Mapeia auth/email-already-in-use amigavelmente'
  );
  assert(
    getFriendlyAuthErrorMessage({ code: 'auth/weak-password' }).includes('mínimo 6 caracteres'),
    'Mapeia auth/weak-password amigavelmente'
  );
  assert(
    getFriendlyAuthErrorMessage({ code: 'auth/invalid-email' }).includes('formato do e-mail'),
    'Mapeia auth/invalid-email amigavelmente'
  );
  assert(
    getFriendlyAuthErrorMessage({ code: 'auth/invalid-credential' }).includes('CPF ou senha incorretos'),
    'Mapeia auth/invalid-credential amigavelmente'
  );
  assert(
    getFriendlyAuthErrorMessage({ code: 'auth/too-many-requests' }).includes('Muitas tentativas'),
    'Mapeia auth/too-many-requests amigavelmente'
  );

  console.log(`\n========================================`);
  console.log(`RESULTADO FINAL: ${passed} passaram | ${failed} falharam`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCpfAuthTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
