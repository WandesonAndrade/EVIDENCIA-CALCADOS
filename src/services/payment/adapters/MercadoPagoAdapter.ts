import {
  IPaymentGateway,
  PaymentRequest,
  CreditCardPaymentRequest,
  DebitCardPaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from '../types';
import { pixFirestoreService } from '../../pixFirestoreService';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError' || err.message === 'timeout') {
      throw new Error(`Timeout de ${timeoutMs}ms excedido ao tentar conectar com Mercado Pago`);
    }
    throw err;
  }
};

export class MercadoPagoAdapter implements IPaymentGateway {
  readonly providerName = 'Mercado Pago';

  /**
   * 1. Criação de Pagamento PIX Instantâneo
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { valor, descricao, emailCliente, nomeCliente, cpfCliente, externalReference, forceNew, idempotencyKey } = request;
    const parcelKey = String(externalReference || descricao).trim().toLowerCase();
    const now = Date.now();

    // Reutilização Instantânea (<50ms) de Pix Ativo no Firestore (se ainda for válido)
    if (!forceNew && parcelKey) {
      try {
        const existing = await pixFirestoreService.getPixTransacaoByParcelKey(parcelKey);
        if (existing && (existing.status === 'pending' || !existing.status) && existing.expires_at > now + 60_000) {
          const amountChanged = Math.abs((existing.transaction_amount || 0) - valor) > 0.01;
          if (!amountChanged) {
            console.log(`[MercadoPagoAdapter] Reutilizando Pix ativo em cache para '${parcelKey}' (ID #${existing.payment_id})`);
            return {
              success: true,
              paymentId: existing.payment_id,
              status: 'pending',
              qrCode: existing.qr_code,
              qrCodeBase64: existing.qr_code_base64 || null,
              expiresAt: existing.expires_at,
              reused: true,
              provider: this.providerName,
            };
          }
        }
      } catch (e) {
        console.warn('[MercadoPagoAdapter] Consulta Firestore ignorada:', e);
      }
    }

    let lastError = '';
    const mpToken = (
      import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
      import.meta.env.MERCADO_PAGO_ACCESS_TOKEN ||
      ''
    ).replace(/['"]/g, '').trim();

    if (!mpToken) {
      throw new Error('Token de acesso do Mercado Pago não configurado no .env (VITE_MERCADO_PAGO_ACCESS_TOKEN)');
    }

    const expiresAtMs = Date.now() + 30 * 60_000;
    const dateOfExpirationIso = new Date(expiresAtMs).toISOString();

    const payerObj: Record<string, any> = { email: emailCliente || 'cliente@evidenciacalcados.com.br' };
    if (nomeCliente && typeof nomeCliente === 'string' && nomeCliente.trim() !== '') {
      const parts = nomeCliente.trim().split(' ');
      payerObj.first_name = parts[0] || 'Cliente';
      if (parts.length > 1) {
        payerObj.last_name = parts.slice(1).join(' ');
      }
    } else {
      payerObj.first_name = 'Cliente';
    }

    if (cpfCliente && typeof cpfCliente === 'string') {
      const cleanCpf = cpfCliente.replace(/\D/g, '');
      if (cleanCpf.length === 11) {
        payerObj.identification = { type: 'CPF', number: cleanCpf };
      }
    }

    const paymentPayload = {
      transaction_amount: Number(valor),
      description: String(descricao || 'Pagamento Evidência Calçados').slice(0, 200),
      payment_method_id: 'pix',
      date_of_expiration: dateOfExpirationIso,
      payer: payerObj,
      external_reference: externalReference ? String(externalReference).slice(0, 64) : undefined,
    };

    const keyToUse = idempotencyKey || `pix-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mpToken}`,
      'X-Idempotency-Key': keyToUse,
    };

    const targetEndpoints = [
      '/mp-api/payments',
      'https://api.mercadopago.com/v1/payments'
    ];

    for (const url of targetEndpoints) {
      try {
        const mpRes = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(paymentPayload),
        }, 8000);

        if (mpRes.ok) {
          const data = await mpRes.json();
          const point = data.point_of_interaction?.transaction_data;
          if (point?.qr_code) {
            return {
              success: true,
              paymentId: data.id,
              status: data.status || 'pending',
              qrCode: point.qr_code,
              qrCodeBase64: point.qr_code_base64 || null,
              expiresAt: expiresAtMs,
              reused: false,
              provider: this.providerName,
              rawProviderData: data,
            };
          }
        } else {
          const data = await mpRes.json().catch(() => ({}));
          if (data.message || (data.cause && data.cause[0])) {
            const errorDesc = data.message || data.cause[0]?.description;
            throw new Error(`Mercado Pago API: ${errorDesc}`);
          }
        }
      } catch (endpointErr: any) {
        if (endpointErr?.message?.includes('Mercado Pago API:')) {
          throw endpointErr;
        }
        console.warn(`[MercadoPagoAdapter] Tentativa em '${url}' falhou ou estourou tempo limite:`, endpointErr?.message || endpointErr);
        lastError = endpointErr?.message || String(endpointErr);
      }
    }

    throw new Error(lastError || 'Não foi possível conectar à API do Mercado Pago. Verifique suas credenciais.');
  }

  /**
   * 2. Processamento de Cartão de Crédito com Tokenização Client-Side (PCI-DSS)
   */
  async createCreditCardPayment(request: CreditCardPaymentRequest): Promise<PaymentResponse> {
    const {
      valor,
      descricao,
      emailCliente,
      nomeCliente,
      cpfCliente,
      cardToken,
      installments,
      paymentMethodId,
      issuerId,
      externalReference,
      idempotencyKey,
    } = request;

    const mpToken = (
      import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
      import.meta.env.MERCADO_PAGO_ACCESS_TOKEN ||
      ''
    ).replace(/['"]/g, '').trim();

    if (!mpToken) {
      throw new Error('Token de acesso do Mercado Pago não configurado no .env.');
    }

    const payerObj: Record<string, any> = { email: emailCliente || 'cliente@evidenciacalcados.com.br' };
    if (nomeCliente) {
      const parts = nomeCliente.trim().split(' ');
      payerObj.first_name = parts[0];
      if (parts.length > 1) payerObj.last_name = parts.slice(1).join(' ');
    }

    if (cpfCliente) {
      const cleanCpf = cpfCliente.replace(/\D/g, '');
      if (cleanCpf.length === 11) {
        payerObj.identification = { type: 'CPF', number: cleanCpf };
      }
    }

    const paymentPayload: Record<string, any> = {
      transaction_amount: Number(valor),
      token: cardToken,
      description: String(descricao || 'Compra Evidência Calçados - Cartão de Crédito').slice(0, 200),
      installments: Number(installments) || 1,
      payment_method_id: paymentMethodId || 'visa',
      payer: payerObj,
      external_reference: externalReference ? String(externalReference).slice(0, 64) : undefined,
    };

    if (issuerId) {
      paymentPayload.issuer_id = issuerId;
    }

    const keyToUse = idempotencyKey || `card-cred-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mpToken}`,
      'X-Idempotency-Key': keyToUse,
    };

    const targetEndpoints = [
      '/mp-api/payments',
      'https://api.mercadopago.com/v1/payments'
    ];

    let lastError = '';

    for (const url of targetEndpoints) {
      try {
        const mpRes = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(paymentPayload),
        }, 10000);

        const data = await mpRes.json().catch(() => ({}));

        if (mpRes.ok && data.id) {
          const isApproved = data.status === 'approved';
          return {
            success: isApproved,
            paymentId: data.id,
            status: data.status,
            statusDetail: data.status_detail,
            message: isApproved ? 'Pagamento com Cartão Aprovado com Sucesso!' : `Status do Pagamento: ${data.status_detail || data.status}`,
            provider: this.providerName,
            rawProviderData: data,
          };
        } else {
          const errorDesc = data.message || (data.cause && data.cause[0]?.description) || 'Transação não autorizada pela operadora do cartão.';
          throw new Error(`Mercado Pago: ${errorDesc}`);
        }
      } catch (endpointErr: any) {
        if (endpointErr?.message?.includes('Mercado Pago:')) {
          throw endpointErr;
        }
        lastError = endpointErr?.message || String(endpointErr);
      }
    }

    throw new Error(lastError || 'Não foi possível processar o pagamento com cartão de crédito.');
  }

  /**
   * 3. Processamento de Cartão de Débito com Tokenização Client-Side
   */
  async createDebitCardPayment(request: DebitCardPaymentRequest): Promise<PaymentResponse> {
    const {
      valor,
      descricao,
      emailCliente,
      nomeCliente,
      cpfCliente,
      cardToken,
      paymentMethodId,
      externalReference,
      idempotencyKey,
    } = request;

    const mpToken = (
      import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
      import.meta.env.MERCADO_PAGO_ACCESS_TOKEN ||
      ''
    ).replace(/['"]/g, '').trim();

    if (!mpToken) {
      throw new Error('Token de acesso do Mercado Pago não configurado no .env.');
    }

    const payerObj: Record<string, any> = { email: emailCliente || 'cliente@evidenciacalcados.com.br' };
    if (nomeCliente) {
      const parts = nomeCliente.trim().split(' ');
      payerObj.first_name = parts[0];
      if (parts.length > 1) payerObj.last_name = parts.slice(1).join(' ');
    }

    if (cpfCliente) {
      const cleanCpf = cpfCliente.replace(/\D/g, '');
      if (cleanCpf.length === 11) {
        payerObj.identification = { type: 'CPF', number: cleanCpf };
      }
    }

    // Para débito, no Mercado Pago usa-se o método correspondente (ex.: debvisa, debmaster) ou installments = 1
    const debitMethod = paymentMethodId.startsWith('deb') ? paymentMethodId : `deb${paymentMethodId}`;

    const paymentPayload = {
      transaction_amount: Number(valor),
      token: cardToken,
      description: String(descricao || 'Compra Evidência Calçados - Cartão de Débito').slice(0, 200),
      installments: 1,
      payment_method_id: debitMethod,
      payer: payerObj,
      external_reference: externalReference ? String(externalReference).slice(0, 64) : undefined,
    };

    const keyToUse = idempotencyKey || `card-deb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mpToken}`,
      'X-Idempotency-Key': keyToUse,
    };

    const targetEndpoints = [
      '/mp-api/payments',
      'https://api.mercadopago.com/v1/payments'
    ];

    let lastError = '';

    for (const url of targetEndpoints) {
      try {
        const mpRes = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(paymentPayload),
        }, 10000);

        const data = await mpRes.json().catch(() => ({}));

        if (mpRes.ok && data.id) {
          const isApproved = data.status === 'approved';
          return {
            success: isApproved,
            paymentId: data.id,
            status: data.status,
            statusDetail: data.status_detail,
            message: isApproved ? 'Pagamento no Débito Aprovado com Sucesso!' : `Status: ${data.status_detail || data.status}`,
            provider: this.providerName,
            rawProviderData: data,
          };
        } else {
          const errorDesc = data.message || (data.cause && data.cause[0]?.description) || 'Débito recusado pelo banco emissor.';
          throw new Error(`Mercado Pago: ${errorDesc}`);
        }
      } catch (endpointErr: any) {
        if (endpointErr?.message?.includes('Mercado Pago:')) {
          throw endpointErr;
        }
        lastError = endpointErr?.message || String(endpointErr);
      }
    }

    throw new Error(lastError || 'Não foi possível processar o pagamento em débito.');
  }

  /**
   * 4. Consulta de Status do Pagamento
   */
  async checkPaymentStatus(paymentId: number | string): Promise<PaymentStatusResponse> {
    const mpToken = (
      import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN ||
      import.meta.env.MERCADO_PAGO_ACCESS_TOKEN ||
      ''
    ).replace(/['"]/g, '').trim();

    if (mpToken) {
      const endpoints = [
        `/mp-api/payments/${paymentId}`,
        `https://api.mercadopago.com/v1/payments/${paymentId}`
      ];

      for (const url of endpoints) {
        try {
          const res = await fetchWithTimeout(url, {
            headers: { Authorization: `Bearer ${mpToken}` },
          }, 5000);

          if (res.ok) {
            const data = await res.json();
            if (data.status) {
              return {
                success: true,
                status: data.status,
                provider: this.providerName,
                rawProviderData: data,
              };
            }
          }
        } catch {
          // Tenta o próximo endpoint
        }
      }
    }

    try {
      const all = await pixFirestoreService.fetchAllPixTransacoes();
      const found = all.find(t => String(t.payment_id) === String(paymentId));
      if (found) {
        return {
          success: true,
          status: (found.status as any) || 'pending',
          provider: this.providerName,
          rawProviderData: found,
        };
      }
    } catch {
      // Ignora silenciosamente
    }

    return {
      success: true,
      status: 'pending',
      provider: this.providerName,
    };
  }
}
