// lib/db/integridadeReferencial.ts

import { db } from '@/lib/db';
import { enfileirarOperacao } from '@/lib/sync/enfileirarOperacao';

/**
 * Verifica e corrige referências órfãs no IndexedDB.
 * Deve ser chamado uma vez por dia (ou por sessão) no boot do app.
 * Utiliza localStorage para registrar a última execução (evita rodar sempre).
 *
 * As correções feitas localmente são enfileiradas para sincronização.
 */
export async function validarIntegridadeReferencial(): Promise<void> {
  const LAST_RUN_KEY = 'vault_integrity_check_date';
  const today = new Date().toISOString().slice(0, 10);

  // Verifica se já rodou hoje
  if (localStorage.getItem(LAST_RUN_KEY) === today) {
    return;
  }

  // Marca como executado agora (será mantido mesmo se falhar)
  localStorage.setItem(LAST_RUN_KEY, today);

  // Carrega todos os IDs existentes das tabelas de referência (uma vez)
  const [
    persons,
    medicos,
    farmacias,
    hospitais,
    locais,
    cids,
    tratamentos,
    medicamentos,
    exames,
    consultas,
    cirurgias,
    renovacoes,
    documents,
  ] = await Promise.all([
    db.persons.toArray(),
    db.medicos.toArray(),
    db.farmacias.toArray(),
    db.hospitais.toArray(),
    db.locais.toArray(),
    db.cids.toArray(),
    db.tratamentos.toArray(),
    db.medicamentos.toArray(),
    db.exames.toArray(),
    db.consultas.toArray(),
    db.cirurgias.toArray(),
    db.renovacoes.toArray(),
    db.documents.toArray(),
  ]);

  const personIds = new Set(persons.map((p) => p.id!));
  const medicoIds = new Set(medicos.map((m) => m.id!));
  const farmaciaIds = new Set(farmacias.map((f) => f.id!));
  const hospitalIds = new Set(hospitais.map((h) => h.id!));
  const localIds = new Set(locais.map((l) => l.id!));
  const cidIds = new Set(cids.map((c) => c.id!));
  const tratamentoIds = new Set(tratamentos.map((t) => t.id!));
  const medicamentoIds = new Set(medicamentos.map((m) => m.id!));
  const exameIds = new Set(exames.map((e) => e.id!));
  const consultaIds = new Set(consultas.map((c) => c.id!));
  const cirurgiaIds = new Set(cirurgias.map((c) => c.id!));
  const renovacaoIds = new Set(renovacoes.map((r) => r.id!));
  const documentIds = new Set(documents.map((d) => d.id!));

  // ---------------------- MEDICAMENTOS ----------------------
  for (const med of medicamentos) {
    let changed = false;

    // tratamento_ids array
    if (med.tratamento_ids && med.tratamento_ids.length > 0) {
      const validTratamentos = med.tratamento_ids.filter((id) =>
        tratamentoIds.has(id)
      );
      if (validTratamentos.length !== med.tratamento_ids.length) {
        med.tratamento_ids = validTratamentos;
        changed = true;
      }
    }

    // FK person_id
    if (med.person_id && !personIds.has(med.person_id)) {
      med.person_id = undefined;
      changed = true;
    }
    // FK medico_id
    if (med.medico_id && !medicoIds.has(med.medico_id)) {
      med.medico_id = undefined;
      changed = true;
    }
    // FK farmacia_id
    if (med.farmacia_id && !farmaciaIds.has(med.farmacia_id)) {
      med.farmacia_id = undefined;
      changed = true;
    }
    // FK hospital_id
    if (med.hospital_id && !hospitalIds.has(med.hospital_id)) {
      med.hospital_id = undefined;
      changed = true;
    }
    // FK local_id
    if (med.local_id && !localIds.has(med.local_id)) {
      med.local_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.medicamentos.update(med.id!, med);
      await enfileirarOperacao('medicamentos', 'update', med);
    }
  }

  // ---------------------- EXAMES ----------------------
  for (const ex of exames) {
    let changed = false;

    // tratamento_ids array
    if (ex.tratamento_ids && ex.tratamento_ids.length > 0) {
      const validTratamentos = ex.tratamento_ids.filter((id) =>
        tratamentoIds.has(id)
      );
      if (validTratamentos.length !== ex.tratamento_ids.length) {
        ex.tratamento_ids = validTratamentos;
        changed = true;
      }
    }

    // FK person_id
    if (ex.person_id && !personIds.has(ex.person_id)) {
      ex.person_id = undefined;
      changed = true;
    }
    // FK medico_id
    if (ex.medico_id && !medicoIds.has(ex.medico_id)) {
      ex.medico_id = undefined;
      changed = true;
    }
    // FK local_id
    if (ex.local_id && !localIds.has(ex.local_id)) {
      ex.local_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.exames.update(ex.id!, ex);
      await enfileirarOperacao('exames', 'update', ex);
    }
  }

  // ---------------------- TRATAMENTOS ----------------------
  for (const trat of tratamentos) {
    let changed = false;

    // cid_ids array
    if (trat.cid_ids && trat.cid_ids.length > 0) {
      const validCids = trat.cid_ids.filter((id) => cidIds.has(id));
      if (validCids.length !== trat.cid_ids.length) {
        trat.cid_ids = validCids;
        changed = true;
      }
    }

    // FK person_id
    if (trat.person_id && !personIds.has(trat.person_id)) {
      trat.person_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.tratamentos.update(trat.id!, trat);
      await enfileirarOperacao('tratamentos', 'update', trat);
    }
  }

  // ---------------------- CONSULTAS ----------------------
  for (const cons of consultas) {
    let changed = false;

    if (cons.person_id && !personIds.has(cons.person_id)) {
      cons.person_id = undefined;
      changed = true;
    }
    if (cons.medico_id && !medicoIds.has(cons.medico_id)) {
      cons.medico_id = undefined;
      changed = true;
    }
    if (cons.hospital_id && !hospitalIds.has(cons.hospital_id)) {
      cons.hospital_id = undefined;
      changed = true;
    }
    if (cons.local_id && !localIds.has(cons.local_id)) {
      cons.local_id = undefined;
      changed = true;
    }
    if (cons.document_id && !documentIds.has(cons.document_id)) {
      cons.document_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.consultas.update(cons.id!, cons);
      await enfileirarOperacao('consultas', 'update', cons);
    }
  }

  // ---------------------- CIRURGIAS ----------------------
  for (const cir of cirurgias) {
    let changed = false;

    if (cir.person_id && !personIds.has(cir.person_id)) {
      cir.person_id = undefined;
      changed = true;
    }
    if (cir.medico_id && !medicoIds.has(cir.medico_id)) {
      cir.medico_id = undefined;
      changed = true;
    }
    if (cir.hospital_id && !hospitalIds.has(cir.hospital_id)) {
      cir.hospital_id = undefined;
      changed = true;
    }
    if (cir.local_id && !localIds.has(cir.local_id)) {
      cir.local_id = undefined;
      changed = true;
    }
    if (cir.document_id && !documentIds.has(cir.document_id)) {
      cir.document_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.cirurgias.update(cir.id!, cir);
      await enfileirarOperacao('cirurgias', 'update', cir);
    }
  }

  // ---------------------- RENOVAÇÕES ----------------------
  for (const ren of renovacoes) {
    let changed = false;

    if (ren.person_id && !personIds.has(ren.person_id)) {
      ren.person_id = undefined;
      changed = true;
    }
    if (ren.medicamento_id && !medicamentoIds.has(ren.medicamento_id)) {
      // Se o medicamento não existe, não faz sentido manter a renovação? 
      // Decisão: manter, mas sem medicamento_id seria quebrar a integridade. 
      // Melhor excluir a renovação? Por ora, apenas logamos e removemos a referência.
      ren.medicamento_id = '';
      changed = true;
    }
    if (ren.medico_id && !medicoIds.has(ren.medico_id)) {
      ren.medico_id = undefined;
      changed = true;
    }
    if (ren.farmacia_id && !farmaciaIds.has(ren.farmacia_id)) {
      ren.farmacia_id = undefined;
      changed = true;
    }
    if (ren.hospital_id && !hospitalIds.has(ren.hospital_id)) {
      ren.hospital_id = undefined;
      changed = true;
    }
    if (ren.local_id && !localIds.has(ren.local_id)) {
      ren.local_id = undefined;
      changed = true;
    }
    if (ren.document_id && !documentIds.has(ren.document_id)) {
      ren.document_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.renovacoes.update(ren.id!, ren);
      await enfileirarOperacao('renovacoes', 'update', ren);
    }
  }

  // ---------------------- CIDs ----------------------
  for (const cid of cids) {
    let changed = false;

    if (cid.person_id && !personIds.has(cid.person_id)) {
      cid.person_id = undefined;
      changed = true;
    }
    if (cid.medico_id && !medicoIds.has(cid.medico_id)) {
      cid.medico_id = undefined;
      changed = true;
    }
    if (cid.hospital_id && !hospitalIds.has(cid.hospital_id)) {
      cid.hospital_id = undefined;
      changed = true;
    }
    if (cid.local_id && !localIds.has(cid.local_id)) {
      cid.local_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.cids.update(cid.id!, cid);
      await enfileirarOperacao('cids', 'update', cid);
    }
  }

  // ---------------------- DOCUMENTS ----------------------
  for (const doc of documents) {
    let changed = false;

    if (doc.person_id && !personIds.has(doc.person_id)) {
      doc.person_id = '';
      changed = true;
    }
    if (doc.hospital_id && !hospitalIds.has(doc.hospital_id)) {
      doc.hospital_id = undefined;
      changed = true;
    }
    if (doc.medico_id && !medicoIds.has(doc.medico_id)) {
      doc.medico_id = undefined;
      changed = true;
    }

    if (changed) {
      await db.documents.update(doc.id!, doc);
      await enfileirarOperacao('documents', 'update', doc);
    }
  }

  // ---------------------- DOSE LOGS ----------------------
  const doseLogs = await db.doseLogs.toArray();
  for (const log of doseLogs) {
    let changed = false;

    if (log.person_id && !personIds.has(log.person_id)) {
      log.person_id = undefined;
      changed = true;
    }
    if (!medicamentoIds.has(log.medicamento_id)) {
      // Excluir dose log se medicamento não existe
      await db.doseLogs.delete(log.id!);
      await enfileirarOperacao('doseLogs', 'delete', { id: log.id! });
      continue;
    }

    if (changed) {
      await db.doseLogs.update(log.id!, log);
      await enfileirarOperacao('doseLogs', 'update', log);
    }
  }

  console.log('[Integridade] Verificação concluída.');
}