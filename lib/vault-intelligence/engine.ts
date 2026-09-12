import type { BankCard, Credential, Document } from "@/lib/types";
import type { VaultGeneralInsight, VaultIntelligenceResult, VaultIntelligenceSnapshot } from "./types";

const accountTypes = new Set(["conta_corrente", "conta_poupanca", "conta_digital"]);
const normalize = (value?: string) => (value || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ageDays = (value?: string, now = new Date()) => {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? Math.floor((now.getTime() - time) / 86400000) : null;
};

function duplicateGroups<T>(items: T[], key: (item: T) => string): number {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

function expiryDate(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const monthYear = /^(0?[1-9]|1[0-2])[\/-](\d{2}|\d{4})$/.exec(trimmed);
  if (monthYear) {
    const year = Number(monthYear[2].length === 2 ? `20${monthYear[2]}` : monthYear[2]);
    return new Date(year, Number(monthYear[1]), 0, 23, 59, 59);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function credentialInsights(credentials: Credential[], now: Date): VaultGeneralInsight[] {
  if (!credentials.length) return [];
  const encrypted = credentials.filter((item) => Boolean(item.password_encrypted)).length;
  const stale = credentials.filter((item) => (ageDays(item.updated_at, now) ?? 0) >= 365).length;
  const duplicates = duplicateGroups(credentials, (item) => `${normalize(item.title)}|${normalize(item.username)}`);
  const result: VaultGeneralInsight[] = [{
    id: "credential-storage-posture",
    kind: "security",
    title: "Proteção das credenciais armazenadas",
    message: `${encrypted} de ${credentials.length} credencial(is) possuem conteúdo cifrado no armazenamento. A implementação atual usa chave disponível no cliente e não deve ser descrita como cofre zero-knowledge ou proteção independente do aplicativo.`,
    confidence: "alta",
    sample: credentials.length,
    sources: ["Metadados locais de credenciais", "Configuração criptográfica do aplicativo"],
    evidence: [`${encrypted} campo(s) de senha cifrado(s)`, `${credentials.length - encrypted} registro(s) sem conteúdo cifrado`],
    actionLabel: "Revisar senhas",
    href: "/senhas",
    priority: encrypted < credentials.length ? 5 : 35,
  }];
  if (stale || duplicates) result.push({
    id: "credential-review-opportunities",
    kind: "organization",
    title: "Credenciais que merecem revisão",
    message: `${stale} credencial(is) não são atualizadas há pelo menos um ano e ${duplicates} identificação(ões) se repetem. Isso indica oportunidade de organização, não prova senha fraca ou conta duplicada.`,
    confidence: "alta",
    sample: credentials.length,
    sources: ["Título, usuário e data de atualização das credenciais"],
    evidence: [`${stale} registro(s) antigos`, `${duplicates} grupo(s) com título e usuário repetidos`],
    actionLabel: "Organizar credenciais",
    href: "/senhas",
    priority: 20,
  });
  return result;
}

function cardInsights(cards: BankCard[], now: Date): VaultGeneralInsight[] {
  const paymentCards = cards.filter((item) => !accountTypes.has(item.type));
  const accounts = cards.filter((item) => accountTypes.has(item.type));
  const expiring = paymentCards.filter((item) => {
    const expiry = expiryDate(item.expiry_date);
    if (!expiry) return false;
    const days = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
    return days >= 0 && days <= 60;
  });
  const expired = paymentCards.filter((item) => {
    const expiry = expiryDate(item.expiry_date);
    return Boolean(expiry && expiry.getTime() < now.getTime());
  });
  const incompleteAccounts = accounts.filter((item) => !item.agency?.trim() || !item.account?.trim());
  const result: VaultGeneralInsight[] = [];
  if (expired.length || expiring.length) result.push({
    id: "card-expiry-review",
    kind: "attention",
    title: "Validade de cartões",
    message: `${expired.length} cartão(ões) aparecem vencidos e ${expiring.length} vencem em até 60 dias, com base nas datas cadastradas.`,
    confidence: "alta", sample: paymentCards.length,
    sources: ["Validade cadastrada nos cartões"],
    evidence: [`${expired.length} vencido(s)`, `${expiring.length} próximo(s) do vencimento`],
    actionLabel: "Ver cartões", href: "/cartoes", priority: expired.length ? 2 : 12,
  });
  if (incompleteAccounts.length) result.push({
    id: "account-data-coverage", kind: "data_quality", title: "Dados de contas incompletos",
    message: `${incompleteAccounts.length} de ${accounts.length} conta(s) não possuem agência ou número informados. O Vault apenas mede cobertura cadastral.`,
    confidence: "alta", sample: accounts.length, sources: ["Metadados locais de contas"],
    evidence: [`${incompleteAccounts.length} conta(s) com campo ausente`], actionLabel: "Revisar contas", href: "/contas", priority: 25,
  });
  return result;
}

function documentInsights(documents: Document[]): VaultGeneralInsight[] {
  if (!documents.length) return [];
  const withoutAttachment = documents.filter((item) => !item.attachments?.length).length;
  const duplicates = duplicateGroups(documents, (item) => `${item.type}|${normalize(item.title)}`);
  if (!withoutAttachment && !duplicates) return [];
  return [{
    id: "personal-document-coverage", kind: "data_quality", title: "Cobertura do cofre de documentos",
    message: `${withoutAttachment} documento(s) não possuem anexo e ${duplicates} grupo(s) repetem tipo e título. Ausência de anexo não significa documento inválido.`,
    confidence: "alta", sample: documents.length,
    sources: ["Metadados e anexos dos documentos da pessoa ativa"],
    evidence: [`${withoutAttachment} sem anexo`, `${duplicates} grupo(s) possivelmente repetido(s)`],
    actionLabel: "Organizar documentos", href: "/documentos", priority: 30,
  }];
}

export function buildVaultIntelligence(snapshot: VaultIntelligenceSnapshot, now = new Date()): VaultIntelligenceResult {
  const credentials = snapshot.credentials.filter((item) => item.user_id === snapshot.userId && item.person_id === snapshot.personId);
  const cards = snapshot.cards.filter((item) => item.user_id === snapshot.userId && item.person_id === snapshot.personId);
  const documents = snapshot.documents.filter((item) => item.user_id === snapshot.userId && item.person_id === snapshot.personId);
  const vaults = snapshot.vaults.filter((item) => item.user_id === snapshot.userId && item.person_id === snapshot.personId);
  const vaultIds = new Set(vaults.map((item) => item.id).filter(Boolean));
  const pendingInvites = snapshot.members.filter((item) => vaultIds.has(item.vault_id) && item.status === "pending");
  const unsynced = [...credentials, ...cards, ...documents, ...vaults].filter((item) => item.synced === false).length;
  const operationalInsights: VaultGeneralInsight[] = [];
  if (pendingInvites.length) operationalInsights.push({
    id: "vault-pending-invitations", kind: "attention", title: "Convites de compartilhamento pendentes",
    message: `${pendingInvites.length} convite(s) de cofre ainda aparecem pendentes. O status descreve o registro atual e não confirma que a pessoa recebeu ou leu o convite.`,
    confidence: "alta", sample: pendingInvites.length, sources: ["Membros e convites dos cofres da pessoa ativa"],
    evidence: [`${pendingInvites.length} convite(s) com status pendente`], actionLabel: "Ver convites", href: "/vaults/convites", priority: 15,
  });
  if (unsynced) operationalInsights.push({
    id: "general-sync-coverage", kind: "data_quality", title: "Alterações aguardando sincronização",
    message: `${unsynced} item(ns) desta pessoa estão marcados localmente como não sincronizados. Eles permanecem no aparelho enquanto o fluxo de sincronização tenta enviá-los.`,
    confidence: "alta", sample: credentials.length + cards.length + documents.length + vaults.length,
    sources: ["Marcadores locais de sincronização"], evidence: [`${unsynced} registro(s) com synced=false`],
    actionLabel: "Ver diagnóstico", href: "/mais", priority: 8,
  });
  const insights = [...credentialInsights(credentials, now), ...cardInsights(cards, now), ...documentInsights(documents), ...operationalInsights]
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  const accounts = cards.filter((item) => accountTypes.has(item.type)).length;
  return {
    insights,
    highlights: insights.slice(0, 3),
    coverage: { credentials: credentials.length, cards: cards.length - accounts, accounts, documents: documents.length, vaults: vaults.length, total: credentials.length + cards.length + documents.length + vaults.length },
  };
}
