"use client";
import {useEffect,useState} from "react";
import {Phone,ShieldAlert,Trash2} from "lucide-react";
import type {TrustedContact} from "@/lib/safety-plan";
import {clearQuickSupportM116,normalizedQuickPhoneM116,readQuickSupportM116,saveQuickSupportM116,type QuickSupportM116 as QuickContact} from "@/lib/quick-support-m116";
/** Deliberately independent of the encrypted plan: opt-in, phone only, never messages or automatic calls. */
export function QuickSupportM116({userId,personId,locked,contacts}:{userId:string;personId:string;locked:boolean;contacts:TrustedContact[]}){
  const [selected,setSelected]=useState<QuickContact|null>(null);
  const [consent,setConsent]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{setSelected(readQuickSupportM116(userId,personId));setConsent(false);setMessage("");},[userId,personId]);
  function choose(contact:TrustedContact){
    try{
      const next=saveQuickSupportM116(userId,personId,{contactId:contact.id,label:contact.name,phone:contact.phone},consent);
      setSelected(next);setConsent(false);setMessage("Contato rápido ativado somente neste aparelho. Nenhuma chamada foi realizada.");
    }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível salvar o contato rápido.");}
  }
  function erase(){try{clearQuickSupportM116(userId,personId);setSelected(null);setMessage("Atalho removido deste aparelho.");}catch{setMessage("Não foi possível remover o atalho.");}}
  // If the plan is opened and the original contact was removed or changed, its
  // stale unencrypted snapshot must be explicitly withdrawn, not silently used.
  const stale=!locked&&Boolean(selected)&&!contacts.some(c=>c.id===selected?.contactId&&
    c.name.trim()===selected?.label&&normalizedQuickPhoneM116(c.phone)===selected?.phone);
  return <section aria-label="Contato de apoio rápido" className="rounded-[22px] border border-rose-300/20 bg-rose-300/[.025] p-4">
    <div className="flex items-start gap-2"><ShieldAlert size={17} className="mt-0.5 shrink-0 text-rose-200"/><div><h2 className="text-xs font-bold text-ink-primary">Contato de apoio rápido</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Um atalho opcional para abrir o discador sem desbloquear o texto do plano. Nunca liga ou envia SMS automaticamente.</p></div></div>
    {selected&&!stale?<a href={`tel:${selected.phone}`} className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 text-center text-xs font-bold text-rose-200"><Phone size={17}/>Abrir discador para {selected.label}</a>:null}
    {stale?<p className="mt-2 text-xs text-amber-200">O contato original foi alterado ou removido. Desative este atalho e escolha novamente antes de ligar.</p>:null}
    {!locked?<>
      <p className="mt-3 text-[10px] leading-relaxed text-ink-muted">Para funcionar com o plano bloqueado, nome e telefone do contato escolhido ficarão em cópia local não criptografada neste dispositivo. O restante do plano continua cifrado. Não sincroniza e não aparece em notificações.</p>
      <label className="mt-2 flex min-h-11 items-center gap-2 text-[11px] text-ink-secondary"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="size-5 accent-rose-300"/>Autorizo a cópia local sem criptografia para discagem rápida</label>
      {contacts.filter(c=>Boolean(normalizedQuickPhoneM116(c.phone))).map(c=><button key={c.id} type="button" disabled={!consent} onClick={()=>choose(c)} className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl border border-surface-border px-3 text-left text-xs text-ink-primary disabled:opacity-40"><span className="truncate">Usar {c.name} para apoio rápido</span><Phone size={15}/></button>)}
      {!contacts.some(c=>normalizedQuickPhoneM116(c.phone))?<p className="mt-2 text-[11px] text-ink-muted">Cadastre um contato com telefone no plano para habilitar este atalho.</p>:null}
      {selected?<button type="button" onClick={erase} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 text-xs text-rose-200"><Trash2 size={14}/>Remover cópia de acesso rápido</button>:null}
    </>:selected?<p className="mt-2 text-[10px] text-ink-faint">O conteúdo clínico do plano permanece protegido. O atalho usa apenas a cópia autorizada do contato.</p>:<p className="mt-2 text-[11px] text-ink-muted">Abra o plano com sua frase para configurar um contato rápido. SAMU 192 e CVV 188 continuam disponíveis acima.</p>}
    {message?<p role="status" className="mt-2 text-xs text-rose-200">{message}</p>:null}
  </section>;
}
