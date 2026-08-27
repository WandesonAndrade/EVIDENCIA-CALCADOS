export interface PaymentRequest {
  valor: number;
  descricao: string;
  emailCliente: string;
  nomeCliente?: string;
  cpfCliente?: string;
  externalReference?: string;
  forceNew?: boolean;
  idempotencyKey?: string;
}

export interface CardTokenParams {
  cardNumber: string;
  cardholderName: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  securityCode: string;
  identificationType?: string;
  identificationNumber?: string;
}

export interface CreditCardPaymentRequest extends PaymentRequest {
  cardToken: string;
  installments: number;
  paymentMethodId: string; // ex: 'visa', 'master'
  issuerId?: string;
}

export interface DebitCardPaymentRequest extends PaymentRequest {
  cardToken: string;
  paymentMethodId: string; // ex: 'debvisa', 'debmaster'
  issuerId?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: number | string;
  status?: 'pending' | 'approved' | 'in_process' | 'rejected' | 'cancelled' | 'refunded';
  statusDetail?: string;
  qrCode?: string;
  qrCodeBase64?: string | null;
  expiresAt?: number;
  reused?: boolean;
  message?: string;
  provider?: string;
  rawProviderData?: any;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'pending' | 'approved' | 'in_process' | 'rejected' | 'cancelled' | 'refunded';
  provider?: string;
  rawProviderData?: any;
  message?: string;
}

export interface IPaymentGateway {
  readonly providerName: string;
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  createCreditCardPayment?(request: CreditCardPaymentRequest): Promise<PaymentResponse>;
  createDebitCardPayment?(request: DebitCardPaymentRequest): Promise<PaymentResponse>;
  checkPaymentStatus(paymentId: number | string): Promise<PaymentStatusResponse>;
}
