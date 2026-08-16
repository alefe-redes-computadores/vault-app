import { db, safeAddMedico, safeUpdateMedico, safeDeleteMedico, safeUpdateMedicamento, safeUpdateConsulta, safeUpdateCirurgia } from "@/lib/db";
import type { Medico } from "@/lib/types";

export const medicosRepository = {
  async getAll() {
    return db.medicos.toArray();
  },

  async getById(id: string) {
    return db.medicos.get(id);
  },

  async create(data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    return safeAddMedico(data);
  },

  async update(id: string, data: Partial<Medico>) {
    return safeUpdateMedico(id, data);
  },

  /**
   * Exclusão Segura com Sincronização (Cascade Delete)
   * Remove o médico e limpa o ID dele de medicamentos, consultas e cirurgias.
   * TODAS as operações usam safe... para manter sync com a nuvem.
   */
  async deleteSafe(id: string) {
    // 1. Deleta o médico (já coloca na fila de sync)
    await safeDeleteMedico(id);

    // 2. Limpa medicamentos (usando safeUpdate)
    const medicamentosAfetados = await db.medicamentos.where('medico_id').equals(id).toArray();
    for (const med of medicamentosAfetados) {
      if (med.id) await safeUpdateMedicamento(med.id, { medico_id: undefined });
    }

    // 3. Limpa consultas (usando safeUpdate)
    const consultasAfetadas = await db.consultas.where('medico_id').equals(id).toArray();
    for (const con of consultasAfetadas) {
      if (con.id) await safeUpdateConsulta(con.id, { medico_id: undefined });
    }

    // 4. Limpa cirurgias (usando safeUpdate)
    const cirurgiasAfetadas = await db.cirurgias.where('medico_id').equals(id).toArray();
    for (const cir of cirurgiasAfetadas) {
      if (cir.id) await safeUpdateCirurgia(cir.id, { medico_id: undefined });
    }
  }
};