import CryptoJS from 'crypto-js';

// No futuro, isso pode ser atrelado ao PIN do usuário para segurança máxima
const SECRET_KEY = process.env.NEXT_PUBLIC_VAULT_SECRET_KEY || 'vault_offline_first_super_secret_key';

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
