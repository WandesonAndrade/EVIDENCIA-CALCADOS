import { IPaymentGateway, PaymentRequest, PaymentResponse, PaymentStatusResponse } from '../types';

export class AsaasAdapter implements IPaymentGateway {
  readonly providerName = 'Asaas';

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { valor } = request;

    const mockPaymentId = `ASAAS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const expiresAt = Date.now() + 30 * 60_000;

    return {
      success: true,
      paymentId: mockPaymentId,
      qrCode: `00020126580014br.gov.bcb.pix0136asaas-${mockPaymentId}520400005303986540${valor.toFixed(2)}5802BR5918EVIDENCIA CALCADOS6009IMPERATRIZ62070503***63041234`,
      qrCodeBase64: null,
      expiresAt,
      reused: false,
      provider: this.providerName,
      message: 'Pagamento gerado via Asaas Adapter (Template para Integração Futura)',
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
