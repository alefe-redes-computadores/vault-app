"use client";
import {ArrowLeft} from "lucide-react";
import {useRouter} from "next/navigation";
import {useHapticFeedback} from "@/lib/haptics";

/** P0: keep the original route where possible, and never trust an external return_to. */
export function ClinicalBackLinkP0({fallback="/saude/careflow",className="", "aria-label":accessibleLabel="Voltar"}:{fallback?:string;className?:string;"aria-label"?:string}){
  const router=useRouter();const {trigger}=useHapticFeedback();
  const goBack=()=>{
    trigger("vibrate");
    const q=new URLSearchParams(window.location.search).get("return_to")||"";
    if(/^\/(?!\/)[^\s\\<>]*$/.test(q)&&!q.startsWith("/api/")&&q!==window.location.pathname){router.push(q);return;}
    // A Next.js history state indicates an in-app route, not an unknown external referrer.
    if(window.history.length>1&&window.history.state?.__NA){router.back();return;}
    router.push(fallback);
  };
  return <button type="button" aria-label={accessibleLabel} onClick={goBack} className={className}><ArrowLeft size={18} aria-hidden="true"/></button>;
}
