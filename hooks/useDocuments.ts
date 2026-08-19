// hooks/useDocuments.ts
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Document } from "@/lib/types";
import { useActivePersonId } from "./useActivePersonId";

export function useDocuments(personId?: string) {
  const { activePersonId } = useActivePersonId();
  const targetPersonId = personId || activePersonId || undefined;

  const documentos = useLiveQuery<Document[]>(
    () => {
      if (!targetPersonId) {
        return db.documents.toArray();
      }
      return db.documents.where("person_id").equals(targetPersonId).toArray();
    },
    [targetPersonId]
  );

  return documentos || [];
}

export function useDocument(id: string) {
  return useLiveQuery<Document | undefined>(
    () => {
      if (!id) return undefined;
      return db.documents.get(id);
    },
    [id]
  );
}