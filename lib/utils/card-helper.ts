export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "unknown";

// Dicionário de domínios de bancos comuns para buscar o favicon oficial
const BANK_DOMAINS: Record<string, string> = {
  nubank: "nu.com.br",
  itau: "itau.com.br",
  bradesco: "bradesco.com.br",
  santander: "santander.com.br",
  "banco do brasil": "bb.com.br",
  bb: "bb.com.br",
  inter: "bancointer.com.br",
  c6: "c6bank.com.br",
  caixa: "caixa.gov.br",
  picpay: "picpay.com",
  mercadopago: "mercadopago.com.br",
  neon: "neon.com.br",
  original: "bancooriginal.com.br",
  safra: "safra.com.br",
  xp: "xpi.com.br",
};

/**
 * Detecta a bandeira do cartão baseada nos números iniciais (BIN).
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const clean = cardNumber.replace(/\D/g, "");
  if (!clean) return "unknown";

  if (/^4/.test(clean)) return "visa";
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return "mastercard";
  if (/^636368|^438935|^504175|^451416|^636297|^5067|^4576|^4011/.test(clean)) return "elo";
  if (/^3[47]/.test(clean)) return "amex";
  if (/^606282/.test(clean)) return "hipercard";

  return "unknown";
}

/**
 * Formata o número do cartão em blocos de 4 dígitos (XXXX XXXX XXXX XXXX)
 */
export function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 16);
  const parts = clean.match(/.{1,4}/g);
  return parts ? parts.join(" ") : clean;
}

/**
 * Formata a validade para o formato MM/AA
 */
export function formatExpiryDate(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 4);
  if (clean.length >= 3) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
}

/**
 * Retorna a URL do logotipo do banco padronizada pelo Google Favicon Service
 */
export function getBankLogoUrl(bankName: string): string {
  if (!bankName) return "";
  const cleanName = bankName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  for (const [key, domain] of Object.entries(BANK_DOMAINS)) {
    if (cleanName.includes(key)) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
  }

  // Fallback slug se o banco não estiver na lista
  const slug = cleanName.replace(/[^a-z0-9]/g, "");
  if (slug) {
    return `https://www.google.com/s2/favicons?domain=${slug}.com.br&sz=128`;
  }

  return "";
}

/**
 * Retorna o rótulo amigável da bandeira
 */
export function getBrandLabel(brand: CardBrand): string {
  switch (brand) {
    case "visa": return "Visa";
    case "mastercard": return "Mastercard";
    case "elo": return "Elo";
    case "amex": return "American Express";
    case "hipercard": return "Hipercard";
    default: return "Desconhecida";
  }
}
