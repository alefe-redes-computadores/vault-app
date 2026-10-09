import { db } from "@/lib/db";

/**
 * Exporta um snapshot lógico dos dados pertencentes à conta atual.
 *
 * Importante: tabelas de relacionamento não possuem user_id. Elas são
 * filtradas pelos IDs das entidades que já foram comprovadamente carregadas
 * para o usuário, evitando vazar registros residuais de outra sessão local.
 */
export async function exportAllData(userId: string): Promise<string> {
  if (!userId) throw new Error("Usuário inválido para exportação");

  try {
    const [
      persons,
      documents,
      medicamentos,
      renovacoes,
      retiradas,
      fornecimentos,
      fornecimento_ciclos,
      fornecimento_itens,
      fornecimento_documentos,

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
      instituicoes,
      anexosClinicos,
      settings,
      registrosSaude,
      healthReminders,
      healthGoals,
      versiculos,
    ] = await Promise.all([
      db.persons.where("user_id").equals(userId).toArray(),
      db.documents.where("user_id").equals(userId).toArray(),
      db.medicamentos.where("user_id").equals(userId).toArray(),
      db.renovacoes.where("user_id").equals(userId).toArray(),
      db.retiradas.where("user_id").equals(userId).toArray(),
      db.fornecimentos.where("user_id").equals(userId).toArray(),
      db.fornecimento_ciclos.where("user_id").equals(userId).toArray(),
      db.fornecimento_itens.where("user_id").equals(userId).toArray(),
      db.fornecimento_documentos.where("user_id").equals(userId).toArray(),

      db.medicos.where("user_id").equals(userId).toArray(),
      db.farmacias.where("user_id").equals(userId).toArray(),
      db.hospitais.where("user_id").equals(userId).toArray(),
      db.locais.where("user_id").equals(userId).toArray(),
      db.exames.where("user_id").equals(userId).toArray(),
      db.consultas.where("user_id").equals(userId).toArray(),
      db.cirurgias.where("user_id").equals(userId).toArray(),
      db.tratamentos.where("user_id").equals(userId).toArray(),
      db.cids.where("user_id").equals(userId).toArray(),
      db.doseLogs.where("user_id").equals(userId).toArray(),
      db.credentials.where("user_id").equals(userId).toArray(),
      db.bankCards.where("user_id").equals(userId).toArray(),
      db.vaults.where("user_id").equals(userId).toArray(),
      db.instituicoes.where("user_id").equals(userId).toArray(),
      db.anexos_clinicos.where("user_id").equals(userId).toArray(),
      db.settings.where("user_id").equals(userId).toArray(),
      db.registros_saude.where("user_id").equals(userId).toArray(),
      db.health_reminders.where("user_id").equals(userId).toArray(),
      db.health_goals.where("user_id").equals(userId).toArray(),
      db.versiculos.where("user_id").equals(userId).toArray(),
    ]);

    const medicamentoIds = new Set(
      medicamentos.flatMap((item) => (item.id ? [item.id] : []))
    );
    const exameIds = new Set(exames.flatMap((item) => (item.id ? [item.id] : [])));
    const tratamentoIds = new Set(
      tratamentos.flatMap((item) => (item.id ? [item.id] : []))
    );
    const vaultIds = new Set(vaults.flatMap((item) => (item.id ? [item.id] : [])));

    const [allMedicamentoTratamentos, allExameTratamentos, allVaultMembers] =
      await Promise.all([
        db.medicamento_tratamentos.toArray(),
        db.exame_tratamentos.toArray(),
        db.vaultMembers.toArray(),
      ]);

    const medicamentoTratamentos = allMedicamentoTratamentos.filter(
      (item) =>
        medicamentoIds.has(item.medicamento_id) &&
        tratamentoIds.has(item.tratamento_id)
    );

    const exameTratamentos = allExameTratamentos.filter(
      (item) => exameIds.has(item.exame_id) && tratamentoIds.has(item.tratamento_id)
    );

    const vaultMembers = allVaultMembers.filter(
      (item) =>
        item.user_id === userId ||
        item.invited_by === userId ||
        vaultIds.has(item.vault_id)
    );

    const data = {
      export_date: new Date().toISOString(),
      version: "3.0",
      user_id: userId,
      persons,
      documents,
      medicamentos,
      renovacoes,
      retiradas,
      fornecimentos,
      fornecimento_ciclos,
      fornecimento_itens,
      fornecimento_documentos,

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
      registros_saude: registrosSaude,
      health_reminders: healthReminders,
      health_goals: healthGoals,
      credentials,
      bank_cards: bankCards,
      vaults,
      vault_members: vaultMembers,
      instituicoes,
      anexos_clinicos: anexosClinicos,
      settings,
      versiculos,
      medicamento_tratamentos: medicamentoTratamentos,
      exame_tratamentos: exameTratamentos,
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    throw new Error("Falha ao exportar dados");
  }
}

export function downloadJSON(data: string, filename = "vault-backup.json") {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
