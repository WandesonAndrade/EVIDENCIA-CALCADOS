/**
 * Testes Automatizados de Autenticação, Perfil e Isolamento de Sessão
 * Evidência Calçados - QA Test Suite
 */

import 'dotenv/config';
import { checkIsProfileComplete, isProfileIncomplete } from '../src/App';
import { userDataService } from '../src/services/userDataService';


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

async function runAuthAndProfileTests() {
  console.log('\n🧪 [SUITE 1] Testes de Validação de Status do Cadastro (checkIsProfileComplete)');

  // 1. Perfil com flag explícita no Firestore
  const userExplicitFlag = { uid: 'user_1', email: 'test1@evidencia.com', isProfileComplete: true };
  assert(checkIsProfileComplete(userExplicitFlag) === true, 'Deve validar como Completo se isProfileComplete === true');

  // 2. Perfil com campos essenciais reais do Firestore (name, cpf, endereco, dataNascimento)
  const userRealFirestoreDoc = {
    uid: 'user_2',
    name: 'Wandeson Andrade',
    email: 'wandeson@evidencia.com',
    cpf: '123.456.789-00',
    endereco: 'Rua Afonso Pena, Nº 295 - Centro, Caxias/MA',
    dataNascimento: '1995-05-15',
    naturalidade: 'Caxias/MA'
  };
  assert(checkIsProfileComplete(userRealFirestoreDoc) === true, 'Deve validar como Completo com os campos reais preenchidos (cpf, endereco, dataNascimento)');

  // 3. Perfil com campos usando nomes alternativos/sinônimos (documento, address, birthDate)
  const userSynonymDoc = {
    uid: 'user_3',
    nome: 'Maria Silva',
    email: 'maria@evidencia.com',
    documento: '987.654.321-11',
    address: 'Avenida Santos Dumont, 100',
    birthDate: '1998-10-20'
  };
  assert(checkIsProfileComplete(userSynonymDoc) === true, 'Deve validar como Completo com sinônimos (documento, address, birthDate)');

  // 4. Perfil incompleto (apenas name e email)
  const userIncompleteDoc = {
    uid: 'user_4',
    name: 'Cliente Novo',
    email: 'novo@evidencia.com'
  };
  assert(checkIsProfileComplete(userIncompleteDoc) === false, 'Deve validar como Incompleto se apenas possuir nome e email');


  console.log('\n🧪 [SUITE 2] Testes de Regra de Negócio de Pendência de Crédito (isProfileIncomplete)');

  // 1. Gestores e vendedores nunca exigem cadastro de crédito
  const adminUser = { uid: 'admin_1', email: 'admin@evidencia.com', role: 'admin' };
  const sellerUser = { uid: 'seller_1', email: 'vendedor@evidencia.com', role: 'seller' };
  assert(isProfileIncomplete(adminUser) === false, 'Perfis de Admin nunca devem exibir aviso de cadastro pendente');
  assert(isProfileIncomplete(sellerUser) === false, 'Perfis de Vendedor nunca devem exibir aviso de cadastro pendente');

  // 2. Cliente com cadastro completo
  const customerComplete = { ...userRealFirestoreDoc, role: 'customer' };
  assert(isProfileIncomplete(customerComplete) === false, 'Cliente com dados essenciais não deve estar incompleto');

  // 3. Cliente com cadastro incompleto
  const customerIncomplete = { ...userIncompleteDoc, role: 'customer' };
  assert(isProfileIncomplete(customerIncomplete) === true, 'Cliente novo sem CPF/Endereço deve ser marcado como incompleto');


  console.log('\n🧪 [SUITE 3] Testes de Isolamento de Armazenamento Local de Sessão (userDataService)');

  // 1. Chaves de armazenamento isoladas por UID
  assert(userDataService.getCartStorageKey('user_uid_123') === 'evidencia_cart_user_uid_123', 'Chave de carrinho deve conter o UID do usuário');
  assert(userDataService.getFavoritesStorageKey('user_uid_123') === 'evidencia_favorites_user_uid_123', 'Chave de favoritos deve conter o UID do usuário');
  assert(userDataService.getCartStorageKey(null) === 'evidencia_cart_guest', 'Chave visitante deve ser evidencia_cart_guest');

  // Relatório Final
  console.log(`\n==================================================`);
  console.log(`📊 RELATÓRIO DA SUITE DE TESTES AUTOMATIZADOS:`);
  console.log(`   ✅ Testes Aprovados: ${passed}`);
  console.log(`   ❌ Testes Falhos: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthAndProfileTests();
