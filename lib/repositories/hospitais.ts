import { db, safeAddHospital, safeUpdateHospital, safeDeleteHospital, safeUpdateDocument, safeUpdateConsulta, safeUpdateCirurgia, safeUpdateExame } from "@/lib/db";
import type { Hospital } from "@/lib/types";

export const hospitaisRepository = {
  async getAll() {
    return db.hospitais.toArray();
  },

  async getById(id: string) {
    return db.hospitais.get(id);
  },

  async create(data: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddHospital(data);
  },

  async update(id: string, data: Partial<Hospital>) {
    return safeUpdateHospital(id, data);
  },

  /**
   * Exclusão Segura com Sincronização (Cascade Delete)
   * Remove o hospital e limpa o ID dele de documentos, consultas, cirurgias e exames.
   * TODAS as operações usam safe... para manter sync com a nuvem.
   */
  async deleteSafe(id: string) {
    // 1. Deleta o hospital (já coloca na fila de sync)
    await safeDeleteHospital(id);

    // 2. Limpa documentos (usando safeUpdate)
    const documentosAfetados = await db.documents.where('hospital_id').equals(id).toArray();
    for (const doc of documentosAfetados) {
      if (doc.id) await safeUpdateDocument(doc.id, { hospital_id: undefined });
    }

    // 3. Limpa consultas (usando safeUpdate)
    const consultasAfetadas = await db.consultas.where('hospital_id').equals(id).toArray();
    for (const con of consultasAfetadas) {
      if (con.id) await safeUpdateConsulta(con.id, { hospital_id: undefined });
    }

    // 4. Limpa cirurgias (usando safeUpdate)
    const cirurgiasAfetadas = await db.cirurgias.where('hospital_id').equals(id).toArray();
    for (const cir of cirurgiasAfetadas) {
      if (cir.id) await safeUpdateCirurgia(cir.id, { hospital_id: undefined });
    }

    // 5. Limpa exames (usando safeUpdate)
    const examesAfetados = await db.exames.where('laboratorio_id').equals(id).toArray();
    for (const exame of examesAfetados) {
      if (exame.id) await safeUpdateExame(exame.id, { laboratorio_id: undefined });
    }
  }
};