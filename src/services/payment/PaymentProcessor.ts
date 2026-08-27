import {
  IPaymentGateway,
  PaymentRequest,
  CreditCardPaymentRequest,
  DebitCardPaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from './types';
import { MercadoPagoAdapter } from './adapters/MercadoPagoAdapter';
import { featureFlags, isNewBankActiveForUser } from '../../featureFlags';

export class PaymentProcessor {
  private gateway: IPaymentGateway;

  constructor(gateway?: IPaymentGateway) {
    this.gateway = gateway || this.resolveDefaultGateway();
  }

  private resolveDefaultGateway(userId?: string): IPaymentGateway {
    // Se a feature flag de migração de banco estiver ativa para o usuário
    if (isNewBankActiveForUser(userId)) {
      console.log('[PaymentProcessor] Usuário incluído na amostragem do Novo Banco.');
      // Futuro adapter do Novo Banco será retornado aqui quando ativado
    }

    const provider = (import.meta.env.VITE_PAYMENT_PROVIDER || 'mercadopago').toLowerCase().trim();
    switch (provider) {
      case 'mercadopago':
      default:
        return new MercadoPagoAdapter();
    }
  }

  public setGateway(gateway: IPaymentGateway): void {
    this.gateway = gateway;
    console.log(`[PaymentProcessor] Gateway de Pagamento alterado para: ${gateway.providerName}`);
  }

  public getActiveGateway(): IPaymentGateway {
    return this.gateway;
  }

  /**
   * Método universal para criar pagamento PIX
   */
  public async criarPagamento(request: PaymentRequest): Promise<PaymentResponse> {
    return this.gateway.createPayment(request);
  }

  /**
   * Método para processar pagamento com Cartão de Crédito (Tokenizado no client-side)
   */
  public async processarCartaoCredito(request: CreditCardPaymentRequest): Promise<PaymentResponse> {
    if (typeof this.gateway.createCreditCardPayment === 'function') {
      return this.gateway.createCreditCardPayment(request);
    }
    throw new Error(`O provedor de pagamento '${this.gateway.providerName}' não suporta cartão de crédito.`);
  }

  /**
   * Método para processar pagamento com Cartão de Débito (Tokenizado no client-side)
   */
  public async processarCartaoDebito(request: DebitCardPaymentRequest): Promise<PaymentResponse> {
    if (typeof this.gateway.createDebitCardPayment === 'function') {
      return this.gateway.createDebitCardPayment(request);
    }
    throw new Error(`O provedor de pagamento '${this.gateway.providerName}' não suporta cartão de débito.`);
  }

  /**
   * Método universal para verificar status do pagamento
   */
  public async verificarPagamento(paymentId: number | string): Promise<PaymentStatusResponse> {
    return this.gateway.checkPaymentStatus(paymentId);
  }
}

export const paymentProcessor = new PaymentProcessor();
