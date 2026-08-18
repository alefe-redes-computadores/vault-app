// lib/repositories/cards.ts

import { db } from '../db';
import { enfileirarOperacao } from '../sync/enfileirarOperacao';
import type { BankCard } from '../types';

export const cardsRepository = {
  async create(
    data: Omit<BankCard, 'id' | 'created_at' | 'updated_at' | 'synced'>,
    userId: string
  ): Promise<BankCard> {
    const now = new Date().toISOString();
    const card: BankCard = {
      ...data,
      id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substring(2),
      user_id: userId,
      created_at: now,
      updated_at: now,
      synced: false,
    };
    await db.bankCards.add(card);
    // Enfileira para sincronização
    await enfileirarOperacao('bank_cards', 'add', card);
    return card;
  },

  async update(
    id: string,
    data: Partial<Omit<BankCard, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>>,
    userId: string
  ): Promise<BankCard> {
    const existing = await db.bankCards.get(id);
    if (!existing) throw new Error('Cartão não encontrado');
    if (existing.user_id !== userId) throw new Error('Acesso negado');

    const now = new Date().toISOString();
    const updated: BankCard = {
      ...existing,
      ...data,
      updated_at: now,
      synced: false,
    };
    await db.bankCards.update(id, updated);
    await enfileirarOperacao('bank_cards', 'update', updated);
    return updated;
  },

  async delete(id: string, userId: string): Promise<void> {
    const existing = await db.bankCards.get(id);
    if (!existing) throw new Error('Cartão não encontrado');
    if (existing.user_id !== userId) throw new Error('Acesso negado');
    await db.bankCards.delete(id);
    await enfileirarOperacao('bank_cards', 'delete', { id });
  },

  async getAll(userId: string): Promise<BankCard[]> {
    return db.bankCards.where('user_id').equals(userId).toArray();
  },

  async getById(id: string, userId: string): Promise<BankCard | null> {
    const card = await db.bankCards.get(id);
    if (!card) return null;
    if (card.user_id !== userId) return null;
    return card;
  },
};