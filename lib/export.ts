import {MACRO02_CLINICAL_BACKUP_TABLES} from "@/lib/dose-premium/clinical-backup-evidence";
import {validateMacro02Backup} from "@/lib/dose-premium/backup-contract";
import { db } from "@/lib/db";
import {TABLES as VITAL_TABLES} from '@/lib/vital/model';

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
    // Every exported dependency and the Macro02 outbox must describe the same
    // IndexedDB snapshot. A second read transaction could mix clinical revisions.
    const tables = [
      db.persons, db.documents, db.medicamentos, db.renovacoes, db.retiradas,
      db.fornecimentos, db.fornecimento_ciclos, db.fornecimento_itens,
      db.fornecimento_documentos, db.medicos, db.farmacias, db.hospitais,
      db.locais, db.exames, db.consultas, db.cirurgias, db.tratamentos, db.cids,
      db.doseLogs, db.credentials, db.bankCards, db.vaults, db.instituicoes,
      db.anexos_clinicos, db.settings, db.registros_saude, db.health_reminders,
      db.health_goals, db.health_profiles, db.health_devices, db.versiculos,
      db.medicamento_tratamentos, db.exame_tratamentos, db.vaultMembers,
      db.syncQueue, db.a1_treatment_phases, db.a1_prescription_links, db.a1_supply_locations, ...VITAL_TABLES.map(name => db.table(name)),
    ];
    const snapshot = await db.transaction("r", tables, async () => {
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
        healthProfiles,
        healthDevices,
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
        db.health_profiles.where("user_id").equals(userId).toArray(),
        db.health_devices.where("user_id").equals(userId).toArray(),
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

      const ownedPeople=new Set(persons.filter(p=>p.user_id===userId).map(p=>p.id));
      const vitalEntries=await Promise.all(VITAL_TABLES.map(async name=>[name,(await db.table(name).where('user_id').equals(userId).toArray()).filter(r=>r.user_id===userId&&ownedPeople.has(r.person_id))] as const));
      const queue = await db.syncQueue.toArray();
      const a1Entries=await Promise.all((["a1_treatment_phases","a1_prescription_links","a1_supply_locations"] as const).map(async name=>[name,(await db.table(name).where("user_id").equals(userId).toArray()).filter(r=>r.user_id===userId&&ownedPeople.has(r.person_id))] as const));
      const clinicalCandidates=queue.filter(q=>(MACRO02_CLINICAL_BACKUP_TABLES as readonly string[]).includes(q.table));
      const clinicalQueue=clinicalCandidates.filter(q=>q.payload?.user_id===userId);
      // Do not export an unowned payload (possible foreign data). Record that
      // the file cannot prove full queue scope, without exposing its contents.
      const omittedUnowned=clinicalCandidates.filter(q=>typeof q.payload?.user_id!=='string'||!q.payload.user_id).length;
      const recovery = validateMacro02Backup({userId,persons,medications:medicamentos,doses:doseLogs.map(row=>({...row})),acquisitions:renovacoes.map(row=>({...row})),withdrawals:retiradas.map(row=>({...row})),queue});
      const data = {
        ...Object.fromEntries(vitalEntries),
        ...Object.fromEntries(a1Entries),
        macro02_clinical_outbox: {version:1,user_id:userId,mode:"evidence_only_no_replay",omitted_unowned_count:omittedUnowned,rows:clinicalQueue},
        macro02_recovery: recovery,
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
        health_profiles:healthProfiles,health_devices:healthDevices,
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

      return data;
    });
    // Serialization is deliberately outside the read transaction.
    return JSON.stringify(snapshot, null, 2);
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
