// contexts/PersonContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { settingsRepository } from "@/lib/repositories/settings";

interface PersonContextType {
  activePersonId: string | null;
  setActivePersonId: (id: string | null) => void;
  changePerson: (id: string) => Promise<void>;
  loading: boolean;
}

const PersonContext = createContext<PersonContextType | undefined>(undefined);

export function PersonProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persons = useLiveQuery(() => db.persons.toArray(), [], []);
  const settings = useLiveQuery(() => db.settings.toArray(), [], []);

  const applyPersonColor = useCallback(async (personId: string) => {
    try {
      const person = await db.persons.get(personId);
      if (person?.color) {
        document.documentElement.style.setProperty("--person-accent", person.color);
      } else {
        document.documentElement.style.setProperty("--person-accent", "#38BDF8");
      }
    } catch (error) {
      console.error("Erro ao aplicar cor da pessoa:", error);
    }
  }, []);

  useEffect(() => {
    const loadDefaultPerson = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const defaultId = await settingsRepository.getDefaultPersonId(user.id);

        if (defaultId) {
          const person = await db.persons.get(defaultId);
          if (person) {
            setActivePersonId(defaultId);
            await applyPersonColor(defaultId);
            setLoading(false);
            return;
          }
        }

        if (persons.length > 0) {
          const firstPersonId = persons[0].id!;
          setActivePersonId(firstPersonId);
          await settingsRepository.setDefaultPersonId(user.id, firstPersonId);
          await applyPersonColor(firstPersonId);
        }
      } catch (error) {
        console.error("Erro ao carregar pessoa padrão:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDefaultPerson();
  }, [user, persons, settings, applyPersonColor]);

  const changePerson = useCallback(
    async (personId: string) => {
      if (!personId || !user) return;

      try {
        const person = await db.persons.get(personId);
        if (!person) {
          console.error("Pessoa não encontrada:", personId);
          return;
        }

        setActivePersonId(personId);
        await settingsRepository.setDefaultPersonId(user.id, personId);
        await applyPersonColor(personId);
      } catch (error) {
        console.error("Erro ao trocar pessoa:", error);
      }
    },
    [user, applyPersonColor]
  );

  return (
    <PersonContext.Provider value={{ activePersonId, setActivePersonId, changePerson, loading }}>
      {children}
    </PersonContext.Provider>
  );
}

export function useActivePersonId() {
  const context = useContext(PersonContext);
  if (!context) {
    throw new Error("useActivePersonId deve ser usado dentro de PersonProvider");
  }
  return context;
}