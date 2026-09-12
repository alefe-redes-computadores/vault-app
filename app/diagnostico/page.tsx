"use client";
import {useCallback,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {useLiveQuery} from "dexie-react-hooks";
import {ArrowLeft,CheckCircle2,Cloud,Database,Loader2,RefreshCw,Smartphone,TriangleAlert,WifiOff} from "lucide-react";
import {PageTransition} from "@/components/PageTransition";
import {useToast} from "@/components/ToastProvider";
import {useAuth} from "@/hooks/useAuth";
import {useHapticFeedback} from "@/lib/haptics";
import {useSyncQueue} from "@/hooks/useSyncQueue";
import {db} from "@/lib/db";
import {pullAllData} from "@/lib/sync/pull";
import {supabase} from "@/lib/supabase/client";
import type {SyncQueueItem} from "@/lib/types";

interface TableCheck{key:string;label:string;local:number|null;remote:number|null;error?:string}
const TABLES=[["persons","persons","Pessoas"],["medicamentos","medicamentos","Medicamentos"],["tratamentos","tratamentos","Tratamentos"],["doseLogs","dose_logs","Doses"],["registros_saude","registros_saude","Registros de saúde"],["health_reminders","health_reminders","Lembretes"],["health_goals","health_goals","Metas"],["documents","documents","Documentos"]] as const;
function ageLabel(value?:string){if(!value)return"idade desconhecida";const minutes=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));return minutes<1?"agora":minutes<60?`há ${minutes} min`:`há ${Math.floor(minutes/60)} h`}

export default function DiagnosticoPage(){
 const router=useRouter();const {user}=useAuth();const {trigger}=useHapticFeedback();const {showToast}=useToast();
 const {processQueue,resetFailedItems,isProcessing,isOnline}=useSyncQueue();
 const queue=(useLiveQuery(()=>db.syncQueue.orderBy("created_at").toArray(),[])??[]) as SyncQueueItem[];
 const [checks,setChecks]=useState<TableCheck[]>([]);const [checking,setChecking]=useState(false);const [syncing,setSyncing]=useState(false);
 const failed=queue.filter(item=>item.failed).length;const deferred=queue.filter(item=>item.next_retry_at&&new Date(item.next_retry_at).getTime()>Date.now()).length;
 const byTable=useMemo(()=>queue.reduce<Record<string,number>>((result,item)=>{result[item.table]=(result[item.table]||0)+1;return result},{}),[queue]);
 const syncNow=useCallback(async()=>{if(!user?.id||!isOnline||syncing)return;setSyncing(true);trigger("vibrate");try{await pullAllData(user.id);const result=await processQueue();showToast(result.remaining===0?"Sincronização concluída":`${result.remaining} item(ns) continuam pendentes`,result.remaining===0?"success":"info")}catch(error){showToast(error instanceof Error?error.message:"Não foi possível sincronizar","error")}finally{setSyncing(false)}},[user?.id,isOnline,syncing,trigger,processQueue,showToast]);
 const runCheck=useCallback(async()=>{if(!user?.id||!isOnline)return;setChecking(true);const results:TableCheck[]=[];for(const [localKey,remoteKey,label] of TABLES){try{const local=await(db as any)[localKey].toCollection().filter((row:any)=>row.user_id===user.id).count();const remoteResult=await supabase.from(remoteKey).select("id",{count:"exact",head:true}).eq("user_id",user.id);results.push({key:localKey,label,local,remote:remoteResult.error?null:(remoteResult.count??0),error:remoteResult.error?.message})}catch(error){results.push({key:localKey,label,local:null,remote:null,error:error instanceof Error?error.message:"Falha na leitura"})}}setChecks(results);setChecking(false)},[user?.id,isOnline]);
 return <PageTransition><main className="min-h-screen bg-void px-5 pb-28 text-ink-primary">
  <header className="sticky top-0 z-20 -mx-5 flex items-center gap-3 border-b border-surface-border/40 bg-void/90 px-5 header-safe-top pb-4 backdrop-blur-xl"><button onClick={()=>router.replace("/mais")} aria-label="Voltar para Mais" className="rounded-full border border-surface-border p-3"><ArrowLeft size={18}/></button><div><p className="font-mono text-[11px] uppercase tracking-[.25em] text-ice">Vault</p><h1 className="text-xl font-semibold">Saúde da sincronização</h1></div></header>
  {!isOnline&&<div className="mt-5 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4"><WifiOff className="shrink-0 text-amber-400"/><p className="text-sm text-ink-muted">Sem rede. Seus dados permanecem no aparelho e a fila será retomada quando a conexão voltar.</p></div>}
  <section className="mt-5 grid grid-cols-3 gap-2">{([["Pendentes",queue.length],["Com falha",failed],["Aguardando",deferred]] as const).map(([label,value])=><div key={label} className="rounded-2xl border border-surface-border bg-surface p-3 text-center"><strong className="text-xl">{value}</strong><p className="text-[11px] text-ink-muted">{label}</p></div>)}</section>
  <p className="mt-2 text-xs text-ink-muted">{queue[0]?`Item mais antigo ${ageLabel(queue[0].created_at)}.`:"Nenhuma alteração aguardando envio."}</p>
  <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={!isOnline||syncing||isProcessing} onClick={()=>void syncNow()} className="flex items-center justify-center gap-2 rounded-2xl bg-ice p-3 font-semibold text-void disabled:opacity-40">{syncing||isProcessing?<Loader2 className="animate-spin" size={17}/>:<RefreshCw size={17}/>}Sincronizar</button><button disabled={!isOnline||failed===0||isProcessing} onClick={()=>void resetFailedItems()} className="rounded-2xl border border-amber-400/40 p-3 text-sm font-semibold text-amber-300 disabled:opacity-40">Repetir falhas</button></div>
  <p className="mt-2 text-xs text-ink-muted">Nenhum item é descartado por esta tela. Reenvios sempre passam pela fila oficial do Vault.</p>
  <section className="mt-6 rounded-3xl border border-surface-border bg-surface p-4"><h2 className="font-semibold">Fila por área</h2>{Object.keys(byTable).length===0?<div className="mt-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={18}/>Fila limpa</div>:<div className="mt-3 grid gap-2">{Object.entries(byTable).map(([table,count])=><div key={table} className="flex justify-between rounded-xl bg-void p-3 text-sm"><span>{table}</span><strong>{count}</strong></div>)}</div>}</section>
  <section className="mt-4 rounded-3xl border border-surface-border bg-surface p-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Cobertura local × nuvem</h2><p className="text-xs text-ink-muted">Diferenças podem ser normais enquanto há fila.</p></div><button disabled={!isOnline||checking} onClick={()=>void runCheck()} aria-label="Verificar contagens" className="rounded-xl border border-surface-border p-3">{checking?<Loader2 className="animate-spin" size={17}/>:<Database size={17}/>}</button></div><div className="mt-3 grid gap-2">{checks.map(check=><div key={check.key} className="rounded-xl bg-void p-3"><div className="flex items-center gap-2"><Smartphone size={14}/><span className="min-w-0 flex-1 text-sm">{check.label}</span><span className="font-mono text-sm">{check.local??"—"}</span><Cloud size={14}/><span className="font-mono text-sm">{check.remote??"—"}</span></div>{check.error&&<p className="mt-1 flex gap-1 text-xs text-coral"><TriangleAlert size={13}/>{check.error}</p>}</div>)}</div></section>
 </main></PageTransition>
}
