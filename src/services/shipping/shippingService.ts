/**
 * Factory e Ponto Único de Entrada para Serviços de Frete.
 * Permite alternar entre provedores (Melhor Envio, Frenet, etc.) via configuração,
 * garantindo zero acoplamento do restante da aplicação.
 */
import { IShippingProvider } from "./shippingProvider.interface.js";
import { MelhorEnvioAdapter } from "./providers/melhorEnvio/melhorEnvioAdapter.js";

function readActiveProviderEnv(): string {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.ACTIVE_SHIPPING_PROVIDER) return process.env.ACTIVE_SHIPPING_PROVIDER;
    if (process.env.VITE_ACTIVE_SHIPPING_PROVIDER) return process.env.VITE_ACTIVE_SHIPPING_PROVIDER;
  }
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv.VITE_ACTIVE_SHIPPING_PROVIDER) return metaEnv.VITE_ACTIVE_SHIPPING_PROVIDER;
      if (metaEnv.ACTIVE_SHIPPING_PROVIDER) return metaEnv.ACTIVE_SHIPPING_PROVIDER;
    }
  } catch {
    // Ignora em ambientes sem import.meta
  }
  return "melhorenvio";
}

export class ShippingService {
  private static instance: IShippingProvider | null = null;

  /**
   * Obtém a instância ativa do provedor de frete configurado
   */
  public static getProvider(): IShippingProvider {
    if (!this.instance) {
      const activeProviderName = readActiveProviderEnv().toLowerCase();

      switch (activeProviderName) {
        case "melhorenvio":
          this.instance = new MelhorEnvioAdapter();
          break;
        default:
          console.warn(
            `[ShippingService] Provedor '${activeProviderName}' desconhecido. Utilizando 'melhorenvio' como padrão.`
          );
          this.instance = new MelhorEnvioAdapter();
          break;
      }
    }
    return this.instance;
  }

  /**
   * Permite redefinir a instância para testes ou troca em tempo de execução
   */
  public static setProvider(provider: IShippingProvider): void {
    this.instance = provider;
  }

  /**
   * Limpa a instância em memória (força nova leitura de configurações)
   */
  public static resetProvider(): void {
    this.instance = null;
  }
}
