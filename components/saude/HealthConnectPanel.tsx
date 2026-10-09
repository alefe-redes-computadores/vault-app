"use client";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Link2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { db } from "@/lib/db";
import { CONNECT_METRICS, type ConnectStatus } from "@/lib/health-connect/types";
import { connectStatus, healthConnectBridge } from "@/lib/health-connect/bridge";
import { saveConnectConnection, disconnectHealthConnect } from "@/lib/repositories/healthConnect";
import { syncHealthConnect } from "@/lib/health-connect/sync";
import { METRICS, type HealthMetric, type HealthDevice } from "@/lib/health-profile/types";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { HealthMetricIcon, HealthDeviceIcon, METRIC_TONES } from "./HealthDeviceIcon";
import { HealthRelationPicker } from "./HealthRelationPicker";
export function HealthConnectPanel({ personId, personName, devices }: { personId:string; personName:string; devices:HealthDevice[] }) {
  const { user } = useAuth(), { trigger } = useHapticFeedback();
  const connection = useLiveQuery(() => user?.id ? db.health_connect_connections.get(user.id) : undefined,[user?.id]);
  const [status,setStatus] = useState<ConnectStatus | null>(null), [expanded,setExpanded] = useState(false), [types,setTypes] = useState<HealthMetric[]>(["sono","caminhada"]), [deviceIds,setDeviceIds] = useState<Partial<Record<HealthMetric,string>>>({}), [auto,setAuto] = useState(true), [confirmed,setConfirmed] = useState(false), [busy,setBusy] = useState(false), [message,setMessage] = useState<string | null>(null), [failure,setFailure] = useState<string | null>(null);
  const lock = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current=true; let alive=true; void connectStatus().then(s => { if(alive)setStatus(s); }).catch(() => { if(alive)setFailure("Não foi possível consultar o Health Connect. Tente abrir as configurações do Android."); });return () => { alive=false;mounted.current=false; }; },[]);
  const linked = connection?.person_id === personId;
  const native = status?.availability === "available";
  async function action(task:()=>Promise<void>) {
    if(lock.current)return;lock.current=true;setBusy(true);setFailure(null);setMessage(null);
    try { await task();if(mounted.current)trigger("success"); }
    catch(e) { if(mounted.current)setFailure(e instanceof Error ? e.message : "Não foi possível conectar."); }
    finally { lock.current=false;if(mounted.current)setBusy(false); }
  }
  async function readNow() {
    if (!user?.id) throw new Error("Conta não identificada.");
    const result=await syncHealthConnect(user.id,personId);if(mounted.current && result)setMessage(!result.added && !result.updated && !result.duplicate && !result.deleted && !result.invalid ? "Nenhum dado do Samsung Health disponível neste período. Confira o compartilhamento com Health Connect no Samsung Health." : `${result.added} novo(s) · ${result.updated} atualizado(s) · ${result.duplicate} já registrado(s)${result.deleted ? ` · ${result.deleted} excluído(s) preservado(s)` : ""}${result.invalid ? ` · ${result.invalid} ignorado(s)` : ""}`);
  }
  function edit() {
    if(linked && connection) { setTypes(connection.types);setDeviceIds(connection.device_ids);setAuto(connection.auto_sync); }
    setConfirmed(false);setExpanded(v => !v);trigger("vibrate");
  }
  return <section className="rounded-[24px] border border-emerald-400/15 bg-surface p-4">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-400"><Link2 size={21}/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Samsung Health</h2><p className="mt-1 text-[11px] text-ink-muted">Via Health Connect · leitura autorizada</p></div><ShieldCheck size={18} className="text-ink-muted"/></div>
    {status?.availability === "web" ? <p className="mt-3 text-xs leading-relaxed text-ink-muted">Conecte pelo APK Android. Os registros importados aparecem aqui após a sincronização da sua conta; o registro manual continua disponível.</p> : status?.availability === "apk_update" ? <p className="mt-3 text-xs text-ink-muted">Instale o novo APK Vault para habilitar esta conexão.</p> : status && !native ? <div className="mt-3 space-y-3"><p className="text-xs text-ink-muted">{status.availability === "update_required" ? "Instale ou atualize o Health Connect no Android." : "Health Connect indisponível neste aparelho ou perfil do Android."}</p>{status.availability === "update_required" && <button type="button" disabled={busy} onClick={() => void action(() => healthConnectBridge.openSettings())} className="rounded-xl border border-surface-border px-3 py-2 text-xs">Abrir Health Connect</button>}</div> : !status ? <p className="mt-3 text-xs text-ink-muted">Verificando conexão…</p> : <>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{linked ? `Vinculado a ${personName}. ${connection?.auto_sync ? "Atualização automática ao abrir ou voltar ao Vault, com intervalo mínimo de 10 minutos." : "Sincronização manual."}` : connection ? "Este celular está vinculado a outra pessoa. Confirme o novo vínculo antes de importar neste perfil." : "Conecte os dados publicados pelo Samsung Health ao histórico desta pessoa."}</p>
      {linked && connection?.auto_sync && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400"><Check size={13}/>Sincronização automática ativa</p>}
      {linked && connection?.last_synced && <p className="mt-2 text-[10px] text-ink-muted">Última leitura: {new Date(connection.last_synced).toLocaleString("pt-BR")}</p>}
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={edit} aria-expanded={expanded} className="rounded-xl border border-surface-border px-3 py-2 text-xs">{linked ? "Configurar conexão" : "Conectar meus dados"}</button>{linked && (!connection?.auto_sync || expanded || failure || connection?.last_error) && <button type="button" disabled={busy} onClick={() => void action(readNow)} className="flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs text-emerald-400"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/>{busy ? "Lendo…" : "Sincronizar agora"}</button>}</div>
      {expanded && <div className="mt-4 space-y-3 border-t border-surface-border pt-4"><p className="text-xs text-ink-muted">Escolha os tipos. Batimentos são importados como média diária; sono representa o intervalo da sessão. A disponibilidade depende do que o Samsung Health publica.</p>
        {CONNECT_METRICS.map(type => <div key={type} className="rounded-2xl border border-surface-border p-3"><button type="button" disabled={busy} aria-pressed={types.includes(type)} onClick={() => {setTypes(v => v.includes(type) ? v.filter(t => t !== type) : [...v,type]);trigger("vibrate");}} className="flex w-full items-center gap-3 text-left text-xs"><span className={METRIC_TONES[type]}><HealthMetricIcon type={type} size={19}/></span><span className="flex-1">{METRICS[type].label}</span><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${types.includes(type) ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-400" : "border-surface-border"}`}>{types.includes(type) && <Check size={14}/>}</span></button>{types.includes(type) && <div className="mt-3"><HealthRelationPicker value={deviceIds[type] || ""} onValueChange={id => setDeviceIds(v => ({...v,[type]:id}))} title={`Aparelho de origem · ${METRICS[type].label}`} disabled={busy} renderIcon={id => {const d=devices.find(d=>d.id===id);return d ? <HealthDeviceIcon kind={d.kind} color={d.color}/> : <Link2 size={18} className="text-ink-muted"/>;}} className="w-full rounded-xl bg-surface-raised px-3 py-2 text-[11px]"><option value="">Samsung Health · sem atribuir aparelho</option>{devices.filter(d=>d.active && d.capabilities.includes(type)).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</HealthRelationPicker></div>}</div>)}
        <p className="text-[10px] leading-relaxed text-ink-muted">Se o Samsung Health combina relógio e anel, deixe sem aparelho. Só atribua um acessório quando souber a origem; o Vault não adivinha qual mediu.</p>
        <button type="button" disabled={busy} aria-pressed={auto} onClick={()=>setAuto(v=>!v)} className="flex w-full items-center gap-2 rounded-xl border border-surface-border p-3 text-left text-xs"><span className={auto ? "text-emerald-400" : "text-ink-muted"}>{auto ? <Check size={16}/> : <RefreshCw size={16}/>}</span>Sincronizar ao abrir o Vault</button>
        <button type="button" disabled={busy} aria-pressed={confirmed} onClick={()=>setConfirmed(v=>!v)} className="flex w-full items-start gap-2 rounded-xl border border-surface-border p-3 text-left text-xs"><ShieldCheck size={18} className={confirmed ? "text-emerald-400" : "text-ink-muted"}/><span>Confirmo que os dados do Samsung Health neste celular pertencem a <strong>{personName}</strong>.</span>{confirmed && <Check size={16} className="shrink-0 text-emerald-400"/>}</button>
        <button type="button" disabled={busy || !confirmed || !types.length} onClick={() => void action(async () => {const next=await healthConnectBridge.requestPermissions({types});if(!mounted.current)return;setStatus(next);const granted=types.filter(t=>next.granted.includes(t));if(!granted.length)throw new Error("Nenhuma permissão concedida. Você pode continuar registrando manualmente.");await saveConnectConnection({person_id:personId,types:granted,device_ids:deviceIds,auto_sync:auto});if(mounted.current){setExpanded(false);setMessage("Vínculo salvo. Importando os dados disponíveis…");}
await readNow(); })} className="w-full rounded-xl bg-emerald-400/15 p-3 text-xs font-semibold text-emerald-400 disabled:opacity-40">{busy ? "Conectando…" : "Autorizar e salvar vínculo"}</button>
        {connection && <button type="button" disabled={busy} onClick={() => void action(async () => {await disconnectHealthConnect();if(mounted.current){setExpanded(false);setMessage("Conexão pausada. O histórico foi preservado. Revogue as permissões no Health Connect se desejar.");} })} className="flex items-center gap-2 px-2 py-2 text-xs text-ink-muted"><Unplug size={15}/>Pausar conexão deste celular</button>}
        <button type="button" disabled={busy} onClick={() => void action(() => healthConnectBridge.openSettings())} className="px-2 py-2 text-xs text-ink-muted">Gerenciar permissões no Android</button>
      </div>}
    </>}
    {busy && <p role="status" className="mt-3 text-[11px] text-ink-muted">Aguarde a leitura; repetir o toque não duplica os registros.</p>}
    {message && <p role="status" className="mt-3 text-xs text-emerald-400">{message}</p>}
    {(failure || (linked && connection?.last_error)) && <p role="alert" className="mt-3 text-xs text-amber-300">{failure || connection?.last_error}</p>}
  </section>;
}
