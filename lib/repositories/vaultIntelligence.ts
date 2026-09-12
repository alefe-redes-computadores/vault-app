import { db } from "@/lib/db";
import type { VaultIntelligenceSnapshot } from "@/lib/vault-intelligence/types";

export const vaultIntelligenceRepository = {
  async snapshot(personId: string, userId: string): Promise<VaultIntelligenceSnapshot> {
    const safePersonId = personId.trim();
    const safeUserId = userId.trim();
    if (!safePersonId || !safeUserId) throw new Error("Pessoa e usuário são obrigatórios para a inteligência geral.");
    const person = await db.persons.get(safePersonId);
    if (!person || person.user_id !== safeUserId) throw new Error("A pessoa analisada não pertence ao usuário ativo.");
    const [credentials, cards, documents, vaults, members] = await Promise.all([
      db.credentials.where("person_id").equals(safePersonId).toArray(),
      db.bankCards.where("person_id").equals(safePersonId).toArray(),
      db.documents.where("person_id").equals(safePersonId).toArray(),
      db.vaults.where("person_id").equals(safePersonId).toArray(),
      db.vaultMembers.toArray(),
    ]);
    return { personId: safePersonId, userId: safeUserId, credentials, cards, documents, vaults, members: members.filter((item) => item.person_id === safePersonId || vaults.some((vault) => vault.id === item.vault_id)) };
  },
};
