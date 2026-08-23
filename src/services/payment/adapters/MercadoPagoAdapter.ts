import { IPaymentGateway, PaymentRequest, PaymentResponse, PaymentStatusResponse } from '../types';
import { pixFirestoreService } from '../../pixFirestoreService';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 4000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

export class MercadoPagoAdapter implements IPaymentGateway {
  readonly providerName = 'Mercado Pago';

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { valor, descricao, emailCliente, nomeCliente, cpfCliente, externalReference, forceNew } = request;
    const parcelKey = String(externalReference || descricao).trim().toLowerCase();
    const now = Date.now();

    // 1. Reutilização Instantânea (<50ms) de Pix Ativo no Firestore (se ainda for válido)
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

    // 2. Tenta o Backend Node dedicado se VITE_BACKEND_URL estiver configurado
    const dedicatedBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    if (dedicatedBackend) {
      try {
        const endpoint = `${dedicatedBackend}/gerar-pix-parcela`;
        const res = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valor,
            descricao,
            emailCliente,
            nomeCliente,
            cpfCliente,
            externalReference,
            forceNew,
          }),
        }, 3000);

        const responseText = await res.text();
        if (!responseText.trim().startsWith('<') && res.ok) {
          const data = JSON.parse(responseText);
          if (data.success && data.qr_code) {
            return {
              success: true,
              paymentId: data.payment_id || data.paymentId,
              qrCode: data.qr_code || data.qrCode,
              qrCodeBase64: data.qr_code_base64 || data.qrCodeBase64 || null,
              expiresAt: data.expires_at || data.expiresAt,
              reused: data.reused,
              provider: this.providerName,
            };
          }
          if (data.message) lastError = data.message;
        }
      } catch (backendErr: any) {
        console.warn('[MercadoPagoAdapter] Servidor Node dedicado indisponível:', backendErr?.message || backendErr);
      }
    }

    // 3. Chamada de Altíssima Velocidade à API Oficial do Mercado Pago via Proxy
    const mpToken = (import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || import.meta.env.MERCADO_PAGO_ACCESS_TOKEN || '').replace(/['"]/g, '').trim();

    if (!mpToken) {
      throw new Error(lastError || 'Token de acesso do Mercado Pago não configurado no .env (VITE_MERCADO_PAGO_ACCESS_TOKEN)');
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

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mpToken}`,
      'X-Idempotency-Key': `pix-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };

    // No desenvolvimento (Vite Dev Proxy), `/mp-api/payments` encaminha para `https://api.mercadopago.com/v1/payments` sem CORS!
    const targetEndpoints = import.meta.env.DEV
      ? ['/mp-api/payments', `https://corsproxy.io/?${encodeURIComponent('https://api.mercadopago.com/v1/payments')}`]
      : [
          '/mp-api/payments',
          `https://corsproxy.io/?${encodeURIComponent('https://api.mercadopago.com/v1/payments')}`,
          'https://api.mercadopago.com/v1/payments',
        ];

    for (const url of targetEndpoints) {
      try {
        const mpRes = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(paymentPayload),
        }, 4000);

        if (mpRes.ok) {
          const data = await mpRes.json();
          const point = data.point_of_interaction?.transaction_data;
          if (point?.qr_code) {
            return {
              success: true,
              paymentId: data.id,
              qrCode: point.qr_code,
              qrCodeBase64: point.qr_code_base64 || null,
              expiresAt: expiresAtMs,
              reused: false,
              provider: this.providerName,
            };
          }
        } else {
          const data = await mpRes.json().catch(() => ({}));
          if (data.message || (data.cause && data.cause[0])) {
            const errorDesc = data.message || data.cause[0].description;
            throw new Error(`Mercado Pago API: ${errorDesc}`);
          }
        }
      } catch (endpointErr: any) {
        if (endpointErr?.message?.includes('Mercado Pago API:')) {
          throw endpointErr; // Exibe o erro real retornado pela API do Mercado Pago sem esperar
        }
        console.warn(`[MercadoPagoAdapter] Tentativa em '${url}' falhou ou estourou tempo limite:`, endpointErr?.message || endpointErr);
        lastError = endpointErr?.message || String(endpointErr);
      }
    }

    throw new Error(lastError || 'Não foi possível conectar à API do Mercado Pago. Verifique suas credenciais no .env');
  }

  async checkPaymentStatus(paymentId: number | string): Promise<PaymentStatusResponse> {
    const mpToken = (import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || import.meta.env.MERCADO_PAGO_ACCESS_TOKEN || '').replace(/['"]/g, '').trim();

    if (mpToken) {
      const endpoints = import.meta.env.DEV
        ? [`/mp-api/payments/${paymentId}`, `https://corsproxy.io/?${encodeURIComponent(`https://api.mercadopago.com/v1/payments/${paymentId}`)}`]
        : [
            `/mp-api/payments/${paymentId}`,
            `https://corsproxy.io/?${encodeURIComponent(`https://api.mercadopago.com/v1/payments/${paymentId}`)}`,
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
          ];

      for (const url of endpoints) {
        try {
          const res = await fetchWithTimeout(url, {
            headers: { Authorization: `Bearer ${mpToken}` },
          }, 2500);

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
          // Tenta o próximo endpoint rapidamente
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
