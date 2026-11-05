import { STORE_THEMES, getStoreThemeTokens } from '../src/theme/storeThemes';
import { AVAILABLE_STORE_THEMES, StoreThemeId } from '../src/types';

console.log('--- Iniciando Testes dos Temas da Loja (Tokens & Consistência) ---');

const expectedThemes: StoreThemeId[] = ['default', 'outubro-rosa', 'black-friday'];

// 1. Valida que todos os temas esperados existem em STORE_THEMES e AVAILABLE_STORE_THEMES
for (const themeId of expectedThemes) {
  const theme = STORE_THEMES[themeId];
  if (!theme) {
    console.error(`[FAIL] Tema ${themeId} ausente em STORE_THEMES!`);
    process.exit(1);
  }

  const def = AVAILABLE_STORE_THEMES.find(t => t.id === themeId);
  if (!def) {
    console.error(`[FAIL] Definição de tema ${themeId} ausente em AVAILABLE_STORE_THEMES!`);
    process.exit(1);
  }

  // Verifica campos obrigatórios
  if (!theme.name || !theme.id) {
    console.error(`[FAIL] Tema ${themeId} com metadados inválidos!`);
    process.exit(1);
  }

  // Verifica Hero
  if (!theme.hero.containerGradient || !theme.hero.curveNeonStroke || theme.hero.curveStops.length !== 3) {
    console.error(`[FAIL] Tema ${themeId} com tokens de Hero incompletos!`);
    process.exit(1);
  }

  // Verifica Saldão
  if (!theme.saldao.cardGradient || !theme.saldao.discountText || !theme.saldao.btnText) {
    console.error(`[FAIL] Tema ${themeId} com tokens de Saldão incompletos!`);
    process.exit(1);
  }

  // Verifica Cards & Badges
  if (!theme.cards.buyButtonGradient || !theme.cards.cornerBadgeLabel) {
    console.error(`[FAIL] Tema ${themeId} com tokens de Cards incompletos!`);
    process.exit(1);
  }

  // Testa gerador de rótulo de corner badge
  const saldaoLabel = theme.cards.cornerBadgeLabel(true, 20);
  const discountLabel = theme.cards.cornerBadgeLabel(false, 30);
  const promoLabel = theme.cards.cornerBadgeLabel(false, 0, 'OFERTA');
  const newLabel = theme.cards.cornerBadgeLabel(false, 0);

  if (!saldaoLabel || !discountLabel || !promoLabel || !newLabel) {
    console.error(`[FAIL] Gerador cornerBadgeLabel do tema ${themeId} retornou vazio!`);
    process.exit(1);
  }

  // Validação específica da Black Friday: deve conter prefixo 'BLACK' nas badges
  if (themeId === 'black-friday') {
    if (!saldaoLabel.includes('BLACK') || !discountLabel.includes('BLACK') || !promoLabel.includes('BLACK') || !newLabel.includes('BLACK')) {
      console.error(`[FAIL] Selo 'BLACK' não encontrado nas labels de Black Friday:`, { saldaoLabel, discountLabel, promoLabel, newLabel });
      process.exit(1);
    }
  }

  console.log(`[PASS] Tema '${themeId}' validado com 100% dos tokens.`);
}

// 2. Valida fallback seguro de getStoreThemeTokens
const fallbackTheme = getStoreThemeTokens('inexistente' as any);
if (fallbackTheme.id !== 'default') {
  console.error('[FAIL] Fallback getStoreThemeTokens falhou em retornar tema default!');
  process.exit(1);
}
console.log('[PASS] Fallback seguro do getStoreThemeTokens validado.');

console.log('🎉 Todos os testes de temas da loja passaram com 100% de sucesso!');

