// hooks/useRetiradas.ts
"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { retiradasRepository } from "@/lib/repositories/retiradas";
import { useActivePersonId } from "./useActivePersonId";
import type { RetiradaCreateInput, RetiradaUpdateInput } from "@/lib/repositories/retiradas";

export function useRetiradas(medicamentoId?:string){
  const {activePersonId}=useActivePersonId();

  const retiradas=useLiveQuery(
    async()=>{
      if(!activePersonId)return [];

      return medicamentoId
        ? retiradasRepository.getByMedicamento(activePersonId,medicamentoId)
        : retiradasRepository.getAll(activePersonId);
    },
    [activePersonId,medicamentoId],
    []
  );

  const getRetirada=useCallback(
    async(id:string)=>{
      if(!activePersonId)return undefined;
      return retiradasRepository.getById(id,activePersonId);
    },
    [activePersonId]
  );

  const getRetiradasByDate=useCallback(
    async(data:string)=>{
      if(!activePersonId)return [];
      return retiradasRepository.getByDate(activePersonId,data);
    },
    [activePersonId]
  );

  const addRetirada=useCallback(
    async(data:Omit<RetiradaCreateInput,"person_id">)=>{
      if(!activePersonId)throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.create({...data,person_id:activePersonId});
    },
    [activePersonId]
  );

  const updateRetirada=useCallback(
    async(id:string,data:RetiradaUpdateInput)=>{
      if(!activePersonId)throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.update(id,activePersonId,data);
    },
    [activePersonId]
  );

  const deleteRetirada=useCallback(
    async(id:string)=>{
      if(!activePersonId)throw new Error("Pessoa ativa não identificada.");
      return retiradasRepository.delete(id,activePersonId);
    },
    [activePersonId]
  );

  return {
    retiradas:retiradas??[],
    getRetirada,
    getRetiradasByDate,
    addRetirada,
    updateRetirada,
    deleteRetirada,
    activePersonId
  };
}
