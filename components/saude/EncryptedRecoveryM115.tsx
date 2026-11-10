"use client";
/** UI intentionally never displays plaintext backup contents. */
import { useEffect,useState } from "react";
import { Clipboard } from "@capacitor/clipboard";
import { ClipboardCopy,FileKey2,LockKeyhole } from "lucide-react";
import { exportEncryptedM115,importEncryptedM115,type PrivateRecoveryKindM115 } from "@/lib/private-recovery-m115";
export function EncryptedRecoveryM115({kind,userId,personId}:{kind:PrivateRecoveryKindM115;userId:string;personId:string}){
  const [raw,setRaw]=useState(""),[passphrase,setPassphrase]=useState(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
  useEffect(()=>{setRaw("");setPassphrase("");setFeedback("");},[kind,userId,personId]);
  useEffect(()=>{const clear=()=>{if(document.visibilityState!=="visible"){setPassphrase("");setRaw("");}};document.addEventListener("visibilitychange",clear);return()=>document.removeEventListener("visibilitychange",clear);},[]);
  async function exportNow(){try{await Clipboard.write({string:exportEncryptedM115(kind,userId,personId)});setFeedback("Backup cifrado copiado. Guarde-o em local seguro e fora do clipboard; ele só abre com a mesma frase, conta e pessoa.");}catch(e){setFeedback(e instanceof Error?e.message:"Falha ao copiar backup.");}}
  async function importNow(){if(busy)return;
    if(!window.confirm("Importar somente para este cofre vazio? O arquivo será validado, não substituirá dados existentes e exige a frase correta."))return;
    setBusy(true);try{await importEncryptedM115(kind,userId,personId,raw,passphrase);setPassphrase("");setRaw("");setFeedback("Backup cifrado recuperado. Reabra esta página para desbloquear com sua frase.");window.location.reload();}
    catch(e){setFeedback(e instanceof Error?e.message:"Não foi possível importar; nada foi sobrescrito.");}finally{setBusy(false);}}
  async function fromFile(file?:File){if(!file)return;if(file.size>1500000){setFeedback("Arquivo maior que o limite de 1,5 MB.");return;}try{setRaw((await file.text()).slice(0,1500001));}catch{setFeedback("Não foi possível ler o arquivo local.");}}
  return <details className="rounded-[20px] border border-cyan-300/15 bg-surface p-3" aria-label="Backup criptografado voluntário"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-cyan-200"><FileKey2 size={17}/>Backup cifrado manual e recuperação</summary>
    <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">Somente cópias já cifradas podem ser exportadas. Não salva a frase, não envia para servidores e não permite recuperar uma frase esquecida. Backup é específico da conta e pessoa atuais.</p>
    <button type="button" onClick={()=>void exportNow()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 text-xs font-semibold text-cyan-200"><ClipboardCopy size={15}/>Copiar backup cifrado existente</button>
    <details className="mt-3 rounded-xl border border-surface-border/70 p-3"><summary className="cursor-pointer text-xs font-medium">Importar backup cifrado para um cofre vazio</summary>
      <label className="mt-3 grid gap-1 text-xs text-ink-muted">Selecionar arquivo JSON (opcional)<input type="file" accept=".json,application/json,text/plain" onChange={e=>void fromFile(e.target.files?.[0])} className="min-h-11 w-full text-[11px]"/></label>
      <label className="mt-2 grid gap-1 text-xs text-ink-muted">Ou colar backup cifrado<textarea value={raw} onChange={e=>setRaw(e.target.value.slice(0,1500001))} rows={3} placeholder="Conteúdo JSON cifrado do VAULT" className="rounded-xl border border-surface-border bg-surface-raised p-3 text-xs text-ink-primary"/></label>
      <label className="mt-2 grid gap-1 text-xs text-ink-muted">Frase usada na criação da cópia<input type="password" autoComplete="off" value={passphrase} onChange={e=>setPassphrase(e.target.value)} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised p-3 text-sm text-ink-primary"/></label>
      <button type="button" disabled={busy||passphrase.length<10||raw.length<40} onClick={()=>void importNow()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/30 text-xs font-semibold text-cyan-200 disabled:opacity-40"><LockKeyhole size={15}/>Validar e importar sem sobrescrever</button>
    </details>
    {feedback?<p role="status" className="mt-3 text-[11px] text-cyan-200">{feedback}</p>:null}
  </details>;
}
