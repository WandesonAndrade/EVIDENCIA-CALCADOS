export interface PaymentRequest {
  valor: number;
  descricao: string;
  emailCliente: string;
  nomeCliente?: string;
  cpfCliente?: string;
  externalReference?: string;
  forceNew?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: number | string;
  qrCode: string;
  qrCodeBase64: string | null;
  expiresAt: number;
  reused?: boolean;
  message?: string;
  provider?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  provider?: string;
  rawProviderData?: any;
}

export interface IPaymentGateway {
  readonly providerName: string;
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  checkPaymentStatus(paymentId: number | string): Promise<PaymentStatusResponse>;
}
