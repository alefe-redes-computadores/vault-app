// hooks/useActivePersonId.ts
"use client";

import { useActivePersonId as useActivePersonIdContext } from "@/contexts/PersonContext";

export function useActivePersonId() {
  return useActivePersonIdContext();
}