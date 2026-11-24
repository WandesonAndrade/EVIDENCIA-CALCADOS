/**
 * Testes Automatizados do Serviço de Migração de E-mail
 * Evidência Calçados - QA Test Suite
 */

import { 
  isFictitiousEmail, 
  validateRealEmail, 
  FICTITIOUS_EMAIL_DOMAINS 
} from '../src/features/cpf-auth/emailMigrationService';
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

async function runEmailMigrationTests() {
  console.log('\n🧪 [SUITE EMAIL-MIGRATION 1] Detecção de E-mails Fictícios');

  // Testes de domínios fictícios
  assert(
    isFictitiousEmail('12345678901@evidenciacalcados.com.br'),
    'Detecta e-mail fictício @evidenciacalcados.com.br'
  );
  assert(
    isFictitiousEmail('12345678901@evidencia.com'),
    'Detecta e-mail legado @evidencia.com'
  );
  assert(
    isFictitiousEmail('  12345678901@evidenciacalcados.com.br  '),
    'Detecta e-mail com espaços em branco'
  );
  assert(
    isFictitiousEmail('12345678901@EVIDENCIACALCADOS.COM.BR'),
    'Detecta e-mail fictício em maiúsculas'
  );

  // E-mails reais legítimos não devem ser considerados fictícios
  assert(
    !isFictitiousEmail('cliente@gmail.com'),
    'Não marca @gmail.com como fictício'
  );
  assert(
    !isFictitiousEmail('usuario@hotmail.com'),
    'Não marca @hotmail.com como fictício'
  );
  assert(
    !isFictitiousEmail('contato@yahoo.com.br'),
    'Não marca @yahoo.com.br como fictício'
  );
  assert(
    !isFictitiousEmail(''),
    'String vazia não é fictício'
  );
  assert(
    !isFictitiousEmail(null),
    'Null não é fictício'
  );

  console.log('\n🧪 [SUITE EMAIL-MIGRATION 2] Validação do Novo E-mail Real');

  // E-mails válidos
  assert(
    validateRealEmail('cliente.novo@gmail.com').valid,
    'Valida e-mail real padrão Gmail'
  );
  assert(
    validateRealEmail('maria_silva123@outlook.com').valid,
    'Valida e-mail real padrão Outlook'
  );

  // E-mails inválidos
  assert(
    !validateRealEmail('email_sem_arroba.com').valid,
    'Rejeita e-mail sem @'
  );
  assert(
    !validateRealEmail('').valid,
    'Rejeita string vazia'
  );

  // Rejeição ao tentar cadastrar o domínio fictício como novo e-mail
  const fictitiousAttempt = validateRealEmail('novocpf@evidenciacalcados.com.br');
  assert(
    !fictitiousAttempt.valid && fictitiousAttempt.error?.includes('e-mail pessoal real'),
    'Rejeita tentativa de cadastrar domínio provisório como novo e-mail'
  );

  console.log('\n🧪 [SUITE EMAIL-MIGRATION 3] Mapeamento de Erro de Reautenticação');

  assert(
    getFriendlyAuthErrorMessage({ code: 'auth/requires-recent-login' }).includes('confirmar sua senha atual'),
    'Mapeia auth/requires-recent-login amigavelmente'
  );

  console.log(`\n========================================`);
  console.log(`RESULTADO FINAL: ${passed} passaram | ${failed} falharam`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEmailMigrationTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
