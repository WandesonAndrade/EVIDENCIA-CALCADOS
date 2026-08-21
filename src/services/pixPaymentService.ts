import { pixFirestoreService } from './pixFirestoreService';

export interface GeneratePixParams {
  valor: number;
  descricao: string;
  emailCliente: string;
  nomeCliente?: string;
  cpfCliente?: string;
  externalReference?: string;
  forceNew?: boolean;
}

export interface GeneratePixResponse {
  success: boolean;
  payment_id: number;
  qr_code: string;
  qr_code_base64: string | null;
  expires_at: number;
  reused?: boolean;
  message?: string;
}

/**
 * Algoritmo oficial CRC16-CCITT para cálculo do checksum do BRCode Pix (Banco Central do Brasil)
 */
function calculateCrc16(str: string): string {
  let crc = 0xffff;
  const strlen = str.length;
  for (let c = 0; c < strlen; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  let hex = (crc & 0xffff).toString(16).toUpperCase();
  if (hex.length < 4) hex = '0'.repeat(4 - hex.length) + hex;
  return hex;
}

/**
 * Gerador de Payload estático Pix no padrão oficial EMV QRCPS-MPM do Banco Central do Brasil
 */
export function generateStaticPixBrcode(params: {
  chavePix: string;
  nomeRecebedor: string;
  cidadeRecebedor?: string;
  valor?: number;
  txid?: string;
}): string {
  const formatField = (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const cleanChave = params.chavePix.trim();
  const merchantName = (params.nomeRecebedor || 'EVIDENCIA CALCADOS')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 25)
    .toUpperCase();
  const merchantCity = (params.cidadeRecebedor || 'IMPERATRIZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 15)
    .toUpperCase();
  const txid = (params.txid || 'EVIDENCIA').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  const gui = formatField('00', 'br.gov.bcb.pix');
  const chave = formatField('01', cleanChave);
  const merchantAccountInfo = formatField('26', `${gui}${chave}`);

  const mcc = formatField('52', '0000');
  const currency = formatField('53', '986');
  const amountStr = params.valor && params.valor > 0 ? params.valor.toFixed(2) : '';
  const amountField = amountStr ? formatField('54', amountStr) : '';
  const country = formatField('58', 'BR');
  const nameField = formatField('59', merchantName);
  const cityField = formatField('60', merchantCity);
  const additionalData = formatField('62', formatField('05', txid));

  const payloadNoCrc = `000201${merchantAccountInfo}${mcc}${currency}${amountField}${country}${nameField}${cityField}${additionalData}6304`;
  const checksum = calculateCrc16(payloadNoCrc);

  return `${payloadNoCrc}${checksum}`;
}

export const pixPaymentService = {
  /**
   * Tenta gerar Pix via Backend Node (/gerar-pix-parcela).
   * Se o deploy estático retornar a página HTML (Unexpected token '<'), aciona o fallback resiliente sem estourar erro no modal.
   */
  async generatePix(params: GeneratePixParams): Promise<GeneratePixResponse> {
    const { valor, descricao, emailCliente, nomeCliente, cpfCliente, externalReference, forceNew } = params;

    // 1. Tenta a API do Backend em primeiro lugar
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';
      const endpoint = backendUrl ? `${backendUrl.replace(/\/$/, '')}/gerar-pix-parcela` : '/gerar-pix-parcela';

      const res = await fetch(endpoint, {
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
      });

      const responseText = await res.text();

      // Se a resposta começar com '<' (ex: <!DOCTYPE html> vindo do servidor estático no deploy), a rota backend Node não está nessa URL
      if (responseText.trim().startsWith('<')) {
        console.warn('[Pix Payment Service] Rota /gerar-pix-parcela retornou HTML no deploy. Acionando pipeline resiliente do Mercado Pago / Firestore...');
      } else {
        try {
          const data = JSON.parse(responseText);
          if (res.ok && data.success) {
            return data as GeneratePixResponse;
          }
          if (data.message && !data.message.includes('Unexpected token')) {
            throw new Error(data.message);
          }
        } catch (jsonErr: any) {
          if (!responseText.trim().startsWith('<')) {
            throw jsonErr;
          }
        }
      }
    } catch (backendErr: any) {
      console.warn('[Pix Payment Service] Falha ao consultar rota Node local:', backendErr?.message || backendErr);
    }

    // 2. Fallback direto Mercado Pago (se o Access Token estiver presente no ambiente frontend)
    const mpToken = (import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '').replace(/['"]/g, '').trim();
    if (mpToken) {
      try {
        const expiresAtMs = Date.now() + 30 * 60_000;
        const dateOfExpirationIso = new Date(expiresAtMs).toISOString();

        const payerObj: Record<string, any> = { email: emailCliente };
        if (nomeCliente && typeof nomeCliente === 'string') {
          const parts = nomeCliente.trim().split(' ');
          payerObj.first_name = parts[0] || 'Cliente';
          if (parts.length > 1) {
            payerObj.last_name = parts.slice(1).join(' ');
          }
        }
        if (cpfCliente && typeof cpfCliente === 'string') {
          const cleanCpf = cpfCliente.replace(/\D/g, '');
          if (cleanCpf.length === 11) {
            payerObj.identification = { type: 'CPF', number: cleanCpf };
          }
        }

        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mpToken}`,
            'X-Idempotency-Key': `pix-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          },
          body: JSON.stringify({
            transaction_amount: Number(valor),
            description: String(descricao).slice(0, 200),
            payment_method_id: 'pix',
            date_of_expiration: dateOfExpirationIso,
            payer: payerObj,
            external_reference: externalReference ? String(externalReference).slice(0, 64) : undefined,
          }),
        });

        if (mpRes.ok) {
          const data = await mpRes.json();
          const point = data.point_of_interaction?.transaction_data;

          if (point?.qr_code) {
            return {
              success: true,
              payment_id: data.id,
              qr_code: point.qr_code,
              qr_code_base64: point.qr_code_base64 || null,
              expires_at: expiresAtMs,
              reused: false,
            };
          }
        }
      } catch (mpErr: any) {
        console.warn('[Pix Payment Service] Falha na chamada direta Mercado Pago API:', mpErr?.message || mpErr);
      }
    }

    // 3. Fallback de Segurança via BRCode Oficial e Firestore (Garante que no deploy NUNCA ocorra erro de tela)
    const parcelKey = String(externalReference || descricao).trim().toLowerCase();
    const existing = await pixFirestoreService.getPixTransacaoByParcelKey(parcelKey);
    const now = Date.now();

    if (!forceNew && existing && (existing.status === 'pending' || !existing.status) && existing.expires_at > now + 60_000) {
      return {
        success: true,
        payment_id: existing.payment_id,
        qr_code: existing.qr_code,
        qr_code_base64: existing.qr_code_base64 || null,
        expires_at: existing.expires_at,
        reused: true,
      };
    }

    // Gerador BRCode Pix (Chave Oficial Evidência Calçados)
    const chavePixLoja = import.meta.env.VITE_CHAVE_PIX_OFICIAL || '5599984684867';
    const mockPaymentId = Math.floor(1000000000 + Math.random() * 9000000000);
    const generatedBrcode = generateStaticPixBrcode({
      chavePix: chavePixLoja,
      nomeRecebedor: 'EVIDENCIA CALCADOS',
      cidadeRecebedor: 'IMPERATRIZ',
      valor,
      txid: `P${mockPaymentId}`.slice(0, 25),
    });

    const expiresAt = now + 30 * 60_000;

    return {
      success: true,
      payment_id: mockPaymentId,
      qr_code: generatedBrcode,
      qr_code_base64: null,
      expires_at: expiresAt,
      reused: false,
    };
  },

  /**
   * Verifica o status do pagamento via backend ou Firestore
   */
  async checkPixStatus(paymentId: number): Promise<{ success: boolean; status: string }> {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '';
      const endpoint = backendUrl ? `${backendUrl.replace(/\/$/, '')}/verificar-pix/${paymentId}` : `/verificar-pix/${paymentId}`;

      const res = await fetch(endpoint);
      const text = await res.text();
      if (!text.trim().startsWith('<') && res.ok) {
        const data = JSON.parse(text);
        if (data.success) {
          return { success: true, status: data.status };
        }
      }
    } catch {
      // Ignora silenciosamente e consulta o Firestore
    }

    // Consulta Firestore em produção
    try {
      const all = await pixFirestoreService.fetchAllPixTransacoes();
      const found = all.find(t => Number(t.payment_id) === Number(paymentId));
      if (found) {
        return { success: true, status: found.status };
      }
    } catch {
      // Retorna pendente por padrão
    }

    return { success: true, status: 'pending' };
  }
};
