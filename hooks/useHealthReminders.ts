"use client";
import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { healthRemindersRepository } from "@/lib/repositories/healthReminders";
import type { CreateHealthReminderInput, UpdateHealthReminderInput } from "@/lib/health-reminders/types";

export function useHealthReminders() {
  const { activePersonId } = useActivePersonId();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const snapshot = useLiveQuery(async () => ({
    userId, personId: activePersonId,
    rows: userId && activePersonId ? await healthRemindersRepository.getAll(activePersonId) : [],
  }), [userId, activePersonId]);
  const scopedSnapshot = snapshot?.userId === userId && snapshot?.personId === activePersonId ? snapshot : undefined;
  const requirePerson = useCallback(() => { if (!activePersonId) throw new Error("Pessoa ativa não identificada."); return activePersonId; }, [activePersonId]);
  return {
    reminders: scopedSnapshot?.rows ?? [], isLoading: scopedSnapshot === undefined,
    createReminder: useCallback((input: Omit<CreateHealthReminderInput, "person_id">) => healthRemindersRepository.create({ ...input, person_id: requirePerson() }), [requirePerson]),
    createReminders: useCallback((inputs: Omit<CreateHealthReminderInput, "person_id">[]) => { const personId = requirePerson(); return healthRemindersRepository.createMany(inputs.map(input => ({ ...input, person_id: personId }))); }, [requirePerson]),
    updateReminder: useCallback((id: string, changes: UpdateHealthReminderInput) => healthRemindersRepository.update(id, requirePerson(), changes), [requirePerson]),
    pauseReminder: useCallback((id: string, paused: boolean) => healthRemindersRepository.setPaused(id, requirePerson(), paused), [requirePerson]),
    deleteReminder: useCallback((id: string) => healthRemindersRepository.delete(id, requirePerson()), [requirePerson]),
  };
}
