// contexts/PersonContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { db, getDefaultPersonId, updateDefaultPersonId } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";

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

  // Carregar a pessoa padrão ao iniciar
  useEffect(() => {
    const loadDefaultPerson = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const defaultId = await getDefaultPersonId();
        
        if (defaultId) {
          // Verificar se a pessoa ainda existe
          const person = await db.persons.get(defaultId);
          if (person) {
            setActivePersonId(defaultId);
            applyPersonColor(defaultId);
            setLoading(false);
            return;
          }
        }

        // Se não houver pessoa padrão, pegar a primeira pessoa
        const persons = await db.persons.toArray();
        if (persons.length > 0) {
          const firstPersonId = persons[0].id!;
          setActivePersonId(firstPersonId);
          await updateDefaultPersonId(firstPersonId);
          applyPersonColor(firstPersonId);
        }
      } catch (error) {
        console.error("Erro ao carregar pessoa padrão:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDefaultPerson();
  }, [user]);

  // Aplicar a cor da pessoa no CSS
  const applyPersonColor = useCallback(async (personId: string) => {
    try {
      const person = await db.persons.get(personId);
      if (person?.color) {
        document.documentElement.style.setProperty("--person-accent", person.color);
      } else {
        // Cor padrão (ice) se a pessoa não tiver cor definida
        document.documentElement.style.setProperty("--person-accent", "#38BDF8");
      }
    } catch (error) {
      console.error("Erro ao aplicar cor da pessoa:", error);
    }
  }, []);

  // Função para trocar de pessoa
  const changePerson = useCallback(async (personId: string) => {
    if (!personId) return;

    try {
      // Verificar se a pessoa existe
      const person = await db.persons.get(personId);
      if (!person) {
        console.error("Pessoa não encontrada:", personId);
        return;
      }

      setActivePersonId(personId);
      
      // Salvar como pessoa padrão no settings
      await updateDefaultPersonId(personId);
      
      // Aplicar a cor
      await applyPersonColor(personId);
    } catch (error) {
      console.error("Erro ao trocar pessoa:", error);
    }
  }, [applyPersonColor]);

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