import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Document } from "@/lib/types";

export function useDocuments(personId?: string) {
  return useLiveQuery<Document[]>(() => {
    if (personId) {
      return db.documents.where("person_id").equals(personId).toArray();
    }
    return db.documents.toArray();
  }, [personId]) || [];
}

export function useDocument(id: string) {
  return useLiveQuery<Document | undefined>(() => {
    if (!id) return undefined;
    return db.documents.get(id);
  }, [id]);
}
