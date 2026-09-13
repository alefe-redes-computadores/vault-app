export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "unknown";
export type BankInstitution = { code: string; name: string; shortName: string; domain?: string; aliases: string[] };

const BANK_ROWS: Array<[string, string, string, string, string]> = [
  ["001", "Banco do Brasil", "BB", "bb.com.br", "bb|banco brasil|banco do brasil"],
  ["003", "Banco da Amazônia", "BASA", "bancoamazonia.com.br", "basa|banco amazonia|banco da amazonia"],
  ["004", "Banco do Nordeste", "BNB", "bnb.gov.br", "bnb|banco nordeste|banco do nordeste"],
  ["021", "Banestes", "Banestes", "banestes.com.br", "banestes"],
  ["033", "Santander", "Santander", "santander.com.br", "santander|banco santander"],
  ["041", "Banrisul", "Banrisul", "banrisul.com.br", "banrisul"],
  ["047", "Banese", "Banese", "banese.com.br", "banese"],
  ["070", "Banco de Brasília", "BRB", "brb.com.br", "brb|banco brb|banco de brasilia|banco brasilia"],
  ["077", "Banco Inter", "Inter", "inter.co", "inter|banco inter"],
  ["104", "Caixa Econômica Federal", "Caixa", "caixa.gov.br", "caixa|cef|caixa economica"],
  ["208", "BTG Pactual", "BTG", "btgpactual.com", "btg|btg pactual"],
  ["212", "Banco Original", "Original", "original.com.br", "original|banco original"],
  ["237", "Bradesco", "Bradesco", "bradesco.com.br", "bradesco|banco bradesco"],
  ["260", "Nubank", "Nubank", "nubank.com.br", "nubank|nu pagamentos|nu"],
  ["290", "PagBank", "PagBank", "pagbank.com.br", "pagbank|pagseguro"],
  ["336", "C6 Bank", "C6", "c6bank.com.br", "c6|c6 bank"],
  ["341", "Itaú Unibanco", "Itaú", "itau.com.br", "itau|itau unibanco"],
  ["422", "Banco Safra", "Safra", "safra.com.br", "safra|banco safra"],
  ["623", "Banco PAN", "PAN", "bancopan.com.br", "pan|banco pan"],
  ["748", "Sicredi", "Sicredi", "sicredi.com.br", "sicredi"],
  ["756", "Sicoob", "Sicoob", "sicoob.com.br", "sicoob"],
];
const BANKS: BankInstitution[] = BANK_ROWS.map(([code, name, shortName, domain, aliases]) => ({ code, name, shortName, domain, aliases: aliases.split("|") }));

export const BANK_INSTITUTIONS = BANKS;
export function normalizeBankName(value: string): string { return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(banco|bco)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim(); }
export function resolveBankInstitution(value: string): BankInstitution | null { const normalized = normalizeBankName(value); if (!normalized) return null; return BANKS.find((bank) => bank.code === normalized || [bank.name, bank.shortName, ...bank.aliases].some((name) => normalizeBankName(name) === normalized)) ?? null; }
export function getBankLogoUrl(bankName: string): string { const bank = resolveBankInstitution(bankName); return bank?.domain ? `https://www.google.com/s2/favicons?domain=${bank.domain}&sz=128` : ""; }
export function getBankDisplayName(value: string): string { return resolveBankInstitution(value)?.shortName ?? value.trim(); }
export function getBankCode(value: string): string | null { return resolveBankInstitution(value)?.code ?? null; }
export function formatAgency(value: string): string { const clean = value.replace(/\D/g, "").slice(0, 5); return clean.length <= 4 ? clean : `${clean.slice(0, 4)}-${clean.slice(4)}`; }
export function formatAccount(value: string): string { const clean = value.replace(/[^0-9xX]/g, "").toUpperCase().slice(0, 13); return clean.length <= 1 ? clean : `${clean.slice(0, -1)}-${clean.slice(-1)}`; }
export function maskAccount(value: string): string { const clean = value.replace(/\s/g, ""); if (clean.length < 4) return "••••"; return `${clean.slice(0, 2)}${"•".repeat(Math.max(2, clean.length - 4))}${clean.slice(-2)}`; }

export function detectCardBrand(cardNumber: string): CardBrand { const clean = cardNumber.replace(/\D/g, ""); if (/^3[47]/.test(clean)) return "amex"; if (/^(606282|3841)/.test(clean)) return "hipercard"; if (/^(4011|4312|4389|4514|4576|5041|5067|509|6277|6362|6363|650|6516|6550)/.test(clean)) return "elo"; if (/^(5[1-5]|2[2-7])/.test(clean)) return "mastercard"; if (/^4/.test(clean)) return "visa"; return "unknown"; }
export function getCardNumberLength(brand: CardBrand): number { return brand === "amex" ? 15 : 16; }
export function getCvvLength(brand: CardBrand): number { return brand === "amex" ? 4 : 3; }
export function formatCardNumber(value: string): string { const clean = value.replace(/\D/g, ""); const brand = detectCardBrand(clean); const limited = clean.slice(0, getCardNumberLength(brand)); if (brand === "amex") return [limited.slice(0, 4), limited.slice(4, 10), limited.slice(10, 15)].filter(Boolean).join(" "); return limited.match(/.{1,4}/g)?.join(" ") ?? limited; }
export function maskCardNumber(value: string): string { const clean = value.replace(/\D/g, ""); if (clean.length < 8) return "•••• •••• •••• ••••"; return `${clean.slice(0, 4)} ${clean.slice(4, 8)} •••• ${clean.slice(-4)}`; }
export function isValidLuhn(value: string): boolean { const clean = value.replace(/\D/g, ""); if (clean.length < 13) return false; let sum = 0; let alternate = false; for (let index = clean.length - 1; index >= 0; index -= 1) { let digit = Number(clean[index]); if (alternate) { digit *= 2; if (digit > 9) digit -= 9; } sum += digit; alternate = !alternate; } return sum % 10 === 0; }
export function formatExpiryDate(value: string): string { const clean = value.replace(/\D/g, "").slice(0, 4); return clean.length >= 3 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean; }
export function isValidExpiryDate(value: string): boolean { const match = value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/); if (!match) return false; const now = new Date(); const month = Number(match[1]); const year = 2000 + Number(match[2]); return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1); }
export function formatCvv(value: string, brand: CardBrand): string { return value.replace(/\D/g, "").slice(0, getCvvLength(brand)); }
export function getBrandLabel(brand: CardBrand): string { return ({ visa: "Visa", mastercard: "Mastercard", elo: "Elo", amex: "American Express", hipercard: "Hipercard", unknown: "Bandeira não identificada" })[brand]; }
