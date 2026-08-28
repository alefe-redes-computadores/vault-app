// hooks/usePaginatedCredentials.ts

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  credentialsRepository,
  type CredentialCreateInput,
  type CredentialUpdateInput,
} from "@/lib/repositories/credentials";
import { decryptPassword } from "@/lib/crypto";

import { useAuth } from "./useAuth";

import type { Credential } from "@/lib/types";

const PAGE_SIZE = 20;

type CredentialCategoryFilter =
  | "all"
  | "fracas"
  | "recentes"
  | Credential["category"];

interface UsePaginatedCredentialsOptions {
  searchQuery?: string;
  category?: CredentialCategoryFilter;
  personId?: string | null;
  initialPage?: number;
  includeLegacyWithoutPerson?: boolean;
}

function calculateStrength(
  password: string
): number {
  let score = 0;

  if (!password) {
    return score;
  }

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  return score;
}

function applyPersonFilter(
  credentials: Credential[],
  personId: string | null | undefined,
  includeLegacyWithoutPerson: boolean
): Credential[] {
  if (!personId) {
    return credentials;
  }

  return credentials.filter(
    (credential) => {
      if (
        credential.person_id ===
        personId
      ) {
        return true;
      }

      if (
        includeLegacyWithoutPerson &&
        !credential.person_id
      ) {
        return true;
      }

      return false;
    }
  );
}

function applyCategoryFilter(
  credentials: Credential[],
  category: CredentialCategoryFilter
): Credential[] {
  if (category === "fracas") {
    return credentials.filter(
      (credential) => {
        const password =
          decryptPassword(
            credential.password_encrypted
          );

        return (
          calculateStrength(
            password
          ) <= 2
        );
      }
    );
  }

  if (category === "recentes") {
    const sevenDaysAgo =
      new Date();

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() -
        7
    );

    return credentials.filter(
      (credential) =>
        new Date(
          credential.created_at
        ).getTime() >=
        sevenDaysAgo.getTime()
    );
  }

  if (category !== "all") {
    return credentials.filter(
      (credential) =>
        credential.category ===
        category
    );
  }

  return credentials;
}

function applySearchFilter(
  credentials: Credential[],
  searchQuery: string
): Credential[] {
  const query =
    searchQuery
      .trim()
      .toLocaleLowerCase(
        "pt-BR"
      );

  if (!query) {
    return credentials;
  }

  return credentials.filter(
    (credential) => {
      const title =
        credential.title.toLocaleLowerCase(
          "pt-BR"
        );

      const username =
        credential.username?.toLocaleLowerCase(
          "pt-BR"
        ) || "";

      const url =
        credential.url?.toLocaleLowerCase(
          "pt-BR"
        ) || "";

      return (
        title.includes(query) ||
        username.includes(query) ||
        url.includes(query)
      );
    }
  );
}

export function usePaginatedCredentials({
  searchQuery = "",
  category = "all",
  personId,
  initialPage = 1,
  includeLegacyWithoutPerson = true,
}: UsePaginatedCredentialsOptions = {}) {
  const { user } = useAuth();

  const [
    page,
    setPage,
  ] = useState(initialPage);

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] = useState(false);

  const filteredCredentials =
    useLiveQuery(
      async () => {
        if (!user?.id) {
          return [];
        }

        let items =
          await db.credentials
            .where("user_id")
            .equals(user.id)
            .toArray();

        items =
          applyPersonFilter(
            items,
            personId,
            includeLegacyWithoutPerson
          );

        items =
          applyCategoryFilter(
            items,
            category
          );

        items =
          applySearchFilter(
            items,
            searchQuery
          );

        items.sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );

        return items;
      },
      [
        user?.id,
        personId,
        includeLegacyWithoutPerson,
        category,
        searchQuery,
      ]
    ) ?? [];

  const totalCount =
    filteredCredentials.length;

  const credentials =
    useMemo(
      () =>
        filteredCredentials.slice(
          0,
          page * PAGE_SIZE
        ),
      [
        filteredCredentials,
        page,
      ]
    );

  const hasMore =
    credentials.length <
    totalCount;

  const loadMore =
    useCallback(() => {
      if (
        !hasMore ||
        isLoadingMore
      ) {
        return;
      }

      setIsLoadingMore(true);

      setPage(
        (previous) =>
          previous + 1
      );
    }, [
      hasMore,
      isLoadingMore,
    ]);

  useEffect(() => {
    setIsLoadingMore(false);
  }, [credentials.length]);

  useEffect(() => {
    setPage(initialPage);
    setIsLoadingMore(false);
  }, [
    searchQuery,
    category,
    personId,
    initialPage,
  ]);

  const requirePersonId =
    (): string => {
      if (!personId) {
        throw new Error(
          "Nenhuma pessoa selecionada"
        );
      }

      return personId;
    };

  const addCredential = async (
    data: CredentialCreateInput
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    const currentPersonId =
      requirePersonId();

    if (
      data.person_id !==
      currentPersonId
    ) {
      throw new Error(
        "A credencial deve pertencer à pessoa selecionada"
      );
    }

    return credentialsRepository.create(
      data
    );
  };

  const updateCredential = async (
    id: string,
    changes: CredentialUpdateInput
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    const currentPersonId =
      requirePersonId();

    if (
      changes.person_id &&
      changes.person_id !==
        currentPersonId
    ) {
      throw new Error(
        "Não é permitido transferir a credencial para outra pessoa por esta tela"
      );
    }

    return credentialsRepository.update(
      id,
      currentPersonId,
      changes
    );
  };

  const deleteCredential = async (
    id: string
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    const currentPersonId =
      requirePersonId();

    return credentialsRepository.delete(
      id,
      currentPersonId
    );
  };

  return {
    credentials,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
    addCredential,
    updateCredential,
    deleteCredential,
  };
}