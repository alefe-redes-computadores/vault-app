"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";

export function usePersons() {
  const { user } = useAuth();

  const persons = useLiveQuery(
    () => db.persons.where('user_id').equals(user?.id || '').toArray(),
    [user?.id],
    []
  );
  return persons || [];
}