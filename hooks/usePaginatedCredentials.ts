// hooks/usePaginatedCredentials.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { credentialsRepository } from "@/lib/repositories/credentials";
import { useAuth } from "./useAuth";
import { decryptPassword } from "@/lib/crypto";
import type { Credential } from "@/lib/types";

const PAGE_SIZE = 20;

const calculateStrength = (password: string) => {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

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
      let allCreds = await db.credentials.where("user_id").equals(user.id).toArray();

      if (category === "fracas") {
        allCreds = allCreds.filter((item) => {
          const plain = decryptPassword(item.password_encrypted) || "";
          return calculateStrength(plain) <= 2;
        });
      } else if (category === "recentes") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        allCreds = allCreds.filter(
          (item) => new Date(item.created_at) >= sevenDaysAgo
        );
      } else if (category !== "all") {
        allCreds = allCreds.filter((item) => item.category === category);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCreds = allCreds.filter(
          (item) =>
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
      let allCreds = await db.credentials.where("user_id").equals(user.id).toArray();

      if (category === "fracas") {
        allCreds = allCreds.filter((item) => {
          const plain = decryptPassword(item.password_encrypted) || "";
          return calculateStrength(plain) <= 2;
        });
      } else if (category === "recentes") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        allCreds = allCreds.filter(
          (item) => new Date(item.created_at) >= sevenDaysAgo
        );
      } else if (category !== "all") {
        allCreds = allCreds.filter((item) => item.category === category);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        allCreds = allCreds.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.username?.toLowerCase().includes(q)
        );
      }

      allCreds.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const end = page * PAGE_SIZE;
      const paginated = allCreds.slice(0, end);

      setAllLoaded(paginated.length >= allCreds.length);

      return paginated;
    },
    [user?.id, category, searchQuery, page],
    []
  );

  const loadMore = useCallback(() => {
    if (!allLoaded && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage((prev) => prev + 1);
    }
  }, [allLoaded, isLoadingMore]);

  useEffect(() => {
    setIsLoadingMore(false);
  }, [credentials]);

  const reset = useCallback(() => {
    setPage(1);
    setAllLoaded(false);
  }, []);

  useEffect(() => {
    reset();
  }, [searchQuery, category, reset]);

  const addCredential = async (
    data: Omit<Credential, "id" | "user_id" | "created_at" | "updated_at" | "synced">
  ) => {
    if (!user) throw new Error("Usuário não autenticado");
    return credentialsRepository.create(data);
  };

  const updateCredential = async (id: string, changes: Partial<Credential>) => {
    await credentialsRepository.update(id, changes);
  };

  const deleteCredential = async (id: string) => {
    await credentialsRepository.delete(id);
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