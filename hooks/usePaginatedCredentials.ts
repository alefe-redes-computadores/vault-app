"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddCredential, safeUpdateCredential, safeDeleteCredential } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { Credential } from "@/lib/types";

const PAGE_SIZE = 20;

interface UsePaginatedCredentialsOptions {
  searchQuery?: string;
  category?: string;
  initialPage?: number;
}

export function usePaginatedCredentials({
  searchQuery = "",
  category = "all",
  initialPage = 1,
}: UsePaginatedCredentialsOptions = {}) {
  const { user } = useAuth();
  const [page, setPage] = useState(initialPage);
  const [allLoaded, setAllLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const totalCount = useLiveQuery(
    async () => {
      if (!user) return 0;
      let allCreds = await db.credentials.where('user_id').equals(user.id).toArray();

      if (category !== "all") {
        allCreds = allCreds.filter((item: Credential) => item.category === category);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCreds = allCreds.filter((item: Credential) =>
          item.title.toLowerCase().includes(q) ||
          item.username?.toLowerCase().includes(q)
        );
      }
      return allCreds.length;
    },
    [user?.id, category, searchQuery],
    0
  );

  const credentials = useLiveQuery(
    async () => {
      if (!user) return [];
      let allCreds = await db.credentials.where('user_id').equals(user.id).toArray();

      if (category !== "all") {
        allCreds = allCreds.filter((item: Credential) => item.category === category);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCreds = allCreds.filter((item: Credential) =>
          item.title.toLowerCase().includes(q) ||
          item.username?.toLowerCase().includes(q)
        );
      }

      allCreds.sort((a: Credential, b: Credential) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const end = page * PAGE_SIZE;
      const paginated = allCreds.slice(0, end);

      if (paginated.length >= allCreds.length) {
        setAllLoaded(true);
      } else {
        setAllLoaded(false);
      }

      return paginated;
    },
    [user?.id, category, searchQuery, page],
    []
  );

  const loadMore = useCallback(() => {
    if (!allLoaded && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage((prev) => prev + 1);
      setTimeout(() => setIsLoadingMore(false), 100);
    }
  }, [allLoaded, isLoadingMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllLoaded(false);
  }, []);

  useEffect(() => {
    reset();
  }, [searchQuery, category, reset]);

  const addCredential = async (credData: Omit<Credential, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
    if (!user) throw new Error("Usuário não autenticado");
    return await safeAddCredential({ ...credData, user_id: user.id });
  };

  const updateCredential = async (id: string, changes: Partial<Credential>) => {
    await safeUpdateCredential(id, changes);
  };

  const deleteCredential = async (id: string) => {
    await safeDeleteCredential(id);
  };

  const hasMore = !allLoaded && (credentials?.length || 0) < (totalCount || 0);

  return {
    credentials: credentials || [],
    totalCount: totalCount || 0,
    hasMore,
    isLoadingMore,
    loadMore,
    addCredential,
    updateCredential,
    deleteCredential,
  };
}
