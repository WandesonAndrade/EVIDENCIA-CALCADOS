import { paymentProcessor, PaymentRequest } from './payment';

export interface GeneratePixParams extends PaymentRequest {}

export interface GeneratePixResponse {
  success: boolean;
  payment_id: number | string;
  qr_code: string;
  qr_code_base64: string | null;
  expires_at: number;
  reused?: boolean;
  message?: string;
}

/**
 * Serviço Facade / Wrapper de Compatibilidade que canaliza todas as chamadas
 * para o novo orquestrador Strategy `paymentProcessor`.
 */
export const pixPaymentService = {
  async generatePix(params: GeneratePixParams): Promise<GeneratePixResponse> {
    const res = await paymentProcessor.criarPagamento(params);
    return {
      success: res.success,
      payment_id: res.paymentId,
      qr_code: res.qrCode,
      qr_code_base64: res.qrCodeBase64,
      expires_at: res.expiresAt,
      reused: res.reused,
      message: res.message,
    };
  },

  async checkPixStatus(paymentId: number | string): Promise<{ success: boolean; status: string }> {
    const res = await paymentProcessor.verificarPagamento(paymentId);
    return {
      success: res.success,
      status: res.status,
    };
  }
};
