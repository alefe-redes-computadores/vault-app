// hooks/useCards.ts

"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";

import {
  cardsRepository,
  type CardCreateInput,
  type CardUpdateInput,
} from "@/lib/repositories/cards";

import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";

// ============================================================
// HOOK
// ============================================================

export function useCards() {
  const { user } = useAuth();

  const {
    activePersonId,
    loading: personLoading,
  } = useActivePersonId();

  // ==========================================================
  // CARDS DA PESSOA ATIVA
  //
  // Usa o índice person_id criado na migration Dexie v34.
  //
  // Também validamos user_id depois da consulta para garantir
  // isolamento local entre contas.
  // ==========================================================

  const cards = useLiveQuery(
    async () => {
      if (
        !user?.id ||
        !activePersonId
      ) {
        return [];
      }

      const rows =
        await db.bankCards
          .where("person_id")
          .equals(activePersonId)
          .toArray();

      return rows.filter(
        (card) =>
          card.user_id === user.id
      );
    },
    [
      user?.id,
      activePersonId,
    ],
    []
  );

  // ==========================================================
  // CREATE
  // ==========================================================

  const addCard = async (
    data: CardCreateInput
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      throw new Error(
        "Nenhuma pessoa ativa selecionada"
      );
    }

    if (
      data.person_id !==
      activePersonId
    ) {
      throw new Error(
        "O cartão deve pertencer à pessoa ativa"
      );
    }

    return cardsRepository.create(
      data
    );
  };

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateCard = async (
    id: string,
    data: CardUpdateInput
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      throw new Error(
        "Nenhuma pessoa ativa selecionada"
      );
    }

    if (
      data.person_id !== undefined &&
      data.person_id !==
        activePersonId
    ) {
      throw new Error(
        "Não é permitido alterar a pessoa do cartão por este fluxo"
      );
    }

    return cardsRepository.update(
      id,
      activePersonId,
      data
    );
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteCard = async (
    id: string
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      throw new Error(
        "Nenhuma pessoa ativa selecionada"
      );
    }

    return cardsRepository.delete(
      id,
      activePersonId
    );
  };

  // ==========================================================
  // GET BY ID
  // ==========================================================

  const getCard = async (
    id: string
  ) => {
    if (!user) {
      throw new Error(
        "Usuário não autenticado"
      );
    }

    if (!activePersonId) {
      return null;
    }

    return cardsRepository.getById(
      id,
      activePersonId
    );
  };

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    cards:
      cards || [],

    activePersonId,

    loading:
      personLoading ||
      cards === undefined,

    addCard,
    updateCard,
    deleteCard,
    getCard,
  };
}