import { IPaymentGateway, PaymentRequest, PaymentResponse, PaymentStatusResponse } from './types';
import { MercadoPagoAdapter } from './adapters/MercadoPagoAdapter';
import { PagSeguroAdapter } from './adapters/PagSeguroAdapter';
import { AsaasAdapter } from './adapters/AsaasAdapter';

export class PaymentProcessor {
  private gateway: IPaymentGateway;

  constructor(gateway?: IPaymentGateway) {
    this.gateway = gateway || this.resolveDefaultGateway();
  }

  private resolveDefaultGateway(): IPaymentGateway {
    const provider = (import.meta.env.VITE_PAYMENT_PROVIDER || 'mercadopago').toLowerCase().trim();
    switch (provider) {
      case 'pagseguro':
        return new PagSeguroAdapter();
      case 'asaas':
        return new AsaasAdapter();
      case 'mercadopago':
      default:
        return new MercadoPagoAdapter();
    }
  }

  /**
   * Permite alterar dinamicamente o gateway de pagamento em tempo de execução
   */
  public setGateway(gateway: IPaymentGateway): void {
    this.gateway = gateway;
    console.log(`[PaymentProcessor] Gateway de Pagamento alterado para: ${gateway.providerName}`);
  }

  /**
   * Retorna o gateway atualmente ativo
   */
  public getActiveGateway(): IPaymentGateway {
    return this.gateway;
  }

  /**
   * Método universal para criar pagamento (PIX, etc.) independente do gateway
   */
  public async criarPagamento(request: PaymentRequest): Promise<PaymentResponse> {
    return this.gateway.createPayment(request);
  }

  /**
   * Método universal para verificar status do pagamento independente do gateway
   */
  public async verificarPagamento(paymentId: number | string): Promise<PaymentStatusResponse> {
    return this.gateway.checkPaymentStatus(paymentId);
  }
}

// Instância singleton pronta para uso no aplicativo
export const paymentProcessor = new PaymentProcessor();
