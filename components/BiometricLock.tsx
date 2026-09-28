"use client";

/**
 * VAULT_BIOMETRIC_POLICY_V66
 *
 * Biometria deixou de ser um cadeado global do aplicativo.
 *
 * Contrato:
 * - abrir o Vault não solicita biometria;
 * - restaurar/minimizar o Vault não solicita biometria;
 * - AppState não controla autenticação;
 * - notificações não provocam autenticação global;
 * - children nunca são ocultados/desmontados por biometria;
 * - conteúdo e ações sensíveis continuam usando seus gates locais.
 *
 * Mantemos este componente como boundary estável para não alterar a
 * arquitetura do layout nem criar uma segunda árvore de Providers.
 */
export function BiometricLock({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
