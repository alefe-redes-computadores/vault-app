// lib/repositories/persons.ts

import { db } from '../db';
import { enfileirarOperacao } from '../sync/enfileirarOperacao';
import { supabase } from '@/lib/supabase/client';
import type { Person } from '../types';

export const personsRepository = {
  async create(
    data: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'synced'>
  ): Promise<Person> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const person: Person = {
      ...data,
      id: crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substring(2),
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    await db.transaction('rw', [db.persons, db.syncQueue], async () => {
      await db.persons.add(person);
      await enfileirarOperacao('persons', 'add', person);
    });

    return person;
  },

  async update(
    id: string,
    data: Partial<Omit<Person, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced'>>
  ): Promise<Person> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const existing = await db.persons.get(id);
    if (!existing) throw new Error('Pessoa não encontrada');
    if (existing.user_id !== user.id) throw new Error('Acesso negado');

    const now = new Date().toISOString();
    const updated: Person = {
      ...existing,
      ...data,
      updated_at: now,
      synced: false,
    };

    await db.transaction('rw', [db.persons, db.syncQueue], async () => {
      await db.persons.put(updated);
      await enfileirarOperacao('persons', 'update', updated);
    });

    return updated;
  },

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const existing = await db.persons.get(id);
    if (!existing) throw new Error('Pessoa não encontrada');
    if (existing.user_id !== user.id) throw new Error('Acesso negado');

    await db.transaction('rw', [
      db.persons,
      db.documents,
      db.medicamentos,
      db.consultas,
      db.exames,
      db.cirurgias,
      db.tratamentos,
      db.cids,
      db.doseLogs,
      db.renovacoes,
      db.syncQueue,
    ], async () => {
      await db.documents.where('person_id').equals(id).delete();
      await db.medicamentos.where('person_id').equals(id).delete();
      await db.consultas.where('person_id').equals(id).delete();
      await db.exames.where('person_id').equals(id).delete();
      await db.cirurgias.where('person_id').equals(id).delete();
      await db.tratamentos.where('person_id').equals(id).delete();
      await db.cids.where('person_id').equals(id).delete();
      await db.doseLogs.where('person_id').equals(id).delete();
      await db.renovacoes.where('person_id').equals(id).delete();
      await db.persons.delete(id);
      await enfileirarOperacao('persons', 'delete', { id });
    });
  },

  async getAll(): Promise<Person[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return db.persons.where('user_id').equals(user.id).toArray();
  },

  async getById(id: string): Promise<Person | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const person = await db.persons.get(id);
    if (!person) return null;
    if (person.user_id !== user.id) return null;
    return person;
  },
};
