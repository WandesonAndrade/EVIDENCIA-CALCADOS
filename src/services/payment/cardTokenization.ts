import { CardTokenParams } from './types';

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

let mpInstance: any = null;
let mpScriptPromise: Promise<any> | null = null;

/**
 * Carrega dinamicamente o SDK JS v2 do Mercado Pago no navegador (PCI-DSS compliant)
 */
export function loadMercadoPagoSDK(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mercado Pago SDK só pode ser carregado no navegador.'));
  }

  if (window.MercadoPago && mpInstance) {
    return Promise.resolve(mpInstance);
  }

  if (mpScriptPromise) {
    return mpScriptPromise;
  }

  mpScriptPromise = new Promise((resolve, reject) => {
    const publicKey = (
      import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
      import.meta.env.VITE_MP_PUBLIC_KEY ||
      'TEST-e940733a-18e3-4d6d-88b4-[#publickey]'
    ).replace(/['"]/g, '').trim();

    if (window.MercadoPago) {
      try {
        mpInstance = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        resolve(mpInstance);
      } catch (e) {
        reject(e);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      try {
        if (window.MercadoPago) {
          mpInstance = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
          resolve(mpInstance);
        } else {
          reject(new Error('SDK do Mercado Pago não foi inicializado corretamente.'));
        }
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => {
      reject(new Error('Falha ao carregar a biblioteca de pagamentos do Mercado Pago. Verifique sua conexão.'));
    };
    document.body.appendChild(script);
  });

  return mpScriptPromise;
}

/**
 * Tokeniza com extrema segurança o cartão de crédito/débito diretamente no navegador (PCI-DSS Compliant).
 * O número do cartão e o CVV JAMAIS trafegam para nossos servidores ou banco de dados.
 */
export async function createCardTokenClientSide(params: CardTokenParams): Promise<string> {
  const mp = await loadMercadoPagoSDK();

  const cleanCardNumber = params.cardNumber.replace(/\D/g, '');
  const cleanMonth = params.cardExpirationMonth.padStart(2, '0');
  let cleanYear = params.cardExpirationYear.trim();
  if (cleanYear.length === 2) {
    cleanYear = `20${cleanYear}`;
  }

  const cleanCpf = (params.identificationNumber || '').replace(/\D/g, '');

  const tokenPayload: any = {
    cardNumber: cleanCardNumber,
    cardholderName: params.cardholderName.trim().toUpperCase(),
    cardExpirationMonth: cleanMonth,
    cardExpirationYear: cleanYear,
    securityCode: params.securityCode.trim(),
  };

  if (cleanCpf && cleanCpf.length === 11) {
    tokenPayload.identification = {
      type: params.identificationType || 'CPF',
      number: cleanCpf,
    };
  }

  try {
    const tokenResult = await mp.createCardToken(tokenPayload);

    if (tokenResult && tokenResult.id) {
      return tokenResult.id;
    }

    if (tokenResult && tokenResult.error) {
      const firstErr = Array.isArray(tokenResult.error) ? tokenResult.error[0] : tokenResult.error;
      const msg = firstErr?.message || firstErr?.description || 'Dados do cartão inválidos. Verifique o número, validade e CVV.';
      throw new Error(msg);
    }

    throw new Error('Não foi possível tokenizar o cartão. Verifique os dados digitados.');
  } catch (err: any) {
    console.error('[CardTokenization] Erro ao tokenizar cartão:', err);
    throw new Error(err.message || 'Erro ao validar o cartão com a operadora.');
  }
}

/**
 * Detecta a bandeira (Visa, Mastercard, Elo, Hipercard, Amex, etc.) a partir do bin do cartão
 */
export async function getCardPaymentMethodId(cardNumber: string): Promise<string> {
  const bin = cardNumber.replace(/\D/g, '').slice(0, 6);
  if (bin.length < 6) return 'visa';

  try {
    const mp = await loadMercadoPagoSDK();
    const methods = await mp.getPaymentMethods({ bin });
    if (methods && methods.results && methods.results.length > 0) {
      return methods.results[0].id;
    }
  } catch {
    // Fallback por Regex simples caso a API de BIN não responda
  }

  if (/^4/.test(bin)) return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(bin)) return 'master';
  if (/^606282|^5067|^4576|^4011|^504175|^5090/.test(bin)) return 'elo';
  if (/^3841|^60/.test(bin)) return 'hipercard';
  if (/^3[47]/.test(bin)) return 'amex';

  return 'visa';
}
