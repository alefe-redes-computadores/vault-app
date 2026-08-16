// lib/repositories/medicos.ts

import { db, safeAddMedico, safeUpdateMedico, safeDeleteMedico } from "@/lib/db";
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
   * Exclusão Segura (Cascade Delete Simulado)
   * Remove o médico e limpa o ID dele de medicamentos, consultas e cirurgias.
   */
  async deleteSafe(id: string) {
    return db.transaction('rw', db.medicos, db.medicamentos, db.consultas, db.cirurgias, async () => {
      await db.medicos.delete(id);

      // Limpa medicamentos
      const medicamentosAfetados = await db.medicamentos.where('medico_id').equals(id).toArray();
      for (const med of medicamentosAfetados) {
        if (med.id) {
          await db.medicamentos.update(med.id, { medico_id: undefined });
        }
      }

      // Limpa consultas
      const consultasAfetadas = await db.consultas.where('medico_id').equals(id).toArray();
      for (const con of consultasAfetadas) {
        if (con.id) {
          await db.consultas.update(con.id, { medico_id: undefined });
        }
      }

      // Limpa cirurgias
      const cirurgiasAfetadas = await db.cirurgias.where('medico_id').equals(id).toArray();
      for (const cir of cirurgiasAfetadas) {
        if (cir.id) {
          await db.cirurgias.update(cir.id, { medico_id: undefined });
        }
      }
    });
  }
};