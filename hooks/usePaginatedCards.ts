// hooks/usePaginatedCards.ts

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
  cardsRepository,
  type CardCreateInput,
  type CardUpdateInput,
} from "@/lib/repositories/cards";

import { useAuth } from "./useAuth";

import type {
  BankCard,
  CardType,
} from "@/lib/types";

const PAGE_SIZE = 20;

const CONTA_TYPES: CardType[] = [
  "conta_corrente",
  "conta_poupanca",
  "conta_digital",
];

const CARTAO_TYPES: CardType[] = [
  "cartao_credito",
  "cartao_debito",
];

type CardListType =
  | "all"
  | "cartoes"
  | "contas"
  | CardType;

interface UsePaginatedCardsOptions {
  searchQuery?: string;
  selectedType?: CardListType;
  personId?: string | null;
  initialPage?: number;

  /**
   * Compatibilidade apenas para leitura de dados antigos.
   *
   * Novos registros não podem mais ser criados sem person_id.
   */
  includeLegacyWithoutPerson?: boolean;
}

export function usePaginatedCards({
  searchQuery = "",
  selectedType = "all",
  personId,
  initialPage = 1,
  includeLegacyWithoutPerson = true,
}: UsePaginatedCardsOptions = {}) {
  const { user } = useAuth();

  const [
    page,
    setPage,
  ] = useState(initialPage);

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] = useState(false);

  const filteredCards =
    useLiveQuery(
      async () => {
        if (!user?.id) {
          return [];
        }

        let items =
          await db.bankCards
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
          applyTypeFilter(
            items,
            selectedType
          );

        const query =
          searchQuery
            .trim()
            .toLocaleLowerCase(
              "pt-BR"
            );

        if (query) {
          items =
            items.filter(
              (item) => {
                const title =
                  item.title.toLocaleLowerCase(
                    "pt-BR"
                  );

                const bankName =
                  item.bank_name.toLocaleLowerCase(
                    "pt-BR"
                  );

                return (
                  title.includes(
                    query
                  ) ||
                  bankName.includes(
                    query
                  )
                );
              }
            );
        }

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
        selectedType,
        searchQuery,
        personId,
        includeLegacyWithoutPerson,
      ]
    ) ?? [];

  const totalCount =
    filteredCards.length;

  const cards =
    useMemo(
      () =>
        filteredCards.slice(
          0,
          page * PAGE_SIZE
        ),
      [
        filteredCards,
        page,
      ]
    );

  const hasMore =
    cards.length <
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
  }, [cards.length]);

  useEffect(() => {
    setPage(initialPage);
    setIsLoadingMore(false);
  }, [
    searchQuery,
    selectedType,
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

  const addCard = async (
    cardData: CardCreateInput
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    const currentPersonId =
      requirePersonId();

    if (
      cardData.person_id !==
      currentPersonId
    ) {
      throw new Error(
        "O cartão ou conta deve pertencer à pessoa selecionada"
      );
    }

    return cardsRepository.create(
      cardData
    );
  };

  const updateCard = async (
    id: string,
    changes: CardUpdateInput
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
        "Não é permitido transferir o cartão ou conta para outra pessoa por esta tela"
      );
    }

    return cardsRepository.update(
      id,
      currentPersonId,
      changes
    );
  };

  const deleteCard = async (
    id: string
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    const currentPersonId =
      requirePersonId();

    return cardsRepository.delete(
      id,
      currentPersonId
    );
  };

  return {
    cards,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMore,
    addCard,
    updateCard,
    deleteCard,
  };
}

function applyPersonFilter(
  cards: BankCard[],
  personId:
    | string
    | null
    | undefined,
  includeLegacyWithoutPerson: boolean
): BankCard[] {
  if (!personId) {
    return cards;
  }

  return cards.filter(
    (item) => {
      if (
        item.person_id ===
        personId
      ) {
        return true;
      }

      if (
        includeLegacyWithoutPerson &&
        !item.person_id
      ) {
        return true;
      }

      return false;
    }
  );
}

function applyTypeFilter(
  cards: BankCard[],
  selectedType: CardListType
): BankCard[] {
  if (
    selectedType ===
    "cartoes"
  ) {
    return cards.filter(
      (item) =>
        CARTAO_TYPES.includes(
          item.type
        )
    );
  }

  if (
    selectedType ===
    "contas"
  ) {
    return cards.filter(
      (item) =>
        CONTA_TYPES.includes(
          item.type
        )
    );
  }

  if (
    selectedType !== "all"
  ) {
    return cards.filter(
      (item) =>
        item.type ===
        selectedType
    );
  }

  return cards;
}