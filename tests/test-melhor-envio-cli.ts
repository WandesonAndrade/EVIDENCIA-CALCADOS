/**
 * CLI Test Suite - Integração Direta com API Melhor Envio
 * Evidência Calçados
 *
 * Execução:
 *   npm run test:shipping
 *   npm run test:shipping -- --track QG56994931BR
 *   npm run test:shipping -- --orders
 *   npm run test:shipping -- --calculate 64016010
 */

import 'dotenv/config';
import { ShippingService } from '../src/services/shipping/shippingService';
import { getMelhorEnvioConfig } from '../src/services/shipping/providers/melhorEnvio/melhorEnvioConfig';

// Cores para saída amigável no terminal
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

async function runCli() {
  const args = process.argv.slice(2);
  const config = getMelhorEnvioConfig();
  const provider = ShippingService.getProvider();

  console.log(`\n${c.bright}${c.cyan}====================================================${c.reset}`);
  console.log(`${c.bright}  📦 TESTE DIRETO CLI - API MELHOR ENVIO${c.reset}`);
  console.log(`${c.cyan}====================================================${c.reset}`);
  console.log(`Ambiente: ${c.yellow}${config.environment.toUpperCase()}${c.reset}`);
  console.log(`Base URL: ${c.gray}${config.baseUrl}${c.reset}`);
  console.log(`Token:    ${config.apiToken ? `${c.green}CONFIGURADO (${config.apiToken.slice(0, 10)}...)${c.reset}` : `${c.red}NÃO ENCONTRADO NO .ENV${c.reset}`}`);
  console.log(`----------------------------------------------------\n`);

  if (!config.apiToken) {
    console.error(`${c.red}❌ Erro: MELHOR_ENVIO_TOKEN não configurado no .env${c.reset}\n`);
    process.exit(1);
  }

  // 1. RASTREAR ESPECÍFICO (--track <codigo_ou_id>)
  const trackIdx = args.indexOf('--track');
  if (trackIdx !== -1 && args[trackIdx + 1]) {
    const code = args[trackIdx + 1].trim();
    console.log(`${c.bright}🔍 Consultando rastreamento para: ${c.yellow}${code}${c.reset}...\n`);
    try {
      const res = await provider.trackShipment(code);
      if (!res) {
        console.log(`${c.red}❌ Nenhum rastreamento localizado para: ${code}${c.reset}\n`);
      } else {
        console.log(`${c.green}✅ Rastreamento Encontrado!${c.reset}`);
        console.log(`- Código Oficial:     ${c.bright}${res.trackingCode}${c.reset}`);
        console.log(`- ID Remessa:         ${res.shipmentId || 'N/A'}`);
        console.log(`- Status Normalizado: ${c.yellow}${res.status}${c.reset}`);
        console.log(`- Status Texto:       ${res.statusText}`);
        console.log(`- Total Eventos:      ${res.events?.length || 0}`);
        if (res.events && res.events.length > 0) {
          console.log(`\n${c.bright}Histórico de Movimentações:${c.reset}`);
          res.events.forEach((ev, idx) => {
            console.log(`  [${idx + 1}] ${c.gray}${ev.createdAt}${c.reset} | ${c.cyan}${ev.status}${c.reset}: ${ev.description} (${ev.location || 'Brasil'})`);
          });
        }
        if (res.metricDivergence) {
          console.log(`\n${c.yellow}⚠️ Divergência de Métrica Detectada: +R$ ${res.metricDivergence.difference}${c.reset}`);
        }
      }
    } catch (e: any) {
      console.error(`${c.red}❌ Erro ao consultar rastreamento:${c.reset}`, e.message);
    }
    console.log();
    return;
  }

  // 2. LISTAR PEDIDOS (--orders)
  const ordersIdx = args.indexOf('--orders');
  if (ordersIdx !== -1) {
    console.log(`${c.bright}📋 Listando últimas remessas da conta...${c.reset}\n`);
    try {
      const headers = await provider.getAuthHeaders();
      const res = await fetch(`${config.baseUrl}/api/v2/me/orders?per_page=10`, { headers });
      if (res.status === 204) {
        console.log(`${c.yellow}Nenhum pedido encontrado na conta.${c.reset}\n`);
        return;
      }
      const data = await res.json();
      const list = data?.data || (Array.isArray(data) ? data : []);
      console.log(`Total retornados: ${list.length}\n`);
      list.forEach((o: any, idx: number) => {
        console.log(`${c.cyan}[${idx + 1}] ${o.protocol || o.id}${c.reset}`);
        console.log(`    Status:   ${c.yellow}${o.status}${c.reset}`);
        console.log(`    Tracking: ${c.green}${o.tracking || o.self_tracking || 'Aguardando'}${c.reset}`);
        console.log(`    Para:     ${o.to?.name} - ${o.to?.postal_code}`);
        console.log(`    Data:     ${o.created_at}`);
      });
    } catch (e: any) {
      console.error(`${c.red}❌ Erro ao listar pedidos:${c.reset}`, e.message);
    }
    console.log();
    return;
  }

  // 3. CALCULAR FRETE (--calculate <cep_destino>)
  const calcIdx = args.indexOf('--calculate');
  if (calcIdx !== -1 && args[calcIdx + 1]) {
    const toCep = args[calcIdx + 1].trim();
    console.log(`${c.bright}🚚 Cotando frete para o CEP: ${c.yellow}${toCep}${c.reset}...\n`);
    try {
      const options = await provider.calculateShipping({
        toPostalCode: toCep,
        box: { height: 12, width: 20, length: 30, weight: 0.8 },
      });
      console.log(`${c.green}✅ ${options.length} opções de frete retornadas:${c.reset}\n`);
      options.forEach((opt) => {
        console.log(`- ${c.bright}${opt.name} (${opt.company.name})${c.reset}: R$ ${opt.price.toFixed(2)} (${opt.deliveryTime} dias úteis)`);
      });
    } catch (e: any) {
      console.error(`${c.red}❌ Erro ao calcular frete:${c.reset}`, e.message);
    }
    console.log();
    return;
  }

  // 4. MODO PADRÃO / DIAGNÓSTICO GERAL (Verificação de Autenticação + Cotação + Rastreamento)
  console.log(`${c.bright}🔎 Executando Diagnóstico Geral da API...${c.reset}\n`);

  // Teste A: Autenticação
  try {
    process.stdout.write(`1. Teste de Autenticação na API... `);
    const isAuth = await provider.isAuthenticated();
    if (isAuth) {
      console.log(`${c.green}OK (Token Válido)${c.reset}`);
    } else {
      console.log(`${c.red}FALHOU (Token inválido ou expirado)${c.reset}`);
    }
  } catch (e: any) {
    console.log(`${c.red}ERRO: ${e.message}${c.reset}`);
  }

  // Teste B: Cotação de Teste
  try {
    process.stdout.write(`2. Teste de Cotação de Frete (Caxias-MA -> Teresina-PI)... `);
    const options = await provider.calculateShipping({
      toPostalCode: '64016010',
      box: { height: 12, width: 20, length: 30, weight: 0.8 },
    });
    console.log(`${c.green}OK (${options.length} opções disponíveis)${c.reset}`);
  } catch (e: any) {
    console.log(`${c.red}ERRO: ${e.message}${c.reset}`);
  }

  // Teste C: Consulta do Último Pedido Postado
  try {
    process.stdout.write(`3. Teste de Rastreamento (Último Pacote Postado)... `);
    const headers = await provider.getAuthHeaders();
    const ordersRes = await fetch(`${config.baseUrl}/api/v2/me/orders?per_page=1`, { headers });
    if (ordersRes.ok && ordersRes.status !== 204) {
      const data = await ordersRes.json();
      const first = data?.data?.[0] || (Array.isArray(data) ? data[0] : null);
      if (first) {
        const trackCode = first.tracking || first.self_tracking || first.id;
        const trackResult = await provider.trackShipment(trackCode);
        if (trackResult) {
          console.log(`${c.green}OK${c.reset}`);
          console.log(`   └─ Envio: ${c.cyan}${trackResult.trackingCode}${c.reset} | Status: ${c.yellow}${trackResult.status} (${trackResult.statusText})${c.reset}`);
        } else {
          console.log(`${c.yellow}Aviso (Pedido localizado mas sem rastreio disponível)${c.reset}`);
        }
      } else {
        console.log(`${c.yellow}Sem pedidos registrados para testar${c.reset}`);
      }
    } else {
      console.log(`${c.yellow}Nenhum pedido na conta (204)${c.reset}`);
    }
  } catch (e: any) {
    console.log(`${c.red}ERRO: ${e.message}${c.reset}`);
  }

  console.log(`\n${c.bright}${c.cyan}Comandos diretos que você pode rodar a qualquer momento:${c.reset}`);
  console.log(`  ${c.gray}npm run test:shipping${c.reset}                               (Diagnóstico Geral)`);
  console.log(`  ${c.gray}npm run test:shipping -- --track QG56994931BR${c.reset}         (Rastrear código específico)`);
  console.log(`  ${c.gray}npm run test:shipping -- --orders${c.reset}                    (Listar últimas remessas)`);
  console.log(`  ${c.gray}npm run test:shipping -- --calculate 65604000${c.reset}             (Cotar frete para um CEP)`);
  console.log();
}

runCli();
