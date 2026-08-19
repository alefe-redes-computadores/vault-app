// hooks/useDefaultPerson.ts
"use client";

import { useEffect, useState } from "react";
import { getDefaultPersonId, updateDefaultPersonId, db } from "@/lib/db";
import type { Person } from "@/lib/types";

export function useDefaultPerson() {
  const [defaultPersonId, setDefaultPersonId] = useState<string | null>(null);
  const [defaultPerson, setDefaultPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDefault = async () => {
      try {
        const id = await getDefaultPersonId();
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
  }, []);

  const setDefaultPersonHandler = async (personId: string) => {
    try {
      await updateDefaultPersonId(personId);
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