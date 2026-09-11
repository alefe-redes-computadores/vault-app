"use client";
import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { healthRemindersRepository } from "@/lib/repositories/healthReminders";
import type { CreateHealthReminderInput, UpdateHealthReminderInput } from "@/lib/health-reminders/types";

export function useHealthReminders() {
  const { activePersonId } = useActivePersonId();
  const reminders = useLiveQuery(() => activePersonId ? healthRemindersRepository.getAll(activePersonId) : [], [activePersonId]);
  const requirePerson = useCallback(() => { if (!activePersonId) throw new Error("Pessoa ativa não identificada."); return activePersonId; }, [activePersonId]);
  return {
    reminders: reminders ?? [], isLoading: reminders === undefined,
    createReminder: useCallback((input: Omit<CreateHealthReminderInput, "person_id">) => healthRemindersRepository.create({ ...input, person_id: requirePerson() }), [requirePerson]),
    updateReminder: useCallback((id: string, changes: UpdateHealthReminderInput) => healthRemindersRepository.update(id, requirePerson(), changes), [requirePerson]),
    pauseReminder: useCallback((id: string, paused: boolean) => healthRemindersRepository.setPaused(id, requirePerson(), paused), [requirePerson]),
    deleteReminder: useCallback((id: string) => healthRemindersRepository.delete(id, requirePerson()), [requirePerson]),
  };
}
