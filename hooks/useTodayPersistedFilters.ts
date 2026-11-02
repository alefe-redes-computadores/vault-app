"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export type FiltroStatus = "todos" | "tomados" | "pendentes" | "ignorados";
export type FiltroPeriodo = "todos" | "manha" | "tarde" | "noite";
const STATUS_KEY="@vault:today_filter_status_v97";
const PERIOD_KEY="@vault:today_filter_period_v97";
const statuses:readonly string[]=["todos","tomados","pendentes","ignorados"];
const periods:readonly string[]=["todos","manha","tarde","noite"];
export type TodayFilterState = {
  filtroStatus:FiltroStatus;
  setFiltroStatus:Dispatch<SetStateAction<FiltroStatus>>;
  filtroPeriodo:FiltroPeriodo;
  setFiltroPeriodo:Dispatch<SetStateAction<FiltroPeriodo>>;
};
/** Hydration barrier: never overwrite saved filters with defaults before the read. */
export function useTodayPersistedFilters():TodayFilterState {
  const [filtroStatus,setFiltroStatus]=useState<FiltroStatus>("todos");
  const [filtroPeriodo,setFiltroPeriodo]=useState<FiltroPeriodo>("todos");
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{
    try {
      const status=window.localStorage.getItem(STATUS_KEY);
      const period=window.localStorage.getItem(PERIOD_KEY);
      if(status&&statuses.includes(status))setFiltroStatus(status as FiltroStatus);
      if(period&&periods.includes(period))setFiltroPeriodo(period as FiltroPeriodo);
    } catch { /* storage can be unavailable in private mode */ }
    finally {setHydrated(true);}
  },[]);
  useEffect(()=>{
    if(!hydrated)return;
    try {
      window.localStorage.setItem(STATUS_KEY,filtroStatus);
      window.localStorage.setItem(PERIOD_KEY,filtroPeriodo);
    } catch { /* keep interactive filters available without persistence */ }
  },[hydrated,filtroStatus,filtroPeriodo]);
  return {filtroStatus,setFiltroStatus,filtroPeriodo,setFiltroPeriodo};
}
