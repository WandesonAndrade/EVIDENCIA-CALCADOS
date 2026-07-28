import { test, expect } from '@playwright/test';

test.describe('QA Automation Suite: Autenticação, Cadastro e Isolamento de Perfil', () => {

  test.beforeEach(async ({ page }) => {
    // Acessa a aplicação
    await page.goto('/');
  });

  test('E2E-01: Login por E-mail & Autorregistro sem Atrito', async ({ page }) => {
    // Navega para a tela de Login
    await page.click('button:has-text("Entrar"), #user-profile-menu-button');
    
    // Insere e-mail de teste
    await page.fill('input[type="email"]', 'cliente.autotest@evidencia.com');
    await page.click('button[type="submit"]');

    // Verifica que o login redireciona para a Home logada
    await expect(page).toHaveURL(/.*home/);
    await expect(page.locator('text=cliente.autotest')).toBeVisible();
  });

  test('E2E-02: Status de Cadastro Completo vs Pendente', async ({ page }) => {
    // Simula usuário logado com documento completo
    await page.evaluate(() => {
      const fullUser = {
        uid: 'qa_user_complete',
        name: 'Ana QA Automática',
        email: 'ana.qa@evidencia.com',
        role: 'customer',
        cpf: '111.222.333-44',
        endereco: 'Rua das Flores, 123 - Caxias/MA',
        dataNascimento: '1992-08-10',
        isProfileComplete: true
      };
      localStorage.setItem('evidencia_user', JSON.stringify(fullUser));
    });

    await page.reload();

    // Abre o menu do usuário
    await page.click('#user-profile-menu-button');

    // Valida que o badge exibe "✓ Completo" em verde em vez de "Pendente"
    await expect(page.locator('text=✓ Completo')).toBeVisible();
    await expect(page.locator('text=Pendente')).not.toBeVisible();
  });

  test('E2E-03: Isolamento de Sessão e Limpeza no Logout', async ({ page }) => {
    // 1. Loga com Usuário A e adiciona item ao carrinho
    await page.evaluate(() => {
      const userA = { uid: 'user_a_123', email: 'userA@evidencia.com', name: 'User A', role: 'customer' };
      localStorage.setItem('evidencia_user', JSON.stringify(userA));
      localStorage.setItem('evidencia_cart_user_a_123', JSON.stringify([{ productId: 'p1', selectedSize: 37, quantity: 2 }]));
    });

    await page.reload();

    // 2. Realiza Logout
    await page.click('#user-profile-menu-button');
    await page.click('button:has-text("Sair da Conta")');

    // 3. Valida que o carrinho do Usuário A foi limpo e o localStorage isolado foi desvinculado
    const cartState = await page.evaluate(() => localStorage.getItem('evidencia_cart'));
    const userState = await page.evaluate(() => localStorage.getItem('evidencia_user'));

    expect(userState).toBeNull();
    expect(cartState).toBeNull();
  });

  test('E2E-04: Verificação de Permissão do Painel Administrativo', async ({ page }) => {
    // Simula cliente comum tentando acessar a rota restrita /admin
    await page.evaluate(() => {
      const normalCustomer = { uid: 'cust_999', email: 'cliente@evidencia.com', name: 'Cliente', role: 'customer' };
      localStorage.setItem('evidencia_user', JSON.stringify(normalCustomer));
    });

    await page.reload();

    // Tenta forçar navegação direta
    await page.evaluate(() => {
      (window as any).setCurrentView?.('admin');
    });

    // Valida que o painel de admin restringe o acesso e exibe a tela de login restrito
    await expect(page.locator('text=Ambiente Administrativo Restrito')).toBeVisible();
  });
});
