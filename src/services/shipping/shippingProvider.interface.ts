/**
 * Interface genérica para provedores de frete.
 * Garante que a aplicação principal não dependa de nenhuma API específica (Melhor Envio, Frenet, Kangu, etc.).
 */

export interface IShippingAuthResponse {
  accessToken: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

export interface IAddressLocation {
  postalCode: string;
  street: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  district?: string;
  cityId?: number;
  stateId?: number;
}

export interface IShippingBoxDimensions {
  height: number; // cm
  width: number;  // cm
  length: number; // cm
  weight: number; // kg
}

export interface IShippingCalculatePayload {
  fromPostalCode?: string; // CEP Origem (Caxias-MA por padrão)
  toPostalCode: string;   // CEP Destino do Cliente
  box?: IShippingBoxDimensions;
  productsCount?: number;
}

export interface IShippingOption {
  id: number | string;
  name: string;             // ex: "SEDEX", "PAC", "Jadlog Package"
  company: {
    id: number | string;
    name: string;           // ex: "Correios", "Jadlog", "Azul Cargo"
    picture?: string;
  };
  price: number;            // Preço em R$
  discount?: number;
  deliveryTime: number;     // Dias úteis
  customDeliveryTime?: number;
  error?: string;
  isCheapest?: boolean;     // Selo "Mais Barato"
  isFastest?: boolean;      // Selo "Mais Rápido"
}

export interface IContactAddressPayload {
  name: string;
  phone: string;
  email: string;
  document?: string;
  company_document?: string;
  address: string;
  number: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
}

export interface ICreateLabelPayload {
  orderId: string;
  serviceId?: number | string;
  from?: Partial<IContactAddressPayload>;
  to: IContactAddressPayload;
  products: Array<{
    name: string;
    quantity: number;
    unitary_value: number;
  }>;
  box?: IShippingBoxDimensions;
}

export interface ILabelResult {
  shipmentId: string;
  trackingCode?: string;
  labelUrl?: string;
  status: string;
}

export interface ITrackingEvent {
  status: string;
  description: string;
  location?: string;
  createdAt: string;
}

export interface IMetricDivergence {
  originalPrice: number;
  difference: number;
  finalPrice: number;
  originalWeight?: number;
  measuredWeight?: number;
  occurredAt: string;
}

export interface ITrackingStatusResult {
  trackingCode: string;
  shipmentId?: string;
  status: 'posted' | 'in_transit' | 'delivered' | 'canceled' | 'pending';
  statusText: string;
  events: ITrackingEvent[];
  metricDivergence?: IMetricDivergence;
  updatedAt: string;
}

export interface IShippingWebhookResult {
  shipmentId?: string;
  trackingCode?: string;
  status?: 'posted' | 'in_transit' | 'delivered' | 'canceled' | 'pending';
  statusText?: string;
  newEvents?: ITrackingEvent[];
  metricDivergence?: IMetricDivergence;
}

export interface IShippingProvider {
  /**
   * Nome do provedor (ex: "melhorenvio", "frenet", "kangu")
   */
  readonly providerName: string;

  /**
   * Retorna o ambiente atual ("sandbox" ou "production")
   */
  readonly environment: "sandbox" | "production";

  /**
   * Obtém os cabeçalhos HTTP de autenticação necessários para requisições na API do provedor
   */
  getAuthHeaders(): Promise<Record<string, string>>;

  /**
   * Verifica se o provedor possui credenciais/tokens válidos para autenticação
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Atualiza ou renova os tokens de autenticação (se aplicável)
   */
  refreshToken(): Promise<IShippingAuthResponse>;

  /**
   * Consulta dados de endereço por CEP utilizando a API do provedor
   */
  fetchAddressByCep(postalCode: string): Promise<IAddressLocation | null>;

  /**
   * Realiza a cotação de frete para o CEP de destino baseado na caixa informada
   */
  calculateShipping(payload: IShippingCalculatePayload): Promise<IShippingOption[]>;

  /**
   * Gera, compra e retorna a etiqueta e código de rastreio para o pedido
   */
  createAndBuyLabel(payload: ICreateLabelPayload): Promise<ILabelResult>;

  /**
   * Cancela uma etiqueta de envio gerada no provedor
   */
  cancelLabel(shipmentId: string, reason?: string): Promise<boolean>;

  /**
   * Consulta o rastreamento em tempo real do pacote no provedor
   */
  trackShipment(trackingCode: string): Promise<ITrackingStatusResult | null>;

  /**
   * Interpreta e normaliza o payload recebido do webhook do provedor
   */
  parseWebhookPayload(payload: any): IShippingWebhookResult | null;
}
