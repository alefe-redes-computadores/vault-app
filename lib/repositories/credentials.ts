// lib/repositories/credentials.ts
import { db } from '../db';
import { enfileirarOperacao } from '../sync/enfileirarOperacao';
import { supabase } from '@/lib/supabase/client';
import type { Credential } from '../types';

export const credentialsRepository = {
  async create(
    data: Omit<Credential, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>
  ): Promise<Credential> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const credential: Credential = {
      ...data,
      id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substring(2),
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
    };
    await db.credentials.add(credential);
    await enfileirarOperacao('credentials', 'add', credential);
    return credential;
  },

  async update(
    id: string,
    data: Partial<Omit<Credential, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>>
  ): Promise<Credential> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const existing = await db.credentials.get(id);
    if (!existing) throw new Error('Credencial não encontrada');
    if (existing.user_id !== user.id) throw new Error('Acesso negado');

    const now = new Date().toISOString();
    const updated: Credential = {
      ...existing,
      ...data,
      updated_at: now,
      synced: false,
    };
    await db.credentials.put(updated);
    await enfileirarOperacao('credentials', 'update', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const existing = await db.credentials.get(id);
    if (!existing) throw new Error('Credencial não encontrada');
    if (existing.user_id !== user.id) throw new Error('Acesso negado');
    await db.credentials.delete(id);
    await enfileirarOperacao('credentials', 'delete', { id });
  },

  async getAll(): Promise<Credential[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return db.credentials.where('user_id').equals(user.id).toArray();
  },

  async getById(id: string): Promise<Credential | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const cred = await db.credentials.get(id);
    if (!cred) return null;
    if (cred.user_id !== user.id) return null;
    return cred;
  },
};