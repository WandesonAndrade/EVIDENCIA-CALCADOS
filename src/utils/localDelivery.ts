/**
 * Utilitários para Entrega Própria Local (Caxias - MA Urbana)
 * Define regras de elegibilidade, formatação de romaneio e numeração de etiqueta.
 */

export interface IUrbanCaxiasCheckParams {
  cep?: string;
  city?: string;
  uf?: string;
  bairro?: string;
  address?: string;
  deliveryType?: string;
}

/**
 * Prefixos de CEP urbanos de Caxias - MA.
 * A malha urbana do município de Caxias/MA compreende os códigos postais de 65600-000 a 65609-999.
 */
export const CAXIAS_URBAN_CEP_PREFIXES = [
  '65600',
  '65601',
  '65602',
  '65603',
  '65604',
  '65605',
  '65606',
  '65607',
  '65608',
  '65609',
];

/**
 * Termos que indicam área rural/distrito distante (fora da rota urbana da moto da loja)
 */
const RURAL_KEYWORDS = [
  'povoado',
  'pov.',
  'zona rural',
  'assentamento',
  'fazenda',
  'sitio',
  'sítio',
  'chacara',
  'chácara',
  'distrito',
  'gleba',
];

/**
 * Valida se um destino pertence à área urbana de Caxias - MA elegível para entrega própria da loja.
 */
export function isUrbanCaxias(params: IUrbanCaxiasCheckParams): boolean {
  const cleanCep = (params.cep || '').replace(/\D/g, '');
  const cleanCity = (params.city || '').trim().toLowerCase();
  const cleanUf = (params.uf || '').trim().toUpperCase();
  const rawText = `${params.address || ''} ${params.bairro || ''} ${params.deliveryType || ''}`.toLowerCase();

  // Se explicitamente possui marcadores de zona rural, não é urbana
  if (RURAL_KEYWORDS.some((kw) => rawText.includes(kw))) {
    return false;
  }

  // 1. Verificação por CEP (se informado com ao menos 5 dígitos)
  if (cleanCep.length >= 5) {
    const prefix5 = cleanCep.slice(0, 5);
    if (CAXIAS_URBAN_CEP_PREFIXES.includes(prefix5)) {
      return true;
    }
  }

  // 2. Verificação por Cidade e UF
  const isCaxiasCity = cleanCity === 'caxias' || cleanCity.includes('caxias');
  const isMaranhao = cleanUf === 'MA' || cleanUf === '' || cleanUf.includes('MARANH');

  if (isCaxiasCity && isMaranhao) {
    return true;
  }

  // 3. Verificação por texto do tipo de entrega
  if (params.deliveryType) {
    const dt = params.deliveryType.toLowerCase();
    if (dt.includes('caxias') || dt.includes('própria') || dt.includes('propria')) {
      return true;
    }
  }

  return false;
}

/**
 * Gera um número de romaneio sequencial legível para a etiqueta própria da loja
 * Formato: EP-AAAAMMDD-XXXXX
 */
export function generateLocalLabelNumber(orderNumberOrId: string | number): string {
  const digits = String(orderNumberOrId).replace(/\D/g, '');
  const suffix = digits.length >= 4 ? digits.slice(-5) : String(orderNumberOrId).slice(-5).toUpperCase();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `EP-${today}-${suffix}`;
}

/**
 * Formata os dados de pagamento para exibição destacada ao motoboy
 */
export function getLocalDeliveryPaymentBadge(order: {
  paymentStatus?: string;
  paymentMethod?: string;
  total: number;
}): {
  type: 'PAID' | 'COLLECT';
  label: string;
  amountToCollect?: number;
  highlightClass: string;
} {
  const isPaid = order.paymentStatus === 'Confirmado';

  if (isPaid) {
    return {
      type: 'PAID',
      label: 'JÁ PAGO ONLINE',
      highlightClass: 'bg-emerald-600 text-white',
    };
  }

  return {
    type: 'COLLECT',
    label: `COBRAR NA ENTREGA: ${order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    amountToCollect: order.total,
    highlightClass: 'bg-amber-500 text-slate-950 font-black',
  };
}

