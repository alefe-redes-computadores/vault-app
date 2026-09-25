import { db } from "@/lib/db";
import type { VaultIntelligenceSnapshot } from "@/lib/vault-intelligence/types";

export const vaultIntelligenceRepository = {
  async snapshot(personId: string, userId: string): Promise<VaultIntelligenceSnapshot> {
    const safePersonId = personId.trim();
    const safeUserId = userId.trim();
    if (!safePersonId || !safeUserId) throw new Error("Pessoa e usuário são obrigatórios para a inteligência geral.");
    const person = await db.persons.get(safePersonId);
    if (!person || person.user_id !== safeUserId) throw new Error("A pessoa analisada não pertence ao usuário ativo.");
    const [credentials, cards, documents, vaults, renovacoes] = await Promise.all([
      db.credentials.where("person_id").equals(safePersonId).toArray(),
      db.bankCards.where("person_id").equals(safePersonId).toArray(),
      db.documents.where("person_id").equals(safePersonId).toArray(),
      db.vaults.where("person_id").equals(safePersonId).toArray(),
      db.renovacoes.where("person_id").equals(safePersonId).toArray(),
    ]);
    const ownedVaultIds = vaults
      .filter((vault) => vault.user_id === safeUserId)
      .map((vault) => vault.id)
      .filter((id): id is string => Boolean(id));
    const members = ownedVaultIds.length
      ? await db.vaultMembers.where("vault_id").anyOf(ownedVaultIds).toArray()
      : [];
    return { personId: safePersonId, userId: safeUserId, credentials, cards, documents, vaults, members, renovacoes };
  },
};
