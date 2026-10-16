"use client";
import { useSearchParams } from "next/navigation";
import { preserveReturnTarget, safeReturnTarget } from "@/lib/navigation/return-context";

export function useReturnContext(fallback:string){
  const params=useSearchParams();
  return {
    backTarget:safeReturnTarget(params.get("return_to"),fallback),
    preserveReturn:(href:string)=>preserveReturnTarget(href,params),
  };
}
