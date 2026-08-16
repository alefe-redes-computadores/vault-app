// lib/repositories/hospitais.ts

import { db, safeAddHospital, safeUpdateHospital, safeDeleteHospital } from "@/lib/db";
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
   * Exclusão Segura
   * Remove o hospital e limpa o ID dele de documentos, consultas, cirurgias e exames.
   */
  async deleteSafe(id: string) {
    return db.transaction('rw', db.hospitais, db.documents, db.consultas, db.cirurgias, db.exames, async () => {
      await db.hospitais.delete(id);

      const documentosAfetados = await db.documents.where('hospital_id').equals(id).toArray();
      for (const doc of documentosAfetados) {
        if (doc.id) {
          await db.documents.update(doc.id, { hospital_id: undefined });
        }
      }

      const consultasAfetadas = await db.consultas.where('hospital_id').equals(id).toArray();
      for (const con of consultasAfetadas) {
        if (con.id) {
          await db.consultas.update(con.id, { hospital_id: undefined });
        }
      }

      const cirurgiasAfetadas = await db.cirurgias.where('hospital_id').equals(id).toArray();
      for (const cir of cirurgiasAfetadas) {
        if (cir.id) {
          await db.cirurgias.update(cir.id, { hospital_id: undefined });
        }
      }

      const examesAfetados = await db.exames.where('laboratorio_id').equals(id).toArray();
      for (const exame of examesAfetados) {
        if (exame.id) {
          await db.exames.update(exame.id, { laboratorio_id: undefined });
        }
      }
    });
  }
};