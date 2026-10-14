/**
 * Lista de marcas renomadas de calçados e confecções para identificação e inferência automática
 */
export const KNOWN_FOOTWEAR_BRANDS = [
  'Nike', 'Adidas', 'Moleca', 'Beira Rio', 'Dakota', 'Via Marte', 'Olympikus', 
  'Havaianas', 'Vizzano', 'Modare', 'Pampili', 'Schutz', 'Arezzo', 'Santa Lolla', 
  'Usaflex', 'Anacapri', 'Zaxy', 'Rider', 'Ipanema', 'Cartago', 'Mizuno', 'Puma', 
  'Under Armour', 'Asics', 'Fila', 'Pegada', 'Democrata', 'Ferracini', 'Crocs',
  'Marvel', 'Disney', 'Grendene', 'Grendene Kids', 'Mormaii', 'Kidy', 'Bibi', 'Kolosh',
  'Campesi', 'Actvitta', 'BR Sport', 'Cravo & Canela', 'Bottero', 'Ramarim', 'Comfortflex',
  'Grendha', 'Azaleia', 'Converse', 'All Star', 'Vans', 'New Balance',
  'Penalty', 'Umbro', 'Topper', 'Rainha', 'Macboot', 'Bull Terrier', 'Coca-Cola'
];

const GENERIC_EXCLUSIONS = new Set([
  'OUTRAS MARCAS',
  'OUTRAS',
  'GERAL',
  'DIVERSOS',
  'SEM MARCA',
  'NAO INFORMADO',
  'NÃO INFORMADO',
  'INDEFINIDO'
]);

/**
 * Extrai ou infere a marca real do produto a partir de campos explícitos (brand, marca, fabricante)
 * ou por reconhecimento inteligente de marcas oficiais no nome/descrição.
 */
export function resolveProductBrand(product: any): string {
  if (!product) return '';

  const explicit = String(product.brand || product.marca || product.fabricante || '').trim();
  if (explicit && !GENERIC_EXCLUSIONS.has(explicit.toUpperCase())) {
    return explicit;
  }

  const name = String(product.name || product.nome || product.descricao || product.descricao_completa || '');
  if (name) {
    const found = KNOWN_FOOTWEAR_BRANDS.find(b => new RegExp(`\\b${b}\\b`, 'i').test(name));
    if (found) return found;
  }

  return explicit || '';
}
