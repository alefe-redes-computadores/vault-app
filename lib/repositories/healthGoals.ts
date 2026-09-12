import { db } from "@/lib/db";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";
import type { HealthGoal } from "@/lib/health-goals/types";

const requirePerson = (value?: string) => {
  const normalized = value?.trim();
  if (!normalized) throw new Error("Pessoa ativa não identificada.");
  return normalized;
};

async function authenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Usuário não autenticado.");
  return data.user.id;
}

async function assertOwnedPerson(personId: string, userId: string) {
  const person = await db.persons.get(personId);
  if (!person || person.user_id !== userId) {
    throw new Error("A pessoa selecionada não pertence ao usuário autenticado.");
  }
}

export const healthGoalsRepository = {
  async getHydration(personId: string) {
    return db.health_goals
      .where("[person_id+goal_type]")
      .equals([requirePerson(personId), "hydration_ml"])
      .first();
  },

  async setHydration(personIdValue: string, value: number) {
    const personId = requirePerson(personIdValue);
    const userId = await authenticatedUserId();
    await assertOwnedPerson(personId, userId);
    const target = Math.round(value);
    if (!Number.isFinite(target) || target <= 0 || target > 20000) {
      throw new Error("Informe uma meta manual entre 1 e 20.000 ml.");
    }

    const current = await this.getHydration(personId);
    if (current && current.user_id !== userId) {
      throw new Error("Meta não pertence ao usuário autenticado.");
    }
    const timestamp = new Date().toISOString();
    const row: HealthGoal = {
      id: current?.id || crypto.randomUUID(),
      user_id: userId,
      person_id: personId,
      goal_type: "hydration_ml",
      target_value: target,
      unit: "ml",
      created_at: current?.created_at || timestamp,
      updated_at: timestamp,
      synced: false,
    };

    await db.transaction("rw", [db.health_goals, db.syncQueue], async () => {
      await db.health_goals.put(row);
      await enfileirarOperacao("health_goals", current ? "update" : "add", row, { dispatchSync: false });
    });
    solicitarProcessamentoSync();
    return row;
  },
};
