// lib/repositories/credentials.ts

import { db } from '../db';
import { enfileirarOperacao } from '../sync/enfileirarOperacao';
import type { Credential } from '../types';

export const credentialsRepository = {
  async create(
    data: Omit<Credential, 'id' | 'created_at' | 'updated_at' | 'synced'>,
    userId: string
  ): Promise<Credential> {
    const now = new Date().toISOString();
    const credential: Credential = {
      ...data,
      id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substring(2),
      user_id: userId,
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
    data: Partial<Omit<Credential, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>>,
    userId: string
  ): Promise<Credential> {
    const existing = await db.credentials.get(id);
    if (!existing) throw new Error('Credencial não encontrada');
    if (existing.user_id !== userId) throw new Error('Acesso negado');

    const now = new Date().toISOString();
    const updated: Credential = {
      ...existing,
      ...data,
      updated_at: now,
      synced: false,
    };
    await db.credentials.update(id, updated);
    await enfileirarOperacao('credentials', 'update', updated);
    return updated;
  },

  async delete(id: string, userId: string): Promise<void> {
    const existing = await db.credentials.get(id);
    if (!existing) throw new Error('Credencial não encontrada');
    if (existing.user_id !== userId) throw new Error('Acesso negado');
    await db.credentials.delete(id);
    await enfileirarOperacao('credentials', 'delete', { id });
  },

  async getAll(userId: string): Promise<Credential[]> {
    return db.credentials.where('user_id').equals(userId).toArray();
  },

  async getById(id: string, userId: string): Promise<Credential | null> {
    const cred = await db.credentials.get(id);
    if (!cred) return null;
    if (cred.user_id !== userId) return null;
    return cred;
  },
};