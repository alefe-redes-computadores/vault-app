// lib/export.ts
import { db } from "@/lib/db";

/**
 * Exporta todos os dados do usuário em formato JSON
 */
export async function exportAllData(userId: string): Promise<string> {
  try {
    const [
      persons,
      documents,
      medicamentos,
      renovacoes,
      medicos,
      farmacias,
      hospitais,
      locais,
      exames,
      consultas,
      cirurgias,
      tratamentos,
      cids,
      doseLogs,
      credentials,
      bankCards,
      vaults,
      vaultMembers,
      instituicoes,
      anexosClinicos,
      settings,
      medicamentoTratamentos,
      exameTratamentos,
    ] = await Promise.all([
      db.persons.where('user_id').equals(userId).toArray(),
      db.documents.where('user_id').equals(userId).toArray(),
      db.medicamentos.where('user_id').equals(userId).toArray(),
      db.renovacoes.where('user_id').equals(userId).toArray(),
      db.medicos.where('user_id').equals(userId).toArray(),
      db.farmacias.where('user_id').equals(userId).toArray(),
      db.hospitais.where('user_id').equals(userId).toArray(),
      db.locais.where('user_id').equals(userId).toArray(),
      db.exames.where('user_id').equals(userId).toArray(),
      db.consultas.where('user_id').equals(userId).toArray(),
      db.cirurgias.where('user_id').equals(userId).toArray(),
      db.tratamentos.where('user_id').equals(userId).toArray(),
      db.cids.where('user_id').equals(userId).toArray(),
      db.doseLogs.where('user_id').equals(userId).toArray(),
      db.credentials.where('user_id').equals(userId).toArray(),
      db.bankCards.where('user_id').equals(userId).toArray(),
      db.vaults.where('user_id').equals(userId).toArray(),
      db.vaultMembers.where('user_id').equals(userId).toArray(),
      db.instituicoes.where('user_id').equals(userId).toArray(),
      db.anexos_clinicos.where('user_id').equals(userId).toArray(),
      db.settings.where('user_id').equals(userId).toArray(),
      db.medicamento_tratamentos.toArray(),
      db.exame_tratamentos.toArray(),
    ]);

    const data = {
      export_date: new Date().toISOString(),
      version: "2.0",
      user_id: userId,
      persons,
      documents,
      medicamentos,
      renovacoes,
      medicos,
      farmacias,
      hospitais,
      locais,
      exames,
      consultas,
      cirurgias,
      tratamentos,
      cids,
      dose_logs: doseLogs,
      credentials,
      bank_cards: bankCards,
      vaults,
      vault_members: vaultMembers,
      instituicoes,
      anexos_clinicos: anexosClinicos,
      settings,
      medicamento_tratamentos: medicamentoTratamentos,
      exame_tratamentos: exameTratamentos,
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    throw new Error("Falha ao exportar dados");
  }
}

/**
 * Baixa os dados como arquivo JSON
 */
export function downloadJSON(data: string, filename: string = "vault-backup.json") {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}