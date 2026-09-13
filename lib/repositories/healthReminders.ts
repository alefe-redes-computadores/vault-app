import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import { db } from "@/lib/db";
import { normalizeHealthReminderInput } from "@/lib/health-reminders/domain";
import type { CreateHealthReminderInput, HealthReminderRule, UpdateHealthReminderInput } from "@/lib/health-reminders/types";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";

const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const requirePersonId = (value?: string) => {
  const normalized = value?.trim();
  if (!normalized) throw new Error("Pessoa ativa não identificada.");
  return normalized;
};

async function authenticatedUserId() {
  const { data, error } = await getLocalFirstAuthUser();
  if (error || !data.user) throw new Error("Usuário não autenticado.");
  return data.user.id;
}

async function assertOwnedPerson(personId: string, userId: string) {
  const owner = await db.persons.get(personId);
  if (!owner || owner.user_id !== userId) {
    throw new Error("A pessoa selecionada não pertence ao usuário autenticado.");
  }
}

export const healthRemindersRepository = {
  async getAll(personId: string) {
    return db.health_reminders.where("person_id").equals(requirePersonId(personId)).sortBy("time");
  },

  async create(input: CreateHealthReminderInput) {
    const userId = await authenticatedUserId();
    const personId = requirePersonId(input.person_id);
    await assertOwnedPerson(personId, userId);
    const normalized = normalizeHealthReminderInput({ ...input, person_id: personId });
    const stamp = now();
    const row: HealthReminderRule = {
      ...normalized,
      id: makeId(),
      user_id: userId,
      created_at: stamp,
      updated_at: stamp,
      synced: false,
    };

    await db.transaction("rw", [db.health_reminders, db.syncQueue], async () => {
      await db.health_reminders.add(row);
      await enfileirarOperacao("health_reminders", "add", row, { dispatchSync: false });
    });
    solicitarProcessamentoSync();
    return row.id;
  },

  async update(reminderId: string, personIdValue: string, changes: UpdateHealthReminderInput) {
    const current = await db.health_reminders.get(reminderId);
    const personId = requirePersonId(personIdValue);
    const userId = await authenticatedUserId();
    await assertOwnedPerson(personId, userId);
    if (!current || current.person_id !== personId || current.user_id !== userId) {
      throw new Error("Lembrete não encontrado para a pessoa ativa.");
    }

    const normalized = normalizeHealthReminderInput({
      ...current,
      ...changes,
      person_id: personId,
    });
    const row: HealthReminderRule = {
      ...current,
      ...normalized,
      id: current.id,
      user_id: current.user_id,
      person_id: personId,
      created_at: current.created_at,
      updated_at: now(),
      synced: false,
    };

    await db.transaction("rw", [db.health_reminders, db.syncQueue], async () => {
      await db.health_reminders.put(row);
      await enfileirarOperacao("health_reminders", "update", row, { dispatchSync: false });
    });
    solicitarProcessamentoSync();
    return row.id;
  },

  async setPaused(reminderId: string, personId: string, paused: boolean) {
    return this.update(reminderId, personId, { status: paused ? "paused" : "active" });
  },

  async delete(reminderId: string, personIdValue: string) {
    const current = await db.health_reminders.get(reminderId);
    const personId = requirePersonId(personIdValue);
    const userId = await authenticatedUserId();
    await assertOwnedPerson(personId, userId);
    if (!current || current.person_id !== personId || current.user_id !== userId) {
      throw new Error("Lembrete não encontrado para a pessoa ativa.");
    }

    await db.transaction("rw", [db.health_reminders, db.syncQueue], async () => {
      await db.health_reminders.delete(reminderId);
      await enfileirarOperacao("health_reminders", "delete", {
        id: reminderId,
        person_id: personId,
        user_id: userId,
      }, { dispatchSync: false });
    });
    solicitarProcessamentoSync();
    return reminderId;
  },
};
