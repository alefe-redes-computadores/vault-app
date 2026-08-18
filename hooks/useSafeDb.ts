// hooks/useSafeDb.ts
"use client";

import { useCallback } from "react";
import { documentsRepository } from "@/lib/repositories/documents";
import { useAuth } from "./useAuth";
import type { Document } from "@/lib/types";

export function useSafeDb() {
  const { user } = useAuth();

  const addDocument = useCallback(
    async (doc: Omit<Document, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
      return documentsRepository.create({ ...doc, user_id: user?.id || "" });
    },
    [user]
  );

  const updateDocument = useCallback(
    async (id: string, changes: Partial<Document>) => {
      return documentsRepository.update(id, changes);
    },
    []
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      return documentsRepository.delete(id);
    },
    []
  );

  const favorite = useCallback(
    async (id: string) => {
      return documentsRepository.favorite(id);
    },
    []
  );

  return {
    addDocument,
    updateDocument,
    deleteDocument,
    favorite,
  };
}