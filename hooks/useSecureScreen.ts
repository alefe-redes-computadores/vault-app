"use client";

/**
 * VAULT_SECURE_SCREEN_V66
 *
 * Não existe mais lifecycle biométrico global.
 *
 * Este shim permanece por compatibilidade estrutural.
 * Proteções sensíveis pertencem ao domínio que executa/revela a ação:
 * senhas, cartões, exclusão destrutiva e demais gates explícitos.
 */
export function useSecureScreen() {
  return {
    isLocked: false,
  };
}
