"use client";

/**
 * Mantido por compatibilidade com imports antigos.
 *
 * A configuração nativa da StatusBar vive exclusivamente em Providers,
 * que também reaplica o contrato edge-to-edge quando o app volta ao
 * primeiro plano.
 */
export default function ClientInit() {
  return null;
}
