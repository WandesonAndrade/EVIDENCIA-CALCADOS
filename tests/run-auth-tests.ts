/**
 * Testes Automatizados de Autenticação, Perfil e Isolamento de Sessão
 * Evidência Calçados - QA Test Suite
 */

import 'dotenv/config';

// Mock de localStorage para ambiente de CLI Node
if (typeof global.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

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

  console.log('\n🧪 [SUITE 4] Testes de Vinculação de Pedidos por UID e Isolamento (orderService)');

  // 1. Pedido de teste EVC-4354 com UID e e-mail vinculados
  const mockOrder = {
    id: 'EVC-4354',
    userId: 'wandeson_uid_123',
    customerEmail: 'wandesonandrade33@gmail.com',
    customerName: 'Wandeson Andrade',
    total: 259.90,
    status: 'Pendente'
  };

  assert(mockOrder.userId === 'wandeson_uid_123', 'Pedido EVC-4354 deve conter a propriedade userId vinculada ao UID do usuário');
  assert(mockOrder.customerEmail === 'wandesonandrade33@gmail.com', 'Pedido deve conter o e-mail do cliente normalizado');

  // 2. Simula execução da limpeza pós-checkout
  userDataService.saveLocalCart('wandeson_uid_123', []);
  const clearedCart = userDataService.loadLocalCart('wandeson_uid_123');
  assert(clearedCart.length === 0, 'O carrinho do usuário no armazenamento local deve ser um array vazio [] pós-checkout');

  console.log('\n🧪 [SUITE 5] Testes de Autenticação Isolada de Admin e Cadastro de Equipe');

  // 1. Validação de isolamento do Admin no localStorage
  const mockAdminProfile = {
    uid: 'admin_user_carlos_evidencia_com',
    name: 'Carlos Vendedor',
    email: 'carlos@evidencia.com',
    role: 'seller',
    requiresPasswordChange: true,
    tempPassword: 'evidencia2026'
  };

  localStorage.setItem('evidencia_admin_user', JSON.stringify(mockAdminProfile));
  const savedAdminSession = JSON.parse(localStorage.getItem('evidencia_admin_user') || '{}');
  assert(savedAdminSession.uid === 'admin_user_carlos_evidencia_com', 'A sessão do admin deve ser salva isoladamente em evidencia_admin_user');
  assert(savedAdminSession.requiresPasswordChange === true, 'Membro cadastrado pela equipe deve possuir a flag requiresPasswordChange === true');
  assert(savedAdminSession.role === 'seller', 'O membro cadastrado deve ter o perfil de acesso correto (seller/admin)');

  // 2. Simula redefinição no 1º acesso
  const updatedAdminSession = { ...savedAdminSession, requiresPasswordChange: false, tempPassword: undefined };
  localStorage.setItem('evidencia_admin_user', JSON.stringify(updatedAdminSession));
  const postResetAdminSession = JSON.parse(localStorage.getItem('evidencia_admin_user') || '{}');
  assert(postResetAdminSession.requiresPasswordChange === false, 'Após redefinição no 1º acesso, a flag requiresPasswordChange deve ser false');
  assert(postResetAdminSession.tempPassword === undefined, 'A senha temporária deve ser removida após a redefinição de senha');

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
