// contexts/PersonContext.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { settingsRepository } from "@/lib/repositories/settings";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

interface PersonContextType {
  activePersonId: string | null;
  changePerson: (id: string) => Promise<void>;
  loading: boolean;
}

const PersonContext =
  createContext<PersonContextType | undefined>(
    undefined
  );

export function PersonProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const [activePersonId, setActivePersonId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  // ==========================================================
  // PESSOAS DO USUÁRIO ATUAL
  // ==========================================================

  const persons = useLiveQuery(
    async () => {
      if (!user?.id) {
        return [];
      }

      return db.persons
        .where("user_id")
        .equals(user.id)
        .toArray();
    },
    [user?.id],
    []
  );

  // ==========================================================
  // IDS VÁLIDOS
  // ==========================================================

  const validPersonIds = useMemo(() => {
    return new Set(
      persons
        .map((person) => person.id)
        .filter(
          (id): id is string =>
            Boolean(id)
        )
    );
  }, [persons]);

  // ==========================================================
  // APLICAR COR
  // ==========================================================

  const applyPersonColor =
    useCallback(
      async (
        personId: string | null
      ) => {
        if (
          !personId ||
          !user?.id
        ) {
          document.documentElement.style.setProperty(
            "--person-accent",
            "#38BDF8"
          );

          return;
        }

        try {
          const person =
            await db.persons.get(
              personId
            );

          if (
            !person ||
            person.user_id !==
              user.id
          ) {
            document.documentElement.style.setProperty(
              "--person-accent",
              "#38BDF8"
            );

            return;
          }

          document.documentElement.style.setProperty(
            "--person-accent",
            person.color ||
              "#38BDF8"
          );
        } catch (error) {
          console.error(
            "Erro ao aplicar cor da pessoa:",
            error
          );

          document.documentElement.style.setProperty(
            "--person-accent",
            "#38BDF8"
          );
        }
      },
      [user?.id]
    );

  // ==========================================================
  // CARREGAR PESSOA PADRÃO
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadDefaultPerson =
      async () => {
        if (!user?.id) {
          if (!cancelled) {
            setActivePersonId(
              null
            );

            setLoading(false);

            document.documentElement.style.setProperty(
              "--person-accent",
              "#38BDF8"
            );
          }

          return;
        }

        setLoading(true);

        try {
          // Se já temos uma pessoa ativa válida
          // para este usuário, preservamos.
          if (
            activePersonId &&
            validPersonIds.has(
              activePersonId
            )
          ) {
            await applyPersonColor(
              activePersonId
            );

            return;
          }

          const defaultId =
            await settingsRepository.getDefaultPersonId(
              user.id
            );

          if (
            defaultId &&
            validPersonIds.has(
              defaultId
            )
          ) {
            if (!cancelled) {
              setActivePersonId(
                defaultId
              );
            }

            await applyPersonColor(
              defaultId
            );

            return;
          }

          const firstPerson =
            persons.find(
              (person) =>
                Boolean(
                  person.id
                )
            );

          if (
            firstPerson?.id
          ) {
            if (!cancelled) {
              setActivePersonId(
                firstPerson.id
              );
            }

            await applyPersonColor(
              firstPerson.id
            );

            try {
              await settingsRepository.setDefaultPersonId(
                user.id,
                firstPerson.id
              );
            } catch (
              persistError
            ) {
              console.error(
                "Erro ao salvar pessoa padrão automática:",
                persistError
              );
            }

            return;
          }

          if (!cancelled) {
            setActivePersonId(
              null
            );
          }

          await applyPersonColor(
            null
          );
        } catch (error) {
          console.error(
            "Erro ao carregar pessoa padrão:",
            error
          );

          if (!cancelled) {
            setActivePersonId(
              null
            );
          }

          await applyPersonColor(
            null
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    void loadDefaultPerson();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    persons,
    validPersonIds,
    activePersonId,
    applyPersonColor,
  ]);

  // ==========================================================
  // TROCAR PESSOA
  // ==========================================================

  const changePerson =
    useCallback(
      async (
        personId: string
      ) => {
        if (
          !personId ||
          !user?.id
        ) {
          throw new Error(
            "Pessoa ou usuário inválido."
          );
        }

        try {
          const person =
            await db.persons.get(
              personId
            );

          if (!person) {
            throw new Error(
              "Pessoa não encontrada."
            );
          }

          if (
            person.user_id !==
            user.id
          ) {
            throw new Error(
              "Acesso negado."
            );
          }

          setActivePersonId(
            personId
          );

          await applyPersonColor(
            personId
          );

          try {
            await settingsRepository.setDefaultPersonId(
              user.id,
              personId
            );
          } catch (
            persistError
          ) {
            console.error(
              "Erro ao salvar pessoa padrão:",
              persistError
            );
          }

          trigger("vibrate");

          showToast(
            `Pessoa alterada para ${person.name}`,
            "success"
          );
        } catch (error) {
          console.error(
            "Erro ao trocar pessoa:",
            error
          );

          trigger("error");

          showToast(
            "Não foi possível alterar a pessoa.",
            "error"
          );

          throw error;
        }
      },
      [
        user?.id,
        applyPersonColor,
        trigger,
        showToast,
      ]
    );

  // ==========================================================
  // CONTEXT
  // ==========================================================

  const value =
    useMemo<PersonContextType>(
      () => ({
        activePersonId,
        changePerson,
        loading,
      }),
      [
        activePersonId,
        changePerson,
        loading,
      ]
    );

  return (
    <PersonContext.Provider
      value={value}
    >
      {children}
    </PersonContext.Provider>
  );
}

export function useActivePersonId() {
  const context =
    useContext(PersonContext);

  if (!context) {
    throw new Error(
      "useActivePersonId deve ser usado dentro de PersonProvider"
    );
  }

  return context;
}