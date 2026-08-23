import { IPaymentGateway, PaymentRequest, PaymentResponse, PaymentStatusResponse } from '../types';

export class PagSeguroAdapter implements IPaymentGateway {
  readonly providerName = 'PagSeguro';

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { valor, descricao, externalReference } = request;

    // Estrutura preparada para chamada à API do PagSeguro (v4/orders ou v3/pix)
    const pagseguroToken = (import.meta.env.VITE_PAGSEGURO_TOKEN || '').trim();

    if (!pagseguroToken) {
      console.warn('[PagSeguroAdapter] VITE_PAGSEGURO_TOKEN não configurado. Ativando emissão padrão...');
    }

    const mockPaymentId = `PAGSEG-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const expiresAt = Date.now() + 30 * 60_000;

    return {
      success: true,
      paymentId: mockPaymentId,
      qrCode: `00020126580014br.gov.bcb.pix0136pagseguro-${mockPaymentId}520400005303986540${valor.toFixed(2)}5802BR5918EVIDENCIA CALCADOS6009IMPERATRIZ62070503***6304ABCD`,
      qrCodeBase64: null,
      expiresAt,
      reused: false,
      provider: this.providerName,
      message: 'Pagamento gerado via PagSeguro Adapter (Template para Integração Futura)',
    };
  }

  async checkPaymentStatus(paymentId: number | string): Promise<PaymentStatusResponse> {
    return {
      success: true,
      status: 'pending',
      provider: this.providerName,
    };
  }
}
