import CryptoJS from 'crypto-js';

// No futuro, isso pode ser atrelado ao PIN do usuário para segurança máxima
const SECRET_KEY = process.env.NEXT_PUBLIC_VAULT_SECRET_KEY || 'vault_offline_first_super_secret_key';

export type VaultCryptoPosture = 'public_client_key' | 'legacy_shared_fallback';

/**
 * Descreve honestamente a configuração; não afirma zero-knowledge.
 * NEXT_PUBLIC é incorporada ao cliente e não é um segredo de servidor.
 */
export function getVaultCryptoPosture(): VaultCryptoPosture {
  return process.env.NEXT_PUBLIC_VAULT_SECRET_KEY
    ? 'public_client_key'
    : 'legacy_shared_fallback';
}

export function encryptPassword(password: string): string {
  if (!password) return '';
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
}

export function decryptPassword(encryptedPassword: string): string {
  if (!encryptedPassword) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar senha:', error);
    return '';
  }
}
