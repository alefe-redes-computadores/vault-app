"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { documentsRepository } from "@/lib/repositories/documents";

export function useGeneralDocumentFormDossier(documentId?: string) {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();

  const dossier = useLiveQuery(async () => {
    if (!user?.id) {
      return {
        persons: [],
        vaults: [],
        document: undefined,
      };
    }

    const [persons, vaults, document] = await Promise.all([
      db.persons.where("user_id").equals(user.id).toArray(),
      activePersonId
        ? db.vaults.where("user_id").equals(user.id).toArray()
        : Promise.resolve([]),
      documentId && activePersonId
        ? documentsRepository.getById(documentId, activePersonId)
        : Promise.resolve(undefined),
    ]);

    return {
      persons,
      vaults: vaults.filter((vault) => vault.person_id === activePersonId),
      document,
    };
  }, [user?.id, activePersonId, documentId]);

  return {
    activePersonId,
    persons: dossier?.persons ?? [],
    userVaults: dossier?.vaults ?? [],
    document: dossier?.document,
    isLoading: dossier === undefined,
  };
}
