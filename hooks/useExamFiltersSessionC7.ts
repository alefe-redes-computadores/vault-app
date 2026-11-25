"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { EXAM_FILTER_DEFAULT_C7, examFilterKeyC7, parseExamFilterStateC7, serializeExamFilterStateC7, type ExamFilterStateC7 } from "@/lib/ui/exam-filter-session-model-c7";

/** Keeps UI filters in this device's tab, scoped to the active account + person. */
export function useExamFiltersSessionC7(userId?: string | null, personId?: string | null): {
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filtroStatus: ExamFilterStateC7["status"]; setFiltroStatus: Dispatch<SetStateAction<ExamFilterStateC7["status"]>>;
} {
  const scope = examFilterKeyC7(userId, personId);
  const [readyScope, setReadyScope] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExamFilterStateC7>({...EXAM_FILTER_DEFAULT_C7});
  useEffect(() => {
    let restored: ExamFilterStateC7 = {...EXAM_FILTER_DEFAULT_C7};
    if (scope) {
      try { restored = parseExamFilterStateC7(window.sessionStorage.getItem(scope), Date.now()) || restored; }
      catch { /* disabled session storage: continue without persistence */ }
    }
    setFilters(restored);
    setReadyScope(scope);
  }, [scope]);
  useEffect(() => {
    if (!scope || readyScope !== scope) return;
    try { window.sessionStorage.setItem(scope, serializeExamFilterStateC7(filters, Date.now())); }
    catch { /* no storage permission does not block the clinical screen */ }
  }, [scope, readyScope, filters]);
  const scoped = readyScope === scope ? filters : EXAM_FILTER_DEFAULT_C7;
  const setSearch: Dispatch<SetStateAction<string>> = next => setFilters(prev => ({...prev, search: typeof next === "function" ? next(prev.search) : next}));
  const setFiltroStatus: Dispatch<SetStateAction<ExamFilterStateC7["status"]>> = next => setFilters(prev => ({...prev, status: typeof next === "function" ? next(prev.status) : next}));
  return {search:scoped.search, filtroStatus:scoped.status, setSearch, setFiltroStatus};
}
