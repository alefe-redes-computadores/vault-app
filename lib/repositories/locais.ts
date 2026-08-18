// lib/repositories/locais.ts
import {
  db,
  safeAddLocal,
  safeUpdateLocal,
  safeDeleteLocal,
  safeUpdateRenovacao,
  safeUpdateMedicamento,
  safeUpdateExame,
  safeUpdateConsulta,
  safeUpdateCirurgia,
} from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { LocalSaude } from "@/lib/types";

export const locaisRepository = {
  async getAll() {
    return db.locais.toArray();
  },

  async getById(id: string) {
    return db.locais.get(id);
  },

  async create(data: Omit<LocalSaude, 'id' | 'created_at' | 'updated_at' | 'synced'>) {
    const id = await safeAddLocal(data);
    await enfileirarOperacao("locais", "add", { id, ...data });
    return id;
  },

  async update(id: string, data: Partial<LocalSaude>) {
    await safeUpdateLocal(id, data);
    await enfileirarOperacao("locais", "update", { id, ...data });
    return id;
  },

  async delete(id: string) {
    return this.deleteSafe(id);
  },

  async deleteSafe(id: string) {
    await safeDeleteLocal(id);
    await enfileirarOperacao("locais", "delete", { id });

    const renovacoesAfetadas = await db.renovacoes.where('local_id').equals(id).toArray();
    for (const ren of renovacoesAfetadas) {
      if (ren.id) {
        await safeUpdateRenovacao(ren.id, { local_id: undefined });
        await enfileirarOperacao("renovacoes", "update", { id: ren.id, local_id: undefined });
      }
    }

    const medicamentosAfetados = await db.medicamentos.where('local_id').equals(id).toArray();
    for (const med of medicamentosAfetados) {
      if (med.id) {
        await safeUpdateMedicamento(med.id, { local_id: undefined });
        await enfileirarOperacao("medicamentos", "update", { id: med.id, local_id: undefined });
      }
    }

    const examesAfetados = await db.exames.where('local_id').equals(id).toArray();
    for (const exame of examesAfetados) {
      if (exame.id) {
        await safeUpdateExame(exame.id, { local_id: undefined });
        await enfileirarOperacao("exames", "update", { id: exame.id, local_id: undefined });
      }
    }

    const consultasAfetadas = await db.consultas.where('local_id').equals(id).toArray();
    for (const con of consultasAfetadas) {
      if (con.id) {
        await safeUpdateConsulta(con.id, { local_id: undefined });
        await enfileirarOperacao("consultas", "update", { id: con.id, local_id: undefined });
      }
    }

    const cirurgiasAfetadas = await db.cirurgias.where('local_id').equals(id).toArray();
    for (const cir of cirurgiasAfetadas) {
      if (cir.id) {
        await safeUpdateCirurgia(cir.id, { local_id: undefined });
        await enfileirarOperacao("cirurgias", "update", { id: cir.id, local_id: undefined });
      }
    }
  },
};