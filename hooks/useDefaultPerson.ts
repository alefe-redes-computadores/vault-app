// hooks/useDefaultPerson.ts
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { settingsRepository } from "@/lib/repositories/settings";
import type { Person } from "@/lib/types";

export function useDefaultPerson() {
  const { user } = useAuth();
  const [defaultPersonId, setDefaultPersonId] = useState<string | null>(null);
  const [defaultPerson, setDefaultPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDefault = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const id = await settingsRepository.getDefaultPersonId(user.id);
        setDefaultPersonId(id);

        if (id) {
          const person = await db.persons.get(id);
          if (person) {
            setDefaultPerson(person);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar pessoa padrão:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDefault();
  }, [user?.id]);

  const setDefaultPersonHandler = async (personId: string) => {
    if (!user?.id) return;

    try {
      await settingsRepository.setDefaultPersonId(user.id, personId);
      setDefaultPersonId(personId);

      const person = await db.persons.get(personId);
      if (person) {
        setDefaultPerson(person);
      }
    } catch (error) {
      console.error("Erro ao definir pessoa padrão:", error);
    }
  };

  return { defaultPersonId, defaultPerson, setDefaultPerson: setDefaultPersonHandler, loading };
}