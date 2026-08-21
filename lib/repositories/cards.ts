// lib/repositories/cards.ts

import { db } from '../db';
import { enfileirarOperacao } from '../sync/enfileirarOperacao';
import { supabase } from '@/lib/supabase/client';
import type { BankCard } from '../types';

export const cardsRepository = {
  async create(
    data: Omit<BankCard, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>
  ): Promise<BankCard> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const card: BankCard = {
      ...data,
      id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substring(2),
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    await db.transaction('rw', [db.bankCards, db.syncQueue], async () => {
      await db.bankCards.add(card);
      await enfileirarOperacao('cards', 'add', card);
    });

    return card;
  },

  async update(
    id: string,
    data: Partial<Omit<BankCard, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>>
  ): Promise<BankCard> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const existing = await db.bankCards.get(id);
    if (!existing) throw new Error('Cartão não encontrado');
    if (existing.user_id !== user.id) throw new Error('Acesso negado');

    const now = new Date().toISOString();
    const updated: BankCard = {
      ...existing,
      ...data,
      updated_at: now,
      synced: false,
    };

    await db.transaction('rw', [db.bankCards, db.syncQueue], async () => {
      await db.bankCards.put(updated);
      await enfileirarOperacao('cards', 'update', updated);
    });

    return updated;
  },

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const existing = await db.bankCards.get(id);
    if (!existing) throw new Error('Cartão não encontrado');
    if (existing.user_id !== user.id) throw new Error('Acesso negado');

    await db.transaction('rw', [db.bankCards, db.syncQueue], async () => {
      await db.bankCards.delete(id);
      await enfileirarOperacao('cards', 'delete', { id });
    });
  },

  async getAll(): Promise<BankCard[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return db.bankCards.where('user_id').equals(user.id).toArray();
  },

  async getById(id: string): Promise<BankCard | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const card = await db.bankCards.get(id);
    if (!card) return null;
    if (card.user_id !== user.id) return null;
    return card;
  },
};
