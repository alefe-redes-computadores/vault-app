"use client";

import { useCallback } from "react";
import { db, safeAddDocument, safeUpdateDocument, safeDeleteDocument, toggleFavorite } from "@/lib/db";
import { useAuth } from "./useAuth";

export function useSafeDb() {
  const { user } = useAuth();

  const addDocument = useCallback(
    async (doc: any) => {
      return safeAddDocument({
        ...doc,
        user_id: user?.id || "",
      });
    },
    [user]
  );

  const updateDocument = useCallback(
    async (id: number, changes: any) => {
      return safeUpdateDocument(id, changes);
    },
    []
  );

  const deleteDocument = useCallback(
    async (id: number) => {
      return safeDeleteDocument(id);
    },
    []
  );

  const favorite = useCallback(
    async (id: number) => {
      return toggleFavorite(id);
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