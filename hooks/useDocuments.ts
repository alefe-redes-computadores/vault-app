"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";

export function useDocuments(personId?: string) { // ← string
  const { user } = useAuth();

  const documents = useLiveQuery(
    () => {
      let query = db.documents.where('user_id').equals(user?.id || '');
      if (personId) {
        query = query.and((doc) => doc.person_id === personId);
      }
      return query.toArray();
    },
    [user?.id, personId],
    []
  );

  return documents || [];
}

export function useFavorites(personId?: string) { // ← string
  const { user } = useAuth();

  const favorites = useLiveQuery(
    () => {
      let query = db.documents
        .where('user_id')
        .equals(user?.id || '')
        .and((doc) => doc.is_favorite === true);
      if (personId) {
        query = query.and((doc) => doc.person_id === personId);
      }
      return query.toArray();
    },
    [user?.id, personId],
    []
  );

  return favorites || [];
}

export function useDocument(id: string) { // ← string
  const { user } = useAuth();

  const document = useLiveQuery(
    () => db.documents.where('user_id').equals(user?.id || '').and((doc) => doc.id === id).first(),
    [user?.id, id],
    null
  );

  return document;
}