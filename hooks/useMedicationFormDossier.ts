"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { useActivePersonId } from "@/hooks/useActivePersonId";
import { cidsRepository } from "@/lib/repositories/cids";
import { farmaciasRepository } from "@/lib/repositories/farmacias";
import { hospitaisRepository } from "@/lib/repositories/hospitais";
import { locaisRepository } from "@/lib/repositories/locais";
import { medicosRepository } from "@/lib/repositories/medicos";
import { medicamentosRepository } from "@/lib/repositories/medicamentos";

export function useMedicationFormDossier(excludedMedicationId?: string) {
  const { activePersonId } = useActivePersonId();

  const dossier = useLiveQuery(async () => {
    const [medicos, farmacias, hospitais, locais, cids, medicamentos] =
      await Promise.all([
        medicosRepository.getAll(),
        farmaciasRepository.getAll(),
        hospitaisRepository.getAll(),
        locaisRepository.getAll(),
        activePersonId ? cidsRepository.getAll(activePersonId) : Promise.resolve([]),
        activePersonId
          ? medicamentosRepository.getAll(activePersonId)
          : Promise.resolve([]),
      ]);

    return {
      medicos,
      farmacias,
      hospitais,
      locais,
      cids,
      medicamentosAtivos: medicamentos.filter(
        (medicamento) =>
          medicamento.id !== excludedMedicationId &&
          medicamento.status !== "descontinuado"
      ),
    };
  }, [activePersonId, excludedMedicationId]);

  const requirePersonId = useCallback(() => {
    if (!activePersonId) {
      throw new Error("Pessoa ativa não identificada.");
    }
    return activePersonId;
  }, [activePersonId]);

  const getMedicamento = useCallback(
    (id: string) =>
      activePersonId
        ? medicamentosRepository.getById(id, activePersonId)
        : Promise.resolve(undefined),
    [activePersonId]
  );
  const updateMedicamento = useCallback(
    (id: string, data: Parameters<typeof medicamentosRepository.update>[2]) =>
      medicamentosRepository.update(id, requirePersonId(), data),
    [requirePersonId]
  );
  const deleteMedicamento = useCallback(
    (id: string) => medicamentosRepository.delete(id, requirePersonId()),
    [requirePersonId]
  );

  return {
    medicos: dossier?.medicos ?? [],
    farmacias: dossier?.farmacias ?? [],
    hospitais: dossier?.hospitais ?? [],
    locais: dossier?.locais ?? [],
    cids: dossier?.cids ?? [],
    medicamentosAtivos: dossier?.medicamentosAtivos ?? [],
    isLoadingDossier: dossier === undefined,
    addMedico: medicosRepository.create,
    addFarmacia: farmaciasRepository.create,
    addHospital: hospitaisRepository.create,
    addLocal: locaisRepository.create,
    getMedicamento,
    updateMedicamento,
    deleteMedicamento,
  };
}
