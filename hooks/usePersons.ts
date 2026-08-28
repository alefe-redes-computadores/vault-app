// hooks/usePersons.ts

"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";

import type { Person } from "@/lib/types";

export function usePersons(): Person[] {
  const { user } = useAuth();

  const persons =
    useLiveQuery<Person[]>(
      async () => {
        if (!user?.id) {
          return [];
        }

        return db.persons
          .where("user_id")
          .equals(user.id)
          .toArray();
      },
      [user?.id]
    );

  return persons ?? [];
}

export function usePerson(
  id?: string
): Person | undefined {
  const { user } = useAuth();

  return useLiveQuery<
    Person | undefined
  >(
    async () => {
      if (
        !id ||
        !user?.id
      ) {
        return undefined;
      }

      const person =
        await db.persons.get(id);

      if (
        !person ||
        person.user_id !==
          user.id
      ) {
        return undefined;
      }

      return person;
    },
    [
      id,
      user?.id,
    ]
  );
}