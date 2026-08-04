"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { db, safeAddCredential, safeUpdateCredential, safeDeleteCredential } from '@/lib/db';
import { encryptPassword } from '@/lib/crypto';
import type { Credential } from '@/lib/types';

// Tipagem de entrada (Omitimos os campos automáticos e o campo criptografado, pedindo a senha pura)
type AddCredentialData = Omit<Credential, 'id' | 'created_at' | 'updated_at' | 'synced' | 'password_encrypted'> & { 
  password_plain: string 
};

type UpdateCredentialData = Partial<Omit<Credential, 'password_encrypted'>> & { 
  password_plain?: string 
};

export function useCredentials() {
  // 1. Busca reativa: Sempre que o Dexie mudar (offline ou sync), a UI atualiza na hora
  const credentials = useLiveQuery(() => db.credentials.toArray()) || [];

  // 2. Adicionar nova credencial com Criptografia E2EE
  const addCredential = async (data: AddCredentialData): Promise<string> => {
    const { password_plain, ...rest } = data;
    
    // Criptografa a senha ANTES de tocar no banco de dados local
    const password_encrypted = encryptPassword(password_plain);

    return await safeAddCredential({
      ...rest,
      password_encrypted,
    });
  };

  // 3. Atualizar credencial (só criptografa novamente se o usuário mudou a senha)
  const updateCredential = async (id: string, changes: UpdateCredentialData): Promise<void> => {
    const { password_plain, ...rest } = changes;
    
    const updatePayload: Partial<Credential> = { ...rest };

    // Só reescreve a criptografia se a senha foi alterada no formulário
    if (password_plain) {
      updatePayload.password_encrypted = encryptPassword(password_plain);
    }

    await safeUpdateCredential(id, updatePayload);
  };

  // 4. Deletar credencial
  const deleteCredential = async (id: string): Promise<void> => {
    await safeDeleteCredential(id);
  };

  // 5. Filtros para facilitar a listagem nas abas da tela principal
  const credentialsByVault = (vaultId: string) => credentials.filter(c => c.vault_id === vaultId);
  const credentialsPersonal = () => credentials.filter(c => !c.vault_id);

  return {
    credentials,
    addCredential,
    updateCredential,
    deleteCredential,
    credentialsByVault,
    credentialsPersonal,
  };
}
