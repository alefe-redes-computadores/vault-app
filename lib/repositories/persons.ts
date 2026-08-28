// lib/repositories/persons.ts

import { db } from "../db";
import { enfileirarOperacao } from "../sync/enfileirarOperacao";
import { supabase } from "@/lib/supabase/client";

import type {
  Person,
} from "../types";

// ============================================================
// INPUTS
// ============================================================

export interface PersonCreateInput {
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  color?: string;
}

export interface PersonUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  color?: string;
}

// ============================================================
// HELPERS
// ============================================================

async function requireUser() {
  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Usuário não autenticado"
    );
  }

  return user;
}

async function requireOwnedPerson(
  id: string,
  userId: string
): Promise<Person> {
  const person =
    await db.persons.get(id);

  if (!person) {
    throw new Error(
      "Pessoa não encontrada"
    );
  }

  if (
    person.user_id !== userId
  ) {
    throw new Error(
      "Acesso negado"
    );
  }

  return person;
}

// ============================================================
// REPOSITORY
// ============================================================

export const personsRepository = {
  // ==========================================================
  // CREATE
  // ==========================================================

  async create(
    data: PersonCreateInput
  ): Promise<Person> {
    const user =
      await requireUser();

    const now =
      new Date().toISOString();

    const person: Person = {
      id:
        crypto.randomUUID?.() ??
        Date.now().toString(
          36
        ) +
          Math.random()
            .toString(36)
            .substring(2),

      user_id: user.id,

      name:
        data.name.trim(),

      email:
        data.email
          ?.trim() ||
        undefined,

      phone:
        data.phone
          ?.trim() ||
        undefined,

      avatar_url:
        data.avatar_url
          ?.trim() ||
        undefined,

      color:
        data.color ||
        "#38BDF8",

      created_at: now,
      updated_at: now,
      synced: false,
    };

    if (!person.name) {
      throw new Error(
        "Nome é obrigatório"
      );
    }

    await db.transaction(
      "rw",
      [
        db.persons,
        db.syncQueue,
      ],
      async () => {
        await db.persons.add(
          person
        );

        await enfileirarOperacao(
          "persons",
          "add",
          person
        );
      }
    );

    return person;
  },

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    data: PersonUpdateInput
  ): Promise<Person> {
    const user =
      await requireUser();

    const existing =
      await requireOwnedPerson(
        id,
        user.id
      );

    const now =
      new Date().toISOString();

    const name =
      data.name !== undefined
        ? data.name.trim()
        : existing.name;

    if (!name) {
      throw new Error(
        "Nome é obrigatório"
      );
    }

    const updated: Person = {
      ...existing,

      ...data,

      name,

      email:
        data.email !==
        undefined
          ? data.email.trim() ||
            undefined
          : existing.email,

      phone:
        data.phone !==
        undefined
          ? data.phone.trim() ||
            undefined
          : existing.phone,

      avatar_url:
        data.avatar_url !==
        undefined
          ? data.avatar_url.trim() ||
            undefined
          : existing.avatar_url,

      color:
        data.color ||
        existing.color ||
        "#38BDF8",

      updated_at: now,
      synced: false,
    };

    await db.transaction(
      "rw",
      [
        db.persons,
        db.syncQueue,
      ],
      async () => {
        await db.persons.put(
          updated
        );

        await enfileirarOperacao(
          "persons",
          "update",
          updated
        );
      }
    );

    return updated;
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    id: string
  ): Promise<void> {
    const user =
      await requireUser();

    await requireOwnedPerson(
      id,
      user.id
    );

    /**
     * IMPORTANTE:
     *
     * Esta cascata atualmente remove os registros filhos
     * apenas do Dexie.
     *
     * A syncQueue recebe somente o delete de "persons".
     *
     * Portanto a integridade na nuvem depende de:
     *
     * - FK ON DELETE CASCADE no Supabase; ou
     * - outra estratégia server-side equivalente.
     *
     * Isso será validado durante a auditoria da arquitetura
     * de Saúde/Supabase antes de considerarmos esta cascata
     * definitivamente fechada.
     */
    await db.transaction(
      "rw",
      [
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
      ],
      async () => {
        await db.documents
          .where("person_id")
          .equals(id)
          .delete();

        await db.medicamentos
          .where("person_id")
          .equals(id)
          .delete();

        await db.consultas
          .where("person_id")
          .equals(id)
          .delete();

        await db.exames
          .where("person_id")
          .equals(id)
          .delete();

        await db.cirurgias
          .where("person_id")
          .equals(id)
          .delete();

        await db.tratamentos
          .where("person_id")
          .equals(id)
          .delete();

        await db.cids
          .where("person_id")
          .equals(id)
          .delete();

        await db.doseLogs
          .where("person_id")
          .equals(id)
          .delete();

        await db.renovacoes
          .where("person_id")
          .equals(id)
          .delete();

        await db.persons.delete(
          id
        );

        await enfileirarOperacao(
          "persons",
          "delete",
          {
            id,
          }
        );
      }
    );
  },

  // ==========================================================
  // GET ALL
  // ==========================================================

  async getAll(): Promise<
    Person[]
  > {
    const user =
      await requireUser();

    return db.persons
      .where("user_id")
      .equals(user.id)
      .toArray();
  },

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(
    id: string
  ): Promise<Person | null> {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const person =
      await db.persons.get(id);

    if (
      !person ||
      person.user_id !==
        user.id
    ) {
      return null;
    }

    return person;
  },
};