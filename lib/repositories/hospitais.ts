// lib/repositories/hospitais.ts

import {
  db,
  safeAddHospital,
  safeUpdateHospital,
  safeDeleteHospital,
  safeUpdateDocument,
  safeUpdateConsulta,
  safeUpdateCirurgia,
  safeUpdateMedicamento,
  safeUpdateRenovacao,
} from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Hospital } from "@/lib/types";

export const hospitaisRepository = {
  async getAll() {
    return db.hospitais.toArray();
  },

  async getById(id: string) {
    return db.hospitais.get(id);
  },

  async create(data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddHospital(data);
    await enfileirarOperacao("hospitais", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Hospital>) {
    await safeUpdateHospital(id, data);
    await enfileirarOperacao("hospitais", "update", { id, ...data });
    return id;
  },

  /**
   * Exclusão Segura com Sincronização
   * Remove o hospital e limpa o ID dele de documentos, consultas, cirurgias, medicamentos e renovações.
   */
  async deleteSafe(id: string) {
    // 1. Exclui o hospital
    await safeDeleteHospital(id);
    await enfileirarOperacao("hospitais", "delete", { id });

    // 2. Limpa documentos
    const documentosAfetados = await db.documents.where('hospital_id').equals(id).toArray();
    for (const doc of documentosAfetados) {
      if (doc.id) {
        await safeUpdateDocument(doc.id, { hospital_id: undefined });
        await enfileirarOperacao("documents", "update", { id: doc.id, hospital_id: undefined });
      }
    }

    // 3. Limpa consultas
    const consultasAfetadas = await db.consultas.where('hospital_id').equals(id).toArray();
    for (const con of consultasAfetadas) {
      if (con.id) {
        await safeUpdateConsulta(con.id, { hospital_id: undefined });
        await enfileirarOperacao("consultas", "update", { id: con.id, hospital_id: undefined });
      }
    }

    // 4. Limpa cirurgias
    const cirurgiasAfetadas = await db.cirurgias.where('hospital_id').equals(id).toArray();
    for (const cir of cirurgiasAfetadas) {
      if (cir.id) {
        await safeUpdateCirurgia(cir.id, { hospital_id: undefined });
        await enfileirarOperacao("cirurgias", "update", { id: cir.id, hospital_id: undefined });
      }
    }

    // 5. Limpa medicamentos
    const medicamentosAfetados = await db.medicamentos.where('hospital_id').equals(id).toArray();
    for (const med of medicamentosAfetados) {
      if (med.id) {
        await safeUpdateMedicamento(med.id, { hospital_id: undefined });
        await enfileirarOperacao("medicamentos", "update", { id: med.id, hospital_id: undefined });
      }
    }

    // 6. Limpa renovações
    const renovacoesAfetadas = await db.renovacoes.where('hospital_id').equals(id).toArray();
    for (const ren of renovacoesAfetadas) {
      if (ren.id) {
        await safeUpdateRenovacao(ren.id, { hospital_id: undefined });
        await enfileirarOperacao("renovacoes", "update", { id: ren.id, hospital_id: undefined });
      }
    }
  },
};