"use client";

import { useState, useEffect } from "react";
import { db, safeAddCard, safeUpdateCard, safeDeleteCard } from "@/lib/db";
import type { BankCard } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth"; // ou o seu hook de autenticação atual

export function useCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCards() {
      try {
        const allCards = await db.cards.toArray();
        // Ordena por data de criação decrescente (mais recentes primeiro)
        allCards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setCards(allCards);
      } catch (error) {
        console.error("Erro ao carregar cartões e contas:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCards();

    // Listener para atualizar em tempo real quando houver mudanças no Dexie
    const handleSyncUpdate = async () => {
      const allCards = await db.cards.toArray();
      allCards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCards(allCards);
    };

    window.addEventListener("sync:success", handleSyncUpdate);
    window.addEventListener("db:changed", handleSyncUpdate);

    return () => {
      window.removeEventListener("sync:success", handleSyncUpdate);
      window.removeEventListener("db:changed", handleSyncUpdate);
    };
  }, []);

  const addCard = async (cardData: Omit<BankCard, "id" | "user_id" | "created_at" | "updated_at" | "synced">) => {
    if (!user) throw new Error("Usuário não autenticado");
    
    const id = await safeAddCard({
      ...cardData,
      user_id: user.id,
    });

    const allCards = await db.cards.toArray();
    allCards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setCards(allCards);

    return id;
  };

  const updateCard = async (id: string, changes: Partial<BankCard>) => {
    await safeUpdateCard(id, changes);
    
    const allCards = await db.cards.toArray();
    allCards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setCards(allCards);
  };

  const deleteCard = async (id: string) => {
    await safeDeleteCard(id);
    setCards((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    cards,
    loading,
    addCard,
    updateCard,
    deleteCard,
  };
}
