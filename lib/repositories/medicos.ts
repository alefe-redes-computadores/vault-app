// lib/repositories/medicos.ts

import {
  db,
  safeAddMedico,
  safeUpdateMedico,
  safeDeleteMedico,
  safeUpdateMedicamento,
  safeUpdateConsulta,
  safeUpdateCirurgia,
} from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { Medico } from "@/lib/types";

export const medicosRepository = {
  async getAll() {
    return db.medicos.toArray();
  },

  async getById(id: string) {
    return db.medicos.get(id);
  },

  async create(data: Omit<Medico, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddMedico(data);
    await enfileirarOperacao("medicos", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<Medico>) {
    await safeUpdateMedico(id, data);
    await enfileirarOperacao("medicos", "update", { id, ...data });
    return id;
  },

  /**
   * Exclusão Segura com Sincronização
   * Remove o médico e limpa o ID dele de medicamentos, consultas e cirurgias.
   * Todas as operações usam safe... e enfileirarOperacao.
   */
  async deleteSafe(id: string) {
    // 1. Exclui o médico
    await safeDeleteMedico(id);
    await enfileirarOperacao("medicos", "delete", { id });

    // 2. Limpa medicamentos
    const medicamentosAfetados = await db.medicamentos.where('medico_id').equals(id).toArray();
    for (const med of medicamentosAfetados) {
      if (med.id) {
        await safeUpdateMedicamento(med.id, { medico_id: undefined });
        await enfileirarOperacao("medicamentos", "update", { id: med.id, medico_id: undefined });
      }
    }

    // 3. Limpa consultas
    const consultasAfetadas = await db.consultas.where('medico_id').equals(id).toArray();
    for (const con of consultasAfetadas) {
      if (con.id) {
        await safeUpdateConsulta(con.id, { medico_id: undefined });
        await enfileirarOperacao("consultas", "update", { id: con.id, medico_id: undefined });
      }
    }

    // 4. Limpa cirurgias
    const cirurgiasAfetadas = await db.cirurgias.where('medico_id').equals(id).toArray();
    for (const cir of cirurgiasAfetadas) {
      if (cir.id) {
        await safeUpdateCirurgia(cir.id, { medico_id: undefined });
        await enfileirarOperacao("cirurgias", "update", { id: cir.id, medico_id: undefined });
      }
    }
  },
};