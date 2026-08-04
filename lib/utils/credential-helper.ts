// Remove acentos e converte para minúsculas para buscas flexíveis
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Dicionário de marcas comuns para auto-preenchimento rápido
const POPULAR_DOMAINS: Record<string, string> = {
  itau: "itau.com.br",
  "banco do brasil": "bb.com.br",
  bradesco: "bradesco.com.br",
  santander: "santander.com.br",
  nubank: "nubank.com.br",
  inter: "bancointer.com.br",
  c6: "c6bank.com.br",
  caixa: "caixa.gov.br",
  globo: "globo.com",
  "mercado livre": "mercadolivre.com.br",
  amazon: "amazon.com.br",
  netflix: "netflix.com",
  spotify: "spotify.com",
  google: "google.com",
  apple: "apple.com",
  microsoft: "microsoft.com",
  instagram: "instagram.com",
  facebook: "facebook.com",
  twitter: "twitter.com",
  x: "x.com",
  discord: "discord.com",
  github: "github.com",
};

/**
 * Tenta adivinhar o site com base no título digitado.
 */
export function guessWebsiteFromTitle(title: string): string {
  const clean = normalizeText(title);
  
  for (const [key, domain] of Object.entries(POPULAR_DOMAINS)) {
    if (clean.includes(key)) {
      return `https://${domain}`;
    }
  }

  if (clean.length > 0) {
    const slug = clean.replace(/[^a-z0-9]/g, "");
    if (slug) {
      return `https://${slug}.com.br`;
    }
  }

  return "";
}

/**
 * Retorna a URL do favicon padronizada pelo serviço do Google.
 */
export function getFaviconUrl(websiteUrl: string): string {
  if (!websiteUrl) return "";
  try {
    let domain = websiteUrl.trim();
    if (!domain.startsWith("http")) {
      domain = `https://${domain}`;
    }
    const urlObj = new URL(domain);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
  } catch (e) {
    return "";
  }
}
