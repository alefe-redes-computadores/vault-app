"use client";
import {ArrowLeft} from "lucide-react";
import {useRouter} from "next/navigation";
import {useHapticFeedback} from "@/lib/haptics";
import {safeClinicalReturnM150} from "@/lib/navigation/clinical-return-m150";

/** P0: keep the original route where possible, and never trust an external return_to. */
export function ClinicalBackLinkP0({fallback="/saude/careflow",className="", "aria-label":accessibleLabel="Voltar"}:{fallback?:string;className?:string;"aria-label"?:string}){
  const router=useRouter();const {trigger}=useHapticFeedback();
  const goBack=()=>{
    trigger("vibrate");
    const q=new URLSearchParams(window.location.search).get("return_to");
    // Explicit origin is deterministic even after refresh/deep link. Do not re-push the child.
    // Browser/Android Back remains owned by Next.js; the on-screen arrow does not guess a history entry.
    const target=safeClinicalReturnM150(q,window.location.pathname,fallback);
    router.replace(target);
  };
  return <button type="button" aria-label={accessibleLabel} onClick={goBack} className={className}><ArrowLeft size={18} aria-hidden="true"/></button>;
}
