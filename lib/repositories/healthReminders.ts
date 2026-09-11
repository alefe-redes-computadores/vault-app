import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import type { CreateHealthReminderInput, HealthReminderRule, UpdateHealthReminderInput } from "@/lib/health-reminders/types";

const id = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const person = (value?: string) => { const v = value?.trim(); if (!v) throw new Error("Pessoa ativa não identificada."); return v; };
const clock = (value: string) => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Horário inválido."); return value; };
const days = (value: number[]) => Array.from(new Set(value.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort();
async function userId() { const { data, error } = await supabase.auth.getUser(); if (error || !data.user) throw new Error("Usuário não autenticado."); return data.user.id; }

export const healthRemindersRepository = {
  async getAll(personId: string) { return db.health_reminders.where("person_id").equals(person(personId)).sortBy("time"); },
  async create(input: CreateHealthReminderInput) {
    const uid = await userId(); const stamp = now();
    const row: HealthReminderRule = { ...input, id: id(), user_id: uid, person_id: person(input.person_id), title: input.title.trim(), target_type: input.target_type.trim(), target_route: input.target_route.trim(), time: clock(input.time), weekdays: days(input.weekdays), created_at: stamp, updated_at: stamp, synced: false };
    if (!row.title || !row.target_type || !row.target_route) throw new Error("Preencha os dados do lembrete.");
    await db.transaction("rw", [db.health_reminders, db.syncQueue], async () => { await db.health_reminders.add(row); await enfileirarOperacao("health_reminders", "add", row, { dispatchSync: false }); });
    solicitarProcessamentoSync(); return row.id;
  },
  async update(reminderId: string, personId: string, changes: UpdateHealthReminderInput) {
    const current = await db.health_reminders.get(reminderId); const pid = person(personId); const uid = await userId();
    if (!current || current.person_id !== pid || current.user_id !== uid) throw new Error("Lembrete não encontrado para a pessoa ativa.");
    const row: HealthReminderRule = { ...current, ...changes, id: current.id, user_id: current.user_id, person_id: pid, title: (changes.title ?? current.title).trim(), target_type: (changes.target_type ?? current.target_type).trim(), target_route: (changes.target_route ?? current.target_route).trim(), time: clock(changes.time ?? current.time), weekdays: days(changes.weekdays ?? current.weekdays), updated_at: now(), synced: false };
    await db.transaction("rw", [db.health_reminders, db.syncQueue], async () => { await db.health_reminders.put(row); await enfileirarOperacao("health_reminders", "update", row, { dispatchSync: false }); });
    solicitarProcessamentoSync(); return row.id;
  },
  async setPaused(reminderId: string, personId: string, paused: boolean) { return this.update(reminderId, personId, { status: paused ? "paused" : "active" }); },
  async delete(reminderId: string, personId: string) {
    const current = await db.health_reminders.get(reminderId); const pid = person(personId); const uid = await userId();
    if (!current || current.person_id !== pid || current.user_id !== uid) throw new Error("Lembrete não encontrado para a pessoa ativa.");
    await db.transaction("rw", [db.health_reminders, db.syncQueue], async () => { await db.health_reminders.delete(reminderId); await enfileirarOperacao("health_reminders", "delete", { id: reminderId, person_id: pid, user_id: uid }, { dispatchSync: false }); });
    solicitarProcessamentoSync(); return reminderId;
  },
};
